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
 * - ADMIN_QUERY_KEYS.stammdaten.fahrzeuge - invalidiert StammFahrzeuge-Queries
 * - ADMIN_QUERY_KEYS.stammdaten.personen - invalidiert StammPersonen-Queries
 * - ADMIN_QUERY_KEYS.security - invalidiert Security-Queries (Status, Migration)
 */
export const ADMIN_QUERY_KEYS = {
  all: ['admin'] as const,
  users: ['admin', 'users'] as const,
  kraefte: {
    all: ['admin', 'kraefte'] as const,
    fahrzeugtypen: {
      all: () => [...ADMIN_QUERY_KEYS.kraefte.all, 'fahrzeugtypen'] as const,
      list: (filters?: { istAktiv?: boolean }) =>
        filters ? ([...ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(), 'list'] as const),
      detail: (id: string) => [...ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(), 'detail', id] as const,
    },
    qualifikationen: {
      all: () => [...ADMIN_QUERY_KEYS.kraefte.all, 'qualifikationen'] as const,
      list: (filters?: { istAktiv?: boolean }) =>
        filters ? ([...ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(), 'list'] as const),
      detail: (id: string) => [...ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(), 'detail', id] as const,
    },
    rollenDefinitionen: {
      all: () => [...ADMIN_QUERY_KEYS.kraefte.all, 'rollenDefinitionen'] as const,
      list: (filters?: { istAktiv?: boolean }) =>
        filters ? ([...ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(), 'list'] as const),
      detail: (id: string) => [...ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(), 'detail', id] as const,
    },
  },
  befehle: {
    all: ['admin', 'befehle'] as const,
    befehlsgeberVorschlaege: {
      all: () => [...ADMIN_QUERY_KEYS.befehle.all, 'befehlsgeber-vorschlaege'] as const,
      list: (filters?: { istAktiv?: boolean }) =>
        filters ? ([...ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(), 'list'] as const),
      detail: (id: string) => [...ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(), 'detail', id] as const,
    },
  },
  stammdaten: {
    all: ['admin', 'stammdaten'] as const,
    fahrzeuge: {
      all: () => [...ADMIN_QUERY_KEYS.stammdaten.all, 'fahrzeuge'] as const,
      list: (filters?: { includeArchived?: boolean }) =>
        filters ? ([...ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(), 'list'] as const),
      detail: (id: string) => [...ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(), 'detail', id] as const,
    },
    personen: {
      all: () => [...ADMIN_QUERY_KEYS.stammdaten.all, 'personen'] as const,
      list: (filters?: { includeArchived?: boolean }) =>
        filters ? ([...ADMIN_QUERY_KEYS.stammdaten.personen.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.stammdaten.personen.all(), 'list'] as const),
      detail: (id: string) => [...ADMIN_QUERY_KEYS.stammdaten.personen.all(), 'detail', id] as const,
    },
  },
  integrations: {
    all: ['admin', 'integrations'] as const,
    hiorg: {
      all: () => [...ADMIN_QUERY_KEYS.integrations.all, 'hiorg'] as const,
      credentials: () => [...ADMIN_QUERY_KEYS.integrations.hiorg.all(), 'credentials'] as const,
      preview: (filters?: { activeOnly?: boolean }) =>
        filters ? ([...ADMIN_QUERY_KEYS.integrations.hiorg.all(), 'preview', filters] as const) : ([...ADMIN_QUERY_KEYS.integrations.hiorg.all(), 'preview'] as const),
      qualifikationMappings: () => [...ADMIN_QUERY_KEYS.integrations.hiorg.all(), 'qualifikationMappings'] as const,
    },
  },
  invites: {
    all: () => [...ADMIN_QUERY_KEYS.all, 'invites'] as const,
    list: (filters?: { status?: string; createdBy?: string; page?: number; pageSize?: number; sort?: string }) =>
      filters ? ([...ADMIN_QUERY_KEYS.invites.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.invites.all(), 'list'] as const),
    detail: (id: string) => [...ADMIN_QUERY_KEYS.invites.all(), 'detail', id] as const,
  },
  accessTokens: {
    all: () => [...ADMIN_QUERY_KEYS.all, 'accessTokens'] as const,
    /**
     * Query Key fuer Token-Liste.
     * Hinweis: Sortierung erfolgt client-seitig (siehe TokenList.tsx),
     * daher enthaelt der Query Key nur Pagination-Parameter.
     */
    list: (filters?: { page?: number; limit?: number }) =>
      filters ? ([...ADMIN_QUERY_KEYS.accessTokens.all(), 'list', filters] as const) : ([...ADMIN_QUERY_KEYS.accessTokens.all(), 'list'] as const),
    detail: (id: string) => [...ADMIN_QUERY_KEYS.accessTokens.all(), 'detail', id] as const,
  },
  security: {
    all: () => [...ADMIN_QUERY_KEYS.all, 'security'] as const,
    status: () => [...ADMIN_QUERY_KEYS.all, 'security', 'status'] as const,
  },
} as const;
