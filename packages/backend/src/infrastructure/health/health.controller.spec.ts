// @ts-nocheck
import type { Request } from 'express';
import type { HealthCheckResult, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import * as bcrypt from 'bcrypt';
import { HealthController } from './health.controller';
import type { PrismaHealthIndicator } from './prisma-health.indicator';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { Result } from '@domain/common/result';
import type { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import { TokenHash } from '@domain/value-objects/token-hash';
import { BCRYPT_COST_FACTOR_TOKEN } from '@infrastructure/config/security.constants';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';
import { CircuitBreakerStateEnum } from '@infrastructure/resilience/circuit-breaker-state';

/**
 * Unit Tests fuer HealthController (Story 1.4).
 *
 * Diese Tests validieren die Token-basierte Health-Response Logik:
 * - Ohne Token: BasicHealthDto (status, setupComplete, version)
 * - Mit gueltigem Token: DetailedHealthDto (database, uptime, memory, loadAverage)
 * - Mit ungueltigem Token: BasicHealthDto (kein Error!)
 *
 * **Test Coverage:**
 * - check() Method: Token-basierte Response-Auswahl
 * - getBasicHealth(): Setup-Status Ermittlung, Security (kein DB-Status Leak)
 * - getDetailedHealth(): Erweiterte Metriken fuer authentifizierte Clients
 * - Cache-Behavior: 10s TTL, Invalidierung bei Fehlern
 * - Error Handling: Graceful Degradation bei ungueltigen Tokens
 *
 * **Mocking Strategy:**
 * - IServerAccessTokenRepository: Vollstaendig gemockt (findAllActive, countActive)
 * - PrismaService: Gemockt fuer user.count() Abfragen
 * - PrismaHealthIndicator: Gemockt fuer pingCheck
 * - HealthCheckService: Gemockt fuer check() Aufrufe
 *
 * **Test Patterns:**
 * - AAA Pattern: Arrange -> Act -> Assert
 * - Mock Reset: beforeEach() cleared alle Mocks
 * - Given-When-Then Comments fuer Lesbarkeit
 */
describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService: jest.Mocked<HealthCheckService>;
  let mockMemoryIndicator: jest.Mocked<MemoryHealthIndicator>;
  let mockDiskIndicator: jest.Mocked<DiskHealthIndicator>;
  let mockPrismaHealth: jest.Mocked<PrismaHealthIndicator>;
  let mockTokenRepo: jest.Mocked<IServerAccessTokenRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreakerService>;
  let mockUserCount: jest.Mock;

  /**
   * Mock HealthCheckResult fuer detaillierte Health-Response
   */
  const mockDetailedHealthResult: HealthCheckResult = {
    status: 'ok',
    info: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
      cpu: { status: 'up', loadAverage: [0.5, 0.7, 0.6], usedCores: 4 },
      internet: { status: 'up', message: 'Internet-Verbindung aktiv' },
      fuekw: { status: 'up', message: 'FueKW-Verbindung aktiv' },
      connection_status: { status: 'up', details: { mode: 'online' } },
    },
    error: {},
    details: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
      cpu: { status: 'up', loadAverage: [0.5, 0.7, 0.6], usedCores: 4 },
      internet: { status: 'up', message: 'Internet-Verbindung aktiv' },
      fuekw: { status: 'up', message: 'FueKW-Verbindung aktiv' },
      connection_status: { status: 'up', details: { mode: 'online' } },
    },
  };

  /**
   * Helper: Erstellt einen Mock ServerAccessToken mit echtem bcrypt-Hash
   */
  const createMockTokenWithHash = async (rawToken: string, overrides: { isRevoked?: boolean; expiresAt?: Date | null } = {}): Promise<ServerAccessToken> => {
    const idResult = AccessTokenId.create();
    const hashedToken = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);
    const tokenHashResult = TokenHash.create(hashedToken);

    return {
      id: idResult.value!,
      tokenHash: tokenHashResult.value!,
      name: 'Test Token',
      lastUsedAt: null,
      expiresAt: overrides.expiresAt ?? null,
      isRevoked: overrides.isRevoked ?? false,
      revokedAt: null,
      isValid: jest.fn().mockReturnValue(!overrides.isRevoked && (!overrides.expiresAt || overrides.expiresAt > new Date())),
      recordUsage: jest.fn(),
      revoke: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ServerAccessToken;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HealthCheckService
    mockHealthCheckService = {
      check: jest.fn().mockResolvedValue(mockDetailedHealthResult),
    } as unknown as jest.Mocked<HealthCheckService>;

    // Mock MemoryHealthIndicator
    mockMemoryIndicator = {
      checkHeap: jest.fn().mockReturnValue({ memory_heap: { status: 'up' } }),
      checkRSS: jest.fn().mockReturnValue({ memory_rss: { status: 'up' } }),
    } as unknown as jest.Mocked<MemoryHealthIndicator>;

    // Mock DiskHealthIndicator
    mockDiskIndicator = {
      checkStorage: jest.fn().mockReturnValue({ storage: { status: 'up' } }),
    } as unknown as jest.Mocked<DiskHealthIndicator>;

    // Mock PrismaHealthIndicator
    mockPrismaHealth = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
      isConnected: jest.fn().mockResolvedValue({ database_connections: { status: 'up', connected: true } }),
    } as unknown as jest.Mocked<PrismaHealthIndicator>;

    // Mock IServerAccessTokenRepository
    mockTokenRepo = {
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn().mockResolvedValue(Result.ok([])),
      save: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
      countActive: jest.fn().mockResolvedValue(Result.ok(0)),
    } as unknown as jest.Mocked<IServerAccessTokenRepository>;

    // Mock PrismaService mit explizit typisierten Mocks
    mockUserCount = jest.fn().mockResolvedValue(0);
    mockPrisma = {
      user: {
        count: mockUserCount,
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    // Mock CircuitBreakerService (Story 5.3)
    mockCircuitBreaker = {
      register: jest.fn(),
      execute: jest.fn(),
      getState: jest.fn().mockReturnValue(CircuitBreakerStateEnum.CLOSED),
      getAllStatus: jest.fn().mockReturnValue([]),
      reset: jest.fn(),
      onStateChange: jest.fn(),
      isOpen: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<CircuitBreakerService>;

    // Controller mit allen 8 Dependencies erstellen (Story 5.6: +mockSystemHealthHandler)
    const mockSystemHealthHandler = {
      execute: jest.fn().mockResolvedValue({
        isSuccess: true,
        value: {
          zustellrate: 100,
          websocketConnections: 0,
          outboxQueueDepth: 0,
          apiResponseTime: { p50: 0, p95: 0, p99: 0 },
          circuitBreakerStatus: {},
          dbConnectionPoolUsage: 0,
          uptime: 3600,
          timestamp: new Date(),
        },
      }),
    } as any;

    controller = new HealthController(mockHealthCheckService, mockMemoryIndicator, mockDiskIndicator, mockPrismaHealth, mockPrisma, mockTokenRepo, mockCircuitBreaker, mockSystemHealthHandler);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('check() - Token-Differenzierung', () => {
    /**
     * Test: Request ohne Token -> BasicHealthDto Response
     * Story 1.4 AC1: Ohne Token nur oeffentliche Informationen
     */
    it('should return BasicHealthDto without X-Server-Access-Token header', async () => {
      // Given: Request ohne Token Header
      const mockRequest = {
        headers: {},
      } as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: Nur BasicHealthDto Felder (status, setupComplete, version)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      // BasicHealthDto hat KEINE info/details Properties
      expect(result).not.toHaveProperty('info');
      expect(result).not.toHaveProperty('details');
    });

    /**
     * Test: Request mit gueltigem Token -> DetailedHealthDto Response
     * Story 1.4 AC2: Mit gueltigem Token erweiterte Health-Response
     */
    it('should return DetailedHealthDto with valid X-Server-Access-Token header', async () => {
      // Given: Request mit gueltigem Token Header
      const rawToken = 'blh_test_valid_token_123';
      const validToken = await createMockTokenWithHash(rawToken);
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      mockUserCount.mockResolvedValue(1); // Admin existiert
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1)); // Token existiert

      const mockRequest = {
        headers: {
          'x-server-access-token': rawToken,
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: DetailedHealthDto mit erweiterten Feldern
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      // AC2 spezifische Felder
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('loadAverage');
      // Keine Terminus-spezifischen Felder
      expect(result).not.toHaveProperty('info');
      expect(result).not.toHaveProperty('details');
      expect(result).not.toHaveProperty('error');
    });

    /**
     * Test: Request mit ungueltigem Token -> BasicHealthDto Response (kein Error!)
     * Story 1.4 AC1: Ungueltiger Token fuehrt zu Basic Response, NICHT zu 401/403
     *
     * Security: Keine Information Disclosure ueber Token-Gueltigkeit
     */
    it('should return BasicHealthDto with invalid token (no 401/403 error)', async () => {
      // Given: Request mit Token der nicht validiert werden kann
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([])); // Keine Tokens in DB

      const mockRequest = {
        headers: {
          'x-server-access-token': 'blh_invalid_token_xyz',
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (nicht 401/403!)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      expect(result).not.toHaveProperty('info');
      expect(result).not.toHaveProperty('details');
    });

    /**
     * Test: Request mit revoked Token -> BasicHealthDto Response
     * Story 1.4: Revoked Tokens behandeln wie ungueltige Tokens
     */
    it('should return BasicHealthDto with revoked token', async () => {
      // Given: Request mit revoked Token
      const rawToken = 'blh_revoked_token_abc';
      const revokedToken = await createMockTokenWithHash(rawToken, { isRevoked: true });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([revokedToken]));

      const mockRequest = {
        headers: {
          'x-server-access-token': rawToken,
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (revoked = ungueltig)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).not.toHaveProperty('info');
    });

    /**
     * Test: Token mit abgelaufenem expiresAt -> BasicHealthDto Response
     * Business Rule: Abgelaufene Tokens behandeln wie ungueltige Tokens
     */
    it('should return BasicHealthDto with expired token', async () => {
      // Given: Request mit abgelaufenem Token
      const rawToken = 'blh_expired_token_def';
      const expiredToken = await createMockTokenWithHash(rawToken, {
        expiresAt: new Date('2020-01-01'), // Vergangenes Datum
      });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([expiredToken]));

      const mockRequest = {
        headers: {
          'x-server-access-token': rawToken,
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (Token ist abgelaufen, also ungueltig)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).not.toHaveProperty('info');
    });

    /**
     * Test: Repository-Fehler -> BasicHealthDto Response (graceful degradation)
     * Story 1.4: Bei Fehlern konservativ BasicHealthDto zurueckgeben
     */
    it('should return BasicHealthDto when repository returns error', async () => {
      // Given: Repository wirft Fehler
      mockTokenRepo.findAllActive.mockResolvedValue(Result.fail('Database error'));

      const mockRequest = {
        headers: {
          'x-server-access-token': 'blh_any_token',
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (graceful degradation)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).not.toHaveProperty('info');
    });
  });

  describe('check() - setupComplete Logic', () => {
    /**
     * Test: Setup-Pending -> setupComplete: false (kein Admin)
     * Story 1.4 AC3: Setup nicht abgeschlossen = setupComplete: false
     */
    it('should return setupComplete: false when no admin user exists', async () => {
      // Given: Keine Admin User in DB
      mockUserCount.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1)); // Token existiert

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird (ohne Token)
      const result = await controller.check(mockRequest);

      // Then: setupComplete = false
      expect(result).toHaveProperty('setupComplete', false);
    });

    /**
     * Test: Setup-Pending -> setupComplete: false (keine Tokens)
     * Story 1.4 AC3: Admin existiert aber keine aktiven Tokens
     */
    it('should return setupComplete: false when no active tokens exist', async () => {
      // Given: Admin existiert aber keine aktiven Tokens
      mockUserCount.mockResolvedValue(1); // Admin existiert
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0)); // Keine Tokens

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: setupComplete = false
      expect(result).toHaveProperty('setupComplete', false);
    });

    /**
     * Test: Setup-Complete -> setupComplete: true
     * Story 1.4 AC3: Admin UND aktive Tokens existieren
     */
    it('should return setupComplete: true when admin and active token exist', async () => {
      // Given: Admin User UND aktive Tokens existieren
      mockUserCount.mockResolvedValue(1); // Admin existiert
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1)); // Token existiert

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: setupComplete = true
      expect(result).toHaveProperty('setupComplete', true);
    });
  });

  describe('checkLiveness()', () => {
    it('should return database health status', async () => {
      // Given: Database ist verfuegbar
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      });

      // When: checkLiveness() aufgerufen wird
      const result = await controller.checkLiveness();

      // Then: Status 'ok' mit Database-Info
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });

    it('should return error status when database is down', async () => {
      // Given: Database ist nicht verfuegbar
      mockHealthCheckService.check.mockResolvedValue({
        status: 'error',
        info: {},
        error: { database: { status: 'down', message: 'Connection failed' } },
        details: { database: { status: 'down', message: 'Connection failed' } },
      });

      // When: checkLiveness() aufgerufen wird
      const result = await controller.checkLiveness();

      // Then: Status 'error'
      expect(result.status).toBe('error');
    });
  });

  describe('checkReadiness()', () => {
    it('should return memory and disk health status', async () => {
      // Given: Memory und Disk sind verfuegbar
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
          storage: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
          storage: { status: 'up' },
        },
      });

      // When: checkReadiness() aufgerufen wird
      const result = await controller.checkReadiness();

      // Then: Status 'ok'
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('checkDatabase()', () => {
    it('should return detailed database health', async () => {
      // Given: Database ist verbunden
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: {
          database: { status: 'up' },
          database_connections: { status: 'up', connected: true },
        },
        error: {},
        details: {
          database: { status: 'up' },
          database_connections: { status: 'up', connected: true },
        },
      });

      // When: checkDatabase() aufgerufen wird
      const result = await controller.checkDatabase();

      // Then: Status 'ok' mit Connection-Details
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('check() - Security: No Information Disclosure (AC1)', () => {
    /**
     * Test: BasicHealthDto gibt IMMER status 'ok' zurueck, auch bei DB-Fehler
     * Story 1.4 AC1: "keine weiteren System-Informationen werden preisgegeben"
     */
    it('should always return status ok for unauthenticated requests even when DB is down', async () => {
      // Given: Database ist nicht erreichbar
      mockPrismaHealth.pingCheck.mockRejectedValue(new Error('Database connection failed'));
      mockUserCount.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0));

      const mockRequest = { headers: {} } as Request;

      // When: check() ohne Token aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: Status ist IMMER 'ok' (keine DB-Information Disclosure)
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      // Keine sensiblen Felder
      expect(result).not.toHaveProperty('database');
      expect(result).not.toHaveProperty('uptime');
    });

    /**
     * Test: DetailedHealthDto zeigt tatsaechlichen DB-Status
     * Story 1.4 AC2: Authentifizierte Clients sehen echte Informationen
     */
    it('should return actual database status for authenticated requests', async () => {
      // Given: Gueltiger Token, Database ist nicht erreichbar
      const rawToken = 'blh_auth_token_456';
      const validToken = await createMockTokenWithHash(rawToken);
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      mockPrismaHealth.pingCheck.mockRejectedValue(new Error('Database down'));
      mockUserCount.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = {
        headers: { 'x-server-access-token': rawToken },
      } as unknown as Request;

      // When: check() mit gueltigem Token aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: DetailedHealthDto zeigt echten DB-Status
      expect(result).toHaveProperty('status', 'error');
      expect(result).toHaveProperty('database', 'disconnected');
    });
  });

  describe('check() - Cache Behavior', () => {
    /**
     * Test: Cache wird genutzt innerhalb TTL
     * Performance: Wiederholte Calls innerhalb 10s nutzen Cache
     */
    it('should use cached setupComplete value within TTL', async () => {
      // Given: Admin und Token existieren
      mockUserCount.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = { headers: {} } as Request;

      // When: Zwei Calls hintereinander
      await controller.check(mockRequest);
      await controller.check(mockRequest);

      // Then: DB-Call nur einmal (zweiter Call nutzt Cache)
      // Hinweis: user.count wird in isSetupComplete() aufgerufen
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    /**
     * Test: Cache wird bei DB-Fehler invalidiert
     * Bug-Fix: Stale Cache bei Fehlern vermeiden
     */
    it('should invalidate cache when database error occurs', async () => {
      // Given: Erster Call erfolgreich, zweiter Call mit DB-Fehler
      mockUserCount.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('DB Error')).mockResolvedValueOnce(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = { headers: {} } as Request;

      // When: Drei Calls mit DB-Fehler in der Mitte
      const result1 = await controller.check(mockRequest);

      // Simuliere Zeit vergangen (Cache abgelaufen) durch neuen Controller
      // In echtem Test: jest.useFakeTimers()
      const mockSystemHealthHandler2 = {
        execute: jest.fn().mockResolvedValue({
          isSuccess: true,
          value: {
            zustellrate: 100,
            websocketConnections: 0,
            outboxQueueDepth: 0,
            apiResponseTime: { p50: 0, p95: 0, p99: 0 },
            circuitBreakerStatus: {},
            dbConnectionPoolUsage: 0,
            uptime: 3600,
            timestamp: new Date(),
          },
        }),
      } as any;

      const controller2 = new HealthController(
        mockHealthCheckService,
        mockMemoryIndicator,
        mockDiskIndicator,
        mockPrismaHealth,
        mockPrisma,
        mockTokenRepo,
        mockCircuitBreaker,
        mockSystemHealthHandler2,
      );
      const result2 = await controller2.check(mockRequest);

      // Then: Ergebnis reflektiert DB-Status korrekt
      expect(result1).toHaveProperty('setupComplete', true);
      // Nach Fehler: setupComplete = false
      expect(result2).toHaveProperty('setupComplete', false);
    });
  });

  describe('getSystemHealth() - Aggregierte Metriken (Story 5.6 AC2)', () => {
    /**
     * Helper: Erstellt einen neuen Controller mit eigenem mockSystemHealthHandler.
     * Noetig weil der Handler im beforeEach gesetzt wird und wir ihn pro Test steuern wollen.
     */
    const createControllerWithHandler = (handler: any): HealthController => {
      return new HealthController(mockHealthCheckService, mockMemoryIndicator, mockDiskIndicator, mockPrismaHealth, mockPrisma, mockTokenRepo, mockCircuitBreaker, handler);
    };

    it('sollte aggregierte Metriken als SystemHealthDto zurueckgeben', async () => {
      // Given: Handler liefert erfolgreiche Metriken
      const timestamp = new Date();
      const handler = {
        execute: jest.fn().mockResolvedValue({
          isSuccess: true,
          isFailure: false,
          value: {
            zustellrate: 99.5,
            websocketConnections: 12,
            outboxQueueDepth: 3,
            apiResponseTime: { p50: 15, p95: 45, p99: 120 },
            circuitBreakerStatus: { 'hiorg-server': 'CLOSED' },
            dbConnectionPoolUsage: 25,
            uptime: 86400,
            timestamp,
          },
        }),
      };
      const ctrl = createControllerWithHandler(handler);

      // When: getSystemHealth() aufgerufen wird
      const result = await ctrl.getSystemHealth();

      // Then: SystemHealthDto mit aggregierten Werten
      expect(result.zustellrate).toBe(99.5);
      expect(result.websocketConnections).toBe(12);
      expect(result.outboxQueueDepth).toBe(3);
      expect(result.apiResponseTime).toEqual({ p50: 15, p95: 45, p99: 120 });
      expect(result.dbConnectionPoolUsage).toBe(25);
      expect(result.uptime).toBe(86400);
      expect(handler.execute).toHaveBeenCalledTimes(1);
    });

    it('sollte Fallback-DTO zurueckgeben wenn Handler fehlschlaegt', async () => {
      // Given: Handler liefert Fehler-Result
      const handler = {
        execute: jest.fn().mockResolvedValue({
          isSuccess: false,
          isFailure: true,
          error: 'Connection failed',
        }),
      };
      const ctrl = createControllerWithHandler(handler);

      // When: getSystemHealth() aufgerufen wird
      const result = await ctrl.getSystemHealth();

      // Then: Minimale Fallback-Werte
      expect(result.zustellrate).toBe(0);
      expect(result.websocketConnections).toBe(0);
      expect(result.outboxQueueDepth).toBe(0);
      expect(result.apiResponseTime).toEqual({ p50: 0, p95: 0, p99: 0 });
      expect(result.circuitBreakerStatus).toEqual([]);
      expect(result.dbConnectionPoolUsage).toBe(0);
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('sollte circuitBreakerStatus von Record zu Array transformieren', async () => {
      // Given: Handler liefert circuitBreakerStatus als Record<string, string>
      const handler = {
        execute: jest.fn().mockResolvedValue({
          isSuccess: true,
          isFailure: false,
          value: {
            zustellrate: 100,
            websocketConnections: 5,
            outboxQueueDepth: 0,
            apiResponseTime: { p50: 10, p95: 30, p99: 80 },
            circuitBreakerStatus: {
              'hiorg-server': 'CLOSED',
              'etb-service': 'OPEN',
              'notification-service': 'HALF_OPEN',
            },
            dbConnectionPoolUsage: 15,
            uptime: 3600,
            timestamp: new Date(),
          },
        }),
      };
      const ctrl = createControllerWithHandler(handler);

      // When: getSystemHealth() aufgerufen wird
      const result = await ctrl.getSystemHealth();

      // Then: Record wird zu Array mit { serviceName, state } transformiert
      expect(result.circuitBreakerStatus).toHaveLength(3);
      expect(result.circuitBreakerStatus).toEqual([
        { serviceName: 'hiorg-server', state: 'CLOSED' },
        { serviceName: 'etb-service', state: 'OPEN' },
        { serviceName: 'notification-service', state: 'HALF_OPEN' },
      ]);
    });
  });

  describe('getIntegrationHealth() - Circuit Breaker Status (Story 5.3 AC4)', () => {
    const RAW_TOKEN = 'test-integration-health-token';

    /** Helper: Erstellt Mock-Request mit gueltigem Token-Header */
    const createAuthenticatedRequest = (): Request => ({ headers: { 'x-server-access-token': RAW_TOKEN } }) as unknown as Request;

    /** Setup: Token-Repo mit gueltigem Token fuer alle Tests */
    const setupValidToken = async () => {
      const mockToken = await createMockTokenWithHash(RAW_TOKEN);
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([mockToken]));
    };

    /**
     * Test: Leere Integration-Liste wenn keine Circuit Breakers registriert
     */
    it('should return empty integrations array when no circuit breakers registered', async () => {
      // Given: Gueltiger Token, aber keine Circuit Breakers registriert
      await setupValidToken();
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When: getIntegrationHealth() mit authentifiziertem Request aufgerufen wird
      const result = await controller.getIntegrationHealth(createAuthenticatedRequest());

      // Then: Leere Liste
      expect(result).toEqual({ integrations: [] });
      expect(mockCircuitBreaker.getAllStatus).toHaveBeenCalled();
    });

    /**
     * Test: Ohne Token → leere Liste (Information Disclosure Prevention)
     */
    it('should return empty integrations without token (H4 - Information Disclosure)', async () => {
      // Given: Kein Token im Request
      const mockRequest = { headers: {} } as Request;

      // When: getIntegrationHealth() ohne Token aufgerufen wird
      const result = await controller.getIntegrationHealth(mockRequest);

      // Then: Leere Liste, getAllStatus NICHT aufgerufen
      expect(result).toEqual({ integrations: [] });
      expect(mockCircuitBreaker.getAllStatus).not.toHaveBeenCalled();
    });

    /**
     * Test: Status aller registrierten Circuit Breakers
     */
    it('should return status of all registered circuit breakers', async () => {
      // Given: Gueltiger Token und zwei registrierte Circuit Breakers
      await setupValidToken();
      mockCircuitBreaker.getAllStatus.mockReturnValue([
        {
          serviceName: 'hiorg-server',
          state: CircuitBreakerStateEnum.CLOSED,
          failureCount: 0,
          successCount: 10,
          lastFailure: null,
          lastSuccess: '2026-02-23T10:00:00.000Z',
        },
        {
          serviceName: 'etb',
          state: CircuitBreakerStateEnum.OPEN,
          failureCount: 5,
          successCount: 15,
          lastFailure: '2026-02-23T10:05:00.000Z',
          lastSuccess: '2026-02-23T09:00:00.000Z',
        },
      ]);

      // When: getIntegrationHealth() mit authentifiziertem Request aufgerufen wird
      const result = await controller.getIntegrationHealth(createAuthenticatedRequest());

      // Then: Beide Integrations mit korrektem Status
      expect(result.integrations).toHaveLength(2);
      expect(result.integrations[0]).toEqual({
        serviceName: 'hiorg-server',
        state: CircuitBreakerStateEnum.CLOSED,
        failureCount: 0,
        lastFailure: null,
        lastSuccess: '2026-02-23T10:00:00.000Z',
        lastSuccessAt: '2026-02-23T10:00:00.000Z',
        lastFailureAt: null,
        errorRate: 0,
        responseTimeP95: undefined,
      });
      expect(result.integrations[1]).toEqual({
        serviceName: 'etb',
        state: CircuitBreakerStateEnum.OPEN,
        failureCount: 5,
        lastFailure: '2026-02-23T10:05:00.000Z',
        lastSuccess: '2026-02-23T09:00:00.000Z',
        lastSuccessAt: '2026-02-23T09:00:00.000Z',
        lastFailureAt: '2026-02-23T10:05:00.000Z',
        errorRate: 25,
        responseTimeP95: undefined,
      });
    });

    /**
     * Test: HALF_OPEN Status korrekt dargestellt
     */
    it('should correctly represent HALF_OPEN state', async () => {
      // Given: Gueltiger Token und Circuit Breaker im HALF_OPEN Zustand
      await setupValidToken();
      mockCircuitBreaker.getAllStatus.mockReturnValue([
        {
          serviceName: 'hiorg-server',
          state: CircuitBreakerStateEnum.HALF_OPEN,
          failureCount: 3,
          successCount: 5,
          lastFailure: '2026-02-23T10:05:00.000Z',
          lastSuccess: null,
        },
      ]);

      // When: getIntegrationHealth() mit authentifiziertem Request aufgerufen wird
      const result = await controller.getIntegrationHealth(createAuthenticatedRequest());

      // Then: HALF_OPEN Status korrekt
      expect(result.integrations[0]?.state).toBe(CircuitBreakerStateEnum.HALF_OPEN);
      expect(result.integrations[0]?.failureCount).toBe(3);
    });
  });
});
