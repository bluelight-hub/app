/**
 * Status-Filter Store fuer Erinnerungen Filterung
 *
 * Verwaltet den Status-Filter-State mit TanStack Store.
 * Ermoeglicht Filterung nach Erinnerungs-Status: Alle oder spezifischer Status.
 *
 * **Story 8.4:**
 * - ErinnerungStatus Type aus ErinnerungResponseDtoStatusEnum abgeleitet
 * - StatusFilterType Tagged Union: 'all' | 'status'
 * - statusFilterStore mit TanStack Store
 * - Actions: setStatusFilter, resetStatusFilterStore
 * - Hooks: useStatusFilter, useIsStatusFilterActive
 * - Selectors: getStatusFilter, isStatusFilterActive
 * - Helpers: statusFilterToValue, createStatusFilter, isStatusFilter
 */

import { Store, useStore } from '@tanstack/react-store';
import { ErinnerungResponseDtoStatusEnum } from '@bluelight-hub/shared/client';

/**
 * Erinnerungs-Status Type
 *
 * Abgeleitet aus dem generierten ErinnerungResponseDtoStatusEnum.
 * Moegliche Werte: GEPLANT, AUSGELOEST, ACKNOWLEDGED, SNOOZED, ESKALIERT, ERLEDIGT
 */
export type ErinnerungStatus = ErinnerungResponseDtoStatusEnum;

/**
 * Re-Export des Enums fuer einfachen Zugriff auf die Werte
 */
export const ErinnerungStatus = ErinnerungResponseDtoStatusEnum;

/**
 * Status-Filter Type (Tagged Union)
 *
 * Discriminated Union fuer typsichere Filter-Handhabung.
 * Jeder Filter-Typ hat ein eindeutiges `type` Feld.
 *
 * - { type: 'all' }: Alle Erinnerungen (kein Status-Filter)
 * - { type: 'status', status: ErinnerungStatus }: Nur Erinnerungen mit diesem Status
 */
export type StatusFilterType = { type: 'all' } | { type: 'status'; status: ErinnerungStatus };

/**
 * Status-Filter Store State Interface
 */
export interface StatusFilterStoreState {
  /** Aktuell ausgewaehlter Status-Filter */
  selectedFilter: StatusFilterType;
}

/**
 * Initial Store State
 */
const initialState: StatusFilterStoreState = {
  selectedFilter: { type: 'all' },
};

/**
 * Status-Filter Store Instance
 */
export const statusFilterStore = new Store<StatusFilterStoreState>(initialState);

// ============================================
// Store Actions (Helper Functions)
// ============================================

/**
 * Setzt den Status-Filter
 *
 * Wird aufgerufen wenn der User einen Filter im Dropdown auswaehlt.
 *
 * @param filter - Neuer Filter-Wert ('all' oder status mit ErinnerungStatus)
 */
export const setStatusFilter = (filter: StatusFilterType): void => {
  statusFilterStore.setState((state) => ({
    ...state,
    selectedFilter: filter,
  }));
};

/**
 * Setzt den kompletten Store zurueck auf Initial-State
 *
 * Wird aufgerufen bei Filter-Reset oder Einsatz-Wechsel.
 *
 * **Note:** Fuer Reset nur des Filters nutze `setStatusFilter({ type: 'all' })`.
 */
export const resetStatusFilterStore = (): void => {
  statusFilterStore.setState(initialState);
};

// ============================================
// Selector Functions (Non-React)
// ============================================

/**
 * Holt den aktuellen Status-Filter-Wert
 *
 * @returns Aktueller Status-Filter
 */
export const getStatusFilter = (): StatusFilterType => {
  return statusFilterStore.state.selectedFilter;
};

/**
 * Prueft ob ein Status-Filter aktiv ist (nicht 'all')
 *
 * @returns true wenn Filter nicht 'all' ist
 */
export const isStatusFilterActive = (): boolean => {
  return statusFilterStore.state.selectedFilter.type !== 'all';
};

// ============================================
// React Hooks
// ============================================

/**
 * Hook fuer den aktuellen Status-Filter
 *
 * @returns Aktueller Filter-Wert
 */
export const useStatusFilter = (): StatusFilterType => {
  return useStore(statusFilterStore, (state) => state.selectedFilter);
};

/**
 * Hook der prueft ob ein Status-Filter aktiv ist (nicht 'all')
 *
 * Nuetzlich fuer visuelles Feedback bei aktivem Filter.
 *
 * @returns true wenn Filter nicht 'all' ist
 */
export const useIsStatusFilterActive = (): boolean => {
  return useStore(statusFilterStore, (state) => state.selectedFilter.type !== 'all');
};

/**
 * Hook der prueft ob ein bestimmter Filter-Typ aktiv ist
 *
 * Vergleicht den Typ des Filters. Bei 'status'-Typ wird auch der Status verglichen.
 *
 * @param filter - Filter zum Pruefen
 * @returns true wenn dieser Filter aktiv ist
 */
export const useIsStatusFilterMatch = (filter: StatusFilterType): boolean => {
  return useStore(statusFilterStore, (state) => {
    if (state.selectedFilter.type !== filter.type) return false;
    if (filter.type === 'status' && state.selectedFilter.type === 'status') {
      return state.selectedFilter.status === filter.status;
    }
    return true;
  });
};

/**
 * Hook fuer den kompletten Store State
 *
 * @returns Kompletter Store State
 */
export const useStatusFilterStoreState = (): StatusFilterStoreState => {
  return useStore(statusFilterStore, (state) => state);
};

// ============================================
// Helper Functions (Type Guards & Constructors)
// ============================================

/**
 * Prueft ob der Filter vom Typ 'status' ist (Type Guard)
 *
 * @param filter - Der zu pruefende Filter
 * @returns true wenn filter.type === 'status'
 */
export const isStatusFilter = (filter: StatusFilterType): filter is { type: 'status'; status: ErinnerungStatus } => {
  return filter.type === 'status';
};

/**
 * Erstellt einen StatusFilterType aus einem Filter-String
 *
 * Konvertiert String-basierte Filter ('all' oder Status-Wert)
 * zum Tagged Union Format.
 *
 * @param value - Filter-Wert als String
 * @returns StatusFilterType im Tagged Union Format
 */
export const createStatusFilter = (value: string): StatusFilterType => {
  if (value === 'all') {
    return { type: 'all' };
  }
  // Validiere ob der Wert ein gueltiger ErinnerungStatus ist
  const validStatuses = Object.values(ErinnerungStatus) as string[];
  if (validStatuses.includes(value)) {
    return { type: 'status', status: value as ErinnerungStatus };
  }
  // Fallback: Unbekannter Wert -> 'all'
  return { type: 'all' };
};

/**
 * Konvertiert einen StatusFilterType zu einem String-Wert (fuer Dropdowns, etc.)
 *
 * @param filter - StatusFilterType im Tagged Union Format
 * @returns String-Repraesentation des Filters
 */
export const statusFilterToValue = (filter: StatusFilterType): string => {
  if (filter.type === 'status') {
    return filter.status;
  }
  return filter.type;
};
