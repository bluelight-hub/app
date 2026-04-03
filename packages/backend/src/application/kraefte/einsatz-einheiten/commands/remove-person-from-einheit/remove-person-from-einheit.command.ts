import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Entfernen einer EinsatzPerson von einer taktischen Einheit.
 *
 * Entfernt den M:N Eintrag aus EinsatzPersonEinheit.
 * Falls die Person Einheitenführer ist, wird der Führerstatus automatisch entfernt.
 */
export class RemovePersonFromEinheitCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der Einheit (CUID2) */
    public readonly einheitId: string,
    /** EinsatzPerson-ID der zu entfernenden Person (CUID2) */
    public readonly personId: string,
    /** User-ID des Bearbeiters (CUID2, Audit-Trail) */
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<RemovePersonFromEinheitCommand>
   */
  static create(props: { einsatzId: string; einheitId: string; personId: string; updatedBy: string }): Result<RemovePersonFromEinheitCommand> {
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

    // Validation: personId (CUID2)
    const trimmedPersonId = props.personId?.trim() ?? '';
    if (trimmedPersonId.length === 0) {
      return Result.fail('personId ist erforderlich');
    }
    if (!isCuid(trimmedPersonId)) {
      return Result.fail('personId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: updatedBy (CUID2)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail('updatedBy ist erforderlich');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new RemovePersonFromEinheitCommand(trimmedEinsatzId, trimmedEinheitId, trimmedPersonId, trimmedUpdatedBy));
  }
}
