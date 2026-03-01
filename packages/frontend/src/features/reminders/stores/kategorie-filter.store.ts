/**
 * Kategorie-Filter Store fuer Erinnerungen/Notizen Filterung
 *
 * Verwaltet den Kategorie-Filter-State mit TanStack Store.
 * Ermoeglicht Filterung nach Kategorie: Alle, spezifische Kategorie, ohne Kategorie.
 *
 * **Story 8.3 Task 1:**
 * - KategorieFilterType Tagged Union: 'all' | 'kategorie' | 'untagged'
 * - kategorieFilterStore mit TanStack Store
 * - Actions: setKategorieFilter, resetKategorieFilterStore
 * - Hooks: useKategorieFilter, useIsKategorieFilterActive
 * - Helpers: kategorieFilterToValue, createKategorieFilter
 */

import { createStore, useStore } from '@tanstack/react-store';

/**
 * Kategorie-Filter Type (Tagged Union)
 *
 * Discriminated Union fuer typsichere Filter-Handhabung.
 * Jeder Filter-Typ hat ein eindeutiges `type` Feld.
 *
 * - { type: 'all' }: Alle Erinnerungen (kein Kategorie-Filter) (AC1)
 * - { type: 'kategorie', kategorieId: string }: Nur Erinnerungen mit dieser Kategorie (AC2)
 * - { type: 'untagged' }: Nur Erinnerungen ohne zugewiesene Kategorie (AC4)
 */
export type KategorieFilterType = { type: 'all' } | { type: 'kategorie'; kategorieId: string } | { type: 'untagged' };

/**
 * Kategorie-Filter Store State Interface
 */
export interface KategorieFilterStoreState {
  /** Aktuell ausgewaehlter Kategorie-Filter */
  selectedFilter: KategorieFilterType;
}

/**
 * Initial Store State
 */
const initialState: KategorieFilterStoreState = {
  selectedFilter: { type: 'all' },
};

/**
 * Kategorie-Filter Store Instance
 */
export const kategorieFilterStore = createStore<KategorieFilterStoreState>(initialState);

// ============================================
// Store Actions (Helper Functions)
// ============================================

/**
 * Setzt den Kategorie-Filter
 *
 * Wird aufgerufen wenn der User einen Filter im Dropdown auswaehlt.
 *
 * @param filter - Neuer Filter-Wert ('all', 'untagged' oder kategorie mit kategorieId)
 */
export const setKategorieFilter = (filter: KategorieFilterType): void => {
  kategorieFilterStore.setState((state) => ({
    ...state,
    selectedFilter: filter,
  }));
};

/**
 * Setzt den kompletten Store zurueck auf Initial-State
 *
 * Wird aufgerufen bei Filter-Reset oder Einsatz-Wechsel.
 *
 * **Note:** Fuer Reset nur des Filters nutze `setKategorieFilter({ type: 'all' })`.
 */
export const resetKategorieFilterStore = (): void => {
  kategorieFilterStore.setState(initialState);
};

// ============================================
// Selector Functions (Non-React)
// ============================================

/**
 * Holt den aktuellen Kategorie-Filter-Wert
 *
 * @returns Aktueller Kategorie-Filter
 */
export const getKategorieFilter = (): KategorieFilterType => {
  return kategorieFilterStore.state.selectedFilter;
};

/**
 * Prueft ob ein Kategorie-Filter aktiv ist (nicht 'all')
 *
 * @returns true wenn Filter nicht 'all' ist
 */
export const isKategorieFilterActive = (): boolean => {
  return kategorieFilterStore.state.selectedFilter.type !== 'all';
};

// ============================================
// React Hooks
// ============================================

/**
 * Hook fuer den aktuellen Kategorie-Filter
 *
 * @returns Aktueller Filter-Wert
 */
export const useKategorieFilter = (): KategorieFilterType => {
  return useStore(kategorieFilterStore, (state) => state.selectedFilter);
};

/**
 * Hook der prueft ob ein Kategorie-Filter aktiv ist (nicht 'all')
 *
 * Nützlich für visuelles Feedback bei aktivem Filter (AC3).
 *
 * @returns true wenn Filter nicht 'all' ist
 */
export const useIsKategorieFilterActive = (): boolean => {
  return useStore(kategorieFilterStore, (state) => state.selectedFilter.type !== 'all');
};

/**
 * Hook der prueft ob ein bestimmter Filter-Typ aktiv ist
 *
 * Vergleicht den Typ des Filters. Bei 'kategorie'-Typ wird auch die kategorieId verglichen.
 * Analog zu useIsFilterActive in team-filter.store.ts.
 *
 * @param filter - Filter zum Pruefen
 * @returns true wenn dieser Filter aktiv ist
 */
export const useIsKategorieFilterMatch = (filter: KategorieFilterType): boolean => {
  return useStore(kategorieFilterStore, (state) => {
    if (state.selectedFilter.type !== filter.type) return false;
    if (filter.type === 'kategorie' && state.selectedFilter.type === 'kategorie') {
      return state.selectedFilter.kategorieId === filter.kategorieId;
    }
    return true;
  });
};

/**
 * Hook fuer den kompletten Store State
 *
 * @returns Kompletter Store State
 */
export const useKategorieFilterStoreState = (): KategorieFilterStoreState => {
  return useStore(kategorieFilterStore, (state) => state);
};

// ============================================
// Helper Functions (Type Guards & Constructors)
// ============================================

/**
 * Prueft ob der Filter vom Typ 'kategorie' ist
 *
 * @param filter - Der zu pruefende Filter
 * @returns true wenn filter.type === 'kategorie'
 */
export const isKategorieFilter = (filter: KategorieFilterType): filter is { type: 'kategorie'; kategorieId: string } => {
  return filter.type === 'kategorie';
};

/**
 * Erstellt einen KategorieFilterType aus einem Filter-String
 *
 * Konvertiert String-basierte Filter ('all', 'untagged', kategorieId)
 * zum Tagged Union Format.
 *
 * @param value - Filter-Wert als String
 * @returns KategorieFilterType im Tagged Union Format
 */
export const createKategorieFilter = (value: string): KategorieFilterType => {
  switch (value) {
    case 'all':
      return { type: 'all' };
    case 'untagged':
      return { type: 'untagged' };
    default:
      return { type: 'kategorie', kategorieId: value };
  }
};

/**
 * Konvertiert einen KategorieFilterType zu einem String-Wert (fuer Dropdowns, etc.)
 *
 * @param filter - KategorieFilterType im Tagged Union Format
 * @returns String-Repraesentation des Filters
 */
export const kategorieFilterToValue = (filter: KategorieFilterType): string => {
  if (filter.type === 'kategorie') {
    return filter.kategorieId;
  }
  return filter.type;
};
