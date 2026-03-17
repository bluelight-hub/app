/**
 * Query Keys für System-Feature
 *
 * Zentralisiert alle Query Keys für System Health und Version Queries.
 */
export const SYSTEM_QUERY_KEYS = {
  all: ['system'] as const,
  health: (serverScope: string) => [...SYSTEM_QUERY_KEYS.all, 'health', serverScope] as const,
  version: (serverScope: string) => [...SYSTEM_QUERY_KEYS.all, 'version', serverScope] as const,
} as const;
