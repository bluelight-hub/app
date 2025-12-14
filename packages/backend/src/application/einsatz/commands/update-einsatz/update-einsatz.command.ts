import { EINSATZ_FIELD_LIMITS, validateRequiredStringResult, validateStringLengthResult } from '@application/common/validators/string-validator';
import { Result } from '@domain/common/result';
import { Address } from '@domain/value-objects/address';

/**
 * Command zum Aktualisieren eines existierenden Einsatzes.
 *
 * Implementiert Partial Update Pattern: Nur übergebene Felder werden aktualisiert.
 * - einsatzId: Pflichtfeld - ID des zu aktualisierenden Einsatzes
 * - alarmstichwort: Optional - Neues Alarmstichwort
 * - einsatzort: Optional - Neuer Einsatzort als String (wird intern zu Address Value Object konvertiert)
 * - bemerkung: Optional - Neue Bemerkung
 *
 * @example
 * ```typescript
 * // Nur alarmstichwort ändern
 * const result = UpdateEinsatzCommand.create('einsatz-id', 'Großbrand');
 *
 * // Mehrere Felder ändern
 * const result2 = UpdateEinsatzCommand.create('einsatz-id', undefined, 'Hauptstraße 1', 'Neue Bemerkung');
 * ```
 */
export class UpdateEinsatzCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly alarmstichwort?: string,
    public readonly einsatzort?: Address,
    public readonly bemerkung?: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   * Konvertiert einsatzort-String zu Address Value Object (Application Layer Verantwortung).
   */
  public static create(einsatzId: string, alarmstichwort?: string, einsatzort?: string, bemerkung?: string): Result<UpdateEinsatzCommand> {
    // einsatzId ist required
    const einsatzIdError = validateRequiredStringResult(einsatzId, 'einsatzId');
    if (einsatzIdError) return Result.fail(einsatzIdError);

    // Mindestens ein Feld muss aktualisiert werden
    const hasUpdates = alarmstichwort !== undefined || einsatzort !== undefined || bemerkung !== undefined;

    if (!hasUpdates) {
      return Result.fail('Mindestens ein Feld muss aktualisiert werden');
    }

    // alarmstichwort mit maxLength validieren (wenn übergeben)
    const alarmstichwortError = validateStringLengthResult(alarmstichwort, 'Alarmstichwort', EINSATZ_FIELD_LIMITS.ALARMSTICHWORT_MAX_LENGTH);
    if (alarmstichwortError) return Result.fail(alarmstichwortError);

    // bemerkung mit maxLength validieren (wenn übergeben)
    const bemerkungError = validateStringLengthResult(bemerkung, 'Bemerkung', EINSATZ_FIELD_LIMITS.BEMERKUNG_MAX_LENGTH);
    if (bemerkungError) return Result.fail(bemerkungError);

    // Konvertiere einsatzort-String zu Address Value Object (als Freitext-Ort)
    const addressValue = einsatzort ? Address.create({ ort: einsatzort }).value : undefined;

    return Result.ok(new UpdateEinsatzCommand(einsatzId.trim(), alarmstichwort?.trim(), addressValue, bemerkung?.trim()));
  }
}
