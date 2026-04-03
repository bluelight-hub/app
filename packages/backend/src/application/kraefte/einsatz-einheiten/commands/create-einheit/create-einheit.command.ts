import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Erstellen einer neuen taktischen Einheit in einem Einsatz.
 *
 * Validiert alle Eingabedaten und gibt ein typsicheres Command-Objekt zurück.
 * Die eigentliche Erstellung erfolgt im Handler über EinsatzEinheit.create().
 */
export class CreateEinheitCommand {
  private constructor(
    /** Einsatz-ID zu dem die Einheit erstellt wird (UUID) */
    public readonly einsatzId: string,
    /** Name der Einheit (z.B. "1. Bergungsgruppe") */
    public readonly name: string,
    /** Typ der Einheit (TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT) */
    public readonly typ: string,
    /** Funktion der Einheit (optional, z.B. "Bergung") */
    public readonly funktion: string | undefined,
    /** ID der übergeordneten Einheit (optional, für Hierarchie) */
    public readonly parentId: string | undefined,
    /** Soll-Stärke der Einheit (optional, default: 0) */
    public readonly sollStaerke: number | undefined,
    /** Auftrag der Einheit (optional) */
    public readonly auftrag: string | undefined,
    /** Einsatzort der Einheit (optional) */
    public readonly einsatzort: string | undefined,
    /** User-ID der die Einheit erstellt (CUID2, Audit-Trail) */
    public readonly createdBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<CreateEinheitCommand>
   */
  static create(props: {
    einsatzId: string;
    name: string;
    typ: string;
    funktion?: string;
    parentId?: string;
    sollStaerke?: number;
    auftrag?: string;
    einsatzort?: string;
    createdBy: string;
  }): Result<CreateEinheitCommand> {
    // Validation: einsatzId (nicht leer)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: name (nicht leer)
    const trimmedName = props.name?.trim() ?? '';
    if (trimmedName.length === 0) {
      return Result.fail('Name ist erforderlich');
    }

    // Validation: typ (nicht leer)
    const trimmedTyp = props.typ?.trim() ?? '';
    if (trimmedTyp.length === 0) {
      return Result.fail('Typ ist erforderlich');
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail('createdBy ist erforderlich');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: parentId (optional, CUID2 Format wenn gesetzt)
    let trimmedParentId: string | undefined = props.parentId?.trim();
    if (trimmedParentId && trimmedParentId.length > 0) {
      if (!isCuid(trimmedParentId)) {
        return Result.fail('parentId muss ein gültiger CUID2-Identifier sein');
      }
    } else {
      trimmedParentId = undefined;
    }

    // Optionale Felder trimmen
    let trimmedFunktion: string | undefined = props.funktion?.trim();
    if (trimmedFunktion !== undefined && trimmedFunktion.length === 0) {
      trimmedFunktion = undefined;
    }

    let trimmedAuftrag: string | undefined = props.auftrag?.trim();
    if (trimmedAuftrag !== undefined && trimmedAuftrag.length === 0) {
      trimmedAuftrag = undefined;
    }

    let trimmedEinsatzort: string | undefined = props.einsatzort?.trim();
    if (trimmedEinsatzort !== undefined && trimmedEinsatzort.length === 0) {
      trimmedEinsatzort = undefined;
    }

    return Result.ok(new CreateEinheitCommand(trimmedEinsatzId, trimmedName, trimmedTyp, trimmedFunktion, trimmedParentId, props.sollStaerke, trimmedAuftrag, trimmedEinsatzort, trimmedCreatedBy));
  }
}
