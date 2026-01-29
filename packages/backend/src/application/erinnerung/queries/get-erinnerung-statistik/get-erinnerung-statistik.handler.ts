import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { ERINNERUNG_REPOSITORY, LOGGER, USER_REPOSITORY } from '@infrastructure/di-tokens';
import type { ErinnerungStatistikDto } from '../../dto/erinnerung-statistik.dto';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { GetErinnerungStatistikQuery } from './get-erinnerung-statistik.query';

@Injectable()
export class GetErinnerungStatistikHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetErinnerungStatistikQuery): Promise<Result<ErinnerungStatistikDto>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<ErinnerungStatistikDto>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const statsResult = await this.erinnerungRepository.getStatistik(einsatzIdResult.value);

    if (statsResult.isFailure) {
      this.logger.error(`Failed to load statistics for Einsatz ${query.einsatzId}: ${statsResult.error}`, 'GetErinnerungStatistikHandler');
      return Result.fail<ErinnerungStatistikDto>(statsResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const stats = statsResult.value!;

    // Resolve User Names
    // Optimization: For Top 3 players, parallel individual lookups are acceptable performance-wise.
    // If this list grows (e.g. Top 10+), implement `findByIds` in IUserRepository to avoid N+1.
    const topReceiversWithNames = await Promise.all(
      stats.topReceivers.map(async (r) => {
        let userName = 'Unbekannt';
        const userResult = await this.userRepository.findById(r.userId);
        if (userResult.isSuccess && userResult.value) {
          userName = userResult.value.username.value;
        }
        return {
          userId: r.userId.toString(),
          userName,
          count: r.count,
        };
      }),
    );

    const dto: ErinnerungStatistikDto = {
      totalEscalated: stats.totalEscalated,
      avgEscalationTimeSeconds: stats.avgEscalationTimeSeconds,
      topReceivers: topReceiversWithNames,
    };

    return Result.ok(dto);
  }
}
