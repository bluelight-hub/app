import { Result } from '@domain/common/result';
import type { ErforderlicheQualifikation } from '@domain/kraefte/aggregates/rollen-definition.aggregate';
import {
  ROLLE_NAME_MIN_LENGTH,
  ROLLE_NAME_MAX_LENGTH,
  ROLLE_FUNKRUFNAME_MAX_LENGTH,
  ROLLE_BESCHREIBUNG_MAX_LENGTH,
  ROLLE_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/rolle-validation.constants';

/**
 * Command zum Aktualisieren einer RollenDefinition.
 *
 * Alle Felder außer id und updatedBy sind optional.
 * Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate).
 */
export class UpdateRollenDefinitionCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
    public readonly name?: string,
    public readonly funkrufname?: string,
    public readonly beschreibung?: string,
    public readonly istAktiv?: boolean,
    public readonly sortOrder?: number,
    public readonly erforderlicheQualifikationen?: ErforderlicheQualifikation[],
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Normalisiert String-Felder (trim) und validiert Constraints.
   */
  static create(props: {
    id: string;
    updatedBy: string;
    name?: string;
    funkrufname?: string;
    beschreibung?: string;
    istAktiv?: boolean;
    sortOrder?: number;
    erforderlicheQualifikationen?: ErforderlicheQualifikation[];
  }): Result<UpdateRollenDefinitionCommand> {
    // Validation: ID
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<UpdateRollenDefinitionCommand>('ID ist erforderlich');
    }

    // Validation: updatedBy
    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<UpdateRollenDefinitionCommand>('updatedBy ist erforderlich');
    }

    // Validation: Name (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.name !== undefined) {
      const trimmedName = props.name.trim();
      if (trimmedName.length === 0) {
        return Result.fail<UpdateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.NAME_REQUIRED);
      }
      if (trimmedName.length < ROLLE_NAME_MIN_LENGTH) {
        return Result.fail<UpdateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.NAME_TOO_SHORT);
      }
      if (trimmedName.length > ROLLE_NAME_MAX_LENGTH) {
        return Result.fail<UpdateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.NAME_TOO_LONG);
      }
    }

    // Validation: Funkrufname (optional, wenn gesetzt) - nutzt Domain-Konstanten
    if (props.funkrufname !== undefined) {
      const trimmedFunkrufname = props.funkrufname.trim();
      if (trimmedFunkrufname.length > ROLLE_FUNKRUFNAME_MAX_LENGTH) {
        return Result.fail<UpdateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
      }
    }

    // Validation und Normalisierung: Beschreibung (wenn gesetzt)
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
    // Validation: Beschreibung - Max-Length (Defense-in-Depth)
    if (beschreibung && beschreibung.length > ROLLE_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<UpdateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    // Validation: sortOrder (wenn gesetzt)
    if (props.sortOrder !== undefined) {
      if (!Number.isInteger(props.sortOrder) || !Number.isFinite(props.sortOrder)) {
        return Result.fail<UpdateRollenDefinitionCommand>('sortOrder muss eine ganze Zahl sein');
      }
      if (props.sortOrder < 0) {
        return Result.fail<UpdateRollenDefinitionCommand>('sortOrder muss >= 0 sein');
      }
    }

    // Validation: erforderlicheQualifikationen (wenn gesetzt)
    if (props.erforderlicheQualifikationen !== undefined) {
      if (!Array.isArray(props.erforderlicheQualifikationen)) {
        return Result.fail<UpdateRollenDefinitionCommand>(ROLLE_VALIDATION_ERRORS.QUALIFIKATION_IDS_REQUIRED);
      }
      // Validiere jedes Element im Array
      for (const qualifikation of props.erforderlicheQualifikationen) {
        if (!qualifikation.qualifikationId || typeof qualifikation.qualifikationId !== 'string') {
          return Result.fail<UpdateRollenDefinitionCommand>('Jede Qualifikation muss eine gültige qualifikationId haben');
        }
        if (qualifikation.qualifikationId.trim().length === 0) {
          return Result.fail<UpdateRollenDefinitionCommand>('qualifikationId darf nicht leer sein');
        }
        if (typeof qualifikation.istPflicht !== 'boolean') {
          return Result.fail<UpdateRollenDefinitionCommand>('istPflicht muss ein Boolean sein');
        }
      }
    }

    // Normalisierung: String-Felder trimmen
    const trimmedName = props.name?.trim();
    const name = trimmedName && trimmedName.length > 0 ? trimmedName : undefined;

    const trimmedFunkrufname = props.funkrufname?.trim();
    const funkrufname = trimmedFunkrufname && trimmedFunkrufname.length > 0 ? trimmedFunkrufname : undefined;

    return Result.ok<UpdateRollenDefinitionCommand>(
      new UpdateRollenDefinitionCommand(props.id.trim(), props.updatedBy.trim(), name, funkrufname, beschreibung, props.istAktiv, props.sortOrder, props.erforderlicheQualifikationen),
    );
  }
}
