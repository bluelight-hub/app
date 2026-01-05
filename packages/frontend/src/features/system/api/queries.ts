/**
 * Query Keys für System-Feature
 *
 * Zentralisiert alle Query Keys für System Health und Version Queries.
 */
export const SYSTEM_QUERY_KEYS = {
  all: ['system'] as const,
  health: () => [...SYSTEM_QUERY_KEYS.all, 'health'] as const,
  version: () => [...SYSTEM_QUERY_KEYS.all, 'version'] as const,
} as const;
