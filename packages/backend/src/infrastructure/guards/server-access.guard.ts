import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Reflector ist Injectable Class - wird zur Laufzeit fuer NestJS DI benoetigt
import { Reflector } from '@nestjs/core';
// biome-ignore lint/style/useImportType: ConfigService ist Injectable Class - wird zur Laufzeit fuer NestJS DI benoetigt
import { ConfigService } from '@nestjs/config';
// biome-ignore lint/style/useImportType: EventEmitter2 ist Injectable Class - wird zur Laufzeit fuer NestJS DI benoetigt
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { IServerConfigRepository } from '@domain/repositories/i-server-config.repository';
import type { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { LOGGER, SERVER_ACCESS_TOKEN_REPOSITORY, SERVER_CONFIG_REPOSITORY } from '@/infrastructure/di-tokens';
import { SKIP_SERVER_ACCESS_KEY } from '../decorators/skip-server-access.decorator';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Guard zur Validierung von Server-Access-Tokens.
 *
 * Prueft den `X-Server-Access-Token` Header gegen die Datenbank.
 * Aktualisiert `lastUsedAt` asynchron bei gueltigem Token.
 *
 * ## OpenAPI Header-Spezifikation
 *
 * **Header:** `X-Server-Access-Token`
 * **Format:** `X-Server-Access-Token: <plaintext_token>`
 * **Beispiel:** `X-Server-Access-Token: bh_abc123def456...`
 *
 * ## Multi-Token Support
 *
 * Das System unterstuetzt mehrere gleichzeitig aktive Tokens:
 * - Jedes Token hat einen eindeutigen Namen (z.B. "Desktop Hauptwache")
 * - `lastUsedAt` wird bei jeder erfolgreichen Validierung aktualisiert
 * - Tokens koennen individuell deaktiviert/reaktiviert werden
 * - Bei Rotation wird ein neues Token generiert, das alte deaktiviert
 *
 * ## Guard-Reihenfolge (zwischen Guards)
 *
 * ThrottlerGuard → ServerAccessGuard → JwtAuthGuard (per Endpoint)
 *
 * ## Check-Reihenfolge (innerhalb canActivate)
 *
 * 1. `@SkipServerAccess` Decorator Check (hoechste Prioritaet, sofort return)
 * 2. DB-Config Check: `ServerConfig.insecureMode` (Prioritaet 1)
 * 3. Fallback: `INSECURE_MODE` ENV Variable (Prioritaet 2, nur wenn kein DB-Eintrag/DB-Fehler)
 * 4. Token-Extraktion aus `X-Server-Access-Token` Header
 * 5. Token-Validierung gegen alle aktiven Hashes (bcrypt.compare)
 * 6. lastUsedAt Update (asynchron, non-blocking)
 *
 * ## Rationale
 *
 * - ThrottlerGuard zuerst: Verhindert DoS bevor teure bcrypt-Operationen
 * - ServerAccessGuard zweiter: Globale Server-Authentifizierung via Token
 * - JwtAuthGuard per Endpoint: Optionale User-Authentifizierung
 *
 * ## Bypass
 *
 * - Endpoints mit `@SkipServerAccess()` Decorator ueberspringen die Pruefung
 * - `ServerConfig.insecureMode=true` in DB deaktiviert Token-Validierung (Prioritaet 1)
 * - `INSECURE_MODE=true` ENV Variable als Fallback (Prioritaet 2, nur bei DB-Fehler/kein DB-Eintrag)
 *
 * ## Security
 *
 * - Token-Hashes werden mit bcrypt.compare() timing-safe validiert
 * - Tokens werden NIEMALS vollstaendig geloggt (nur erste 8 Zeichen bei Fehlern)
 * - lastUsedAt Update erfolgt asynchron (non-blocking)
 * - INSECURE_MODE ist standardmaessig false (Secure-by-Default)
 * - INSECURE_MODE in Production fuehrt zu sofortigem App-Crash (siehe main.ts)
 */
@Injectable()
export class ServerAccessGuard implements CanActivate {
  constructor(
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IServerAccessTokenRepository,
    @Inject(SERVER_CONFIG_REPOSITORY)
    private readonly serverConfigRepo: IServerConfigRepository,
    private readonly reflector: Reflector,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check @SkipServerAccess decorator (Klasse oder Methode)
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SERVER_ACCESS_KEY, [context.getHandler(), context.getClass()]);
    if (skipCheck) {
      return true;
    }

    // 2. Check insecure mode (DB-Config hat Prioritaet ueber ENV)
    const isInsecure = await this.checkInsecureMode();
    if (isInsecure) {
      return true;
    }

    // 3. Extract token from header
    const request = context.switchToHttp().getRequest();
    const rawToken = request.headers['x-server-access-token'] as string | undefined;

    if (!rawToken) {
      throw new UnauthorizedException('Server access token required');
    }

    // 4. Validate token against all active tokens
    const validToken = await this.validateToken(rawToken);
    if (!validToken) {
      const maskedPrefix = rawToken.length >= 8 ? rawToken.substring(0, 8) : rawToken.substring(0, Math.floor(rawToken.length / 2));
      this.logger.warn(`ServerAccessGuard: Invalid token attempt (prefix: ${maskedPrefix}...)`);
      throw new UnauthorizedException('Invalid or revoked server access token');
    }

    // 5. Update lastUsedAt asynchronously (non-blocking)
    this.updateLastUsedAsync(validToken);

    this.logger.debug(`ServerAccessGuard: Token ${validToken.id.value} validated`);
    return true;
  }

  /**
   * Prueft ob der Server im INSECURE Mode laeuft.
   *
   * **Prioritaetsreihenfolge:**
   * 1. DB-Config (ServerConfig.insecureMode) - hoechste Prioritaet
   * 2. ENV Variable (INSECURE_MODE) - Fallback bei DB-Fehler oder fehlendem Eintrag
   *
   * **Sicherheitshinweise:**
   * - KEIN Caching: Security-Entscheidungen werden IMMER live aus DB gelesen
   * - Bei DB-Fehlern: Fallback auf ENV (Backward Compatibility)
   * - Separate Warnings fuer DB-Config vs ENV Bypass
   *
   * **Rationale fuer Fallback:**
   * - Backward Compatibility: Bestehende Deployments ohne DB-Config funktionieren weiterhin
   * - Graceful Degradation: DB-Ausfaelle blockieren nicht komplett
   * - Migration: Erlaubt schrittweise Migration von ENV zu DB-Config
   *
   * @returns true wenn INSECURE Mode aktiv (Token-Validierung wird uebersprungen)
   */
  private async checkInsecureMode(): Promise<boolean> {
    // Prioritaet 1: DB-Config abfragen
    const dbConfigResult = await this.serverConfigRepo.isInsecureMode();

    if (dbConfigResult.isSuccess) {
      // DB-Config existiert - diese hat Prioritaet ueber ENV
      const isInsecureFromDb = dbConfigResult.value!;
      if (isInsecureFromDb) {
        this.logger.warn('ServerAccessGuard: INSECURE_MODE enabled via DB config - bypassing token validation');
        return true;
      }
      // DB sagt insecureMode=false -> Token erforderlich
      return false;
    }

    // DB-Fehler: Log und Fallback auf ENV
    this.logger.warn(`ServerAccessGuard: Failed to read DB config (${dbConfigResult.error}), falling back to ENV`);

    // Prioritaet 2: Fallback auf INSECURE_MODE ENV Variable
    const insecureModeEnv = this.configService.get<string>('INSECURE_MODE') === 'true';
    if (insecureModeEnv) {
      this.logger.warn('ServerAccessGuard: INSECURE_MODE enabled via ENV fallback - bypassing token validation');
      return true;
    }

    return false;
  }

  /**
   * Validiert Klartext-Token gegen alle aktiven Token-Hashes.
   *
   * Iteriert ueber alle aktiven Tokens und prueft mit bcrypt.compare().
   * Stoppt bei erstem Match UND isValid() = true (Performance-Optimierung).
   *
   * **Warum nicht Hash-Lookup?**
   * - bcrypt Hashes sind nicht deterministisch (salt)
   * - Deshalb muessen wir bcrypt.compare() gegen jeden gespeicherten Hash ausfuehren
   * - Performance: Bei wenigen aktiven Tokens (<100) ist das akzeptabel
   *
   * @param rawToken - Klartext-Token aus dem Request-Header
   * @returns ServerAccessToken bei Match, null sonst
   */
  private async validateToken(rawToken: string): Promise<ServerAccessToken | null> {
    const activeTokensResult = await this.tokenRepo.findAllActive();
    if (activeTokensResult.isFailure) {
      this.logger.error('ServerAccessGuard: Failed to fetch active tokens');
      return null;
    }

    const activeTokens = activeTokensResult.value!;
    for (const token of activeTokens) {
      try {
        const isMatch = await bcrypt.compare(rawToken, token.tokenHash.value);
        if (isMatch && token.isValid()) {
          return token;
        }
      } catch (_error) {
        // bcrypt error - skip this token, log error
        this.logger.error(`ServerAccessGuard: bcrypt error for token ${token.id.value}`);
      }
    }

    return null;
  }

  /**
   * Aktualisiert lastUsedAt asynchron (nicht blockierend).
   *
   * Fehler werden geloggt, aber der Request wird nicht blockiert.
   *
   * **Warum setImmediate() statt Promise.resolve().then():**
   * - Verzoegert Ausfuehrung bis nach aktuellem Event-Loop-Tick
   * - Garantiert dass HTTP Response gesendet wird BEVOR DB-Update startet
   * - Verhindert Race Conditions zwischen Response und DB-Write
   * - Request-Latenz wird nicht von lastUsedAt-Update beeinflusst
   *
   * **Event Emission:**
   * - recordUsage() fuegt Domain Event zur Aggregate hinzu
   * - Events werden VOR save() extrahiert und emittiert
   * - Repository.save() loescht Events nach Persistierung
   * - EventEmitter2 triggert asynchrone Event Handler
   *
   * @param token - Das validierte ServerAccessToken
   */
  private updateLastUsedAsync(token: ServerAccessToken): void {
    setImmediate(async () => {
      try {
        // 1. recordUsage() aktualisiert lastUsedAt und fuegt Domain Event hinzu
        token.recordUsage();

        // 2. Domain Events VOR save() extrahieren (save() loescht sie via clearDomainEvents)
        const domainEvents = token.getDomainEvents();

        // 3. Events emittieren (asynchron, non-blocking)
        // Hinweis: eventName() ist statisch, daher nutzen wir EVENT_NAMES direkt
        for (const event of domainEvents) {
          this.eventEmitter.emit(EVENT_NAMES.SERVER_ACCESS_TOKEN.USED, event);
        }

        // 4. Token speichern (loescht Domain Events nach erfolgreichem Save)
        const saveResult = await this.tokenRepo.save(token);
        if (saveResult.isFailure) {
          this.logger.error(`ServerAccessGuard: Failed to save lastUsedAt for ${token.id.value}: ${saveResult.error}`);
        }
      } catch (error) {
        this.logger.error(`ServerAccessGuard: Exception updating lastUsedAt for ${token.id.value}`, error instanceof Error ? error.stack : String(error));
      }
    });
  }
}
