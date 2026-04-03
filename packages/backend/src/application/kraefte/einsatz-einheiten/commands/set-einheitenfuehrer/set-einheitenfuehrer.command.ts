import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Setzen des Einheitenführers einer taktischen Einheit.
 *
 * fuehrerId = null entfernt den aktuellen Einheitenführer.
 * Wenn der Führender noch nicht der Einheit zugewiesen ist, wird er automatisch zugewiesen.
 */
export class SetEinheitenfuehrerCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der Einheit (CUID2) */
    public readonly einheitId: string,
    /** EinsatzPerson-ID des neuen Führers (null = entfernen) */
    public readonly fuehrerId: string | null,
    /** User-ID des Bearbeiters (CUID2, Audit-Trail) */
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<SetEinheitenfuehrerCommand>
   */
  static create(props: { einsatzId: string; einheitId: string; fuehrerId: string | null; updatedBy: string }): Result<SetEinheitenfuehrerCommand> {
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

    // Validation: fuehrerId (optional, CUID2 wenn nicht null)
    let trimmedFuehrerId: string | null = props.fuehrerId;
    if (trimmedFuehrerId !== null) {
      trimmedFuehrerId = trimmedFuehrerId?.trim() ?? '';
      if (trimmedFuehrerId.length === 0) {
        trimmedFuehrerId = null;
      } else if (!isCuid(trimmedFuehrerId)) {
        return Result.fail('fuehrerId muss ein gültiger CUID2-Identifier sein');
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

    return Result.ok(new SetEinheitenfuehrerCommand(trimmedEinsatzId, trimmedEinheitId, trimmedFuehrerId, trimmedUpdatedBy));
  }
}
