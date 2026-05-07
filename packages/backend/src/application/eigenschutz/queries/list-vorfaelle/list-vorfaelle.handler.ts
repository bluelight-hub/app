import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { IEigenschutzVorfallRepository, VorfallListFilter, VorfallListReadRow } from '@domain/eigenschutz/repositories';
import { EIGENSCHUTZ_VORFALL_REPOSITORY } from '@infrastructure/di-tokens';
import { LIST_VORFAELLE_ERROR_CODES, VORFALL_FILTER_EINHEIT_IDS_CAP } from './list-vorfaelle.error-codes';
import { ListVorfaelleQuery } from './list-vorfaelle.query';

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${LIST_VORFAELLE_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Handler für `ListVorfaelleQuery` (Story 5.3, AC2 — FR36).
 *
 * **Flow:**
 * 1. Validate: `einsatzId` non-empty (Whitespace-Trim).
 * 2. Filter normalisieren:
 *    - `einheitIds.length > 50` → `EINHEIT_IDS_CAP` (Defense gegen IN-Bombs).
 *    - `vorfallZeitVon > vorfallZeitBis` → `RANGE_INVALID`.
 * 3. Repo-Aufruf `findByEinsatzWithFilters`.
 * 4. Failure-Mapping (Sentinel-Pass-Through analog `list-sync-conflicts`).
 *
 * `EinsatzScopeGuard` regelt die Membership-Defense; der Handler führt
 * **keinen** zusätzlichen Teilnehmer-Lookup durch (Pattern Story 4.1).
 */
@Injectable()
@QueryHandler(ListVorfaelleQuery)
export class ListVorfaelleHandler implements IQueryHandler<ListVorfaelleQuery, Result<VorfallListReadRow[]>> {
  constructor(
    @Inject(EIGENSCHUTZ_VORFALL_REPOSITORY)
    private readonly vorfallRepo: IEigenschutzVorfallRepository,
  ) {}

  async execute(query: ListVorfaelleQuery): Promise<Result<VorfallListReadRow[]>> {
    const einsatzId = typeof query.einsatzId === 'string' ? query.einsatzId.trim() : '';
    if (einsatzId.length === 0) {
      return Result.fail<VorfallListReadRow[]>(LIST_VORFAELLE_ERROR_CODES.EINSATZ_REQUIRED);
    }

    const filter = query.filter ?? ({} as VorfallListFilter);

    if (filter.einheitIds !== undefined && filter.einheitIds.length > VORFALL_FILTER_EINHEIT_IDS_CAP) {
      return Result.fail<VorfallListReadRow[]>(LIST_VORFAELLE_ERROR_CODES.EINHEIT_IDS_CAP);
    }

    if (filter.vorfallZeitVon !== undefined && filter.vorfallZeitBis !== undefined && filter.vorfallZeitVon.getTime() > filter.vorfallZeitBis.getTime()) {
      return Result.fail<VorfallListReadRow[]>(LIST_VORFAELLE_ERROR_CODES.RANGE_INVALID);
    }

    const repoResult = await this.vorfallRepo.findByEinsatzWithFilters(einsatzId, filter);
    if (repoResult.isFailure) {
      return Result.fail<VorfallListReadRow[]>(wrapInfrastructureError(repoResult.error, 'Vorfall-Liste konnte nicht geladen werden'));
    }

    return Result.ok<VorfallListReadRow[]>(repoResult.value ?? []);
  }
}
