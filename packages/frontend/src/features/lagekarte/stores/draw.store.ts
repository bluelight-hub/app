/**
 * Draw Store
 *
 * Verwaltet den UI-Zustand der Zeichenwerkzeuge (Modus, Selektion, Toolbar-Sichtbarkeit)
 * mit @tanstack/react-store.
 */

import { createStore } from '@tanstack/react-store';
import type { DrawMode } from '../drawing/types';

/** Feature-Gruppe für zusammengehörige Zeichnungsobjekte */
export interface FeatureGroup {
  /** Eindeutige Gruppen-ID */
  id: string;
  /** Anzeigename (z.B. "Einsatzabschnitt A") */
  name: string;
  /** IDs der enthaltenen Features */
  featureIds: string[];
  /** Optionale Gruppenfarbe */
  color?: string;
}

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
  /** Feature-Gruppen */
  featureGroups: FeatureGroup[];
  /** Ob das Symbolbibliothek-Panel sichtbar ist */
  isSymbolPanelVisible: boolean;
  /** Ob das Template-Panel sichtbar ist */
  isTemplatePanelVisible: boolean;
  /** Features gegen Bearbeitung gesperrt */
  isLocked: boolean;
}

const initialState: DrawStoreState = {
  drawMode: 'idle',
  selectedFeatureIds: [],
  isDrawToolbarVisible: false,
  isDirectSelect: false,
  snapEnabled: true,
  featureGroups: [],
  isSymbolPanelVisible: false,
  isTemplatePanelVisible: false,
  isLocked: false,
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
 * Schaltet die Feature-Sperre um (verhindert Selektieren/Editieren/Löschen)
 */
export const toggleLock = () => {
  drawStore.setState((state) => ({
    ...state,
    isLocked: !state.isLocked,
    // Beim Sperren: Werkzeuge deaktivieren, aber Selektion beibehalten (Read-Only-Inspektion)
    ...(!state.isLocked && {
      drawMode: 'select' as DrawMode,
      isDirectSelect: false,
      isDrawToolbarVisible: false,
      isSymbolPanelVisible: false,
      isTemplatePanelVisible: false,
    }),
  }));
};

/**
 * Schaltet die Symbolbibliothek-Sichtbarkeit um
 */
export const toggleSymbolPanel = () => {
  drawStore.setState((state) => ({
    ...state,
    isSymbolPanelVisible: !state.isSymbolPanelVisible,
    isTemplatePanelVisible: false,
  }));
};

/**
 * Schaltet die Template-Panel-Sichtbarkeit um
 */
export const toggleTemplatePanel = () => {
  drawStore.setState((state) => ({
    ...state,
    isTemplatePanelVisible: !state.isTemplatePanelVisible,
    isSymbolPanelVisible: false,
  }));
};

/**
 * Fügt eine Feature-Gruppe hinzu
 */
export const addFeatureGroup = (group: FeatureGroup) => {
  drawStore.setState((state) => ({
    ...state,
    featureGroups: [...state.featureGroups, group],
  }));
};

/**
 * Entfernt eine Feature-Gruppe (Features bleiben erhalten)
 */
export const removeFeatureGroup = (groupId: string) => {
  drawStore.setState((state) => ({
    ...state,
    featureGroups: state.featureGroups.filter((g) => g.id !== groupId),
  }));
};

/**
 * Setzt Feature-Gruppen (z.B. beim Laden aus dem Backend)
 */
export const setFeatureGroups = (groups: FeatureGroup[]) => {
  drawStore.setState((state) => ({
    ...state,
    featureGroups: groups,
  }));
};

/**
 * Setzt den Draw-Store auf den Initialzustand zurück
 */
export const resetDrawStore = () => {
  drawStore.setState(() => initialState);
};
