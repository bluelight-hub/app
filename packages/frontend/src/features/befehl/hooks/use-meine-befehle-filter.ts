/**
 * "Meine Befehle" Filter Store
 *
 * Verwaltet den Filter-State fuer die Befehlsliste mit TanStack Store.
 * Ermoeglicht Umschaltung zwischen "Alle Befehle" und "Meine Befehle".
 *
 * Default basiert auf Viewport:
 * - Mobile (< 768px): showMeineBefehle = true
 * - Desktop: showMeineBefehle = false
 */

import { createStore, useStore } from '@tanstack/react-store';

// ============================================
// Store State & Instance
// ============================================

export interface MeineBefehleFilterStoreState {
  /** Ob nur eigene Befehle angezeigt werden */
  showMeineBefehle: boolean;
  /** Ob nur Befehle mit offenen Rueckfragen angezeigt werden */
  showOffeneRueckfragen: boolean;
}

/** Viewport-basierter Default: Mobile zeigt "Meine Befehle" */
const getInitialState = (): MeineBefehleFilterStoreState => ({
  showMeineBefehle: typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  showOffeneRueckfragen: false,
});

export const meineBefehleFilterStore = createStore<MeineBefehleFilterStoreState>(getInitialState());

// ============================================
// Store Actions
// ============================================

/** Setzt den "Meine Befehle" Filter-Wert (deaktiviert "Offene Rueckfragen" bei Aktivierung) */
export const setShowMeineBefehle = (show: boolean): void => {
  meineBefehleFilterStore.setState((state) => ({
    ...state,
    showMeineBefehle: show,
    showOffeneRueckfragen: show ? false : state.showOffeneRueckfragen,
  }));
};

/** Togglet den "Meine Befehle" Filter */
export const toggleMeineBefehle = (): void => {
  meineBefehleFilterStore.setState((state) => ({
    ...state,
    showMeineBefehle: !state.showMeineBefehle,
    showOffeneRueckfragen: !state.showMeineBefehle ? false : state.showOffeneRueckfragen,
  }));
};

/** Setzt den "Offene Rueckfragen" Filter-Wert (deaktiviert "Meine Befehle" bei Aktivierung) */
export const setShowOffeneRueckfragen = (show: boolean): void => {
  meineBefehleFilterStore.setState((state) => ({
    ...state,
    showOffeneRueckfragen: show,
    showMeineBefehle: show ? false : state.showMeineBefehle,
  }));
};

/** Togglet den "Offene Rueckfragen" Filter */
export const toggleOffeneRueckfragen = (): void => {
  meineBefehleFilterStore.setState((state) => ({
    ...state,
    showOffeneRueckfragen: !state.showOffeneRueckfragen,
    showMeineBefehle: !state.showOffeneRueckfragen ? false : state.showMeineBefehle,
  }));
};

/** Setzt den Store auf den Viewport-basierten Default zurueck */
export const resetMeineBefehleFilterStore = (): void => {
  meineBefehleFilterStore.setState(getInitialState());
};

// ============================================
// React Hooks
// ============================================

/**
 * Hook fuer den "Meine Befehle" Filter
 *
 * Gibt den aktuellen Filter-Wert und eine Toggle-Funktion zurueck.
 * Default wird einmalig beim Store-Init aus dem Viewport ermittelt.
 *
 * @returns Tuple: [showMeineBefehle, toggleMeineBefehle]
 */
export function useMeineBefehleFilter(): [showMeineBefehle: boolean, toggle: () => void] {
  const showMeineBefehle = useStore(meineBefehleFilterStore, (state) => state.showMeineBefehle);

  return [showMeineBefehle, toggleMeineBefehle];
}

/** Hook der nur den booleschen Wert zurueckgibt */
export const useShowMeineBefehle = (): boolean => {
  return useStore(meineBefehleFilterStore, (state) => state.showMeineBefehle);
};

/**
 * Hook fuer den "Offene Rueckfragen" Filter
 *
 * Gibt den aktuellen Filter-Wert und eine Toggle-Funktion zurueck.
 *
 * @returns Tuple: [showOffeneRueckfragen, toggleOffeneRueckfragen]
 */
export function useOffeneRueckfragenFilter(): [showOffeneRueckfragen: boolean, toggle: () => void] {
  const showOffeneRueckfragen = useStore(meineBefehleFilterStore, (state) => state.showOffeneRueckfragen);
  return [showOffeneRueckfragen, toggleOffeneRueckfragen];
}

/** Hook der nur den booleschen Wert fuer offene Rueckfragen zurueckgibt */
export const useShowOffeneRueckfragen = (): boolean => {
  return useStore(meineBefehleFilterStore, (state) => state.showOffeneRueckfragen);
};
