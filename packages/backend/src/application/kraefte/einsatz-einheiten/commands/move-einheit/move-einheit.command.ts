import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Verschieben einer taktischen Einheit in der Hierarchie.
 *
 * parentId = null verschiebt die Einheit auf Top-Level.
 * Zirkuläre Hierarchien werden im Handler geprüft (Ancestor-Walk).
 */
export class MoveEinheitCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der zu verschiebenden Einheit (CUID2) */
    public readonly einheitId: string,
    /** Neue übergeordnete Einheit-ID (null = Top-Level) */
    public readonly parentId: string | null,
    /** User-ID des Bearbeiters (CUID2, Audit-Trail) */
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<MoveEinheitCommand>
   */
  static create(props: { einsatzId: string; einheitId: string; parentId: string | null; updatedBy: string }): Result<MoveEinheitCommand> {
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

    // Validation: parentId (optional, CUID2 wenn nicht null)
    let trimmedParentId: string | null = props.parentId;
    if (trimmedParentId !== null) {
      trimmedParentId = trimmedParentId?.trim() ?? '';
      if (trimmedParentId.length === 0) {
        trimmedParentId = null;
      } else if (!isCuid(trimmedParentId)) {
        return Result.fail('parentId muss ein gültiger CUID2-Identifier sein');
      }
    }

    // Validation: updatedBy (CUID2)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail('updatedBy ist erforderlich');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new MoveEinheitCommand(trimmedEinsatzId, trimmedEinheitId, trimmedParentId, trimmedUpdatedBy));
  }
}
