import { Result } from '@domain/common/result';
import { FUNKSTATUS_VALIDATION, FUNKSTATUS_VALIDATION_ERRORS } from '@domain/kraefte/constants/funkstatus-validation.constants';

/**
 * Props für UpdateFunkStatusConfigCommand.
 *
 * **Config-Only Pattern:**
 * - KEIN CreateCommand - FunkStatusConfig wird NICHT neu erstellt
 * - NUR UpdateCommand für Änderungen an bestehenden Einträgen
 *
 * **Wichtig:**
 * - code identifiziert den zu ändernden Status (0-9)
 * - code ist NICHT änderbar (Immutable Business Key)
 * - standardLabel ist NICHT änderbar (System-Vorgabe)
 */
export interface UpdateFunkStatusConfigCommandProps {
  /** Status-Code (0-9) - identifiziert den zu ändernden Eintrag */
  code: number;
  /** Angepasstes Label (optional, überschreibt standardLabel) */
  customLabel?: string;
  /** Farbe als Hex-Code (#RRGGBB, optional) */
  farbe?: string;
  /** Ob Fahrzeuge mit diesem Status alarmierbar sind (optional) */
  istAlarmierbar?: boolean;
  /** Beschreibung des Status (optional) */
  beschreibung?: string;
  /** User-ID des Bearbeiters (für Audit-Trail) */
  updatedBy: string;
}

/**
 * Command für Update FunkStatusConfig Operation.
 *
 * Kapselt Validierung für UpdateFunkStatusConfig Use Case.
 *
 * **Validierungen:**
 * - code muss zwischen 0 und 9 liegen
 * - updatedBy muss gesetzt sein (Audit-Trail)
 * - Weitere Validierungen (Label-Länge, Hex-Format) im Aggregate
 *
 * **Design Rationale:**
 * Command validiert NUR code Range, weil:
 * - code ist der Lookup-Key für Repository (technische Validierung)
 * - Business Validierung (Label-Länge, Farbe, Editable-Check) im Aggregate
 * - Aggregate.update() hat vollständigen Context (code, editable-Status)
 */
export class UpdateFunkStatusConfigCommand {
  private constructor(public readonly props: UpdateFunkStatusConfigCommandProps) {}

  /**
   * Factory Method mit Validation.
   *
   * Validiert code Range (0-9) und updatedBy Pflichtfeld.
   *
   * @param props - UpdateFunkStatusConfigCommandProps
   * @returns Result<UpdateFunkStatusConfigCommand>
   */
  static create(props: UpdateFunkStatusConfigCommandProps): Result<UpdateFunkStatusConfigCommand> {
    // Validation: code Range (0-9)
    if (!Number.isInteger(props.code)) {
      return Result.fail('Code muss eine ganze Zahl sein');
    }
    if (props.code < FUNKSTATUS_VALIDATION.CODE_MIN || props.code > FUNKSTATUS_VALIDATION.CODE_MAX) {
      return Result.fail(FUNKSTATUS_VALIDATION_ERRORS.CODE_OUT_OF_RANGE);
    }

    // Validation: updatedBy Pflichtfeld
    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail('updatedBy ist erforderlich für Audit-Trail');
    }

    return Result.ok(new UpdateFunkStatusConfigCommand(props));
  }

  /**
   * Getter für code (Convenience).
   */
  get code(): number {
    return this.props.code;
  }

  /**
   * Getter für updatedBy (Convenience).
   */
  get updatedBy(): string {
    return this.props.updatedBy;
  }
}
