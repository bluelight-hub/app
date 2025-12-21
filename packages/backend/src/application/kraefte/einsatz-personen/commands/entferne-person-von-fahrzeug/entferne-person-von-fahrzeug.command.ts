import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command zum Entfernen einer EinsatzPerson von einem Fahrzeug.
 *
 * Validierung:
 * - einsatzId: Pflicht, UUID Format
 * - personId: Pflicht, CUID2 Format
 * - updatedBy: Pflicht, CUID2 Format (User-ID für Audit)
 *
 * Idempotenz: Wenn Person keinem Fahrzeug zugewiesen ist, wird Success ohne Event zurückgegeben.
 */
export class EntfernePersonVonFahrzeugCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly personId: string,
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   */
  public static create(props: { einsatzId: string; personId: string; updatedBy: string }): Result<EntfernePersonVonFahrzeugCommand> {
    // einsatzId
    if (!props.einsatzId?.trim()) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // personId (CUID2)
    const trimmedPersonId = props.personId?.trim() ?? '';
    if (!trimmedPersonId || !isCuid(trimmedPersonId)) {
      return Result.fail('personId muss ein gültiger CUID2-Identifier sein');
    }

    // updatedBy (CUID2)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (!trimmedUpdatedBy || !isCuid(trimmedUpdatedBy)) {
      return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new EntfernePersonVonFahrzeugCommand(props.einsatzId.trim(), trimmedPersonId, trimmedUpdatedBy));
  }
}
