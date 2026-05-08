import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { IAmpelWarnBadgeReadPort } from '@domain/eigenschutz/repositories';
import { AmpelWarnBadgeService, type AmpelWarnBadge } from '@domain/eigenschutz/services/ampel-warn-badge.service';
import { AMPEL_WARN_BADGE_READ_PORT } from '@infrastructure/di-tokens';
import { ListAmpelWarnBadgesQuery } from './list-ampel-warn-badges.query';

@Injectable()
@QueryHandler(ListAmpelWarnBadgesQuery)
export class ListAmpelWarnBadgesHandler implements IQueryHandler<ListAmpelWarnBadgesQuery, Result<AmpelWarnBadge[]>> {
  constructor(
    @Inject(AMPEL_WARN_BADGE_READ_PORT)
    private readonly readPort: IAmpelWarnBadgeReadPort,
    private readonly warnBadgeService: AmpelWarnBadgeService,
  ) {}

  async execute(query: ListAmpelWarnBadgesQuery): Promise<Result<AmpelWarnBadge[]>> {
    if (!query.einsatzId?.trim()) {
      return Result.fail<AmpelWarnBadge[]>('BusinessRule:EinsatzErforderlich');
    }

    const candidates = await this.readPort.listCandidatesByEinsatz(query.einsatzId);
    if (candidates.isFailure) {
      return Result.fail<AmpelWarnBadge[]>(candidates.error ?? 'InfrastructureError:AmpelWarnBadgeRead:unknown');
    }

    return Result.ok(this.warnBadgeService.buildBadges(candidates.value ?? { gefaehrdungen: [], psa: [] }));
  }
}
