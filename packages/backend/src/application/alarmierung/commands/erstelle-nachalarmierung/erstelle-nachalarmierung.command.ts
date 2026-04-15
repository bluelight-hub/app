import { Result } from '@domain/common/result';
import type { ErstelleAlarmierungEmpfaengerInput } from '../erstelle-alarmierung/erstelle-alarmierung.command';

export interface ErstelleNachalarmierungCommandProps {
  readonly einsatzId: string;
  readonly ursprungAlarmierungId: string;
  readonly bezeichnung: string;
  readonly beschreibung?: string;
  readonly alarmierungszeit?: Date;
  readonly empfaenger: ErstelleAlarmierungEmpfaengerInput[];
  readonly createdBy: string;
}

/**
 * Command: Eine Nachalarmierung anlegen — Wrapper um
 * {@link ErstelleAlarmierungCommand} mit gesetztem `ursprungAlarmierungId`.
 *
 * Der Handler prüft zusätzlich, dass die Ursprungsalarmierung existiert
 * und zum gleichen Einsatz gehört.
 */
export class ErstelleNachalarmierungCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly ursprungAlarmierungId: string,
    public readonly bezeichnung: string,
    public readonly beschreibung: string | undefined,
    public readonly alarmierungszeit: Date | undefined,
    public readonly empfaenger: ErstelleAlarmierungEmpfaengerInput[],
    public readonly createdBy: string,
  ) {}

  static create(props: ErstelleNachalarmierungCommandProps): Result<ErstelleNachalarmierungCommand> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<ErstelleNachalarmierungCommand>('einsatzId ist erforderlich');
    }
    const ursprungAlarmierungId = props.ursprungAlarmierungId?.trim();
    if (!ursprungAlarmierungId) {
      return Result.fail<ErstelleNachalarmierungCommand>('ursprungAlarmierungId ist erforderlich');
    }
    const bezeichnung = props.bezeichnung?.trim();
    if (!bezeichnung) {
      return Result.fail<ErstelleNachalarmierungCommand>('Bezeichnung ist erforderlich');
    }
    const createdBy = props.createdBy?.trim();
    if (!createdBy) {
      return Result.fail<ErstelleNachalarmierungCommand>('createdBy ist erforderlich');
    }
    if (!Array.isArray(props.empfaenger) || props.empfaenger.length === 0) {
      return Result.fail<ErstelleNachalarmierungCommand>('Mindestens ein Empfänger ist erforderlich');
    }
    const beschreibung = props.beschreibung?.trim() || undefined;
    return Result.ok(new ErstelleNachalarmierungCommand(einsatzId, ursprungAlarmierungId, bezeichnung, beschreibung, props.alarmierungszeit, props.empfaenger, createdBy));
  }
}
