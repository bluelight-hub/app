import { Result } from '@domain/common/result';

/**
 * Query für das Laden aller EinsatzFahrzeuge eines Einsatzes.
 *
 * Verwendet für die Fahrzeug-Übersicht im Einsatz-Detail-View.
 */
export class GetEinsatzFahrzeugeQuery {
  private constructor(
    /** Einsatz-ID für die Fahrzeuge geladen werden sollen (UUID) */
    public readonly einsatzId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (UUID)
   * @returns Result<GetEinsatzFahrzeugeQuery>
   */
  static create(einsatzId: string): Result<GetEinsatzFahrzeugeQuery> {
    const trimmed = einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    return Result.ok(new GetEinsatzFahrzeugeQuery(trimmed));
  }
}
