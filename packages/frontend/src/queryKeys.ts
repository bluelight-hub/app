/**
 * Zentrale Definition aller React Query Keys
 *
 * Diese Datei zentralisiert alle Query Keys für eine konsistente
 * und wartbare Verwendung im gesamten Frontend.
 */

const AUTH_QUERY_KEYS = (base: [string]) =>
  ({
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

// Export all query keys grouped for easier access
export const QUERY_KEYS = {
  auth: {
    queryKey: ['auth'],
    queries: AUTH_QUERY_KEYS(['auth']),
  },
  user: USER_QUERY_KEYS,
  admin: ADMIN_QUERY_KEYS,
  health: HEALTH_QUERY_KEYS,
} as const;
