import { Result } from '@domain/common/result';

/**
 * Query für das Laden aller EinsatzPersonen eines Einsatzes.
 *
 * Verwendet für die Personen-Übersicht im Einsatz-Detail-View.
 *
 * **Use Case Story 4-1:**
 * - Liste alle registrierten Personen eines Einsatzes
 * - Zeigt sowohl Personen aus Stammdaten (stammId gesetzt) als auch
 *   manuell erfasste Personen (stammId = undefined)
 */
export class GetEinsatzPersonenQuery {
  private constructor(
    /** Einsatz-ID für die Personen geladen werden sollen (UUID) */
    public readonly einsatzId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (UUID)
   * @returns Result<GetEinsatzPersonenQuery>
   */
  static create(einsatzId: string): Result<GetEinsatzPersonenQuery> {
    const trimmed = einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    return Result.ok(new GetEinsatzPersonenQuery(trimmed));
  }
}
