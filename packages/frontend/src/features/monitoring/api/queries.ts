/**
 * Query Keys Factory fuer Monitoring Feature
 *
 * @remarks Story 5.6 AC4
 */
export const MONITORING_QUERY_KEYS = {
  all: ['monitoring'] as const,
  systemHealth: () => [...MONITORING_QUERY_KEYS.all, 'system-health'] as const,
} as const;
