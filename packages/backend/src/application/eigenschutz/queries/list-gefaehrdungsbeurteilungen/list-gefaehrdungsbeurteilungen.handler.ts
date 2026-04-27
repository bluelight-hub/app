import { Result } from '@domain/common/result';
import type { GefaehrdungsbeurteilungReadModel, IGefaehrdungsbeurteilungRepository } from '@domain/eigenschutz/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { GEFAEHRDUNGSBEURTEILUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { ListGefaehrdungsbeurteilungenQuery } from './list-gefaehrdungsbeurteilungen.query';

/**
 * Listet alle Gefährdungsbeurteilungen eines Einsatzes als Read-Models.
 *
 * Die Einsatz-Mitgliedschaft wird durch die Controller-Guard-Kette geprüft;
 * der Handler beschränkt die Daten zusätzlich über `einsatzId` im Repository.
 */
@Injectable()
@QueryHandler(ListGefaehrdungsbeurteilungenQuery)
export class ListGefaehrdungsbeurteilungenHandler implements IQueryHandler<ListGefaehrdungsbeurteilungenQuery, Result<GefaehrdungsbeurteilungReadModel[]>> {
  constructor(
    @Inject(GEFAEHRDUNGSBEURTEILUNG_REPOSITORY)
    private readonly beurteilungRepo: IGefaehrdungsbeurteilungRepository,
  ) {}

  async execute(query: ListGefaehrdungsbeurteilungenQuery): Promise<Result<GefaehrdungsbeurteilungReadModel[]>> {
    const result = await this.beurteilungRepo.findReadModelsByEinsatz(query.einsatzId);
    if (result.isFailure || !result.value) {
      return Result.fail<GefaehrdungsbeurteilungReadModel[]>(result.error ?? 'Beurteilungen konnten nicht geladen werden');
    }
    return Result.ok(result.value);
  }
}
