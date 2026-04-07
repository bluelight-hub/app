/**
 * Draw Store
 *
 * Verwaltet den UI-Zustand der Zeichenwerkzeuge (Modus, Selektion, Toolbar-Sichtbarkeit)
 * mit @tanstack/react-store.
 */

import { createStore } from '@tanstack/react-store';
import type { DrawMode } from '../drawing/types';

/**
 * State für die Zeichenwerkzeuge der Lagekarte
 */
export interface DrawStoreState {
  /** Aktiver Zeichenmodus */
  drawMode: DrawMode;
  /** IDs der aktuell selektierten Features */
  selectedFeatureIds: string[];
  /** Ist die Draw-Toolbar sichtbar */
  isDrawToolbarVisible: boolean;
}

const initialState: DrawStoreState = {
  drawMode: 'idle',
  selectedFeatureIds: [],
  isDrawToolbarVisible: true,
};

/**
 * Draw Store Instanz
 */
export const drawStore = createStore<DrawStoreState>(initialState);

// ============================================
// Store Actions
// ============================================

/**
 * Setzt den aktiven Zeichenmodus
 */
export const setDrawMode = (mode: DrawMode) => {
  drawStore.setState((state) => ({
    ...state,
    drawMode: mode,
    // Selektion aufheben wenn ein Zeichenmodus aktiviert wird
    selectedFeatureIds: mode !== 'select' && mode !== 'idle' ? [] : state.selectedFeatureIds,
  }));
};

/**
 * Setzt die selektierten Feature-IDs
 */
export const setSelectedFeatures = (ids: string[]) => {
  drawStore.setState((state) => ({
    ...state,
    selectedFeatureIds: ids,
  }));
};

/**
 * Schaltet die Sichtbarkeit der Draw-Toolbar um
 */
export const toggleDrawToolbar = () => {
  drawStore.setState((state) => ({
    ...state,
    isDrawToolbarVisible: !state.isDrawToolbarVisible,
  }));
};

/**
 * Setzt den Draw-Store auf den Initialzustand zurück
 */
export const resetDrawStore = () => {
  drawStore.setState(() => initialState);
};
