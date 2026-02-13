import { Inject, Injectable } from '@nestjs/common';

import { Result } from '@domain/common/result';
import { ILogger } from '@domain/ports/i-logger.port';
import { IInviteCodeRepository } from '@domain/repositories/i-invite-code.repository';
import type { InviteCode } from '@domain/aggregates/invite-code.aggregate';

import { INVITE_CODE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

import type { ListInvitesQuery } from './list-invites.query';
import type { InviteCodeListDto } from '../dto/invite-code-list.dto';
import type { InviteCodeListItemDto } from '../dto/invite-code-list-item.dto';
import type { InviteCodeCreatorDto } from '../dto/invite-code-creator.dto';

/**
 * Handler zum Auflisten von Invite-Codes mit Pagination, Filterung und Sortierung.
 *
 * Laedt Invite-Codes aus dem Repository, mappt sie zu DTOs mit maskierten Codes
 * und loggt einen Audit-Trail fuer die Abfrage.
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 * - DTO Mapping: Domain Aggregate -> Maskiertes ListItem DTO
 *
 * **Security Considerations:**
 * - Codes werden in der Liste IMMER maskiert (z.B. "ABC1****")
 * - Audit-Trail loggt anfragenden Admin und Filterparameter
 *
 * @example
 * ```typescript
 * const query = ListInvitesQuery.create({
 *   filters: { status: InviteCodeStatus.ACTIVE },
 *   pagination: { page: 1, pageSize: 20 },
 *   requestedById: 'admin_123',
 * }).value!;
 *
 * const result = await handler.execute(query);
 * if (result.isSuccess) {
 *   console.log(`${result.value.meta.total} Codes gefunden`);
 * }
 * ```
 */
@Injectable()
export class ListInvitesHandler {
  constructor(
    @Inject(INVITE_CODE_REPOSITORY)
    private readonly inviteCodeRepository: IInviteCodeRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Fuehrt die Query aus und gibt paginierte Invite-Codes als DTOs zurueck.
   *
   * **Ablauf:**
   * 1. Query-Parameter an Repository weiterreichen
   * 2. Repository-Result pruefen
   * 3. Domain Aggregates zu DTOs mappen (mit maskierten Codes)
   * 4. Audit-Trail loggen
   * 5. Result mit InviteCodeListDto zurueckgeben
   *
   * **Fehlerbehandlung:**
   * - Repository-Fehler -> Result.fail()
   * - Unerwartete Fehler (try-catch) -> Result.fail()
   * - Leeres Array ist KEIN Fehler sondern valides Resultat
   *
   * @param query - Validierte ListInvitesQuery
   * @returns Result<InviteCodeListDto> - Success mit DTOs oder Failure
   */
  async execute(query: ListInvitesQuery): Promise<Result<InviteCodeListDto>> {
    try {
      // ════════════════════════════════════════════════════════════════════════
      // 1. Repository-Abfrage mit Filterung, Sortierung und Pagination
      // ════════════════════════════════════════════════════════════════════════
      const repositoryResult = await this.inviteCodeRepository.findAll(query.filters, query.sort, query.pagination);

      // ════════════════════════════════════════════════════════════════════════
      // 2. Repository-Result pruefen
      // ════════════════════════════════════════════════════════════════════════
      if (repositoryResult.isFailure) {
        this.logger.error(`Failed to list invite codes: ${repositoryResult.error}`, 'ListInvitesHandler');
        return Result.fail<InviteCodeListDto>(repositoryResult.error ?? 'Failed to fetch invite codes from repository');
      }

      const paginatedResult = repositoryResult.value;
      if (!paginatedResult) {
        return Result.fail<InviteCodeListDto>('Unexpected null result from repository');
      }

      // ════════════════════════════════════════════════════════════════════════
      // 3. Domain Aggregates zu DTOs mappen (mit maskierten Codes)
      // ════════════════════════════════════════════════════════════════════════
      const items: InviteCodeListItemDto[] = paginatedResult.items.map((invite) => this.mapToListItemDto(invite));

      // ════════════════════════════════════════════════════════════════════════
      // 4. Audit-Trail loggen
      // ════════════════════════════════════════════════════════════════════════
      const filterDescription = this.buildFilterDescription(query);
      this.logger.log(`Admin listed invite codes (count: ${items.length}, total: ${paginatedResult.total}, ${filterDescription}, by: ${query.requestedById})`, 'ListInvitesHandler');

      // ════════════════════════════════════════════════════════════════════════
      // 5. Result zusammenstellen
      // ════════════════════════════════════════════════════════════════════════
      const response: InviteCodeListDto = {
        data: items,
        meta: {
          page: paginatedResult.page,
          pageSize: paginatedResult.pageSize,
          total: paginatedResult.total,
          totalPages: paginatedResult.totalPages,
        },
      };

      return Result.ok<InviteCodeListDto>(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while listing invite codes';
      this.logger.error(`Unexpected error in ListInvitesHandler: ${errorMessage}`, 'ListInvitesHandler');
      return Result.fail<InviteCodeListDto>(errorMessage);
    }
  }

  /**
   * Mappt ein InviteCode Aggregate zu einem ListItem DTO.
   *
   * **Security:**
   * - Code wird IMMER maskiert (z.B. "ABC1****")
   * - Status wird zur Laufzeit berechnet
   *
   * **Design Decision: Warum displayName = 'Admin':**
   * - User-Lookup wuerde N+1 Queries verursachen (1-100 extra DB-Calls pro Seite)
   * - IUserRepository hat keine findByIds() Batch-Methode
   * - Audit-Trail loggt bereits createdById (wichtig fuer Security)
   * - Admin-Feature MVP: "Admin" ist akzeptabel bis User-Management UI existiert
   * - Performance > UX-Detail fuer selten genutzte Liste
   *
   * **Future Improvement (wenn benoetigt):**
   * 1. IUserRepository.findByIds(ids: UserId[]) hinzufuegen
   * 2. Batch-Fetch aller eindeutigen createdById Werte
   * 3. In-Memory Map fuer userId -> username Lookup erstellen
   * 4. displayName aus Map mappen
   *
   * @param invite - InviteCode Domain Aggregate
   * @returns InviteCodeListItemDto mit maskiertem Code
   */
  private mapToListItemDto(invite: InviteCode): InviteCodeListItemDto {
    // Design Decision: User-Lookup wuerde N+1 Queries verursachen.
    // createdById ist bereits im Audit-Trail, displayName ist nice-to-have.
    const createdBy: InviteCodeCreatorDto = {
      id: invite.createdById,
      displayName: 'Admin',
    };

    return {
      id: invite.id.value,
      code: invite.code.toMasked(), // WICHTIG: Maskierter Code!
      expiresAt: invite.expiresAt.toISOString(),
      maxUses: invite.maxUses,
      useCount: invite.usedCount,
      status: invite.computeStatus(), // Berechneter Status
      label: invite.label ?? null,
      createdAt: invite.createdAt.toISOString(),
      createdBy,
      revokedAt: invite.revokedAt?.toISOString() ?? null,
    };
  }

  /**
   * Baut eine lesbare Beschreibung der Filter fuer das Audit-Log.
   *
   * @param query - Die ausgefuehrte Query
   * @returns Formatierter String mit Filter-Informationen
   */
  private buildFilterDescription(query: ListInvitesQuery): string {
    const parts: string[] = [];

    if (query.filters?.status) {
      parts.push(`status: ${query.filters.status}`);
    }

    if (query.filters?.createdById) {
      parts.push(`createdBy: ${query.filters.createdById}`);
    }

    parts.push(`sort: ${query.sort.field} ${query.sort.direction}`);
    parts.push(`page: ${query.pagination.page}/${query.pagination.pageSize}`);

    return parts.length > 0 ? `filters: {${parts.join(', ')}}` : 'filters: {}';
  }
}
