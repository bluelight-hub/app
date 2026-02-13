import { Inject, Injectable } from '@nestjs/common';

import { Result } from '@domain/common/result';
import { ILogger } from '@domain/ports/i-logger.port';
import { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { IServerConfigRepository } from '@domain/repositories/i-server-config.repository';

import { SERVER_ACCESS_TOKEN_REPOSITORY, SERVER_CONFIG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

import type { GetSecurityStatusQuery } from './get-security-status.query';
import type { SecurityStatusDto } from '../dto/security-status.dto';
import { SECURITY_ERROR_CODES } from '../errors/security-error.codes';

/**
 * Handler zum Abrufen des Security-Status des Servers.
 *
 * Laedt die Server-Konfiguration und zaehlt aktive Tokens um den
 * aktuellen Security-Status zu ermitteln.
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 * - DTO Mapping: ServerConfig + countActive -> SecurityStatusDto
 *
 * **Use Cases (Story 4.6):**
 * - AC1: INSECURE Mode Status abfragen
 * - AC5: Migration-Faehigkeit pruefen (canMigrate wenn INSECURE + Tokens vorhanden)
 * - AC6: Active Token Count fuer Migration-Entscheidung
 *
 * **Security Considerations:**
 * - Keine sensiblen Daten in Response (nur Counts und Flags)
 * - Audit-Trail loggt anfragenden Admin
 *
 * @example
 * ```typescript
 * const query = GetSecurityStatusQuery.create({
 *   requestedById: 'admin_123',
 * }).value!;
 *
 * const result = await handler.execute(query);
 * if (result.isSuccess) {
 *   const status = result.value;
 *   if (status.canMigrate) {
 *     // Migration zu SECURE Mode moeglich
 *   }
 * }
 * ```
 */
@Injectable()
export class GetSecurityStatusHandler {
  constructor(
    @Inject(SERVER_CONFIG_REPOSITORY)
    private readonly configRepository: IServerConfigRepository,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Fuehrt die Query aus und gibt den Security-Status zurueck.
   *
   * **Ablauf:**
   * 1. Server-Konfiguration laden (getOrCreate)
   * 2. Anzahl aktiver Tokens zaehlen (countActive)
   * 3. SecurityStatusDto zusammenstellen
   * 4. Audit-Trail loggen
   * 5. Result mit SecurityStatusDto zurueckgeben
   *
   * **Fehlerbehandlung:**
   * - Config-Repository-Fehler -> Result.fail()
   * - Token-Repository-Fehler -> Result.fail()
   * - Unerwartete Fehler (try-catch) -> Result.fail()
   *
   * @param query - Validierte GetSecurityStatusQuery
   * @returns Result<SecurityStatusDto> - Success mit Status oder Failure
   */
  async execute(query: GetSecurityStatusQuery): Promise<Result<SecurityStatusDto>> {
    try {
      // ════════════════════════════════════════════════════════════════════════
      // 1. Server-Konfiguration laden
      // ════════════════════════════════════════════════════════════════════════
      const configResult = await this.configRepository.getOrCreate();

      if (configResult.isFailure) {
        this.logger.error(`Failed to load server config: ${configResult.error}`, 'GetSecurityStatusHandler');
        return Result.fail<SecurityStatusDto>(configResult.error ?? SECURITY_ERROR_CODES.CONFIG_NOT_FOUND);
      }

      const config = configResult.value;
      if (!config) {
        return Result.fail<SecurityStatusDto>(SECURITY_ERROR_CODES.CONFIG_NULL);
      }

      // ════════════════════════════════════════════════════════════════════════
      // 2. Anzahl aktiver Tokens zaehlen
      // ════════════════════════════════════════════════════════════════════════
      const countResult = await this.tokenRepository.countActive();

      if (countResult.isFailure) {
        this.logger.error(`Failed to count active tokens: ${countResult.error}`, 'GetSecurityStatusHandler');
        return Result.fail<SecurityStatusDto>(countResult.error ?? SECURITY_ERROR_CODES.TOKEN_COUNT_FAILED);
      }

      const activeTokenCount = countResult.value ?? 0;

      // ════════════════════════════════════════════════════════════════════════
      // 3. SecurityStatusDto zusammenstellen
      // - insecureMode: direkt aus Config
      // - setupComplete: true wenn mindestens 1 aktives Token existiert
      // - migratedAt: Migrationszeitpunkt (ISO-8601) oder null
      // ════════════════════════════════════════════════════════════════════════
      const setupComplete = activeTokenCount >= 1;

      const securityStatus: SecurityStatusDto = {
        insecureMode: config.insecureMode,
        setupComplete,
        activeTokenCount,
        migratedAt: config.migratedAt?.toISOString() ?? null,
      };

      // ════════════════════════════════════════════════════════════════════════
      // 4. Audit-Trail loggen
      // ════════════════════════════════════════════════════════════════════════
      this.logger.log(
        `Security status queried (insecureMode: ${config.insecureMode}, setupComplete: ${setupComplete}, activeTokens: ${activeTokenCount}, by: ${query.requestedById})`,
        'GetSecurityStatusHandler',
      );

      // ════════════════════════════════════════════════════════════════════════
      // 5. Result zurueckgeben
      // ════════════════════════════════════════════════════════════════════════
      return Result.ok<SecurityStatusDto>(securityStatus);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error in GetSecurityStatusHandler: ${errorMessage}`, 'GetSecurityStatusHandler');
      return Result.fail<SecurityStatusDto>(SECURITY_ERROR_CODES.STATUS_QUERY_FAILED);
    }
  }
}
