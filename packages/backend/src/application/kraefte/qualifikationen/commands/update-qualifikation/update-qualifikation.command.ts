import { Result } from '@domain/common/result';
import { QualifikationKategorie } from '@domain/kraefte/value-objects/qualifikation-kategorie';
import {
  QUALIFIKATION_NAME_MIN_LENGTH,
  QUALIFIKATION_NAME_MAX_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MIN_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MAX_LENGTH,
  QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH,
  QUALIFIKATION_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/qualifikation-validation.constants';

/**
 * Command zum Aktualisieren einer Qualifikation.
 *
 * Alle Felder außer id und updatedBy sind optional.
 * Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate).
 */
export class UpdateQualifikationCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
    public readonly name?: string,
    public readonly abkuerzung?: string,
    public readonly kategorie?: string,
    public readonly beschreibung?: string,
    public readonly istAktiv?: boolean,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Delegiert Kategorie-Validierung an QualifikationKategorie Value Object.
   */
  static create(props: { id: string; updatedBy: string; name?: string; abkuerzung?: string; kategorie?: string; beschreibung?: string; istAktiv?: boolean }): Result<UpdateQualifikationCommand> {
    // Validation: ID
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<UpdateQualifikationCommand>('ID ist erforderlich');
    }

    // Validation: updatedBy
    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<UpdateQualifikationCommand>('updatedBy ist erforderlich');
    }

    // Validation: Name (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.name !== undefined) {
      if (props.name.trim().length < QUALIFIKATION_NAME_MIN_LENGTH) {
        return Result.fail<UpdateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_SHORT);
      }
      if (props.name.trim().length > QUALIFIKATION_NAME_MAX_LENGTH) {
        return Result.fail<UpdateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_LONG);
      }
    }

    // Validation: Abkuerzung (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.abkuerzung !== undefined) {
      if (props.abkuerzung.trim().length < QUALIFIKATION_ABKUERZUNG_MIN_LENGTH) {
        return Result.fail<UpdateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_SHORT);
      }
      if (props.abkuerzung.trim().length > QUALIFIKATION_ABKUERZUNG_MAX_LENGTH) {
        return Result.fail<UpdateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_LONG);
      }
    }

    // Validation: Kategorie (delegiert an Value Object, wenn gesetzt)
    if (props.kategorie !== undefined) {
      const kategorieResult = QualifikationKategorie.create(props.kategorie);
      if (kategorieResult.isFailure) {
        return Result.fail<UpdateQualifikationCommand>(kategorieResult.error ?? 'Ungültige Kategorie');
      }
    }

    // Validation und Normalisierung: Beschreibung (wenn gesetzt)
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
    // Validation: Beschreibung - Max-Length (Defense-in-Depth)
    if (beschreibung && beschreibung.length > QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<UpdateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    return Result.ok<UpdateQualifikationCommand>(
      new UpdateQualifikationCommand(props.id.trim(), props.updatedBy.trim(), props.name?.trim(), props.abkuerzung?.trim(), props.kategorie, beschreibung, props.istAktiv),
    );
  }
}
