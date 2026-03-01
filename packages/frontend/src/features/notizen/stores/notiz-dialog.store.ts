/**
 * Notiz Dialog Store
 *
 * Globaler UI-State fuer den Notiz Quick-Create Dialog via Keyboard-Shortcut.
 * Pattern analog zu erinnerung-dialog.store.ts.
 */

import { createStore, useStore } from '@tanstack/react-store';

interface NotizDialogState {
  /** Ob der Quick-Create Dialog geoeffnet ist */
  isQuickCreateOpen: boolean;
  /** Einsatz-ID fuer den aktuellen Dialog-Kontext */
  einsatzId: string | null;
}

const initialState: NotizDialogState = {
  isQuickCreateOpen: false,
  einsatzId: null,
};

export const notizDialogStore = createStore<NotizDialogState>(initialState);

// ============================================
// Store Actions (Helper Functions)
// ============================================

/**
 * Oeffnet den Quick-Create Notiz Dialog fuer einen Einsatz.
 */
export const openQuickCreateNotizDialog = (einsatzId: string) => {
  notizDialogStore.setState((state) => ({
    ...state,
    isQuickCreateOpen: true,
    einsatzId,
  }));
};

/**
 * Schliesst den Quick-Create Notiz Dialog.
 */
export const closeQuickCreateNotizDialog = () => {
  notizDialogStore.setState((state) => ({
    ...state,
    isQuickCreateOpen: false,
    // einsatzId bleibt erhalten fuer potentielle Wiederverwendung
  }));
};

/**
 * Setzt den Store zurueck.
 */
export const resetNotizDialogStore = () => {
  notizDialogStore.setState(initialState);
};

// ============================================
// React Hooks
// ============================================

/**
 * Hook fuer den Quick-Create Notiz Dialog State.
 *
 * @returns Tuple aus [isOpen, einsatzId]
 */
export const useQuickCreateNotizDialogState = (): [boolean, string | null] => {
  const isOpen = useStore(notizDialogStore, (state) => state.isQuickCreateOpen);
  const einsatzId = useStore(notizDialogStore, (state) => state.einsatzId);
  return [isOpen, einsatzId];
};
