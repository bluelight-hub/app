import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
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
 * Command zum Erstellen eines neuen Stamm-Fahrzeugs.
 *
 * Kapselt alle erforderlichen Daten für die StammFahrzeug-Erstellung.
 * Validation findet in der Factory-Methode statt (Result Pattern).
 *
 * **Validation Strategy:**
 * - Nutzt zentrale Domain-Konstanten aus `stamm-fahrzeug-validation.constants.ts`
 * - Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate)
 * - CUID2-Validierung für fahrzeugtypId und createdBy
 * - Optionale Felder werden zu undefined normalisiert (empty string → undefined)
 *
 * **Fahrzeugtyp Immutability:**
 * - fahrzeugtypId kann NACH Erstellung NICHT mehr geändert werden
 * - UpdateStammFahrzeugCommand enthält fahrzeugtypId NICHT
 * - Business Rule: Bei Typwechsel muss neues StammFahrzeug erstellt werden
 */
export class CreateStammFahrzeugCommand {
  private constructor(
    public readonly rufname: string,
    public readonly funkrufname: string,
    public readonly fahrzeugtypId: string,
    public readonly createdBy: string,
    public readonly kennzeichen?: string,
    public readonly baujahr?: number,
    public readonly funkkenungBOS?: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Validiert alle Pflichtfelder und optionale Felder (wenn gesetzt).
   * Normalisiert empty strings zu undefined für optionale Felder.
   *
   * @param props - Command Properties
   * @returns Result<CreateStammFahrzeugCommand> - Success oder Failure mit Fehlermeldung
   */
  static create(props: {
    rufname: string;
    funkrufname: string;
    fahrzeugtypId: string;
    createdBy: string;
    kennzeichen?: string;
    baujahr?: number;
    funkkenungBOS?: string;
  }): Result<CreateStammFahrzeugCommand> {
    // Validation: Rufname - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.rufname || props.rufname.trim().length < STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH) {
      return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_SHORT);
    }
    // Validation: Rufname - Max-Length (Defense-in-Depth, fängt zu lange Werte früh ab)
    if (props.rufname.trim().length > STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH) {
      return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_LONG);
    }

    // Validation: Funkrufname - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.funkrufname || props.funkrufname.trim().length < STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH) {
      return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_SHORT);
    }
    // Validation: Funkrufname - Max-Length (Defense-in-Depth)
    if (props.funkrufname.trim().length > STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
    }

    // Validation: fahrzeugtypId (CUID2 Format)
    if (!props.fahrzeugtypId || props.fahrzeugtypId.trim().length === 0) {
      return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FAHRZEUGTYP_ID_REQUIRED);
    }
    if (!isCuid(props.fahrzeugtypId.trim())) {
      return Result.fail<CreateStammFahrzeugCommand>('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: createdBy (CUID2 Format)
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      return Result.fail<CreateStammFahrzeugCommand>('createdBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(props.createdBy.trim())) {
      return Result.fail<CreateStammFahrzeugCommand>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation und Normalisierung: Kennzeichen (optional)
    const trimmedKennzeichen = props.kennzeichen?.trim();
    const kennzeichen = trimmedKennzeichen && trimmedKennzeichen.length > 0 ? trimmedKennzeichen : undefined;
    // Validation: Kennzeichen - Max-Length (Defense-in-Depth)
    if (kennzeichen && kennzeichen.length > STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH) {
      return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.KENNZEICHEN_TOO_LONG);
    }

    // Validation: Baujahr (optional, Wert muss >= 1900 sein und integer)
    if (props.baujahr !== undefined) {
      if (!Number.isFinite(props.baujahr) || !Number.isInteger(props.baujahr)) {
        return Result.fail<CreateStammFahrzeugCommand>('Baujahr muss eine ganze Zahl sein');
      }
      if (props.baujahr < STAMM_FAHRZEUG_BAUJAHR_MIN) {
        return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.BAUJAHR_TOO_LOW);
      }
    }

    // Validation und Normalisierung: FunkkenungBOS (optional)
    const trimmedFunkkenungBOS = props.funkkenungBOS?.trim();
    const funkkenungBOS = trimmedFunkkenungBOS && trimmedFunkkenungBOS.length > 0 ? trimmedFunkkenungBOS : undefined;
    // Validation: FunkkenungBOS - Max-Length (Defense-in-Depth)
    if (funkkenungBOS && funkkenungBOS.length > STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH) {
      return Result.fail<CreateStammFahrzeugCommand>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKKENNUNG_TOO_LONG);
    }

    return Result.ok<CreateStammFahrzeugCommand>(
      new CreateStammFahrzeugCommand(props.rufname.trim(), props.funkrufname.trim(), props.fahrzeugtypId.trim(), props.createdBy.trim(), kennzeichen, props.baujahr, funkkenungBOS),
    );
  }
}
