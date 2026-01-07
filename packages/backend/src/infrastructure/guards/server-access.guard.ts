import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Reflector ist Injectable Class - wird zur Laufzeit fuer NestJS DI benoetigt
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { LOGGER, SERVER_ACCESS_TOKEN_REPOSITORY } from '@/infrastructure/di-tokens';
import { SKIP_SERVER_ACCESS_KEY } from '../decorators/skip-server-access.decorator';

/**
 * Guard zur Validierung von Server-Access-Tokens.
 *
 * Prueft den `X-Server-Access-Token` Header gegen die Datenbank.
 * Aktualisiert `lastUsedAt` asynchron bei gueltigem Token.
 *
 * **Guard-Reihenfolge:**
 * ThrottlerGuard → ServerAccessGuard → JwtAuthGuard (per Endpoint)
 *
 * **Rationale:**
 * - ThrottlerGuard zuerst: Verhindert DoS bevor teure bcrypt-Operationen
 * - ServerAccessGuard zweiter: Globale Server-Authentifizierung via Token
 * - JwtAuthGuard per Endpoint: Optionale User-Authentifizierung
 *
 * **Bypass:**
 * Endpoints mit `@SkipServerAccess()` Decorator ueberspringen die Pruefung.
 *
 * **Security:**
 * - Token-Hashes werden mit bcrypt.compare() timing-safe validiert
 * - Tokens werden NIEMALS vollstaendig geloggt (nur erste 8 Zeichen bei Fehlern)
 * - lastUsedAt Update erfolgt asynchron (non-blocking)
 */
@Injectable()
export class ServerAccessGuard implements CanActivate {
  constructor(
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IServerAccessTokenRepository,
    private readonly reflector: Reflector,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check @SkipServerAccess decorator (Klasse oder Methode)
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SERVER_ACCESS_KEY, [context.getHandler(), context.getClass()]);
    if (skipCheck) {
      return true;
    }

    // 2. Extract token from header
    const request = context.switchToHttp().getRequest();
    const rawToken = request.headers['x-server-access-token'] as string | undefined;

    if (!rawToken) {
      throw new UnauthorizedException('Server access token required');
    }

    // 3. Validate token against all active tokens
    const validToken = await this.validateToken(rawToken);
    if (!validToken) {
      const maskedPrefix = rawToken.length >= 8 ? rawToken.substring(0, 8) : rawToken.substring(0, Math.floor(rawToken.length / 2));
      this.logger.warn(`ServerAccessGuard: Invalid token attempt (prefix: ${maskedPrefix}...)`);
      throw new UnauthorizedException('Invalid or revoked server access token');
    }

    // 4. Update lastUsedAt asynchronously (non-blocking)
    this.updateLastUsedAsync(validToken);

    this.logger.debug(`ServerAccessGuard: Token ${validToken.id.value} validated`);
    return true;
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
   * @param token - Das validierte ServerAccessToken
   */
  private updateLastUsedAsync(token: ServerAccessToken): void {
    setImmediate(async () => {
      try {
        token.recordUsage();
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
