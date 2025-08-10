/**
 * Zentrale Definition aller React Query Keys
 *
 * Diese Datei zentralisiert alle Query Keys für eine konsistente
 * und wartbare Verwendung im gesamten Frontend.
 */

export const AUTH_QUERY_KEYS = {
  authCheck: ['auth-check'] as const,
  adminStatus: ['admin', 'status'] as const,
  adminPresence: ['admin-presence'] as const,
} as const;

export const USER_QUERY_KEYS = {
  users: ['users'] as const,
  publicUsers: ['public-users'] as const,
} as const;

export const HEALTH_QUERY_KEYS = {
  health: ['health'] as const,
} as const;

// Export all query keys grouped for easier access
export const QUERY_KEYS = {
  auth: AUTH_QUERY_KEYS,
  user: USER_QUERY_KEYS,
  health: HEALTH_QUERY_KEYS,
} as const;
