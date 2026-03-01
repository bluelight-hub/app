/**
 * Befehle Filter Store
 *
 * Verwaltet den erweiterten Filter-State fuer die Befehlsliste
 * (Status, Empfaenger, Befehlsgeber, Freitext, Zeitraum).
 * Persistiert ueber Seitenwechsel via TanStack Store Lifecycle.
 */

import { createStore, useStore } from '@tanstack/react-store';
import type { BefehlDtoStatusEnum } from '@bluelight-hub/shared/client';

// ============================================
// Store State & Instance
// ============================================

export interface BefehleFilterState {
  /** Aktive Status-Filter (Multi-Select) */
  statusFilter: BefehlDtoStatusEnum[];
  /** Filter nach Empfaenger-Name */
  empfaengerName: string;
  /** Filter nach Befehlsgeber-Name */
  befehlsgeberName: string;
  /** Freitext-Suche */
  searchText: string;
  /** Zeitraum-Start (ISO date string oder '') */
  von: string;
  /** Zeitraum-Ende (ISO date string oder '') */
  bis: string;
}

const INITIAL_STATE: BefehleFilterState = {
  statusFilter: [],
  empfaengerName: '',
  befehlsgeberName: '',
  searchText: '',
  von: '',
  bis: '',
};

export const befehleFilterStore = createStore<BefehleFilterState>(INITIAL_STATE);

// ============================================
// Store Actions
// ============================================

/** Setzt die Status-Filter */
export const setStatusFilter = (statuses: BefehlDtoStatusEnum[]): void => {
  befehleFilterStore.setState((state) => ({ ...state, statusFilter: statuses }));
};

/** Setzt den Empfaenger-Name Filter */
export const setEmpfaengerName = (name: string): void => {
  befehleFilterStore.setState((state) => ({ ...state, empfaengerName: name }));
};

/** Setzt den Befehlsgeber-Name Filter */
export const setBefehlsgeberName = (name: string): void => {
  befehleFilterStore.setState((state) => ({ ...state, befehlsgeberName: name }));
};

/** Setzt den Freitext-Suchbegriff */
export const setSearchText = (text: string): void => {
  befehleFilterStore.setState((state) => ({ ...state, searchText: text }));
};

/** Setzt das Von-Datum (ISO string oder '') */
export const setVon = (date: string): void => {
  befehleFilterStore.setState((state) => ({ ...state, von: date }));
};

/** Setzt das Bis-Datum (ISO string oder '') */
export const setBis = (date: string): void => {
  befehleFilterStore.setState((state) => ({ ...state, bis: date }));
};

/** Setzt alle Filter auf den Initialzustand zurueck */
export const resetBefehleFilter = (): void => {
  befehleFilterStore.setState(() => INITIAL_STATE);
};

// ============================================
// React Hooks
// ============================================

/** Hook fuer den gesamten Filter-State */
export function useBefehleFilter(): BefehleFilterState {
  return useStore(befehleFilterStore, (state) => state);
}

/** Hook der die Anzahl aktiver Filter zurueckgibt */
export function useActiveFilterCount(): number {
  return useStore(befehleFilterStore, (state) => {
    let count = 0;
    if (state.statusFilter.length > 0) count++;
    if (state.empfaengerName.length > 0) count++;
    if (state.befehlsgeberName.length > 0) count++;
    if (state.searchText.length > 0) count++;
    if (state.von.length > 0) count++;
    if (state.bis.length > 0) count++;
    return count;
  });
}

/** Hook der prueft ob mindestens ein Filter aktiv ist */
export function useHasActiveFilters(): boolean {
  return useStore(befehleFilterStore, (state) => {
    return state.statusFilter.length > 0 || state.empfaengerName.length > 0 || state.befehlsgeberName.length > 0 || state.searchText.length > 0 || state.von.length > 0 || state.bis.length > 0;
  });
}
