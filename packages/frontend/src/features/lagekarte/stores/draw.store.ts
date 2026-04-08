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
  /** Ist MapboxDraw im Vertex-Bearbeitungsmodus (direct_select) */
  isDirectSelect: boolean;
  /** Snap an Vertices/Kanten aktiviert */
  snapEnabled: boolean;
}

const initialState: DrawStoreState = {
  drawMode: 'idle',
  selectedFeatureIds: [],
  isDrawToolbarVisible: false,
  isDirectSelect: false,
  snapEnabled: true,
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
    // Toolbar einklappen wenn Zeichenmodus beendet wird
    isDrawToolbarVisible: mode === 'idle' ? false : state.isDrawToolbarVisible,
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
 * Setzt den direct_select-Status (Vertex-Bearbeitung)
 */
export const setDirectSelect = (active: boolean) => {
  drawStore.setState((state) => ({
    ...state,
    isDirectSelect: active,
  }));
};

/**
 * Schaltet die Sichtbarkeit der Draw-Toolbar um
 */
export const toggleDrawToolbar = () => {
  drawStore.setState((state) => ({
    ...state,
    isDrawToolbarVisible: !state.isDrawToolbarVisible,
    // Beim Einklappen auf Select-Modus wechseln
    drawMode: !state.isDrawToolbarVisible ? state.drawMode : 'select',
  }));
};

/**
 * Schaltet Snap an Vertices/Kanten um
 */
export const toggleSnapEnabled = () => {
  drawStore.setState((state) => ({
    ...state,
    snapEnabled: !state.snapEnabled,
  }));
};

/**
 * Setzt den Draw-Store auf den Initialzustand zurück
 */
export const resetDrawStore = () => {
  drawStore.setState(() => initialState);
};
