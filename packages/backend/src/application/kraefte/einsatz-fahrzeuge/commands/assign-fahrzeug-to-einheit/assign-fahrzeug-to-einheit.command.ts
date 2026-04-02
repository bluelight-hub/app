import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Zuweisen eines EinsatzFahrzeugs zu einer taktischen Einheit.
 *
 * Setzt einheitId auf dem Fahrzeug-Aggregate (direkte 1:N FK-Relation).
 * Bei null wird die Zuweisung entfernt.
 */
export class AssignFahrzeugToEinheitCommand {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** EinsatzFahrzeug-ID (CUID2) */
    public readonly fahrzeugId: string,
    /** Einheit-ID (CUID2) oder null zum Entfernen */
    public readonly einheitId: string | null,
    /** User-ID des Bearbeiters (CUID2, Audit-Trail) */
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<AssignFahrzeugToEinheitCommand>
   */
  static create(props: { einsatzId: string; fahrzeugId: string; einheitId: string | null; updatedBy: string }): Result<AssignFahrzeugToEinheitCommand> {
    // Validation: einsatzId
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: fahrzeugId (CUID2)
    const trimmedFahrzeugId = props.fahrzeugId?.trim() ?? '';
    if (trimmedFahrzeugId.length === 0) {
      return Result.fail('fahrzeugId ist erforderlich');
    }
    if (!isCuid(trimmedFahrzeugId)) {
      return Result.fail('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: einheitId (CUID2, nullable)
    let trimmedEinheitId: string | null = null;
    if (props.einheitId !== null && props.einheitId !== undefined) {
      trimmedEinheitId = props.einheitId.trim();
      if (trimmedEinheitId.length === 0) {
        trimmedEinheitId = null;
      } else if (!isCuid(trimmedEinheitId)) {
        return Result.fail('einheitId muss ein gültiger CUID2-Identifier sein');
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

    return Result.ok(new AssignFahrzeugToEinheitCommand(trimmedEinsatzId, trimmedFahrzeugId, trimmedEinheitId, trimmedUpdatedBy));
  }
}
