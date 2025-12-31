import { Result } from '@domain/common/result';

/**
 * Query für die Berechnung der taktischen Stärke eines Einsatzes.
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * Berechnet die Kräfte-Verteilung nach Kategorien:
 * - Führung: Leiter, LNA, OrgL, Zugführer, Ärzte
 * - Unterführung: Gruppenführer, Truppführer
 * - Mannschaft: Alle anderen Helfer
 *
 * @see GetTaktischeStaerkeHandler für Ausführung
 */
export class GetTaktischeStaerkeQuery {
  private constructor(
    /** Einsatz-ID für die Stärke-Berechnung */
    public readonly einsatzId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (UUID)
   * @returns Result<GetTaktischeStaerkeQuery>
   */
  static create(einsatzId: string): Result<GetTaktischeStaerkeQuery> {
    const trimmed = einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    return Result.ok(new GetTaktischeStaerkeQuery(trimmed));
  }
}
