/**
 * Zentrale Definition aller React Query Keys
 *
 * Diese Datei zentralisiert alle Query Keys für eine konsistente
 * und wartbare Verwendung im gesamten Frontend.
 */

const AUTH_QUERY_KEYS = (base: [string]) =>
  ({
    users: [...base, 'users'] as const,
    authCheck: [...base, 'check'] as const,
    adminStatus: [...base, 'admin', 'status'] as const,
    adminPresence: [...base, 'admin', 'presence'] as const,
  }) as const;

export const USER_QUERY_KEYS = {
  users: ['users'] as const,
  publicUsers: ['public-users'] as const,
} as const;

export const ADMIN_QUERY_KEYS = {
  users: ['admin', 'users'] as const,
} as const;

export const HEALTH_QUERY_KEYS = {
  health: ['health'] as const,
} as const;

export const EINSATZ_QUERY_KEYS = {
  all: ['einsatz'] as const,
  lists: () => [...EINSATZ_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...EINSATZ_QUERY_KEYS.lists(), filters].filter((value) => value),
  infiniteLists: () => [...EINSATZ_QUERY_KEYS.all, 'infinite'] as const,
  infinite: (filters?: Record<string, unknown>) => [...EINSATZ_QUERY_KEYS.infiniteLists(), filters].filter((value) => value),
  details: () => [...EINSATZ_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string | null) => [...EINSATZ_QUERY_KEYS.details(), id] as const,
  previous: (id: string) => [...EINSATZ_QUERY_KEYS.all, 'previous', id] as const,
  next: (id: string) => [...EINSATZ_QUERY_KEYS.all, 'next', id] as const,
  completeness: (id: string) => [...EINSATZ_QUERY_KEYS.detail(id), 'completeness'] as const,
  statusCounts: (includeArchived = false) => [...EINSATZ_QUERY_KEYS.all, 'statusCounts', includeArchived] as const,
} as const;

// Export all query keys grouped for easier access
export const QUERY_KEYS = {
  auth: {
    queryKey: ['auth'],
    queries: AUTH_QUERY_KEYS(['auth']),
  },
  user: USER_QUERY_KEYS,
  admin: ADMIN_QUERY_KEYS,
  health: HEALTH_QUERY_KEYS,
  einsatz: EINSATZ_QUERY_KEYS,
} as const;
