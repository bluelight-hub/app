import { Result } from '@domain/common/result';
import type { GefaehrdungsbeurteilungReadModel, IGefaehrdungsbeurteilungRepository } from '@domain/eigenschutz/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { GEFAEHRDUNGSBEURTEILUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { GetGefaehrdungsbeurteilungQuery } from './get-gefaehrdungsbeurteilung.query';

/**
 * Sentinel-Präfix für „Beurteilung nicht gefunden" (oder gehört zu einem
 * anderen Einsatz). Der Controller mappt den String auf HTTP 404. Der
 * Cross-Einsatz-Fall wird bewusst **nicht** als 403 signalisiert — die
 * Existenz einer Beurteilung in einem fremden Einsatz soll nicht leaken.
 */
export const GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES = {
  NOT_FOUND: 'NotFound:Beurteilung',
} as const;

/**
 * Query-Handler für `GetGefaehrdungsbeurteilungQuery`.
 *
 * Liefert das Read-Model (`GefaehrdungsbeurteilungReadModel`) samt
 * Persistenz-Metadaten, damit der Controller die DTO-Factory befüllen kann.
 * Der Handler nutzt `findReadModelById` und führt den AC6-symmetrischen
 * Cross-Einsatz-Check aus (`row.einsatzId === query.einsatzId`).
 */
@Injectable()
@QueryHandler(GetGefaehrdungsbeurteilungQuery)
export class GetGefaehrdungsbeurteilungHandler implements IQueryHandler<GetGefaehrdungsbeurteilungQuery, Result<GefaehrdungsbeurteilungReadModel>> {
  constructor(
    @Inject(GEFAEHRDUNGSBEURTEILUNG_REPOSITORY)
    private readonly beurteilungRepo: IGefaehrdungsbeurteilungRepository,
  ) {}

  async execute(query: GetGefaehrdungsbeurteilungQuery): Promise<Result<GefaehrdungsbeurteilungReadModel>> {
    const loadResult = await this.beurteilungRepo.findReadModelById(query.gefaehrdungsbeurteilungId);
    if (loadResult.isFailure) {
      return Result.fail<GefaehrdungsbeurteilungReadModel>(loadResult.error ?? 'Beurteilung konnte nicht geladen werden');
    }
    const readModel = loadResult.value;
    if (!readModel) {
      return Result.fail<GefaehrdungsbeurteilungReadModel>(GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.NOT_FOUND);
    }
    // AC6-symmetrischer Cross-Einsatz-Check: fremde Einsatz-ID → NotFound.
    // Bewusst kein 403, um keine Existenz zu bestätigen.
    if (readModel.aggregate.einsatzId !== query.einsatzId) {
      return Result.fail<GefaehrdungsbeurteilungReadModel>(GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.NOT_FOUND);
    }
    return Result.ok<GefaehrdungsbeurteilungReadModel>(readModel);
  }
}
