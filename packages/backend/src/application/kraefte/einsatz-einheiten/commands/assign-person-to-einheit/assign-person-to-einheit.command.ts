import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Zuweisen einer EinsatzPerson zu einer taktischen Einheit.
 *
 * Erstellt einen Eintrag in der M:N Junction Table (EinsatzPersonEinheit).
 * Die Person muss bereits im Einsatz registriert sein.
 */
export class AssignPersonToEinheitCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der Einheit (CUID2) */
    public readonly einheitId: string,
    /** EinsatzPerson-ID der zuzuweisenden Person (CUID2) */
    public readonly personId: string,
    /** User-ID des Bearbeiters (CUID2, Audit-Trail) */
    public readonly createdBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<AssignPersonToEinheitCommand>
   */
  static create(props: { einsatzId: string; einheitId: string; personId: string; createdBy: string }): Result<AssignPersonToEinheitCommand> {
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

    // Validation: createdBy (CUID2)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail('createdBy ist erforderlich');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new AssignPersonToEinheitCommand(trimmedEinsatzId, trimmedEinheitId, trimmedPersonId, trimmedCreatedBy));
  }
}
