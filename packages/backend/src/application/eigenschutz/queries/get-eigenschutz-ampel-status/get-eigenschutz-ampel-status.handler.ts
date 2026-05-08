import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { AmpelProjectionReadRow, IAmpelProjectionRepository } from '@domain/eigenschutz/repositories';
import { AMPEL_PROJECTION_REPOSITORY } from '@infrastructure/di-tokens';
import { GetEigenschutzAmpelStatusQuery } from './get-eigenschutz-ampel-status.query';

@Injectable()
@QueryHandler(GetEigenschutzAmpelStatusQuery)
export class GetEigenschutzAmpelStatusHandler implements IQueryHandler<GetEigenschutzAmpelStatusQuery, Result<AmpelProjectionReadRow[]>> {
  constructor(
    @Inject(AMPEL_PROJECTION_REPOSITORY)
    private readonly ampelProjection: IAmpelProjectionRepository,
  ) {}

  async execute(query: GetEigenschutzAmpelStatusQuery): Promise<Result<AmpelProjectionReadRow[]>> {
    if (!query.einsatzId?.trim()) {
      return Result.fail<AmpelProjectionReadRow[]>('BusinessRule:EinsatzErforderlich');
    }
    return this.ampelProjection.findByEinsatz(query.einsatzId);
  }
}
