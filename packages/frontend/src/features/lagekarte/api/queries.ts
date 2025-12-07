/**
 * Query Keys Factory für Lagekarte Feature
 *
 * Zentralisiert alle Query Keys für konsistente Cache-Verwaltung.
 * Folgt dem hierarchischen Pattern von @tanstack/react-query Best Practices.
 */

/**
 * Query Keys für Lagekarte Feature
 *
 * Hierarchische Struktur ermöglicht granulare Cache-Invalidierung:
 * - LAGEKARTE_QUERY_KEYS.all - invalidiert alle Lagekarte-Queries
 * - LAGEKARTE_QUERY_KEYS.byEinsatz(id) - invalidiert Lagekarte für Einsatz
 * - LAGEKARTE_QUERY_KEYS.screenshots(id) - invalidiert Screenshots für Einsatz
 */
export const LAGEKARTE_QUERY_KEYS = {
  all: ['lagekarte'] as const,

  // Lagekarte by Einsatz
  byEinsatz: (einsatzId: string) => [...LAGEKARTE_QUERY_KEYS.all, 'einsatz', einsatzId] as const,

  // Legacy: Direct lagekarte query (alias for byEinsatz)
  lagekarte: (einsatzId: string) => [...LAGEKARTE_QUERY_KEYS.all, einsatzId] as const,

  // Screenshots
  screenshots: (einsatzId: string) => [...LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId), 'screenshots'] as const,

  // POIs (Point of Interest)
  pois: (einsatzId: string) => ['pois', einsatzId] as const,
} as const;

/**
 * Exponential Backoff Retry-Verzögerung berechnen
 *
 * @param attemptIndex - Index des aktuellen Retry-Versuchs (0-basiert)
 * @returns Verzögerung in Millisekunden (max 30 Sekunden)
 */
export function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}
