import { Inject, Injectable } from '@nestjs/common';

import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: ILogger wird fuer NestJS DI benoetigt
import { ILogger } from '@domain/ports/i-logger.port';
// biome-ignore lint/style/useImportType: IServerAccessTokenRepository wird fuer NestJS DI benoetigt
import { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';

import { SERVER_ACCESS_TOKEN_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

import type { GetTokenListQuery } from './get-token-list.query';
import type { TokenListDto } from '../dto/token-list.dto';
import type { TokenListItemDto, TokenStatus } from '../dto/token-list-item.dto';

/**
 * Handler zum Auflisten von Server-Access-Tokens mit Pagination.
 *
 * Laedt Tokens aus dem Repository, mappt sie zu DTOs und
 * loggt einen Audit-Trail fuer die Abfrage.
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 * - DTO Mapping: Domain Aggregate -> TokenListItemDto
 *
 * **Security Considerations:**
 * - Token-Hash wird NIEMALS in der Response zurückgegeben
 * - Nur der Prefix (blh_...) wird angezeigt
 * - Audit-Trail loggt anfragenden Admin
 *
 * @example
 * ```typescript
 * const query = GetTokenListQuery.create({
 *   page: 1,
 *   limit: 20,
 *   requestedById: 'admin_123',
 * }).value!;
 *
 * const result = await handler.execute(query);
 * if (result.isSuccess) {
 *   console.log(`${result.value.meta.total} Tokens gefunden`);
 * }
 * ```
 */
@Injectable()
export class GetTokenListHandler {
  constructor(
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Fuehrt die Query aus und gibt paginierte Tokens als DTOs zurueck.
   *
   * **Ablauf:**
   * 1. Repository-Abfrage mit Pagination
   * 2. Repository-Result pruefen
   * 3. Domain Aggregates zu DTOs mappen (OHNE Token-Hash!)
   * 4. Audit-Trail loggen
   * 5. Result mit TokenListDto zurueckgeben
   *
   * **Fehlerbehandlung:**
   * - Repository-Fehler -> Result.fail()
   * - Unerwartete Fehler (try-catch) -> Result.fail()
   * - Leeres Array ist KEIN Fehler sondern valides Resultat
   *
   * @param query - Validierte GetTokenListQuery
   * @returns Result<TokenListDto> - Success mit DTOs oder Failure
   */
  async execute(query: GetTokenListQuery): Promise<Result<TokenListDto>> {
    try {
      // ════════════════════════════════════════════════════════════════════════
      // 1. Repository-Abfrage mit Pagination
      // ════════════════════════════════════════════════════════════════════════
      const repositoryResult = await this.tokenRepository.findAllPaginated(query.page, query.limit);

      // ════════════════════════════════════════════════════════════════════════
      // 2. Repository-Result pruefen
      // ════════════════════════════════════════════════════════════════════════
      if (repositoryResult.isFailure) {
        this.logger.error(`Failed to list access tokens: ${repositoryResult.error}`, 'GetTokenListHandler');
        return Result.fail<TokenListDto>(repositoryResult.error ?? 'Failed to fetch tokens from repository');
      }

      const paginatedResult = repositoryResult.value;
      if (!paginatedResult) {
        return Result.fail<TokenListDto>('Unexpected null result from repository');
      }

      // ════════════════════════════════════════════════════════════════════════
      // 3. Domain Aggregates zu DTOs mappen (OHNE Token-Hash!)
      // ════════════════════════════════════════════════════════════════════════
      const items: TokenListItemDto[] = paginatedResult.items.map((token) => this.mapToListItemDto(token));

      // ════════════════════════════════════════════════════════════════════════
      // 4. Audit-Trail loggen
      // ════════════════════════════════════════════════════════════════════════
      this.logger.log(
        `Admin listed access tokens (count: ${items.length}, total: ${paginatedResult.total}, page: ${query.page}/${paginatedResult.totalPages}, by: ${query.requestedById})`,
        'GetTokenListHandler',
      );

      // ════════════════════════════════════════════════════════════════════════
      // 5. Result zusammenstellen
      // ════════════════════════════════════════════════════════════════════════
      const response: TokenListDto = {
        data: items,
        meta: {
          page: paginatedResult.page,
          pageSize: paginatedResult.pageSize,
          total: paginatedResult.total,
          totalPages: paginatedResult.totalPages,
        },
      };

      return Result.ok<TokenListDto>(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while listing access tokens';
      this.logger.error(`Unexpected error in GetTokenListHandler: ${errorMessage}`, 'GetTokenListHandler');
      return Result.fail<TokenListDto>(errorMessage);
    }
  }

  /**
   * Mappt ein ServerAccessToken Aggregate zu einem ListItem DTO.
   *
   * **Security:**
   * - Token-Hash wird NIEMALS in der Response zurückgegeben
   * - Nur der Prefix (ID: blh_...) wird angezeigt
   * - Status wird zur Laufzeit berechnet
   *
   * @param token - ServerAccessToken Domain Aggregate
   * @returns TokenListItemDto ohne sensible Daten
   */
  private mapToListItemDto(token: ServerAccessToken): TokenListItemDto {
    return {
      id: token.id.value,
      name: token.name ?? 'Unbenanntes Token',
      prefix: this.extractTokenPrefix(token.id.value),
      createdAt: token.createdAt.toISOString(),
      status: this.computeStatus(token),
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    };
  }

  /**
   * Extrahiert den Prefix aus der Token-ID.
   *
   * Das Token-ID hat das Format "blh_..." (24+ Zeichen).
   * Wir zeigen die ersten 12 Zeichen als Prefix.
   *
   * @param tokenId - Die Token-ID (blh_...)
   * @returns Prefix mit max. 12 Zeichen
   */
  private extractTokenPrefix(tokenId: string): string {
    // Token-ID ist bereits der Prefix (blh_ + CUID2)
    // Wir zeigen die ersten 12 Zeichen für die Identifizierung
    return tokenId.substring(0, 12);
  }

  /**
   * Berechnet den aktuellen Status des Tokens.
   *
   * Priorität:
   * 1. revoked (höchste Priorität)
   * 2. expired
   * 3. active
   *
   * @param token - ServerAccessToken Aggregate
   * @returns TokenStatus
   */
  private computeStatus(token: ServerAccessToken): TokenStatus {
    // Revoked hat höchste Priorität
    if (token.isRevoked) {
      return 'revoked';
    }

    // Abgelaufen prüfen
    if (token.expiresAt !== null && token.expiresAt < new Date()) {
      return 'expired';
    }

    // Ansonsten aktiv
    return 'active';
  }
}
