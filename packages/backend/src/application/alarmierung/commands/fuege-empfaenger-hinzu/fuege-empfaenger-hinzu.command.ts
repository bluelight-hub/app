import { Result } from '@domain/common/result';

/**
 * Eingabeform: Empfänger-Referenz für nachträgliches Hinzufügen.
 */
export type FuegeEmpfaengerHinzuRef = { kind: 'fahrzeug'; fahrzeugId: string } | { kind: 'person'; personId: string } | { kind: 'einheit'; einheitId: string };

export interface FuegeEmpfaengerHinzuCommandProps {
  readonly alarmierungId: string;
  readonly empfaenger: FuegeEmpfaengerHinzuRef;
  readonly nameSnapshot?: string;
  readonly alarmiertAm?: Date;
  readonly createdBy: string;
}

/**
 * Command: Einen einzelnen Empfänger nachträglich zur Alarmierung hinzufügen.
 */
export class FuegeEmpfaengerHinzuCommand {
  private constructor(
    public readonly alarmierungId: string,
    public readonly empfaenger: FuegeEmpfaengerHinzuRef,
    public readonly nameSnapshot: string | undefined,
    public readonly alarmiertAm: Date | undefined,
    public readonly createdBy: string,
  ) {}

  static create(props: FuegeEmpfaengerHinzuCommandProps): Result<FuegeEmpfaengerHinzuCommand> {
    const alarmierungId = props.alarmierungId?.trim();
    if (!alarmierungId) {
      return Result.fail<FuegeEmpfaengerHinzuCommand>('alarmierungId ist erforderlich');
    }
    const createdBy = props.createdBy?.trim();
    if (!createdBy) {
      return Result.fail<FuegeEmpfaengerHinzuCommand>('createdBy ist erforderlich');
    }
    if (!props.empfaenger || typeof props.empfaenger !== 'object') {
      return Result.fail<FuegeEmpfaengerHinzuCommand>('empfaenger ist erforderlich');
    }
    const ref = sanitizeRef(props.empfaenger);
    if (!ref) {
      return Result.fail<FuegeEmpfaengerHinzuCommand>('empfaenger: ungültige oder fehlende ID');
    }
    const nameSnapshot = props.nameSnapshot?.trim() || undefined;
    return Result.ok(new FuegeEmpfaengerHinzuCommand(alarmierungId, ref, nameSnapshot, props.alarmiertAm, createdBy));
  }
}

function sanitizeRef(raw: FuegeEmpfaengerHinzuRef): FuegeEmpfaengerHinzuRef | null {
  switch (raw.kind) {
    case 'fahrzeug':
      return raw.fahrzeugId?.trim() ? { kind: 'fahrzeug', fahrzeugId: raw.fahrzeugId.trim() } : null;
    case 'person':
      return raw.personId?.trim() ? { kind: 'person', personId: raw.personId.trim() } : null;
    case 'einheit':
      return raw.einheitId?.trim() ? { kind: 'einheit', einheitId: raw.einheitId.trim() } : null;
    default:
      return null;
  }
}
