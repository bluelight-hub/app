/**
 * React Query Keys für Auth-Feature
 *
 * Zentralisiert alle Query Keys für Auth-Queries und User-Queries.
 */

const AUTH_QUERY_KEYS = (base: [string]) =>
  ({
    users: [...base, 'users'] as const,
    authCheck: [...base, 'check'] as const,
    authCheckScoped: (serverScope: string) => [...base, 'check', serverScope] as const,
    adminStatus: [...base, 'admin', 'status'] as const,
    adminStatusScoped: (serverScope: string) => [...base, 'admin', 'status', serverScope] as const,
    adminPresence: [...base, 'admin', 'presence'] as const,
    publicUsers: [...base, 'public-users'] as const,
    publicUsersScoped: (serverScope: string) => [...base, 'public-users', serverScope] as const,
  }) as const;

export const USERS_QUERY_KEYS = {
  all: ['users'] as const,
  byId: (id?: string) => ['users', id] as const,
} as const;

/**
 * @deprecated Legacy query keys - verwende USERS_QUERY_KEYS stattdessen
 */
export const USER_QUERY_KEYS = {
  users: ['users'] as const,
  publicUsers: ['public-users'] as const,
} as const;

export const HEALTH_QUERY_KEYS = {
  health: ['health'] as const,
} as const;

export const AUTH_KEYS = {
  auth: {
    queryKey: ['auth'] as const,
    queries: AUTH_QUERY_KEYS(['auth']),
  },
  users: USERS_QUERY_KEYS,
  publicUsers: ['auth', 'public-users'] as const,
} as const;
