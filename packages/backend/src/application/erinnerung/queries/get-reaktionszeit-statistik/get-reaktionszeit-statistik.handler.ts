import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { ILogger } from '@domain/ports/i-logger.port';
import { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { ReaktionszeitStatistikDto } from '../../dto/reaktionszeit-statistik.dto';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { GetReaktionszeitStatistikQuery } from './get-reaktionszeit-statistik.query';

@Injectable()
export class GetReaktionszeitStatistikHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetReaktionszeitStatistikQuery): Promise<Result<ReaktionszeitStatistikDto>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<ReaktionszeitStatistikDto>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const statistikResult = await this.erinnerungRepository.getReaktionszeitStatistik(einsatzIdResult.value);

    if (statistikResult.isFailure) {
      this.logger.error(`Failed to load reaction time statistics for Einsatz ${query.einsatzId}: ${statistikResult.error}`, 'GetReaktionszeitStatistikHandler');
      return Result.fail<ReaktionszeitStatistikDto>(statistikResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const statistik = statistikResult.value;
    if (!statistik) {
      return Result.fail<ReaktionszeitStatistikDto>(ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const dto: ReaktionszeitStatistikDto = {
      totalAcknowledged: statistik.totalAcknowledged,
      avgReaktionszeitSeconds: statistik.avgReaktionszeitSeconds,
      medianReaktionszeitSeconds: statistik.medianReaktionszeitSeconds,
      minReaktionszeitSeconds: statistik.minReaktionszeitSeconds,
      maxReaktionszeitSeconds: statistik.maxReaktionszeitSeconds,
      buckets: statistik.buckets.map((b) => ({
        label: b.label,
        minSeconds: b.minSeconds,
        maxSeconds: b.maxSeconds,
        count: b.count,
      })),
    };

    return Result.ok(dto);
  }
}
