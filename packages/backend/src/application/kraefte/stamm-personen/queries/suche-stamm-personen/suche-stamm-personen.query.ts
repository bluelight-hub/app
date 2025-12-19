import { Result } from '@domain/common/result';

/**
 * Query für Autocomplete-Suche nach StammPersonen.
 *
 * Sucht nach Nachname (LIKE-Search, Case-Insensitive).
 * Limitiert Ergebnisse auf maximal `limit` Treffer.
 *
 * **Use Case Story 4-1 AC1:**
 * - Autocomplete beim Person-Hinzufügen
 * - User tippt Nachname → Backend liefert Vorschläge
 * - Frontend zeigt Name + Personalnummer
 * - User wählt Person aus → Daten werden kopiert
 *
 * **Archivierte Personen:**
 * - Werden NICHT in Suchergebnissen angezeigt
 * - Repository filtert automatisch (archivedAt IS NULL)
 */
export class SucheStammPersonenQuery {
  private constructor(
    /** Suchbegriff für Nachname (min. 1 Zeichen) */
    public readonly searchTerm: string,
    /** Maximale Anzahl Ergebnisse (default: 10) */
    public readonly limit: number = 10,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * Mindestens 1 Zeichen für Autocomplete erforderlich.
   * Limit standardmäßig 10, maximal 50 Ergebnisse.
   *
   * @param searchTerm - Suchbegriff für Nachname
   * @param limit - Maximale Anzahl Ergebnisse (default: 10)
   * @returns Result<SucheStammPersonenQuery>
   */
  static create(searchTerm: string, limit?: number): Result<SucheStammPersonenQuery> {
    // Validate searchTerm
    const trimmed = searchTerm?.trim() ?? '';
    if (trimmed.length < 1) {
      return Result.fail('Suchbegriff muss mindestens 1 Zeichen haben');
    }

    // Validate limit (default: 10, max: 50)
    const effectiveLimit = limit ?? 10;
    if (effectiveLimit < 1) {
      return Result.fail('Limit muss mindestens 1 sein');
    }
    if (effectiveLimit > 50) {
      return Result.fail('Limit darf maximal 50 sein');
    }

    return Result.ok(new SucheStammPersonenQuery(trimmed, effectiveLimit));
  }
}
