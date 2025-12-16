import { Result } from '@domain/common/result';
import {
  ROLLE_NAME_MIN_LENGTH,
  ROLLE_NAME_MAX_LENGTH,
  ROLLE_FUNKRUFNAME_MAX_LENGTH,
  ROLLE_BESCHREIBUNG_MAX_LENGTH,
  ROLLE_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/rolle-validation.constants';

/**
 * Erforderliche Qualifikation Input für CreateRollenDefinitionCommand.
 *
 * Kapselt die M:N-Beziehung zwischen Rolle und Qualifikation mit istPflicht Flag.
 */
export interface ErforderlicheQualifikationInput {
  qualifikationId: string;
  istPflicht: boolean;
}

/**
 * Command zum Erstellen einer neuen RollenDefinition.
 *
 * Kapselt alle erforderlichen Daten für die Rollen-Erstellung.
 * Validation findet in der Factory-Methode statt (Result Pattern).
 *
 * **Validation Strategy:**
 * - Nutzt zentrale Domain-Konstanten aus `rolle-validation.constants.ts`
 * - Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate)
 * - erforderlicheQualifikationen wird als Array validiert (kann leer sein)
 */
export class CreateRollenDefinitionCommand {
  private constructor(
    public readonly name: string,
    public readonly createdBy: string,
    public readonly funkrufname?: string,
    public readonly beschreibung?: string,
    public readonly sortOrder?: number,
    public readonly erforderlicheQualifikationen?: ErforderlicheQualifikationInput[],
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<CreateRollenDefinitionCommand> - Success oder Failure mit Fehlermeldung
   */
  static create(props: {
    name: string;
    createdBy: string;
    funkrufname?: string;
    beschreibung?: string;
    sortOrder?: number;
    erforderlicheQualifikationen?: ErforderlicheQualifikationInput[];
  }): Result<CreateRollenDefinitionCommand> {
    // Validation: Name - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.name || props.name.trim().length < ROLLE_NAME_MIN_LENGTH) {
      return Result.fail<CreateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.NAME_TOO_SHORT);
    }
    // Validation: Name - Max-Length (Defense-in-Depth, fängt zu lange Werte früh ab)
    if (props.name.trim().length > ROLLE_NAME_MAX_LENGTH) {
      return Result.fail<CreateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.NAME_TOO_LONG);
    }

    // Validation: Funkrufname (optional, nutzt Domain-Konstanten)
    if (props.funkrufname && props.funkrufname.trim().length > ROLLE_FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<CreateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
    }

    // Validation: Beschreibung (optional, nutzt Domain-Konstanten)
    if (props.beschreibung && props.beschreibung.trim().length > ROLLE_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<CreateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    // Validation: sortOrder (optional, muss >= 0 sein wenn angegeben)
    if (props.sortOrder !== undefined) {
      if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
        return Result.fail<CreateRollenDefinitionCommand>('sortOrder muss eine ganze Zahl sein (keine NaN oder Infinity)');
      }
      if (props.sortOrder < 0) {
        return Result.fail<CreateRollenDefinitionCommand>('sortOrder muss größer oder gleich 0 sein');
      }
    }

    // Validation: createdBy
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      return Result.fail<CreateRollenDefinitionCommand>('createdBy ist erforderlich');
    }

    // Validation: erforderlicheQualifikationen (muss Array sein wenn angegeben)
    if (props.erforderlicheQualifikationen !== undefined && !Array.isArray(props.erforderlicheQualifikationen)) {
      return Result.fail<CreateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.QUALIFIKATION_IDS_REQUIRED);
    }

    // Normalisierung: trim und handle empty string for optional fields
    const trimmedFunkrufname = props.funkrufname?.trim();
    const funkrufname = trimmedFunkrufname && trimmedFunkrufname.length > 0 ? trimmedFunkrufname : undefined;

    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    return Result.ok<CreateRollenDefinitionCommand>(
      new CreateRollenDefinitionCommand(props.name.trim(), props.createdBy.trim(), funkrufname, beschreibung, props.sortOrder, props.erforderlicheQualifikationen ?? []),
    );
  }
}
