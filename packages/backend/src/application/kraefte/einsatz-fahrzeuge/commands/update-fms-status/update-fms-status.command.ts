import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { EINSATZ_FAHRZEUG_VALIDATION } from '@domain/kraefte/constants/einsatz-fahrzeug-validation.constants';

/**
 * Props für UpdateFmsStatusCommand Factory.
 */
export interface UpdateFmsStatusCommandProps {
  /** Einsatz-ID (UUID) */
  einsatzId: string;
  /** EinsatzFahrzeug-ID (CUID2) */
  fahrzeugId: string;
  /** Neuer FMS-Status (0-9) */
  fmsStatus: number;
  /** User-ID (CUID2) der die Änderung durchführt */
  updatedBy: string;
  /** Optional: GPS Position */
  position?: { lat: number; lng: number };
}

/**
 * Command für FMS-Status Update eines EinsatzFahrzeugs.
 *
 * **Validierung:**
 * - einsatzId: Nicht leer (UUID-Format wird im Controller validiert)
 * - fahrzeugId: CUID2 Format
 * - fmsStatus: Integer 0-9
 * - updatedBy: CUID2 Format
 * - position: Optional, aber wenn vorhanden lat/lng in gültigem Bereich
 */
export class UpdateFmsStatusCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly fahrzeugId: string,
    public readonly fmsStatus: number,
    public readonly updatedBy: string,
    public readonly position?: { lat: number; lng: number },
  ) {}

  /**
   * Factory Method mit Validierung.
   */
  static create(props: UpdateFmsStatusCommandProps): Result<UpdateFmsStatusCommand> {
    // Validation: einsatzId (nicht leer, UUID-Format wird im Controller validiert)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (!trimmedEinsatzId) {
      return Result.fail<UpdateFmsStatusCommand>('einsatzId ist erforderlich');
    }

    // Validation: fahrzeugId (CUID2)
    const trimmedFahrzeugId = props.fahrzeugId?.trim() ?? '';
    if (!trimmedFahrzeugId || !isCuid(trimmedFahrzeugId)) {
      return Result.fail<UpdateFmsStatusCommand>('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: fmsStatus (0-9)
    if (
      !Number.isFinite(props.fmsStatus) ||
      !Number.isInteger(props.fmsStatus) ||
      props.fmsStatus < EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MIN ||
      props.fmsStatus > EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MAX
    ) {
      return Result.fail<UpdateFmsStatusCommand>(`fmsStatus muss zwischen ${EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MIN} und ${EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MAX} liegen`);
    }

    // Validation: updatedBy (CUID2)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (!trimmedUpdatedBy || !isCuid(trimmedUpdatedBy)) {
      return Result.fail<UpdateFmsStatusCommand>('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: position (optional)
    if (props.position) {
      if (props.position.lat < -90 || props.position.lat > 90 || props.position.lng < -180 || props.position.lng > 180) {
        return Result.fail<UpdateFmsStatusCommand>('Position ungültig: lat muss zwischen -90 und 90, lng zwischen -180 und 180 liegen');
      }
    }

    return Result.ok<UpdateFmsStatusCommand>(new UpdateFmsStatusCommand(trimmedEinsatzId, trimmedFahrzeugId, props.fmsStatus, trimmedUpdatedBy, props.position));
  }
}
