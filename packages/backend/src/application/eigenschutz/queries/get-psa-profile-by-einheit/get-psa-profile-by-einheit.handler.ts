import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { IPsaProfilZuweisungReadRepository, PsaProfilZuweisungReadRow } from '@domain/eigenschutz/repositories/i-psa-profil-zuweisung.repository';
import { PSA_PROFIL_ZUWEISUNG_READ_REPOSITORY } from '@infrastructure/di-tokens';
import { GetPsaProfileByEinheitQuery } from './get-psa-profile-by-einheit.query';

/**
 * Query-Handler für `GetPsaProfileByEinheitQuery` (Story 3.1 AC9).
 *
 * Read-Pfad — nutzt das Read-Repository (Lesson L5 aus Story 2.4: Read-
 * Modell ≠ Aggregate). Liefert leeres Array bei Cross-Einsatz-Hit oder
 * fehlender aktiver Zuweisung.
 */
@Injectable()
@QueryHandler(GetPsaProfileByEinheitQuery)
export class GetPsaProfileByEinheitHandler implements IQueryHandler<GetPsaProfileByEinheitQuery, Result<PsaProfilZuweisungReadRow[]>> {
  constructor(
    @Inject(PSA_PROFIL_ZUWEISUNG_READ_REPOSITORY)
    private readonly readRepo: IPsaProfilZuweisungReadRepository,
  ) {}

  async execute(query: GetPsaProfileByEinheitQuery): Promise<Result<PsaProfilZuweisungReadRow[]>> {
    if (!query.einsatzId?.trim() || !query.einheitId?.trim()) {
      return Result.fail<PsaProfilZuweisungReadRow[]>('BusinessRule:EinsatzUndEinheitErforderlich');
    }
    return this.readRepo.findActiveProfileByEinheit(query.einsatzId, query.einheitId);
  }
}
