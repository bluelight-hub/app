/**
 * Query Keys für Server Feature
 *
 * Zentrale Verwaltung aller TanStack Query Keys für Server-Operationen.
 * Hierarchische Struktur für effiziente Cache-Invalidierung.
 */

export const SERVER_QUERY_KEYS = {
  /**
   * Base Key für alle Server-Queries
   */
  all: ['servers'] as const,

  /**
   * Query Key für Server-Liste
   */
  list: () => [...SERVER_QUERY_KEYS.all, 'list'] as const,

  /**
   * Query Key für einzelnen Server
   *
   * @param serverId - ID des Servers
   */
  detail: (serverId: string) => [...SERVER_QUERY_KEYS.all, 'detail', serverId] as const,
} as const;
