/**
 * Query Keys Factory für Taktische Zeichen Feature.
 *
 * Zentralisiert alle Query Keys für konsistente Cache-Verwaltung.
 * Folgt dem hierarchischen Pattern von @tanstack/react-query Best Practices.
 */

/**
 * Query Keys für Taktische Zeichen Feature.
 *
 * Hierarchische Struktur ermöglicht granulare Cache-Invalidierung:
 * - `TAKTISCHE_ZEICHEN_QUERY_KEYS.all` — invalidiert alle Taktische-Zeichen-Queries
 * - `TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(id)` — invalidiert Zeichen-Liste eines Einsatzes
 * - `TAKTISCHE_ZEICHEN_QUERY_KEYS.katalog(id)` — invalidiert Katalog-Queries
 */
export const TAKTISCHE_ZEICHEN_QUERY_KEYS = {
  /** Root Key für alle Taktische-Zeichen-Queries */
  all: ['taktische-zeichen'] as const,

  /** Einsatz-spezifische Daten */
  byEinsatz: (einsatzId: string) => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.all, einsatzId] as const,

  /** Zeichen-Liste eines Einsatzes */
  zeichen: (einsatzId: string) => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.byEinsatz(einsatzId), 'zeichen'] as const,

  /** Katalog-Einträge (global, nicht einsatz-spezifisch) */
  katalog: () => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.all, 'katalog'] as const,

  /** Gefilterter Katalog nach Kategorie und Suchbegriff */
  katalogFiltered: (filter: { kategorie?: string; suche?: string }) => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.katalog(), filter] as const,

  /** Default-Zeichen (global) */
  defaults: [...TAKTISCHE_ZEICHEN_QUERY_KEYS.all, 'defaults'] as const,

  /** Default-Zeichen für Fahrzeugtypen */
  defaultsFahrzeugtypen: () => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.defaults, 'fahrzeugtypen'] as const,

  /** Default-Zeichen für Einheitentypen */
  defaultsEinheitentypen: () => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.defaults, 'einheitentypen'] as const,
} as const;

/**
 * Retry Delay Berechnung für exponential backoff.
 *
 * @param attemptIndex - Versuchsnummer (0-basiert)
 * @returns Delay in Millisekunden (max 30 Sekunden)
 */
export function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}
