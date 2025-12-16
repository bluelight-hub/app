import { Result } from '@domain/common/result';
import {
  STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH,
  STAMM_FAHRZEUG_BAUJAHR_MIN,
  STAMM_FAHRZEUG_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/stamm-fahrzeug-validation.constants';

/**
 * Command zum Aktualisieren eines Stamm-Fahrzeugs.
 *
 * Alle Felder außer id und updatedBy sind optional.
 * Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate).
 *
 * **WICHTIG: fahrzeugtypId ist NICHT enthalten!**
 * - Fahrzeugtyp ist IMMUTABLE nach Erstellung (siehe StammFahrzeug Aggregate)
 * - Business Rule: Ein RTW kann nicht nachträglich zu einem KTW werden
 * - Bei Typwechsel muss neues StammFahrzeug erstellt werden
 * - Aggregate.update() würde fahrzeugtypId-Änderung ablehnen (Result.fail)
 */
export class UpdateStammFahrzeugCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
    public readonly rufname?: string,
    public readonly funkrufname?: string,
    public readonly kennzeichen?: string,
    public readonly baujahr?: number,
    public readonly funkkenungBOS?: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Validiert nur gesetzte optionale Felder.
   * Normalisiert empty strings zu undefined.
   */
  static create(props: { id: string; updatedBy: string; rufname?: string; funkrufname?: string; kennzeichen?: string; baujahr?: number; funkkenungBOS?: string }): Result<UpdateStammFahrzeugCommand> {
    // Validation: ID
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<UpdateStammFahrzeugCommand>('ID ist erforderlich');
    }

    // Validation: updatedBy
    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<UpdateStammFahrzeugCommand>('updatedBy ist erforderlich');
    }

    // Validation: Rufname (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.rufname !== undefined) {
      if (props.rufname.trim().length < STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH) {
        return Result.fail<UpdateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_SHORT);
      }
      if (props.rufname.trim().length > STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH) {
        return Result.fail<UpdateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_LONG);
      }
    }

    // Validation: Funkrufname (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.funkrufname !== undefined) {
      if (props.funkrufname.trim().length < STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH) {
        return Result.fail<UpdateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_SHORT);
      }
      if (props.funkrufname.trim().length > STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH) {
        return Result.fail<UpdateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
      }
    }

    // Validation und Normalisierung: Kennzeichen (wenn gesetzt)
    const trimmedKennzeichen = props.kennzeichen?.trim();
    const kennzeichen = trimmedKennzeichen && trimmedKennzeichen.length > 0 ? trimmedKennzeichen : undefined;
    // Validation: Kennzeichen - Max-Length (Defense-in-Depth)
    if (kennzeichen && kennzeichen.length > STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH) {
      return Result.fail<UpdateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.KENNZEICHEN_TOO_LONG);
    }

    // Validation: Baujahr (wenn gesetzt)
    if (props.baujahr !== undefined) {
      if (!Number.isFinite(props.baujahr) || !Number.isInteger(props.baujahr)) {
        return Result.fail<UpdateStammFahrzeugCommand>('Baujahr muss eine ganze Zahl sein');
      }
      if (props.baujahr < STAMM_FAHRZEUG_BAUJAHR_MIN) {
        return Result.fail<UpdateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.BAUJAHR_TOO_LOW);
      }
    }

    // Validation und Normalisierung: FunkkenungBOS (wenn gesetzt)
    const trimmedFunkkenungBOS = props.funkkenungBOS?.trim();
    const funkkenungBOS = trimmedFunkkenungBOS && trimmedFunkkenungBOS.length > 0 ? trimmedFunkkenungBOS : undefined;
    // Validation: FunkkenungBOS - Max-Length (Defense-in-Depth)
    if (funkkenungBOS && funkkenungBOS.length > STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH) {
      return Result.fail<UpdateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKKENNUNG_TOO_LONG);
    }

    return Result.ok<UpdateStammFahrzeugCommand>(
      new UpdateStammFahrzeugCommand(props.id.trim(), props.updatedBy.trim(), props.rufname?.trim(), props.funkrufname?.trim(), kennzeichen, props.baujahr, funkkenungBOS),
    );
  }
}
