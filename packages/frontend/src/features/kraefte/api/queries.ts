/**
 * Query Keys Factory für Kräfte Feature
 *
 * Zentralisiert alle Query Keys für konsistente Cache-Verwaltung.
 * Folgt dem hierarchischen Pattern von @tanstack/react-query Best Practices.
 */

/**
 * Query Keys für Kräfte Feature
 *
 * Hierarchische Struktur ermöglicht granulare Cache-Invalidierung:
 * - KRAEFTE_QUERY_KEYS.all - invalidiert alle Kräfte-Queries
 * - KRAEFTE_QUERY_KEYS.byEinsatz(id) - invalidiert Einsatz-spezifische Queries
 * - KRAEFTE_QUERY_KEYS.staerke(id) - invalidiert nur Stärke-Query
 */
export const KRAEFTE_QUERY_KEYS = {
  /** Root Key für alle Kräfte-Queries */
  all: ['kraefte'] as const,

  /** Einsatz-spezifische Kräfte-Daten */
  byEinsatz: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.all, einsatzId] as const,

  /** Taktische Stärke (Story 6.1a) */
  staerke: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'staerke'] as const,

  /** Fahrzeuge eines Einsatzes (Story 6.1b - future) */
  fahrzeuge: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'fahrzeuge'] as const,

  /** Personen eines Einsatzes */
  personen: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'personen'] as const,

  /** Rollen eines Einsatzes (Story 6.1c - future) */
  rollen: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'rollen'] as const,

  /** RollenDefinitionen (Admin) */
  rollenDefinitionen: () => [...KRAEFTE_QUERY_KEYS.all, 'rollen-definitionen'] as const,

  /** Taktische Einheiten eines Einsatzes (Issue #411) */
  einheiten: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'einheiten'] as const,

  /** Detail-Daten einer einzelnen taktischen Einheit (Issue #411) */
  einheitDetails: (einsatzId: string, einheitId: string) => [...KRAEFTE_QUERY_KEYS.einheiten(einsatzId), einheitId] as const,

  /** Kraefte POIs fuer Lagekarte (Story 8.1) */
  pois: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'pois'] as const,

  /** Taktisches Zeichen einer Einheit (Issue #667) */
  einheitZeichen: (einsatzId: string, einheitId: string) => [...KRAEFTE_QUERY_KEYS.einheiten(einsatzId), einheitId, 'zeichen'] as const,

  /** Taktisches Zeichen eines Fahrzeugs */
  fahrzeugZeichen: (einsatzId: string, fahrzeugId: string) => [...KRAEFTE_QUERY_KEYS.fahrzeuge(einsatzId), fahrzeugId, 'zeichen'] as const,
} as const;

/**
 * Retry Delay Berechnung für exponential backoff.
 *
 * @param attemptIndex - Versuchsnummer (0-basiert)
 * @returns Delay in Millisekunden (max 30s)
 */
export function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}
