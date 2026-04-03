import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Löschen einer taktischen Einheit.
 *
 * Voraussetzungen für die Löschung:
 * - Keine untergeordneten Einheiten (Children)
 * - Keine zugewiesenen Personen
 */
export class DeleteEinheitCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der zu löschenden Einheit (CUID2) */
    public readonly einheitId: string,
    /** User-ID des Löschenden (CUID2, Audit-Trail) */
    public readonly deletedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<DeleteEinheitCommand>
   */
  static create(props: { einsatzId: string; einheitId: string; deletedBy: string }): Result<DeleteEinheitCommand> {
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

    // Validation: deletedBy (CUID2)
    const trimmedDeletedBy = props.deletedBy?.trim() ?? '';
    if (trimmedDeletedBy.length === 0) {
      return Result.fail('deletedBy ist erforderlich');
    }
    if (!isCuid(trimmedDeletedBy)) {
      return Result.fail('deletedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new DeleteEinheitCommand(trimmedEinsatzId, trimmedEinheitId, trimmedDeletedBy));
  }
}
