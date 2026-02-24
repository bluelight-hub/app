/**
 * Befehle View Store
 *
 * Verwaltet die aktuelle Ansicht (Kanban oder Tabelle) fuer die Befehlsuebersicht.
 * Persistiert ueber Seitenwechsel via TanStack Store Lifecycle.
 */

import { Store, useStore } from '@tanstack/react-store';

// ============================================
// Store State & Instance
// ============================================

export type BefehleView = 'kanban' | 'tabelle';

export interface BefehleViewStoreState {
  /** Aktuelle Ansicht der Befehlsliste */
  view: BefehleView;
}

export const befehleViewStore = new Store<BefehleViewStoreState>({ view: 'kanban' });

// ============================================
// Store Actions
// ============================================

/** Setzt die aktuelle Ansicht */
export const setBefehleView = (view: BefehleView): void => {
  befehleViewStore.setState((state) => ({ ...state, view }));
};

/** Wechselt zwischen Kanban und Tabelle */
export const toggleBefehleView = (): void => {
  befehleViewStore.setState((state) => ({
    ...state,
    view: state.view === 'kanban' ? 'tabelle' : 'kanban',
  }));
};

// ============================================
// React Hooks
// ============================================

/**
 * Hook fuer die aktuelle Befehle-Ansicht.
 * @returns Tuple: [view, toggle]
 */
export function useBefehleView(): [view: BefehleView, toggle: () => void] {
  const view = useStore(befehleViewStore, (state) => state.view);
  return [view, toggleBefehleView];
}

/** Hook der nur den View-Wert zurueckgibt */
export const useCurrentBefehleView = (): BefehleView => {
  return useStore(befehleViewStore, (state) => state.view);
};
