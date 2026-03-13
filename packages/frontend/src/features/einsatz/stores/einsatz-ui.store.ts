/**
 * Einsatz UI State Store
 *
 * Globaler UI-State für Einsatz-Feature mit TanStack Store.
 * Verwaltet UI-spezifische Zustände wie Filter, Sorting, Selected Items.
 */

import type { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzControllerFindAllVAlphaStatusEnum, EinsatzResponseDtoStatusEnum } from '@/shared';
import { createStore } from '@tanstack/react-store';

export type EinsatzDashboardSortOptionId = 'recent' | 'number' | 'status';

interface EinsatzDashboardState {
  searchTerm: string;
  statusFilter?: EinsatzResponseDtoStatusEnum;
  sortOptionId: EinsatzDashboardSortOptionId;
  showArchived: boolean;
}

/**
 * Einsatz UI State Interface
 */
export interface EinsatzUIState {
  // Selection State
  selectedEinsatzId: string | null;

  // Filter State
  filters: {
    status?: EinsatzControllerFindAllVAlphaStatusEnum;
    search?: string;
    page: number;
    limit: number;
  };

  // Sorting State
  sorting: {
    orderBy?: EinsatzControllerFindAllVAlphaOrderByEnum;
    orderDirection?: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
  };

  // View Mode State
  viewMode: 'list' | 'grid' | 'infinite';

  // Dashboard / Startseite
  dashboard: EinsatzDashboardState;
}

const DASHBOARD_STORAGE_KEY = 'einsatzDashboardState';

const initialDashboardState: EinsatzDashboardState = {
  searchTerm: '',
  statusFilter: undefined,
  sortOptionId: 'recent',
  showArchived: false,
};

function loadDashboardState(): EinsatzDashboardState {
  if (typeof window === 'undefined') {
    return initialDashboardState;
  }

  try {
    const rawValue = localStorage.getItem(DASHBOARD_STORAGE_KEY);

    if (!rawValue) {
      return initialDashboardState;
    }

    const parsed = JSON.parse(rawValue) as Partial<EinsatzDashboardState>;
    const sortOptionId = parsed.sortOptionId;

    return {
      searchTerm: typeof parsed.searchTerm === 'string' ? parsed.searchTerm : '',
      statusFilter: typeof parsed.statusFilter === 'string' ? (parsed.statusFilter as EinsatzResponseDtoStatusEnum) : undefined,
      sortOptionId: sortOptionId === 'number' || sortOptionId === 'status' || sortOptionId === 'recent' ? sortOptionId : 'recent',
      showArchived: parsed.showArchived === true,
    };
  } catch {
    return initialDashboardState;
  }
}

function persistDashboardState(state: EinsatzDashboardState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Fallback: Dashboard bleibt ohne Persistenz trotzdem nutzbar.
  }
}

/**
 * Initial State
 */
const initialState: EinsatzUIState = {
  selectedEinsatzId: null,
  filters: {
    page: 1,
    limit: 20,
  },
  sorting: {},
  viewMode: 'list',
  dashboard: loadDashboardState(),
};

/**
 * Einsatz UI Store
 *
 * Zentrale Store-Instanz für Einsatz-UI-State.
 * Nutze die bereitgestellten Helper-Funktionen für State-Updates.
 */
export const einsatzUIStore = createStore<EinsatzUIState>(initialState);

einsatzUIStore.subscribe(() => {
  persistDashboardState(einsatzUIStore.state.dashboard);
});

// ============================================
// Store Actions (Helper Functions)
// ============================================

/**
 * Setzt die ausgewählte Einsatz-ID
 */
export const setSelectedEinsatzId = (id: string | null) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    selectedEinsatzId: id,
  }));
};

/**
 * Setzt den Status-Filter
 */
export const setStatusFilter = (status?: EinsatzControllerFindAllVAlphaStatusEnum) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    filters: {
      ...state.filters,
      status,
      page: 1, // Reset page bei Filter-Änderung
    },
  }));
};

/**
 * Setzt den Such-Filter
 */
export const setSearchFilter = (search?: string) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    filters: {
      ...state.filters,
      search,
      page: 1, // Reset page bei Filter-Änderung
    },
  }));
};

/**
 * Setzt die Seite (Pagination)
 */
export const setPage = (page: number) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    filters: {
      ...state.filters,
      page,
    },
  }));
};

/**
 * Setzt das Limit (Items pro Seite)
 */
export const setLimit = (limit: number) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    filters: {
      ...state.filters,
      limit,
      page: 1, // Reset page bei Limit-Änderung
    },
  }));
};

/**
 * Setzt Sorting-Optionen
 */
export const setSorting = (orderBy?: EinsatzControllerFindAllVAlphaOrderByEnum, orderDirection?: EinsatzControllerFindAllVAlphaOrderDirectionEnum) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    sorting: {
      orderBy,
      orderDirection,
    },
  }));
};

/**
 * Setzt den View Mode
 */
export const setViewMode = (viewMode: 'list' | 'grid' | 'infinite') => {
  einsatzUIStore.setState((state) => ({
    ...state,
    viewMode,
  }));
};

/**
 * Setzt alle Filter zurück
 */
export const resetFilters = () => {
  einsatzUIStore.setState((state) => ({
    ...state,
    filters: initialState.filters,
    sorting: initialState.sorting,
  }));
};

export const setDashboardSearchTerm = (searchTerm: string) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      searchTerm,
    },
  }));
};

export const setDashboardStatusFilter = (statusFilter?: EinsatzResponseDtoStatusEnum) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      statusFilter,
    },
  }));
};

export const setDashboardSortOption = (sortOptionId: EinsatzDashboardSortOptionId) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      sortOptionId,
    },
  }));
};

export const setDashboardShowArchived = (showArchived: boolean) => {
  einsatzUIStore.setState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      showArchived,
      statusFilter: showArchived ? undefined : state.dashboard.statusFilter,
    },
  }));
};

export const resetDashboardState = () => {
  einsatzUIStore.setState((state) => ({
    ...state,
    dashboard: initialDashboardState,
  }));
};

/**
 * Setzt den kompletten Store zurück
 */
export const resetEinsatzUIStore = () => {
  einsatzUIStore.setState({
    ...initialState,
    dashboard: initialDashboardState,
  });
};

// ============================================
// Store Selectors (Helper Functions)
// ============================================

/**
 * Holt alle Filter-Werte kombiniert für TanStack Query
 */
export const getEinsatzQueryFilters = () => {
  const state = einsatzUIStore.state;
  return {
    ...state.filters,
    ...state.sorting,
  };
};
