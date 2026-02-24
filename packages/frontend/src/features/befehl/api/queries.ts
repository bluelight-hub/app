/**
 * Query Keys Factory für Befehl Feature
 *
 * Zentralisiert alle Query Keys für konsistente Cache-Verwaltung.
 * Folgt dem hierarchischen Pattern von @tanstack/react-query Best Practices.
 */

import type { BefehleFilterState } from '../hooks/use-befehle-filter-store';

/** Filter-Params die an den Query Key angehaengt werden */
export interface BefehleQueryFilters {
  status?: string[];
  empfaengerName?: string;
  befehlsgeberName?: string;
  q?: string;
  von?: string;
  bis?: string;
}

/** Prueft ob mindestens ein Filter aktiv ist */
export function hasActiveQueryFilters(filters?: BefehleQueryFilters): boolean {
  if (!filters) return false;
  return (filters.status?.length ?? 0) > 0 || !!filters.empfaengerName || !!filters.befehlsgeberName || !!filters.q || !!filters.von || !!filters.bis;
}

/** Konvertiert BefehleFilterState zu BefehleQueryFilters (nur server-seitige Filter) */
export function toQueryFilters(state: BefehleFilterState): BefehleQueryFilters {
  return {
    status: state.statusFilter.length > 0 ? state.statusFilter : undefined,
    empfaengerName: state.empfaengerName || undefined,
    befehlsgeberName: state.befehlsgeberName || undefined,
    q: state.searchText || undefined,
    von: state.von || undefined,
    bis: state.bis || undefined,
  };
}

export const BEFEHL_QUERY_KEYS = {
  all: ['befehl'] as const,
  lists: () => [...BEFEHL_QUERY_KEYS.all, 'list'] as const,
  list: (einsatzId: string, filters?: BefehleQueryFilters) =>
    hasActiveQueryFilters(filters) ? ([...BEFEHL_QUERY_KEYS.lists(), einsatzId, filters] as const) : ([...BEFEHL_QUERY_KEYS.lists(), einsatzId] as const),
  /** Prefix-Key fuer Cache-Invalidation: matcht ALLE list-Queries eines Einsatzes */
  listPrefix: (einsatzId: string) => [...BEFEHL_QUERY_KEYS.lists(), einsatzId] as const,
  meineBefehle: (einsatzId: string, userId: string) => [...BEFEHL_QUERY_KEYS.lists(), einsatzId, 'meine', userId] as const,
  offeneRueckfragen: (einsatzId: string) => [...BEFEHL_QUERY_KEYS.lists(), einsatzId, 'offeneRueckfragen'] as const,
  details: () => [...BEFEHL_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BEFEHL_QUERY_KEYS.details(), id] as const,
  historie: (id: string) => [...BEFEHL_QUERY_KEYS.detail(id), 'historie'] as const,
  metriken: (von?: string, bis?: string) => [...BEFEHL_QUERY_KEYS.all, 'metriken', von, bis] as const,
  empfaengerSuche: (einsatzId: string, q: string) => [...BEFEHL_QUERY_KEYS.all, 'empfaenger-suche', einsatzId, q] as const,
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
