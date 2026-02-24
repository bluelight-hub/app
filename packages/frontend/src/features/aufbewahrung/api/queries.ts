/**
 * Query Keys Factory fuer Aufbewahrungs Feature
 *
 * Zentralisiert alle Query Keys fuer konsistente Cache-Verwaltung.
 * Folgt dem hierarchischen Pattern von @tanstack/react-query Best Practices.
 */

export const AUFBEWAHRUNG_QUERY_KEYS = {
  all: ['aufbewahrung'] as const,
  config: () => [...AUFBEWAHRUNG_QUERY_KEYS.all, 'config'] as const,
  vorschau: () => [...AUFBEWAHRUNG_QUERY_KEYS.all, 'vorschau'] as const,
  reports: () => [...AUFBEWAHRUNG_QUERY_KEYS.all, 'reports'] as const,
  reportsByEinsatz: (einsatzId: string) => [...AUFBEWAHRUNG_QUERY_KEYS.reports(), einsatzId] as const,
} as const;

/**
 * Exponential Backoff Retry-Verzoegerung berechnen
 *
 * @param attemptIndex - Index des aktuellen Retry-Versuchs (0-basiert)
 * @returns Verzoegerung in Millisekunden (max 30 Sekunden)
 */
export function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}
