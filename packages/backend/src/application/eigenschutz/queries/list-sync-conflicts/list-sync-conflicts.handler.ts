import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { ISyncConflictRepository, SyncConflictListFilter, SyncConflictReadModel } from '@domain/eigenschutz/repositories/i-sync-conflict.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER, SYNC_CONFLICT_REPOSITORY } from '@infrastructure/di-tokens';
import { LIST_SYNC_CONFLICTS_ERROR_CODES } from './list-sync-conflicts.error-codes';
import { ListSyncConflictsQuery, type ListSyncConflictsResult, type SyncConflictListItem } from './list-sync-conflicts.query';

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${LIST_SYNC_CONFLICTS_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Handler für `ListSyncConflictsQuery` (Story 3.10 AC3, FR50).
 *
 * **Flow:**
 * 1. Validate: `einsatzId` + `callerUserId` non-empty (Whitespace-Trim,
 *    Pattern Story 3.9 Code-Review-Patch P14).
 * 2. Caller-Membership-Check via `EinsatzTeilnehmerRepository.findByEinsatzAndUser`
 *    — Nicht-Teilnehmer dürfen die Liste NICHT sehen (NFR-S2, UX-DR21
 *    Zero-Toast bei 403).
 * 3. Repository-Aufruf `findOpenByEinsatzId` (sortiert `reportedAt DESC`,
 *    gecapped @ 200, Filter optional).
 * 4. Mapping `SyncConflictReadModel` → `SyncConflictListItem` (entfernt
 *    redundantes `einsatzId`).
 */
@Injectable()
@QueryHandler(ListSyncConflictsQuery)
export class ListSyncConflictsHandler implements IQueryHandler<ListSyncConflictsQuery, Result<ListSyncConflictsResult>> {
  constructor(
    @Inject(SYNC_CONFLICT_REPOSITORY)
    private readonly syncConflictRepo: ISyncConflictRepository,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly teilnehmerRepo: IEinsatzTeilnehmerRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async execute(query: ListSyncConflictsQuery): Promise<Result<ListSyncConflictsResult>> {
    // Step 1 — Validation (Whitespace-Trim).
    const einsatzId = typeof query.einsatzId === 'string' ? query.einsatzId.trim() : '';
    const callerUserId = typeof query.callerUserId === 'string' ? query.callerUserId.trim() : '';
    if (einsatzId.length === 0) {
      return Result.fail<ListSyncConflictsResult>(LIST_SYNC_CONFLICTS_ERROR_CODES.EINSATZ_REQUIRED);
    }
    if (callerUserId.length === 0) {
      return Result.fail<ListSyncConflictsResult>(LIST_SYNC_CONFLICTS_ERROR_CODES.CALLER_REQUIRED);
    }

    // Step 2 — Caller-Membership-Check.
    let teilnehmer: Awaited<ReturnType<IEinsatzTeilnehmerRepository['findByEinsatzAndUser']>>;
    try {
      teilnehmer = await this.teilnehmerRepo.findByEinsatzAndUser(einsatzId, callerUserId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      this.logger.warn?.('ListSyncConflicts: Teilnehmer-Lookup fehlgeschlagen', { reason: message });
      return Result.fail<ListSyncConflictsResult>(wrapInfrastructureError(undefined, `Teilnehmer-Lookup fehlgeschlagen: ${message}`));
    }
    if (!teilnehmer) {
      return Result.fail<ListSyncConflictsResult>(LIST_SYNC_CONFLICTS_ERROR_CODES.NOT_TEILNEHMER);
    }

    // Step 3 — Repository-Aufruf (Filter pass-through).
    const filter: SyncConflictListFilter | undefined = query.filter
      ? {
          entityType: query.filter.entityType,
          einheitId: query.filter.einheitId,
        }
      : undefined;

    const repoResult = await this.syncConflictRepo.findOpenByEinsatzId(einsatzId, filter);
    if (repoResult.isFailure || !repoResult.value) {
      return Result.fail<ListSyncConflictsResult>(wrapInfrastructureError(repoResult.error, 'sync_conflicts-Lookup fehlgeschlagen'));
    }

    // Step 4 — Mapping ohne `einsatzId`.
    const conflicts: SyncConflictListItem[] = repoResult.value.map((row) => toListItem(row));

    return Result.ok<ListSyncConflictsResult>({ conflicts });
  }
}

function toListItem(row: SyncConflictReadModel): SyncConflictListItem {
  return {
    id: row.id,
    einheitId: row.einheitId,
    entityType: row.entityType,
    entityId: row.entityId,
    fieldPath: row.fieldPath,
    localPayload: row.localPayload,
    serverVersion: row.serverVersion,
    localExpectedVersion: row.localExpectedVersion,
    reportedAt: row.reportedAt,
    reportedByUserId: row.reportedByUserId,
  };
}
