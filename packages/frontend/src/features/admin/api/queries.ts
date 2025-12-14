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
 * - ADMIN_QUERY_KEYS.kraefte.qualifikationen - invalidiert Qualifikationen-Queries
 */
export const ADMIN_QUERY_KEYS = {
  all: ['admin'] as const,
  users: ['admin', 'users'] as const,
  kraefte: {
    all: ['admin', 'kraefte'] as const,
    qualifikationen: {
      all: () => [...ADMIN_QUERY_KEYS.kraefte.all, 'qualifikationen'] as const,
      list: (filters?: { istAktiv?: boolean }) => [...ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(), 'list', filters].filter((v) => v !== undefined) as const,
      detail: (id: string) => [...ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(), 'detail', id] as const,
    },
  },
} as const;
