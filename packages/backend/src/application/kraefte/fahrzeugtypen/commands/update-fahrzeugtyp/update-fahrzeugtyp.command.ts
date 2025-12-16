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
import type { SollbesatzungSchema } from '../create-fahrzeugtyp/create-fahrzeugtyp.command';

/**
 * Command zum Aktualisieren eines Fahrzeugtyps.
 *
 * Alle Felder außer id und updatedBy sind optional.
 * Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate).
 */
export class UpdateFahrzeugtypCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
    public readonly code?: string,
    public readonly bezeichnung?: string,
    public readonly kategorie?: string,
    public readonly beschreibung?: string,
    public readonly sollbesatzung?: SollbesatzungSchema,
    public readonly istAktiv?: boolean,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Delegiert Kategorie-Validierung an FahrzeugtypKategorie Value Object.
   * Normalisiert Code zu UPPERCASE (AC2: Code UPPERCASE Normalisierung).
   */
  static create(props: {
    id: string;
    updatedBy: string;
    code?: string;
    bezeichnung?: string;
    kategorie?: string;
    beschreibung?: string;
    sollbesatzung?: SollbesatzungSchema;
    istAktiv?: boolean;
  }): Result<UpdateFahrzeugtypCommand> {
    // Validation: ID
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<UpdateFahrzeugtypCommand>('ID ist erforderlich');
    }

    // Validation: updatedBy
    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<UpdateFahrzeugtypCommand>('updatedBy ist erforderlich');
    }

    // Validation: Code (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.code !== undefined) {
      if (props.code.trim().length < FAHRZEUGTYP_CODE_MIN_LENGTH) {
        return Result.fail<UpdateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_SHORT);
      }
      if (props.code.trim().length > FAHRZEUGTYP_CODE_MAX_LENGTH) {
        return Result.fail<UpdateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_LONG);
      }
    }

    // Validation: Bezeichnung (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.bezeichnung !== undefined) {
      if (props.bezeichnung.trim().length < FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH) {
        return Result.fail<UpdateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_SHORT);
      }
      if (props.bezeichnung.trim().length > FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH) {
        return Result.fail<UpdateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_LONG);
      }
    }

    // Validation: Kategorie (delegiert an Value Object, wenn gesetzt)
    if (props.kategorie !== undefined) {
      const kategorieResult = FahrzeugtypKategorie.create(props.kategorie);
      if (kategorieResult.isFailure) {
        return Result.fail<UpdateFahrzeugtypCommand>(kategorieResult.error ?? 'Ungültige Kategorie');
      }
    }

    // Validation und Normalisierung: Beschreibung (wenn gesetzt)
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
    // Validation: Beschreibung - Max-Length (Defense-in-Depth)
    if (beschreibung && beschreibung.length > FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<UpdateFahrzeugtypCommand>(FAHRZEUGTYP_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
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
        return Result.fail<UpdateFahrzeugtypCommand>(fahrerValidation.error || 'Unbekannter Validierungsfehler');
      }

      const sanitaeterValidation = validatePositiveInteger(sollbesatzung.sanitaeter, 'sanitaeter');
      if (sanitaeterValidation.isFailure) {
        return Result.fail<UpdateFahrzeugtypCommand>(sanitaeterValidation.error || 'Unbekannter Validierungsfehler');
      }

      const notarztValidation = validatePositiveInteger(sollbesatzung.notarzt, 'notarzt');
      if (notarztValidation.isFailure) {
        return Result.fail<UpdateFahrzeugtypCommand>(notarztValidation.error || 'Unbekannter Validierungsfehler');
      }

      const funktruppValidation = validatePositiveInteger(sollbesatzung.funktrupp, 'funktrupp');
      if (funktruppValidation.isFailure) {
        return Result.fail<UpdateFahrzeugtypCommand>(funktruppValidation.error || 'Unbekannter Validierungsfehler');
      }

      const helferValidation = validatePositiveInteger(sollbesatzung.helfer, 'helfer');
      if (helferValidation.isFailure) {
        return Result.fail<UpdateFahrzeugtypCommand>(helferValidation.error || 'Unbekannter Validierungsfehler');
      }
    }

    // Code UPPERCASE Normalisierung (AC2: Code wird automatisch auf UPPERCASE normalisiert)
    const normalizedCode = props.code ? props.code.trim().toUpperCase() : undefined;

    return Result.ok<UpdateFahrzeugtypCommand>(
      new UpdateFahrzeugtypCommand(props.id.trim(), props.updatedBy.trim(), normalizedCode, props.bezeichnung?.trim(), props.kategorie, beschreibung, props.sollbesatzung, props.istAktiv),
    );
  }
}
