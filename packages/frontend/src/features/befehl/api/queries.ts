/**
 * Query Keys Factory für Befehl Feature
 *
 * Zentralisiert alle Query Keys für konsistente Cache-Verwaltung.
 * Folgt dem hierarchischen Pattern von @tanstack/react-query Best Practices.
 */

export const BEFEHL_QUERY_KEYS = {
  all: ['befehl'] as const,
  lists: () => [...BEFEHL_QUERY_KEYS.all, 'list'] as const,
  list: (einsatzId: string) => [...BEFEHL_QUERY_KEYS.lists(), einsatzId] as const,
  details: () => [...BEFEHL_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BEFEHL_QUERY_KEYS.details(), id] as const,
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
