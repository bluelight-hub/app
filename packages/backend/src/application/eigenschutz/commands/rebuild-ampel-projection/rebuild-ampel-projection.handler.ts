import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import { IAmpelProjectionRepository } from '@domain/eigenschutz/repositories';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { AMPEL_PROJECTION_REPOSITORY, KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { RebuildAmpelProjectionCommand, type RebuildAmpelProjectionResult } from './rebuild-ampel-projection.command';

@Injectable()
@CommandHandler(RebuildAmpelProjectionCommand)
export class RebuildAmpelProjectionHandler implements ICommandHandler<RebuildAmpelProjectionCommand, Result<RebuildAmpelProjectionResult>> {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(AMPEL_PROJECTION_REPOSITORY)
    private readonly ampelProjectionRepo: IAmpelProjectionRepository,
  ) {}

  async execute(command: RebuildAmpelProjectionCommand): Promise<Result<RebuildAmpelProjectionResult>> {
    let einheitenResult: Awaited<ReturnType<IEinsatzEinheitRepository['findByEinsatzId']>>;
    try {
      einheitenResult = await this.einheitRepo.findByEinsatzId(command.einsatzId);
    } catch (error) {
      return Result.fail<RebuildAmpelProjectionResult>(`InfrastructureError:AmpelProjectionRebuild:${error instanceof Error ? error.message : String(error)}`);
    }

    if (einheitenResult.isFailure) {
      return Result.fail<RebuildAmpelProjectionResult>(einheitenResult.error ?? 'InfrastructureError:AmpelProjectionRebuild:Einheiten konnten nicht geladen werden');
    }

    let recalculated = 0;
    for (const einheit of einheitenResult.value ?? []) {
      let recomputeResult: Awaited<ReturnType<IAmpelProjectionRepository['recalculateForEinheit']>>;
      try {
        recomputeResult = await this.ampelProjectionRepo.recalculateForEinheit({
          einsatzId: command.einsatzId,
          einheitId: einheit.id.value,
          letzteAenderungAm: command.letzteAenderungAm,
          letzteAenderungVonUserId: null,
        });
      } catch (error) {
        return Result.fail<RebuildAmpelProjectionResult>(`InfrastructureError:AmpelProjectionRebuild:${error instanceof Error ? error.message : String(error)}`);
      }
      if (recomputeResult.isFailure) {
        return Result.fail<RebuildAmpelProjectionResult>(recomputeResult.error ?? 'InfrastructureError:AmpelProjectionRebuild:Recompute fehlgeschlagen');
      }
      recalculated += 1;
    }

    return Result.ok<RebuildAmpelProjectionResult>({ recalculated });
  }
}
