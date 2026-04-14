import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Query zum Abrufen des verknüpften taktischen Zeichens eines Fahrzeugs.
 *
 * Sucht das Zeichen über die Referenz-Verknüpfung (referenzTyp: 'FAHRZEUG', referenzId: fahrzeugId).
 */
export class GetFahrzeugZeichenQuery {
  private constructor(
    /** Einsatz-ID (CUID) zur Kontext-Prüfung */
    public readonly einsatzId: string,
    /** ID des Fahrzeugs dessen Zeichen geladen wird (CUID2) */
    public readonly fahrzeugId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (CUID)
   * @param fahrzeugId - Fahrzeug-ID (CUID2)
   * @returns Result<GetFahrzeugZeichenQuery>
   */
  static create(einsatzId: string, fahrzeugId: string): Result<GetFahrzeugZeichenQuery> {
    const trimmedEinsatzId = einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    const trimmedFahrzeugId = fahrzeugId?.trim() ?? '';
    if (trimmedFahrzeugId.length === 0) {
      return Result.fail('fahrzeugId ist erforderlich');
    }
    if (!isCuid(trimmedFahrzeugId)) {
      return Result.fail('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new GetFahrzeugZeichenQuery(trimmedEinsatzId, trimmedFahrzeugId));
  }
}
