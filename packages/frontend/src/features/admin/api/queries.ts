/**
 * Query Keys Factory für Admin Feature
 *
 * Zentralisiert alle Query Keys für konsistente Cache-Verwaltung.
 * Folgt dem hierarchischen Pattern von @tanstack/react-query Best Practices.
 */

/**
 * Query Keys für Admin Feature
 *
 * Hierarchische Struktur ermöglicht granulare Cache-Invalidierung:
 * - ADMIN_QUERY_KEYS.all - invalidiert alle Admin-Queries
 * - ADMIN_QUERY_KEYS.users - invalidiert User-Management-Queries
 */
export const ADMIN_QUERY_KEYS = {
  all: ['admin'] as const,
  users: ['admin', 'users'] as const,
} as const;
