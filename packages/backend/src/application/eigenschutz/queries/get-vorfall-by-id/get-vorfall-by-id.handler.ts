import { Result } from '@domain/common/result';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EIGENSCHUTZ_VORFALL_REPOSITORY } from '@infrastructure/di-tokens';
import { GetVorfallByIdQuery } from './get-vorfall-by-id.query';

/**
 * Sentinel-Codes des Query-Handlers (Story 5.2 AC10). Cross-Einsatz wird
 * symmetrisch zur `GetSicherungsposten`-Logik als 404 signalisiert.
 */
export const GET_VORFALL_BY_ID_ERROR_CODES = {
  NOT_FOUND: 'NotFound:Vorfall',
} as const;

/**
 * Query-Handler für `GetVorfallByIdQuery` (Story 5.2 AC10).
 *
 * Reiner Read — kein Transaction-Context. Cross-Einsatz-Treffer werden auf
 * `NotFound:Vorfall` heruntergesetzt, damit fremde Vorfall-Existenzen nicht
 * leaken. Reconstitute-Failures (z. B. korrupter Snapshot) werden 1:1 vom
 * Repo-Sentinel `InfrastructureError:ReconstituteEigenschutzVorfall:*`
 * weitergereicht; der Controller mappt sie auf 500.
 */
@Injectable()
@QueryHandler(GetVorfallByIdQuery)
export class GetVorfallByIdHandler implements IQueryHandler<GetVorfallByIdQuery, Result<EigenschutzVorfall>> {
  constructor(
    @Inject(EIGENSCHUTZ_VORFALL_REPOSITORY)
    private readonly vorfallRepo: IEigenschutzVorfallRepository,
  ) {}

  async execute(query: GetVorfallByIdQuery): Promise<Result<EigenschutzVorfall>> {
    const result = await this.vorfallRepo.findById(query.vorfallId);
    if (result.isFailure) {
      return Result.fail<EigenschutzVorfall>(result.error ?? 'Vorfall konnte nicht geladen werden');
    }
    const vorfall = result.value;
    if (!vorfall) {
      return Result.fail<EigenschutzVorfall>(GET_VORFALL_BY_ID_ERROR_CODES.NOT_FOUND);
    }
    if (vorfall.einsatzId !== query.einsatzId) {
      return Result.fail<EigenschutzVorfall>(GET_VORFALL_BY_ID_ERROR_CODES.NOT_FOUND);
    }
    return Result.ok<EigenschutzVorfall>(vorfall);
  }
}
