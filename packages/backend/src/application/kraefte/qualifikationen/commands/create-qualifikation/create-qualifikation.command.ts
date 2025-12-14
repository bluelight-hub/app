import { Result } from '@domain/common/result';
import type { QualifikationKategorie } from '@domain/kraefte/aggregates/qualifikation.aggregate';

/**
 * Command zum Erstellen einer neuen Qualifikation.
 *
 * Kapselt alle erforderlichen Daten für die Qualifikation-Erstellung.
 * Validation findet in der Factory-Methode statt (Result Pattern).
 */
export class CreateQualifikationCommand {
  private constructor(
    public readonly name: string,
    public readonly abkuerzung: string,
    public readonly kategorie: QualifikationKategorie,
    public readonly createdBy: string,
    public readonly beschreibung?: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<CreateQualifikationCommand> - Success oder Failure mit Fehlermeldung
   */
  static create(props: { name: string; abkuerzung: string; kategorie: QualifikationKategorie; createdBy: string; beschreibung?: string }): Result<CreateQualifikationCommand> {
    // Validation: Name
    if (!props.name || props.name.trim().length < 3) {
      return Result.fail<CreateQualifikationCommand>('Name muss mindestens 3 Zeichen haben');
    }

    // Validation: Abkuerzung
    if (!props.abkuerzung || props.abkuerzung.trim().length < 2) {
      return Result.fail<CreateQualifikationCommand>('Abkürzung muss mindestens 2 Zeichen haben');
    }

    // Validation: Kategorie
    const validKategorien: QualifikationKategorie[] = ['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES'];
    if (!validKategorien.includes(props.kategorie)) {
      return Result.fail<CreateQualifikationCommand>(`Ungültige Kategorie: ${props.kategorie}. Erlaubt: ${validKategorien.join(', ')}`);
    }

    // Validation: createdBy
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      return Result.fail<CreateQualifikationCommand>('createdBy ist erforderlich');
    }

    // Trim beschreibung and convert empty string to undefined
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    return Result.ok<CreateQualifikationCommand>(new CreateQualifikationCommand(props.name.trim(), props.abkuerzung.trim(), props.kategorie, props.createdBy.trim(), beschreibung));
  }
}
