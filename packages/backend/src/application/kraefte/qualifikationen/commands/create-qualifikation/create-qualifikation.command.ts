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
 * Command zum Erstellen einer neuen Qualifikation.
 *
 * Kapselt alle erforderlichen Daten für die Qualifikation-Erstellung.
 * Validation findet in der Factory-Methode statt (Result Pattern).
 *
 * **Validation Strategy:**
 * - Nutzt zentrale Domain-Konstanten aus `qualifikation-validation.constants.ts`
 * - Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate)
 * - Kategorie-Validierung wird an QualifikationKategorie Value Object delegiert
 */
export class CreateQualifikationCommand {
  private constructor(
    public readonly name: string,
    public readonly abkuerzung: string,
    public readonly kategorie: string,
    public readonly createdBy: string,
    public readonly beschreibung?: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Delegiert Kategorie-Validierung an QualifikationKategorie Value Object.
   *
   * @param props - Command Properties
   * @returns Result<CreateQualifikationCommand> - Success oder Failure mit Fehlermeldung
   */
  static create(props: { name: string; abkuerzung: string; kategorie: string; createdBy: string; beschreibung?: string }): Result<CreateQualifikationCommand> {
    // Validation: Name - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.name || props.name.trim().length < QUALIFIKATION_NAME_MIN_LENGTH) {
      return Result.fail<CreateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_SHORT);
    }
    // Validation: Name - Max-Length (Defense-in-Depth, fängt zu lange Werte früh ab)
    if (props.name.trim().length > QUALIFIKATION_NAME_MAX_LENGTH) {
      return Result.fail<CreateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_LONG);
    }

    // Validation: Abkuerzung - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.abkuerzung || props.abkuerzung.trim().length < QUALIFIKATION_ABKUERZUNG_MIN_LENGTH) {
      return Result.fail<CreateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_SHORT);
    }
    // Validation: Abkuerzung - Max-Length (Defense-in-Depth)
    if (props.abkuerzung.trim().length > QUALIFIKATION_ABKUERZUNG_MAX_LENGTH) {
      return Result.fail<CreateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_LONG);
    }

    // Validation: Kategorie (delegiert an Value Object)
    const kategorieResult = QualifikationKategorie.create(props.kategorie);
    if (kategorieResult.isFailure) {
      return Result.fail<CreateQualifikationCommand>(kategorieResult.error ?? 'Ungültige Kategorie');
    }

    // Validation: createdBy
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      return Result.fail<CreateQualifikationCommand>('createdBy ist erforderlich');
    }

    // Validation und Normalisierung: Beschreibung
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
    // Validation: Beschreibung - Max-Length (Defense-in-Depth)
    if (beschreibung && beschreibung.length > QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<CreateQualifikationCommand>(QUALIFIKATION_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    return Result.ok<CreateQualifikationCommand>(new CreateQualifikationCommand(props.name.trim(), props.abkuerzung.trim(), props.kategorie, props.createdBy.trim(), beschreibung));
  }
}
