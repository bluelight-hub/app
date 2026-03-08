import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER, USER_REPOSITORY } from '@infrastructure/di-tokens';
import type { PersonStatistikDto } from '../../dto/person-statistik.dto';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { GetPersonStatistikQuery } from './get-person-statistik.query';

@Injectable()
export class GetPersonStatistikHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetPersonStatistikQuery): Promise<Result<PersonStatistikDto>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<PersonStatistikDto>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const statsResult = await this.erinnerungRepository.getPersonStatistik(einsatzIdResult.value);

    if (statsResult.isFailure) {
      this.logger.error(`Failed to load person statistics for Einsatz ${query.einsatzId}: ${statsResult.error}`, 'GetPersonStatistikHandler');
      return Result.fail<PersonStatistikDto>(statsResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const stats = statsResult.value;
    if (!stats) {
      return Result.fail<PersonStatistikDto>(ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    // Resolve User Names (parallel)
    const itemsWithNames = await Promise.all(
      stats.items.map(async (item) => {
        // Fallback "Unbekannt" konsistent mit GetErinnerungStatistikHandler (Story 4.9)
        let userName = 'Unbekannt';
        const userResult = await this.userRepository.findById(item.userId);
        if (userResult.isSuccess && userResult.value) {
          userName = userResult.value.username.value;
        }
        return {
          userId: item.userId.toString(),
          userName,
          zugewiesen: item.zugewiesen,
          acknowledged: item.acknowledged,
          eskalationen: item.eskalationen,
          avgReaktionszeitSeconds: item.avgReaktionszeitSeconds,
        };
      }),
    );

    const dto: PersonStatistikDto = {
      items: itemsWithNames,
    };

    return Result.ok(dto);
  }
}
