import { Result } from '@domain/common/result';

/**
 * Query fuer das Laden der Kraefte als GeoJSON POIs fuer die Lagekarte.
 *
 * **Verwendung:**
 * Wird von der Lagekarte genutzt um EinsatzFahrzeuge mit Position
 * als GeoJSON FeatureCollection anzuzeigen.
 *
 * **Validierung:**
 * - einsatzId ist Pflichtfeld
 */
export class GetKraeftePoisQuery {
  private constructor(
    /** Einsatz-ID fuer die Fahrzeuge als POIs geladen werden sollen (UUID) */
    public readonly einsatzId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (UUID)
   * @returns Result<GetKraeftePoisQuery>
   */
  static create(einsatzId: string): Result<GetKraeftePoisQuery> {
    const trimmed = einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    return Result.ok(new GetKraeftePoisQuery(trimmed));
  }
}
