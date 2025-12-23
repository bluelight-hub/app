import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command zum Zuweisen einer EinsatzPerson zu einem EinsatzFahrzeug.
 *
 * Validierung:
 * - einsatzId: Pflicht, CUID2 Format
 * - personId: Pflicht, CUID2 Format
 * - fahrzeugId: Pflicht, CUID2 Format
 * - updatedBy: Pflicht, CUID2 Format (User-ID für Audit)
 */
export class WeisePersonZuFahrzeugZuCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly personId: string,
    public readonly fahrzeugId: string,
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   */
  public static create(props: { einsatzId: string; personId: string; fahrzeugId: string; updatedBy: string }): Result<WeisePersonZuFahrzeugZuCommand> {
    // einsatzId (CUID2)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (!trimmedEinsatzId || !isCuid(trimmedEinsatzId)) {
      return Result.fail('einsatzId muss ein gültiger CUID2-Identifier sein');
    }

    // personId (CUID2)
    const trimmedPersonId = props.personId?.trim() ?? '';
    if (!trimmedPersonId || !isCuid(trimmedPersonId)) {
      return Result.fail('personId muss ein gültiger CUID2-Identifier sein');
    }

    // fahrzeugId (CUID2)
    const trimmedFahrzeugId = props.fahrzeugId?.trim() ?? '';
    if (!trimmedFahrzeugId || !isCuid(trimmedFahrzeugId)) {
      return Result.fail('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    }

    // updatedBy (CUID2)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (!trimmedUpdatedBy || !isCuid(trimmedUpdatedBy)) {
      return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new WeisePersonZuFahrzeugZuCommand(trimmedEinsatzId, trimmedPersonId, trimmedFahrzeugId, trimmedUpdatedBy));
  }
}
