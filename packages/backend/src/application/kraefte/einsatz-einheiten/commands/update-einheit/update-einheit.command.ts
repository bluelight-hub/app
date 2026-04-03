import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Aktualisieren einer taktischen Einheit.
 *
 * Alle Felder außer einsatzId, einheitId und updatedBy sind optional.
 * Nur übergebene Felder werden aktualisiert (Partial Update).
 */
export class UpdateEinheitCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der zu aktualisierenden Einheit (CUID2) */
    public readonly einheitId: string,
    /** Neuer Name (optional) */
    public readonly name: string | undefined,
    /** Neuer Typ (optional) */
    public readonly typ: string | undefined,
    /** Neue Funktion (optional, null = entfernen) */
    public readonly funktion: string | null | undefined,
    /** Neue übergeordnete Einheit-ID (optional) */
    public readonly parentId: string | undefined,
    /** Neue Soll-Stärke (optional) */
    public readonly sollStaerke: number | undefined,
    /** Neuer Auftrag (optional, null = entfernen) */
    public readonly auftrag: string | null | undefined,
    /** Neuer Einsatzort (optional, null = entfernen) */
    public readonly einsatzort: string | null | undefined,
    /** User-ID des Bearbeiters (CUID2, Audit-Trail) */
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<UpdateEinheitCommand>
   */
  static create(props: {
    einsatzId: string;
    einheitId: string;
    name?: string;
    typ?: string;
    funktion?: string | null;
    parentId?: string;
    sollStaerke?: number;
    auftrag?: string | null;
    einsatzort?: string | null;
    updatedBy: string;
  }): Result<UpdateEinheitCommand> {
    // Validation: einsatzId
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: einheitId (CUID2)
    const trimmedEinheitId = props.einheitId?.trim() ?? '';
    if (trimmedEinheitId.length === 0) {
      return Result.fail('einheitId ist erforderlich');
    }
    if (!isCuid(trimmedEinheitId)) {
      return Result.fail('einheitId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: updatedBy (CUID2)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail('updatedBy ist erforderlich');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: parentId (optional, CUID2 wenn gesetzt)
    let trimmedParentId: string | undefined = props.parentId?.trim();
    if (trimmedParentId && trimmedParentId.length > 0) {
      if (!isCuid(trimmedParentId)) {
        return Result.fail('parentId muss ein gültiger CUID2-Identifier sein');
      }
    } else {
      trimmedParentId = undefined;
    }

    return Result.ok(
      new UpdateEinheitCommand(trimmedEinsatzId, trimmedEinheitId, props.name, props.typ, props.funktion, trimmedParentId, props.sollStaerke, props.auftrag, props.einsatzort, trimmedUpdatedBy),
    );
  }
}
