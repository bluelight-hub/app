import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { ZeitverlaufStatistikDto } from '../../dto/zeitverlauf-statistik.dto';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { GetZeitverlaufStatistikQuery } from './get-zeitverlauf-statistik.query';

@Injectable()
export class GetZeitverlaufStatistikHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetZeitverlaufStatistikQuery): Promise<Result<ZeitverlaufStatistikDto>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<ZeitverlaufStatistikDto>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const statsResult = await this.erinnerungRepository.getZeitverlaufStatistik(einsatzIdResult.value);

    if (statsResult.isFailure) {
      this.logger.error(`Failed to load zeitverlauf statistics for Einsatz ${query.einsatzId}: ${statsResult.error}`, 'GetZeitverlaufStatistikHandler');
      return Result.fail<ZeitverlaufStatistikDto>(statsResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const stats = statsResult.value;
    if (!stats) {
      return Result.fail<ZeitverlaufStatistikDto>(ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const dto: ZeitverlaufStatistikDto = {
      intervalMinutes: stats.intervalMinutes,
      buckets: stats.buckets.map((b) => ({
        timestamp: b.timestamp.toISOString(),
        erstellt: b.erstellt,
        ausgeloest: b.ausgeloest,
        eskaliert: b.eskaliert,
      })),
    };

    return Result.ok(dto);
  }
}
