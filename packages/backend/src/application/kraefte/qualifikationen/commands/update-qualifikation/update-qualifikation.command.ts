import { Result } from '@domain/common/result';
import type { QualifikationKategorie } from '@domain/kraefte/aggregates/qualifikation.aggregate';

/**
 * Command zum Aktualisieren einer Qualifikation.
 *
 * Alle Felder außer id und updatedBy sind optional.
 */
export class UpdateQualifikationCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
    public readonly name?: string,
    public readonly abkuerzung?: string,
    public readonly kategorie?: QualifikationKategorie,
    public readonly beschreibung?: string,
    public readonly istAktiv?: boolean,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   */
  static create(props: {
    id: string;
    updatedBy: string;
    name?: string;
    abkuerzung?: string;
    kategorie?: QualifikationKategorie;
    beschreibung?: string;
    istAktiv?: boolean;
  }): Result<UpdateQualifikationCommand> {
    // Validation: ID
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<UpdateQualifikationCommand>('ID ist erforderlich');
    }

    // Validation: updatedBy
    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<UpdateQualifikationCommand>('updatedBy ist erforderlich');
    }

    // Validation: Name (wenn gesetzt)
    if (props.name !== undefined && props.name.trim().length < 3) {
      return Result.fail<UpdateQualifikationCommand>('Name muss mindestens 3 Zeichen haben');
    }

    // Validation: Abkuerzung (wenn gesetzt)
    if (props.abkuerzung !== undefined && props.abkuerzung.trim().length < 2) {
      return Result.fail<UpdateQualifikationCommand>('Abkürzung muss mindestens 2 Zeichen haben');
    }

    // Validation: Kategorie (wenn gesetzt)
    if (props.kategorie !== undefined) {
      const validKategorien: QualifikationKategorie[] = ['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES'];
      if (!validKategorien.includes(props.kategorie)) {
        return Result.fail<UpdateQualifikationCommand>(`Ungültige Kategorie: ${props.kategorie}. Erlaubt: ${validKategorien.join(', ')}`);
      }
    }

    // Trim beschreibung and convert empty string to undefined
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    return Result.ok<UpdateQualifikationCommand>(
      new UpdateQualifikationCommand(props.id.trim(), props.updatedBy.trim(), props.name?.trim(), props.abkuerzung?.trim(), props.kategorie, beschreibung, props.istAktiv),
    );
  }
}
