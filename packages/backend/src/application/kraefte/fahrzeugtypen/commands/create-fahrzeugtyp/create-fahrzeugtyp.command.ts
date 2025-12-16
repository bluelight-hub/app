import { Result } from '@domain/common/result';
import { FahrzeugtypKategorie } from '@domain/kraefte/value-objects/fahrzeugtyp-kategorie';
import {
  FAHRZEUGTYP_CODE_MIN_LENGTH,
  FAHRZEUGTYP_CODE_MAX_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH,
  FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH,
  FAHRZEUGTYP_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/fahrzeugtyp-validation.constants';

/**
 * Sollbesatzung Schema für Fahrzeugtyp.
 *
 * Definiert die Soll-Besetzung pro Fahrzeugtyp für Einsatzplanung.
 * Alle Felder sind optional, da nicht jeder Fahrzeugtyp alle Rollen benötigt.
 *
 * @example
 * // RTW: Rettungswagen
 * { fahrer: 1, sanitaeter: 2 }
 *
 * @example
 * // NEF: Notarzteinsatzfahrzeug
 * { fahrer: 1, notarzt: 1 }
 *
 * @example
 * // ELW: Einsatzleitwagen
 * { fahrer: 1, funktrupp: 2 }
 */
export interface SollbesatzungSchema {
  fahrer?: number;
  sanitaeter?: number;
  notarzt?: number;
  funktrupp?: number;
  helfer?: number;
}

/**
 * Command zum Erstellen eines neuen Fahrzeugtyps.
 *
 * Kapselt alle erforderlichen Daten für die Fahrzeugtyp-Erstellung.
 * Validation findet in der Factory-Methode statt (Result Pattern).
 *
 * **Validation Strategy:**
 * - Nutzt zentrale Domain-Konstanten aus `fahrzeugtyp-validation.constants.ts`
 * - Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate)
 * - Kategorie-Validierung wird an FahrzeugtypKategorie Value Object delegiert
 * - Code wird automatisch auf UPPERCASE normalisiert
 */
export class CreateFahrzeugtypCommand {
  private constructor(
    public readonly code: string,
    public readonly bezeichnung: string,
    public readonly kategorie: string,
    public readonly createdBy: string,
    public readonly beschreibung?: string,
    public readonly sollbesatzung?: SollbesatzungSchema,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Delegiert Kategorie-Validierung an FahrzeugtypKategorie Value Object.
   * Normalisiert Code zu UPPERCASE (AC2: Code UPPERCASE Normalisierung).
   *
   * @param props - Command Properties
   * @returns Result<CreateFahrzeugtypCommand> - Success oder Failure mit Fehlermeldung
   */
  static create(props: { code: string; bezeichnung: string; kategorie: string; createdBy: string; beschreibung?: string; sollbesatzung?: SollbesatzungSchema }): Result<CreateFahrzeugtypCommand> {
    // Validation: Code - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.code || props.code.trim().length < FAHRZEUGTYP_CODE_MIN_LENGTH) {
      return Result.fail<CreateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_SHORT);
    }
    // Validation: Code - Max-Length (Defense-in-Depth, fängt zu lange Werte früh ab)
    if (props.code.trim().length > FAHRZEUGTYP_CODE_MAX_LENGTH) {
      return Result.fail<CreateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_LONG);
    }

    // Validation: Bezeichnung - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.bezeichnung || props.bezeichnung.trim().length < FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH) {
      return Result.fail<CreateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_SHORT);
    }
    // Validation: Bezeichnung - Max-Length (Defense-in-Depth)
    if (props.bezeichnung.trim().length > FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH) {
      return Result.fail<CreateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_LONG);
    }

    // Validation: Kategorie (delegiert an Value Object)
    const kategorieResult = FahrzeugtypKategorie.create(props.kategorie);
    if (kategorieResult.isFailure) {
      return Result.fail<CreateFahrzeugtypCommand>(kategorieResult.error ?? 'Ungültige Kategorie');
    }

    // Validation: createdBy
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      return Result.fail<CreateFahrzeugtypCommand>('createdBy ist erforderlich');
    }

    // Validation und Normalisierung: Beschreibung
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
    // Validation: Beschreibung - Max-Length (Defense-in-Depth)
    if (beschreibung && beschreibung.length > FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<CreateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    // Validation: Sollbesatzung (optional, Werte müssen >= 0 sein)
    if (props.sollbesatzung) {
      const sollbesatzung = props.sollbesatzung;
      const validatePositiveInteger = (value: number | undefined, fieldName: string): Result<void> => {
        if (value !== undefined) {
          if (!Number.isInteger(value)) {
            return Result.fail(`${fieldName} muss eine Ganzzahl sein`);
          }
          if (value < 0) {
            return Result.fail(`${fieldName} muss >= 0 sein`);
          }
        }
        return Result.ok(undefined);
      };

      const fahrerValidation = validatePositiveInteger(sollbesatzung.fahrer, 'fahrer');
      if (fahrerValidation.isFailure) {
        return Result.fail<CreateFahrzeugtypCommand>(fahrerValidation.error || 'Unbekannter Validierungsfehler');
      }

      const sanitaeterValidation = validatePositiveInteger(sollbesatzung.sanitaeter, 'sanitaeter');
      if (sanitaeterValidation.isFailure) {
        return Result.fail<CreateFahrzeugtypCommand>(sanitaeterValidation.error || 'Unbekannter Validierungsfehler');
      }

      const notarztValidation = validatePositiveInteger(sollbesatzung.notarzt, 'notarzt');
      if (notarztValidation.isFailure) {
        return Result.fail<CreateFahrzeugtypCommand>(notarztValidation.error || 'Unbekannter Validierungsfehler');
      }

      const funktruppValidation = validatePositiveInteger(sollbesatzung.funktrupp, 'funktrupp');
      if (funktruppValidation.isFailure) {
        return Result.fail<CreateFahrzeugtypCommand>(funktruppValidation.error || 'Unbekannter Validierungsfehler');
      }

      const helferValidation = validatePositiveInteger(sollbesatzung.helfer, 'helfer');
      if (helferValidation.isFailure) {
        return Result.fail<CreateFahrzeugtypCommand>(helferValidation.error || 'Unbekannter Validierungsfehler');
      }
    }

    // Code UPPERCASE Normalisierung (AC2: Code wird automatisch auf UPPERCASE normalisiert)
    const normalizedCode = props.code.trim().toUpperCase();

    return Result.ok<CreateFahrzeugtypCommand>(new CreateFahrzeugtypCommand(normalizedCode, props.bezeichnung.trim(), props.kategorie, props.createdBy.trim(), beschreibung, props.sollbesatzung));
  }
}
