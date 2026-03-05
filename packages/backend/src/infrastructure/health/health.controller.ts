import * as os from 'node:os';
import { Controller, Get, Inject, Req, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiOperation, getSchemaPath } from '@nestjs/swagger';
import { DiskHealthIndicator, HealthCheck, type HealthCheckResult, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import type { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { SkipTransform } from '@/modules/common/decorators/skip-transform.decorator';
import { SkipServerAccess } from '@/infrastructure/decorators/skip-server-access.decorator';
import { SkipSetupCheck } from '@/infrastructure/decorators/skip-setup-check.decorator';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { SERVER_ACCESS_TOKEN_REPOSITORY, RESILIENCE } from '@/infrastructure/di-tokens';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CircuitBreakerService } from '@/infrastructure/resilience/circuit-breaker.service';
import { GetSystemHealthQueryHandler } from '@application/monitoring/queries/get-system-health/get-system-health.handler';
import { GetSystemHealthQuery } from '@application/monitoring/queries/get-system-health/get-system-health.query';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { BasicHealthDto, DetailedHealthDto, IntegrationHealthDto, SystemHealthDto } from './dto';

/**
 * Konstanten für Health-Checks
 */
const HEALTH_CHECK_CONFIG = {
  MEMORY: {
    HEAP_THRESHOLD: 150 * 1024 * 1024, // 150MB
    RSS_THRESHOLD: 1024 * 1024 * 1024, // 1024MB
  },
  DISK: {
    THRESHOLD_PERCENT: 0.9, // 90%
    PATH: '/',
  },
};

/**
 * Controller für Gesundheitscheck-Endpunkte, die den Gesundheitsstatus der Anwendung überwachen.
 * Stellt Endpunkte für Gesamtgesundheit, Liveness, Readiness und Datenbankprüfungen bereit.
 *
 * @class HealthController
 */
@SkipServerAccess() // Health-Endpoints muessen ohne Server-Access-Token erreichbar sein
@SkipSetupCheck() // Health-Endpoints muessen waehrend Setup erreichbar sein (Story 1.2)
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  /**
   * Cache fuer Setup-Complete Status.
   * Vermeidet wiederholte Datenbank-Abfragen bei hochfrequenten Health-Checks.
   */
  private cachedSetupComplete: boolean | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 10_000; // 10 Sekunden

  /**
   * Erstellt eine Instanz des HealthControllers.
   *
   * @constructor
   * @param {HealthCheckService} health - Service zur Durchführung von Gesundheitschecks
   * @param {MemoryHealthIndicator} memory - Indikator für Speicher-Gesundheitschecks
   * @param {DiskHealthIndicator} disk - Indikator für Festplatten-Gesundheitschecks
   * @param {PrismaHealthIndicator} prismaDb - Indikator für Prisma-Datenbank-Gesundheitschecks
   * @param {PrismaService} prisma - Prisma Service für Setup-Status Abfragen
   * @param {IServerAccessTokenRepository} tokenRepo - Repository für Token-Validierung
   */
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaDb: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY) private readonly tokenRepo: IServerAccessTokenRepository,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
    private readonly systemHealthHandler: GetSystemHealthQueryHandler,
  ) {}

  /**
   * Führt einen differenzierten Gesundheitscheck durch basierend auf Token-Authentifizierung.
   *
   * **Ohne Token / Ungueltiger Token:**
   * Gibt BasicHealthDto zurück (nur: status, setupComplete, version).
   * Security: Keine Database-Details, Memory, CPU oder Uptime-Information.
   *
   * **Mit gueltigem X-Server-Access-Token:**
   * Gibt DetailedHealthDto zurück mit erweiterten Informationen:
   * - Datenbankverbindungsstatus (connected/disconnected)
   * - Server-Uptime in Sekunden
   * - Optional: Memory-Metriken, CPU Load Average
   *
   * @param request - Express Request für Token-Extraktion
   * @returns BasicHealthDto oder DetailedHealthDto je nach Authentifizierung
   */
  @Get()
  @SkipTransform()
  @ApiOperation({ summary: 'Health-Check mit Token-Differenzierung' })
  @ApiExtraModels(BasicHealthDto, DetailedHealthDto)
  @ApiOkResponse({
    description: 'Ohne Token: BasicHealthDto, Mit Token: DetailedHealthDto',
    schema: {
      oneOf: [{ $ref: getSchemaPath(BasicHealthDto) }, { $ref: getSchemaPath(DetailedHealthDto) }],
    },
  })
  async check(@Req() request: Request): Promise<BasicHealthDto | DetailedHealthDto> {
    // Token aus Header extrahieren
    const rawToken = request.headers['x-server-access-token'];
    const tokenString = Array.isArray(rawToken) ? rawToken[0] : rawToken;

    // Wenn Token vorhanden und gueltig: detaillierten Health-Check zurueckgeben
    if (tokenString && (await this.validateToken(tokenString))) {
      return this.getDetailedHealth();
    }

    // Ohne Token oder ungueltiger Token: BasicHealthDto zurueckgeben
    return this.getBasicHealth();
  }

  /**
   * Führt einen Liveness-Check durch, um festzustellen, ob die Anwendung läuft.
   * Überprüft nur die Datenbankverbindung als primären Indikator.
   *
   * @returns {Promise<HealthCheckResult>} Liveness-Check-Ergebnisobjekt
   */
  @Get('liveness')
  @SkipTransform()
  @HealthCheck()
  async checkLiveness(): Promise<HealthCheckResult> {
    return this.health.check([async () => this.prismaDb.pingCheck('database')]);
  }

  /**
   * Führt einen Readiness-Check durch, um festzustellen, ob die Anwendung bereit ist, Anfragen anzunehmen.
   * Überprüft Speicher- und Festplattenverfügbarkeit.
   *
   * @returns {Promise<HealthCheckResult>} Readiness-Check-Ergebnisobjekt
   */
  @Get('readiness')
  @SkipTransform()
  @HealthCheck()
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', HEALTH_CHECK_CONFIG.MEMORY.HEAP_THRESHOLD),
      () =>
        this.disk.checkStorage('storage', {
          thresholdPercent: HEALTH_CHECK_CONFIG.DISK.THRESHOLD_PERCENT,
          path: HEALTH_CHECK_CONFIG.DISK.PATH,
        }),
    ]);
  }

  /**
   * Führt einen detaillierten Datenbank-Gesundheitscheck durch.
   * Überprüft Datenbankverbindung und Initialisierungsstatus.
   *
   * @returns {Promise<HealthCheckResult>} Datenbank-Check-Ergebnisobjekt
   */
  @Get('db')
  @SkipTransform()
  @HealthCheck()
  async checkDatabase(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prismaDb.pingCheck('database'), () => this.prismaDb.isConnected('database_connections')]);
  }

  /**
   * Gibt den Circuit Breaker Status aller registrierten Integrationen zurueck.
   *
   * Zeigt pro Integration: serviceName, state, failureCount, lastFailure, lastSuccess.
   *
   * @see Story 5.3 AC4
   * @returns {IntegrationHealthDto} Status aller Circuit Breakers
   */
  @Get('integrations')
  @ApiOperation({ summary: 'Circuit Breaker Status aller externen Integrationen' })
  @ApiWrappedResponse(IntegrationHealthDto, { description: 'Status aller externen Integrationen' })
  async getIntegrationHealth(@Req() request: Request): Promise<IntegrationHealthDto> {
    // Token-Validierung: ohne/ungueltigem Token → leere Liste (Information Disclosure Prevention)
    const rawToken = request.headers['x-server-access-token'];
    const tokenString = Array.isArray(rawToken) ? rawToken[0] : rawToken;

    if (!tokenString || !(await this.validateToken(tokenString))) {
      return { integrations: [] };
    }

    const statuses = this.circuitBreaker.getAllStatus();
    return {
      integrations: statuses.map((s) => {
        const totalCount = s.failureCount + s.successCount;
        return {
          serviceName: s.serviceName,
          state: s.state,
          failureCount: s.failureCount,
          lastFailure: s.lastFailure,
          lastSuccess: s.lastSuccess,
          // Story 5.6 AC5: Erweiterte Metriken
          lastSuccessAt: s.lastSuccess,
          lastFailureAt: s.lastFailure,
          // AC5: Fehlerrate im Rolling Window (failureCount + successCount aus CircuitBreakerState)
          errorRate: totalCount > 0 ? (s.failureCount / totalCount) * 100 : 0,
          // Per-Integration Response Time Tracking ist ein separates Feature.
          // Das globale Prometheus HTTP Histogram trackt nur aggregierte Latenz, nicht per Integration.
          responseTimeP95: undefined,
        };
      }),
    };
  }

  /**
   * Gibt den aggregierten System-Gesundheitszustand zurueck.
   *
   * Erfordert Admin-Authentifizierung (JWT + ADMIN/SUPER_ADMIN Rolle).
   *
   * Enthaelt:
   * - zustellrate: Prozent erfolgreich zugestellter Befehle im 5min-Window
   * - websocketConnections: Anzahl aktiver WebSocket-Verbindungen
   * - outboxQueueDepth: Anzahl wartender Events im Outbox
   * - apiResponseTime: p50/p95/p99 in ms
   * - circuitBreakerStatus: Status pro Integration
   * - dbConnectionPoolUsage: Auslastung in Prozent
   * - uptime: Server-Uptime in Sekunden
   *
   * @see Story 5.6 AC2
   */
  @Get('system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Aggregierter System-Gesundheitszustand (Admin only)' })
  @ApiWrappedResponse(SystemHealthDto, { description: 'System-Health-Metriken' })
  async getSystemHealth(): Promise<SystemHealthDto> {
    const result = await this.systemHealthHandler.execute(new GetSystemHealthQuery());

    if (result.isFailure) {
      // Fallback bei Fehler: minimale Werte
      return {
        zustellrate: 0,
        websocketConnections: 0,
        outboxQueueDepth: 0,
        apiResponseTime: { p50: 0, p95: 0, p99: 0 },
        circuitBreakerStatus: [],
        dbConnectionPoolUsage: 0,
        uptime: Math.floor(process.uptime()),
      };
    }

    const dto = result.value!;
    return {
      zustellrate: dto.zustellrate,
      websocketConnections: dto.websocketConnections,
      outboxQueueDepth: dto.outboxQueueDepth,
      apiResponseTime: dto.apiResponseTime,
      circuitBreakerStatus: Object.entries(dto.circuitBreakerStatus).map(([serviceName, state]) => ({
        serviceName,
        state,
      })),
      dbConnectionPoolUsage: dto.dbConnectionPoolUsage,
      uptime: dto.uptime,
    };
  }

  /**
   * Prueft ob das Server-Setup abgeschlossen ist.
   *
   * Setup gilt als abgeschlossen wenn:
   * 1. Mindestens ein aktiver Admin (ADMIN oder SUPER_ADMIN) existiert
   * 2. Mindestens ein aktiver Server-Access-Token existiert
   *
   * Nutzt einen Cache (10 Sekunden TTL) um die Datenbank-Last zu reduzieren,
   * da der Health-Endpoint hochfrequent aufgerufen werden kann.
   *
   * @returns {Promise<boolean>} True wenn Setup abgeschlossen
   */
  private async isSetupComplete(): Promise<boolean> {
    const now = Date.now();

    // Cache noch gueltig?
    if (this.cachedSetupComplete !== null && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedSetupComplete;
    }

    try {
      // Admin-Check: Aktive User mit ADMIN oder SUPER_ADMIN Rolle
      const adminCount = await this.prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true,
          isDeleted: false,
        },
      });

      // Token-Check: Aktive Tokens via Repository
      const activeTokenResult = await this.tokenRepo.countActive();
      const activeTokenCount = activeTokenResult.isSuccess ? (activeTokenResult.value ?? 0) : 0;

      const hasAdmin = adminCount > 0;
      const hasActiveToken = activeTokenCount > 0;

      // Cache aktualisieren
      this.cachedSetupComplete = hasAdmin && hasActiveToken;
      this.cacheTimestamp = now;

      return this.cachedSetupComplete;
    } catch (_error) {
      // Bei Fehler: Cache invalidieren um stale Daten zu vermeiden
      // Naechster Call wird frischen DB-Lookup durchfuehren
      this.cachedSetupComplete = null;
      this.cacheTimestamp = 0;
      // Konservativ annehmen Setup ist nicht abgeschlossen
      return false;
    }
  }

  /**
   * Validiert einen Klartext-Token gegen gespeicherte Token-Hashes.
   *
   * **Security:**
   * - Nutzt bcrypt.compare() für timing-safe Vergleich
   * - Keine Exceptions - gibt false bei jedem Fehler zurück
   * - Token-Hashes werden nicht geloggt
   *
   * @param rawToken - Klartext-Token aus dem X-Server-Access-Token Header
   * @returns {Promise<boolean>} True wenn Token gueltig und aktiv
   */
  private async validateToken(rawToken: string): Promise<boolean> {
    try {
      // Alle aktiven Tokens laden
      const tokensResult = await this.tokenRepo.findAllActive();
      if (tokensResult.isFailure || !tokensResult.value) {
        return false;
      }

      // Gegen jeden gespeicherten Hash pruefen (bcrypt.compare ist timing-safe)
      for (const token of tokensResult.value) {
        try {
          const isMatch = await bcrypt.compare(rawToken, token.tokenHash.value);
          if (isMatch && token.isValid()) {
            return true;
          }
        } catch (_error) {
          // Bei Fehler diesen Token ueberspringen, weiter pruefen
        }
      }

      return false;
    } catch (_error) {
      // Bei jedem Fehler: Token ungueltig
      return false;
    }
  }

  /**
   * Erstellt eine minimale Health-Response fuer unauthentifizierte Requests.
   *
   * **Security:** Gibt IMMER 'ok' als Status zurueck um keine Database-Informationen
   * an unauthentifizierte Clients zu leaken. Der tatsaechliche DB-Status ist nur
   * in der authentifizierten DetailedHealthDto Response sichtbar.
   *
   * Enthaelt nur oeffentliche Informationen:
   * - status: IMMER 'ok' (keine Information Disclosure!)
   * - setupComplete: Admin + Token vorhanden?
   * - version: Server-Version aus package.json
   * @returns {Promise<BasicHealthDto>} Minimale Health-Information
   */
  private async getBasicHealth(): Promise<BasicHealthDto> {
    const setupComplete = await this.isSetupComplete();

    return {
      // Security: Immer 'ok' zurueckgeben, keine DB-Status Information leaken
      // AC1 fordert: "keine weiteren System-Informationen werden preisgegeben"
      status: 'ok',
      setupComplete,
      // Version dynamisch aus package.json (via npm_package_version)
      version: process.env.npm_package_version ?? '0.0.0-unknown',
    };
  }

  /**
   * Erstellt eine erweiterte Health-Response fuer authentifizierte Requests.
   *
   * Diese Methode wird nur aufgerufen wenn ein gueltiger X-Server-Access-Token
   * im Request Header vorhanden ist. Enthaelt sensible Systeminformationen:
   *
   * - status: Tatsaechlicher DB-Verbindungsstatus
   * - setupComplete: Admin + Token vorhanden?
   * - version: Server-Version
   * - database: 'connected' | 'disconnected'
   * - uptime: Server-Uptime in Sekunden (process.uptime())
   * - memory: Heap und RSS Metriken (optional)
   * - loadAverage: CPU Load Average [1m, 5m, 15m] (optional)
   *
   * @returns {Promise<DetailedHealthDto>} Erweiterte Health-Information
   */
  private async getDetailedHealth(): Promise<DetailedHealthDto> {
    const setupComplete = await this.isSetupComplete();

    // Database-Status pruefen
    let dbConnected = false;
    try {
      await this.prismaDb.pingCheck('database');
      dbConnected = true;
    } catch (_error) {
      dbConnected = false;
    }

    // Memory-Metriken sammeln
    const memUsage = process.memoryUsage();

    return {
      status: dbConnected ? 'ok' : 'error',
      setupComplete,
      version: process.env.npm_package_version ?? '0.0.0-unknown',
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
      },
      loadAverage: os.loadavg(),
    };
  }
}
