import { Result } from '@domain/common/result';
import type { GefaehrdungsbeurteilungVorlageReadModel, IGefaehrdungsbeurteilungVorlageRepository } from '@domain/eigenschutz/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY } from '@infrastructure/di-tokens';
import { ListGefaehrdungsbeurteilungsVorlagenQuery } from './list-gefaehrdungsbeurteilungs-vorlagen.query';

/**
 * Query-Handler — liest aktive Vorlagen direkt über den Port. Kein Aggregate-
 * Bau, weil Vorlagen read-only und framework-seitig unveränderlich sind
 * (Seeds in `prisma/seed.ts`).
 */
@Injectable()
@QueryHandler(ListGefaehrdungsbeurteilungsVorlagenQuery)
export class ListGefaehrdungsbeurteilungsVorlagenHandler implements IQueryHandler<ListGefaehrdungsbeurteilungsVorlagenQuery, Result<GefaehrdungsbeurteilungVorlageReadModel[]>> {
  constructor(
    @Inject(GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY)
    private readonly vorlageRepo: IGefaehrdungsbeurteilungVorlageRepository,
  ) {}

  async execute(_query: ListGefaehrdungsbeurteilungsVorlagenQuery): Promise<Result<GefaehrdungsbeurteilungVorlageReadModel[]>> {
    return this.vorlageRepo.findAktive();
  }
}
