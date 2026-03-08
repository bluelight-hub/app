import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER, USER_REPOSITORY } from '@infrastructure/di-tokens';
import type { EskalationsAnalyseDto } from '../../dto/eskalations-analyse.dto';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { GetEskalationsAnalyseQuery } from './get-eskalations-analyse.query';

@Injectable()
export class GetEskalationsAnalyseHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetEskalationsAnalyseQuery): Promise<Result<EskalationsAnalyseDto>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<EskalationsAnalyseDto>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const analyseResult = await this.erinnerungRepository.getEskalationsAnalyse(einsatzIdResult.value);

    if (analyseResult.isFailure) {
      this.logger.error(`Failed to load escalation analysis for Einsatz ${query.einsatzId}: ${analyseResult.error}`, 'GetEskalationsAnalyseHandler');
      return Result.fail<EskalationsAnalyseDto>(analyseResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const analyse = analyseResult.value;
    if (!analyse) {
      return Result.fail<EskalationsAnalyseDto>(ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    // Resolve User Names parallel
    const [topReceiversWithNames, topSourcesWithNames, itemsWithNames] = await Promise.all([
      // Top Receivers
      Promise.all(
        analyse.topReceivers.map(async (r) => {
          let userName = 'Unbekannt';
          const userResult = await this.userRepository.findById(r.userId);
          if (userResult.isSuccess && userResult.value) {
            userName = userResult.value.username.value;
          }
          return { userId: r.userId.toString(), userName, count: r.count };
        }),
      ),
      // Top Sources
      Promise.all(
        analyse.topSources.map(async (s) => {
          let userName = 'Unbekannt';
          const userResult = await this.userRepository.findById(s.userId);
          if (userResult.isSuccess && userResult.value) {
            userName = userResult.value.username.value;
          }
          return { userId: s.userId.toString(), userName, count: s.count };
        }),
      ),
      // Items - resolve eskaliertAn and previousAssignee
      Promise.all(
        analyse.items.map(async (item) => {
          let eskaliertAn = 'Unbekannt';
          const eskaliertAnResult = await this.userRepository.findById(item.eskaliertAnId);
          if (eskaliertAnResult.isSuccess && eskaliertAnResult.value) {
            eskaliertAn = eskaliertAnResult.value.username.value;
          }

          let previousAssignee: string | null = null;
          if (item.previousAssigneeId) {
            const prevResult = await this.userRepository.findById(item.previousAssigneeId);
            if (prevResult.isSuccess && prevResult.value) {
              previousAssignee = prevResult.value.username.value;
            } else {
              previousAssignee = 'Unbekannt';
            }
          }

          return {
            erinnerungId: item.erinnerungId.toString(),
            titel: item.titel,
            ausgeloestAm: item.ausgeloestAm.toISOString(),
            eskaliertAm: item.eskaliertAm.toISOString(),
            zeitBisEskalationSeconds: item.zeitBisEskalationSeconds,
            eskaliertAn,
            previousAssignee,
          };
        }),
      ),
    ]);

    const dto: EskalationsAnalyseDto = {
      totalEscalated: analyse.totalEscalated,
      totalErinnerungen: analyse.totalErinnerungen,
      eskalationsRate: analyse.eskalationsRate,
      avgZeitBisEskalationSeconds: analyse.avgZeitBisEskalationSeconds,
      topReceivers: topReceiversWithNames,
      topSources: topSourcesWithNames,
      items: itemsWithNames,
    };

    return Result.ok(dto);
  }
}
