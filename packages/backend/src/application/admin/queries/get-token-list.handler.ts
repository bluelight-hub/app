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
import type { TokenListItemDto, TokenRotatedStatus } from '../dto/token-list-item.dto';

/**
 * Handler zum Auflisten von Server-Access-Tokens mit Pagination, Sortierung und Filter.
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
 * **Sortierung (Story 4.3):**
 * - sortBy: 'createdAt' | 'lastUsedAt' | 'name'
 * - sortOrder: 'asc' | 'desc'
 *
 * **Inaktivitäts-Filter (Story 4.3):**
 * - inactiveDays: Tokens die länger als X Tage nicht verwendet wurden
 * - Inkludiert auch Tokens die NIE verwendet wurden
 *
 * @example
 * ```typescript
 * const query = GetTokenListQuery.create({
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'lastUsedAt',
 *   sortOrder: 'asc',
 *   inactiveDays: 30,
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
   * 1. Repository-Abfrage mit Pagination, Sortierung und Filter
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
      // 1. Repository-Abfrage mit Pagination, Sortierung und Filter
      // ════════════════════════════════════════════════════════════════════════
      const repositoryResult = await this.tokenRepository.findAllPaginated({
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        inactiveDays: query.inactiveDays,
      });

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
      // Sammle alle rotatedFromIds fuer den 'rotated' Status Check
      const rotatedFromIds = new Set(
        paginatedResult.items.filter((t): t is typeof t & { rotatedFromId: NonNullable<typeof t.rotatedFromId> } => t.rotatedFromId !== null).map((t) => t.rotatedFromId.value),
      );

      const items: TokenListItemDto[] = paginatedResult.items.map((token) => this.mapToListItemDto(token, rotatedFromIds));

      // ════════════════════════════════════════════════════════════════════════
      // 4. Audit-Trail loggen (inkl. Sortierung/Filter)
      // ════════════════════════════════════════════════════════════════════════
      const filterInfo = query.inactiveDays !== null ? `, inactive>${query.inactiveDays}d` : '';
      this.logger.log(
        `Admin listed access tokens (count: ${items.length}, total: ${paginatedResult.total}, page: ${query.page}/${paginatedResult.totalPages}, sort: ${query.sortBy}/${query.sortOrder}${filterInfo}, by: ${query.requestedById})`,
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
   * - Status wird via Aggregate-Methode berechnet
   *
   * @param token - ServerAccessToken Domain Aggregate
   * @param rotatedFromIds - Set aller Token-IDs die als rotatedFromId referenziert werden
   * @returns TokenListItemDto ohne sensible Daten
   */
  private mapToListItemDto(token: ServerAccessToken, rotatedFromIds: Set<string>): TokenListItemDto {
    return {
      id: token.id.value,
      name: token.name ?? 'Unbenanntes Token',
      prefix: token.getDisplayPrefix(),
      createdAt: token.createdAt.toISOString(),
      status: token.getStatus(),
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      expiresAt: token.expiresAt?.toISOString() ?? null,
      revokedAt: token.revokedAt?.toISOString() ?? null,
      rotatedFromId: token.rotatedFromId?.value ?? null,
      rotatedStatus: this.computeRotatedStatus(token, rotatedFromIds),
    };
  }

  /**
   * Berechnet den Rotations-Status eines Tokens.
   *
   * **Logik:**
   * - `'replacement'`: Dieses Token wurde durch Rotation erstellt (rotatedFromId ist gesetzt)
   * - `'rotated'`: Dieses Token wurde durch Rotation ersetzt (isRevoked && ein anderes Token hat rotatedFromId = this.id)
   * - `null`: Normales Token (weder rotiert noch Replacement)
   *
   * **Hinweis:** Der 'rotated' Status kann nur fuer Tokens in der aktuellen Seite berechnet werden.
   * Wenn ein Replacement-Token auf einer anderen Seite ist, wird das originale Token als `null` angezeigt.
   *
   * @param token - ServerAccessToken Aggregate
   * @param rotatedFromIds - Set aller Token-IDs die in der aktuellen Seite als rotatedFromId referenziert werden
   * @returns TokenRotatedStatus
   */
  private computeRotatedStatus(token: ServerAccessToken, rotatedFromIds: Set<string>): TokenRotatedStatus {
    // 1. Dieses Token ist ein Replacement (wurde durch Rotation erstellt)
    if (token.rotatedFromId !== null) {
      return 'replacement';
    }

    // 2. Dieses Token wurde rotiert (widerrufen UND ein anderes Token referenziert es als rotatedFromId)
    if (token.isRevoked && rotatedFromIds.has(token.id.value)) {
      return 'rotated';
    }

    // 3. Normales Token
    return null;
  }
}
