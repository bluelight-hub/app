import { Result } from '@domain/common/result';

/**
 * Eingabeform eines Empfängers am Command-API-Rand.
 *
 * Die Discriminated Union (`kind`) entspricht dem Domain-Modell
 * (`AlarmierungEmpfaengerRef`). Der `nameSnapshot` ist optional — der Handler
 * lädt ihn andernfalls aus dem zuständigen Kräfte-Repository.
 */
export type ErstelleAlarmierungEmpfaengerInput =
  | { kind: 'fahrzeug'; fahrzeugId: string; nameSnapshot?: string; alarmiertAm?: Date }
  | { kind: 'person'; personId: string; nameSnapshot?: string; alarmiertAm?: Date }
  | { kind: 'einheit'; einheitId: string; nameSnapshot?: string; alarmiertAm?: Date };

export interface ErstelleAlarmierungCommandProps {
  readonly einsatzId: string;
  readonly bezeichnung: string;
  readonly beschreibung?: string;
  readonly alarmierungszeit?: Date;
  readonly ursprungAlarmierungId?: string;
  readonly empfaenger: ErstelleAlarmierungEmpfaengerInput[];
  readonly createdBy: string;
}

/**
 * Command: Eine neue Alarmierung auslösen (inkl. aller Empfänger in einem Atom).
 *
 * Validierung am API-Rand beschränkt sich auf Trivial-Invarianten
 * (Pflichtfelder, Trimming). Fachliche Regeln (z.B. „Empfänger eindeutig",
 * „nameSnapshot nicht leer") werden im Handler bzw. im Aggregat geprüft.
 */
export class ErstelleAlarmierungCommand {
  private static readonly MAX_BEZEICHNUNG = 200;
  private static readonly MAX_BESCHREIBUNG = 2000;

  private constructor(
    public readonly einsatzId: string,
    public readonly bezeichnung: string,
    public readonly beschreibung: string | undefined,
    public readonly alarmierungszeit: Date | undefined,
    public readonly ursprungAlarmierungId: string | undefined,
    public readonly empfaenger: ErstelleAlarmierungEmpfaengerInput[],
    public readonly createdBy: string,
  ) {}

  static create(props: ErstelleAlarmierungCommandProps): Result<ErstelleAlarmierungCommand> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<ErstelleAlarmierungCommand>('einsatzId ist erforderlich');
    }
    const bezeichnung = props.bezeichnung?.trim();
    if (!bezeichnung) {
      return Result.fail<ErstelleAlarmierungCommand>('Bezeichnung ist erforderlich');
    }
    if (bezeichnung.length > ErstelleAlarmierungCommand.MAX_BEZEICHNUNG) {
      return Result.fail<ErstelleAlarmierungCommand>(`Bezeichnung darf maximal ${ErstelleAlarmierungCommand.MAX_BEZEICHNUNG} Zeichen lang sein`);
    }
    const beschreibung = props.beschreibung?.trim() || undefined;
    if (beschreibung && beschreibung.length > ErstelleAlarmierungCommand.MAX_BESCHREIBUNG) {
      return Result.fail<ErstelleAlarmierungCommand>(`Beschreibung darf maximal ${ErstelleAlarmierungCommand.MAX_BESCHREIBUNG} Zeichen lang sein`);
    }
    const createdBy = props.createdBy?.trim();
    if (!createdBy) {
      return Result.fail<ErstelleAlarmierungCommand>('createdBy ist erforderlich');
    }
    if (!Array.isArray(props.empfaenger) || props.empfaenger.length === 0) {
      return Result.fail<ErstelleAlarmierungCommand>('Mindestens ein Empfänger ist erforderlich');
    }
    const ursprungAlarmierungId = props.ursprungAlarmierungId?.trim() || undefined;

    const sanitized: ErstelleAlarmierungEmpfaengerInput[] = [];
    for (const [i, raw] of props.empfaenger.entries()) {
      const e = sanitizeEmpfaenger(raw);
      if (!e) {
        return Result.fail<ErstelleAlarmierungCommand>(`Empfänger #${i + 1}: ungültige oder fehlende ID/Felder`);
      }
      sanitized.push(e);
    }

    return Result.ok(new ErstelleAlarmierungCommand(einsatzId, bezeichnung, beschreibung, props.alarmierungszeit, ursprungAlarmierungId, sanitized, createdBy));
  }
}

function sanitizeEmpfaenger(raw: ErstelleAlarmierungEmpfaengerInput | undefined | null): ErstelleAlarmierungEmpfaengerInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const nameSnapshot = raw.nameSnapshot?.trim() || undefined;
  switch (raw.kind) {
    case 'fahrzeug': {
      const fahrzeugId = raw.fahrzeugId?.trim();
      if (!fahrzeugId) return null;
      return { kind: 'fahrzeug', fahrzeugId, nameSnapshot, alarmiertAm: raw.alarmiertAm };
    }
    case 'person': {
      const personId = raw.personId?.trim();
      if (!personId) return null;
      return { kind: 'person', personId, nameSnapshot, alarmiertAm: raw.alarmiertAm };
    }
    case 'einheit': {
      const einheitId = raw.einheitId?.trim();
      if (!einheitId) return null;
      return { kind: 'einheit', einheitId, nameSnapshot, alarmiertAm: raw.alarmiertAm };
    }
    default:
      return null;
  }
}
