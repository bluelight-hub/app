import { Result } from '@domain/common/result';

export interface SchliesseAlarmierungAbCommandProps {
  readonly alarmierungId: string;
  readonly updatedBy: string;
}

/**
 * Command: Eine aktive Alarmierung in den Status `abgeschlossen` überführen.
 */
export class SchliesseAlarmierungAbCommand {
  private constructor(
    public readonly alarmierungId: string,
    public readonly updatedBy: string,
  ) {}

  static create(props: SchliesseAlarmierungAbCommandProps): Result<SchliesseAlarmierungAbCommand> {
    const alarmierungId = props.alarmierungId?.trim();
    if (!alarmierungId) {
      return Result.fail<SchliesseAlarmierungAbCommand>('alarmierungId ist erforderlich');
    }
    const updatedBy = props.updatedBy?.trim();
    if (!updatedBy) {
      return Result.fail<SchliesseAlarmierungAbCommand>('updatedBy ist erforderlich');
    }
    return Result.ok(new SchliesseAlarmierungAbCommand(alarmierungId, updatedBy));
  }
}
