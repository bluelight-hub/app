import { Result } from '@domain/common/result';

export interface EntferneEmpfaengerCommandProps {
  readonly alarmierungId: string;
  readonly empfaengerId: string;
  readonly updatedBy: string;
}

/**
 * Command: Einen Empfänger aus einer Alarmierung entfernen.
 */
export class EntferneEmpfaengerCommand {
  private constructor(
    public readonly alarmierungId: string,
    public readonly empfaengerId: string,
    public readonly updatedBy: string,
  ) {}

  static create(props: EntferneEmpfaengerCommandProps): Result<EntferneEmpfaengerCommand> {
    const alarmierungId = props.alarmierungId?.trim();
    if (!alarmierungId) {
      return Result.fail<EntferneEmpfaengerCommand>('alarmierungId ist erforderlich');
    }
    const empfaengerId = props.empfaengerId?.trim();
    if (!empfaengerId) {
      return Result.fail<EntferneEmpfaengerCommand>('empfaengerId ist erforderlich');
    }
    const updatedBy = props.updatedBy?.trim();
    if (!updatedBy) {
      return Result.fail<EntferneEmpfaengerCommand>('updatedBy ist erforderlich');
    }
    return Result.ok(new EntferneEmpfaengerCommand(alarmierungId, empfaengerId, updatedBy));
  }
}
