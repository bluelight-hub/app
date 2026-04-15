import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { ALARMIERUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { ErstelleAlarmierungCommand } from '../erstelle-alarmierung/erstelle-alarmierung.command';
import { ErstelleAlarmierungHandler } from '../erstelle-alarmierung/erstelle-alarmierung.handler';
import type { ErstelleNachalarmierungCommand } from './erstelle-nachalarmierung.command';

/**
 * Handler: Legt eine Nachalarmierung an. Validiert vor dem Delegieren an den
 * {@link ErstelleAlarmierungHandler}, dass die Ursprungsalarmierung existiert
 * und zum gleichen Einsatz gehört. Persistierung + Outbox laufen in der TX
 * des Delegate-Handlers.
 */
@Injectable()
export class ErstelleNachalarmierungHandler {
  constructor(
    @Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository,
    private readonly erstelleAlarmierungHandler: ErstelleAlarmierungHandler,
  ) {}

  async execute(command: ErstelleNachalarmierungCommand): Promise<Result<AlarmierungAggregate>> {
    const ursprungIdResult = AlarmierungId.create(command.ursprungAlarmierungId);
    if (ursprungIdResult.isFailure || !ursprungIdResult.value) {
      return Result.fail<AlarmierungAggregate>(ursprungIdResult.error ?? 'Ungültige ursprungAlarmierungId');
    }

    const ursprung = await this.alarmierungRepository.findById(ursprungIdResult.value);
    if (!ursprung) {
      return Result.fail<AlarmierungAggregate>('Ursprungs-Alarmierung nicht gefunden');
    }

    if (ursprung.einsatzId.value !== command.einsatzId) {
      return Result.fail<AlarmierungAggregate>('Ursprungs-Alarmierung gehört nicht zum angegebenen Einsatz');
    }

    const inner = ErstelleAlarmierungCommand.create({
      einsatzId: command.einsatzId,
      bezeichnung: command.bezeichnung,
      beschreibung: command.beschreibung,
      alarmierungszeit: command.alarmierungszeit,
      ursprungAlarmierungId: command.ursprungAlarmierungId,
      empfaenger: command.empfaenger,
      createdBy: command.createdBy,
    });
    if (inner.isFailure || !inner.value) {
      return Result.fail<AlarmierungAggregate>(inner.error ?? 'Nachalarmierung konnte nicht erstellt werden');
    }
    return this.erstelleAlarmierungHandler.execute(inner.value);
  }
}
