import { isCuid } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';

/**
 * Command für die Besetzung einer Führungsrolle mit einer qualifizierten Person.
 *
 * Validiert alle Input-Felder im Factory Method und stellt sicher,
 * dass nur valide Commands an den Handler übergeben werden.
 *
 * **Business Context:**
 * Dieses Command triggert die Besetzung einer Führungsrolle (LNA, OrgL, etc.)
 * mit einer EinsatzPerson. Die Qualifikationsprüfung erfolgt im Handler (AC1).
 *
 * @see BesetzeRolleHandler für die Ausführungslogik
 */
export class BesetzeRolleCommand {
  private constructor(
    /** Einsatz-ID in dem die Rolle besetzt werden soll */
    public readonly einsatzId: string,
    /** EinsatzPerson-ID die die Rolle übernehmen soll */
    public readonly einsatzPersonId: string,
    /** RollenDefinition-ID der zu besetzenden Rolle */
    public readonly rollenDefinitionId: string,
    /** User-ID der die Besetzung durchführt (Audit Trail) */
    public readonly besetztVon: string,
  ) {}

  /**
   * Factory Method mit vollständiger Input-Validierung.
   *
   * Validiert:
   * - Alle Felder sind vorhanden und nicht leer
   * - Alle IDs sind valide CUID2-Strings
   *
   * @param props - Input-Properties für das Command
   * @returns Result<BesetzeRolleCommand> - Success mit validem Command oder Failure mit Error
   */
  public static create(props: { einsatzId: string; einsatzPersonId: string; rollenDefinitionId: string; besetztVon: string }): Result<BesetzeRolleCommand> {
    // Trimmen und Null-Checks
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    const trimmedEinsatzPersonId = props.einsatzPersonId?.trim() ?? '';
    const trimmedRollenDefinitionId = props.rollenDefinitionId?.trim() ?? '';
    const trimmedBesetztVon = props.besetztVon?.trim() ?? '';

    // Validierung: einsatzId
    if (!trimmedEinsatzId) {
      return Result.fail('einsatzId ist erforderlich');
    }
    if (!isCuid(trimmedEinsatzId)) {
      return Result.fail('einsatzId muss ein gültiger CUID2-Identifier sein');
    }

    // Validierung: einsatzPersonId
    if (!trimmedEinsatzPersonId) {
      return Result.fail('einsatzPersonId ist erforderlich');
    }
    if (!isCuid(trimmedEinsatzPersonId)) {
      return Result.fail('einsatzPersonId muss ein gültiger CUID2-Identifier sein');
    }

    // Validierung: rollenDefinitionId
    if (!trimmedRollenDefinitionId) {
      return Result.fail('rollenDefinitionId ist erforderlich');
    }
    if (!isCuid(trimmedRollenDefinitionId)) {
      return Result.fail('rollenDefinitionId muss ein gültiger CUID2-Identifier sein');
    }

    // Validierung: besetztVon
    if (!trimmedBesetztVon) {
      return Result.fail('besetztVon ist erforderlich');
    }
    if (!isCuid(trimmedBesetztVon)) {
      return Result.fail('besetztVon muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new BesetzeRolleCommand(trimmedEinsatzId, trimmedEinsatzPersonId, trimmedRollenDefinitionId, trimmedBesetztVon));
  }
}
