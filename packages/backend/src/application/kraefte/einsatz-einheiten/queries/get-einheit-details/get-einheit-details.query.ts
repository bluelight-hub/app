import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Query für das Laden der Details einer taktischen Einheit.
 *
 * Liefert die Einheit mit allen zugewiesenen Personen und
 * dem aufgelösten Einheitenführer zurück.
 */
export class GetEinheitDetailsQuery {
  private constructor(
    /** Einsatz-ID (UUID) zur Zugehörigkeits-Prüfung */
    public readonly einsatzId: string,
    /** ID der Einheit deren Details geladen werden (CUID2) */
    public readonly einheitId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (UUID)
   * @param einheitId - Einheit-ID (CUID2)
   * @returns Result<GetEinheitDetailsQuery>
   */
  static create(einsatzId: string, einheitId: string): Result<GetEinheitDetailsQuery> {
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

    return Result.ok(new GetEinheitDetailsQuery(trimmedEinsatzId, trimmedEinheitId));
  }
}
