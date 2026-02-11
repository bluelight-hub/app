import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { ILogger } from '@domain/ports/i-logger.port';
import { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { FuehrungsrhythmusStatistikDto, FuehrungsrhythmusActivationGroupDto, FuehrungsrhythmusReminderTypeStatsDto } from '../../dto/fuehrungsrhythmus-statistik.dto';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { GetFuehrungsrhythmusStatistikQuery } from './get-fuehrungsrhythmus-statistik.query';

@Injectable()
export class GetFuehrungsrhythmusStatistikHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetFuehrungsrhythmusStatistikQuery): Promise<Result<FuehrungsrhythmusStatistikDto>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<FuehrungsrhythmusStatistikDto>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const statistikResult = await this.erinnerungRepository.getFuehrungsrhythmusStatistik(einsatzIdResult.value);

    if (statistikResult.isFailure) {
      this.logger.error(`Failed to load Fuehrungsrhythmus-Statistik for Einsatz ${query.einsatzId}: ${statistikResult.error}`, 'GetFuehrungsrhythmusStatistikHandler');
      return Result.fail<FuehrungsrhythmusStatistikDto>(statistikResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const statistik = statistikResult.value!;

    const activations: FuehrungsrhythmusActivationGroupDto[] = statistik.activations.map((activation) => {
      const reminderTypeStats: FuehrungsrhythmusReminderTypeStatsDto[] = activation.reminderTypeStats.map((ts) => ({
        reminderType: ts.reminderType,
        totalOccurrences: ts.totalOccurrences,
        snoozeCount: ts.snoozeCount,
        snoozeRate: ts.snoozeRate,
        escalationCount: ts.escalationCount,
        escalationRate: ts.escalationRate,
      }));

      return {
        activationTimestamp: activation.activationTimestamp.toISOString(),
        reminderCount: activation.reminderCount,
        totalCycles: activation.totalCycles,
        completedParents: activation.completedParents,
        completionRate: activation.completionRate,
        escalatedCount: activation.escalatedCount,
        reminderTypeStats,
      };
    });

    const dto: FuehrungsrhythmusStatistikDto = {
      activations,
      totalActivations: statistik.totalActivations,
      totalCycles: statistik.totalCycles,
      avgCompletionRate: statistik.avgCompletionRate,
      totalEscalations: statistik.totalEscalations,
      overallSnoozeRate: statistik.overallSnoozeRate,
    };

    return Result.ok(dto);
  }
}
