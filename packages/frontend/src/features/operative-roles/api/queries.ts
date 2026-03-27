/**
 * Query Keys für operative Rollen und Beitrittsanfragen
 *
 * Zentralisierte Query-Key-Definitionen für TanStack Query.
 * Ermöglicht gezielte Cache-Invalidierung und Prefetching.
 */

export const OPERATIVE_ROLES_QUERY_KEYS = {
  all: ['operative-roles'] as const,
  beitrittsanfragen: () => [...OPERATIVE_ROLES_QUERY_KEYS.all, 'beitrittsanfragen'] as const,
  beitrittsanfragenByEinsatz: (einsatzId: string) => [...OPERATIVE_ROLES_QUERY_KEYS.beitrittsanfragen(), einsatzId] as const,
} as const;
