import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Query zum Abrufen des verknüpften taktischen Zeichens einer Einheit.
 *
 * Sucht das Zeichen über die Referenz-Verknüpfung (referenzTyp: 'EINHEIT', referenzId: einheitId).
 *
 * **Issue #667:** Einheit-Zeichen-Verknüpfung
 */
export class GetEinheitZeichenQuery {
  private constructor(
    /** Einsatz-ID (CUID) zur Kontext-Prüfung */
    public readonly einsatzId: string,
    /** ID der Einheit deren Zeichen geladen wird (CUID2) */
    public readonly einheitId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (CUID)
   * @param einheitId - Einheit-ID (CUID2)
   * @returns Result<GetEinheitZeichenQuery>
   */
  static create(einsatzId: string, einheitId: string): Result<GetEinheitZeichenQuery> {
    const trimmedEinsatzId = einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    const trimmedEinheitId = einheitId?.trim() ?? '';
    if (trimmedEinheitId.length === 0) {
      return Result.fail('einheitId ist erforderlich');
    }
    if (!isCuid(trimmedEinheitId)) {
      return Result.fail('einheitId muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new GetEinheitZeichenQuery(trimmedEinsatzId, trimmedEinheitId));
  }
}
