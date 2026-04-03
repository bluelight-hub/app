import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Ändern des Status einer taktischen Einheit.
 *
 * Gültige Status: AUFGESTELLT, EINSATZBEREIT, IM_EINSATZ, IN_RESERVE, AUFGELOEST.
 * Die Validierung der Status-Übergänge erfolgt im Domain Layer.
 */
export class ChangeEinheitStatusCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der Einheit deren Status geändert wird (CUID2) */
    public readonly einheitId: string,
    /** Neuer Status der Einheit */
    public readonly status: string,
    /** User-ID des Bearbeiters (CUID2, Audit-Trail) */
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<ChangeEinheitStatusCommand>
   */
  static create(props: { einsatzId: string; einheitId: string; status: string; updatedBy: string }): Result<ChangeEinheitStatusCommand> {
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

    // Validation: status (nicht leer)
    const trimmedStatus = props.status?.trim() ?? '';
    if (trimmedStatus.length === 0) {
      return Result.fail('Status ist erforderlich');
    }

    // Validation: updatedBy (CUID2)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail('updatedBy ist erforderlich');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new ChangeEinheitStatusCommand(trimmedEinsatzId, trimmedEinheitId, trimmedStatus, trimmedUpdatedBy));
  }
}
