import { createStore } from '@tanstack/react-store';
import type * as GeoJSON from 'geojson';
import type { DrawingTool } from '@/features/lagekarte/ui';

/**
 * Zentrale State-Definition für Lagekarte Feature (MapLibre GL JS)
 *
 * Bereinigt: Keine Library-Instanzen mehr im Store.
 * Alle Daten sind serialisierbar (GeoJSON + primitive Typen).
 */
export interface LagekarteState {
  /** GeoJSON FeatureCollection mit allen Shapes auf der Lagekarte */
  shapes: GeoJSON.FeatureCollection;

  /** IDs der aktuell selektierten Shapes */
  selectedShapeIds: Set<string>;

  /** Aktuell aktives Drawing Tool */
  activeDrawingTool: DrawingTool | null;

  /** Sichtbarkeit der SelectedShapeToolbar */
  toolbarVisible: boolean;

  /** Position der SelectedShapeToolbar (relativ zu selektiertem Shape) */
  toolbarPosition: { x: number; y: number } | null;

  /** Context Menu State (Right-Click auf Shape) */
  contextMenu: {
    isOpen: boolean;
    position: { x: number; y: number };
    shapeId: string;
  } | null;

  /** Maximum Anzahl Shapes pro Lagekarte */
  maxShapes: number;
}

const initialState: LagekarteState = {
  shapes: {
    type: 'FeatureCollection',
    features: [],
  },
  selectedShapeIds: new Set<string>(),
  activeDrawingTool: null,
  toolbarVisible: false,
  toolbarPosition: null,
  contextMenu: null,
  maxShapes: 100,
};

export const lagekarteStore = createStore<LagekarteState>(initialState);

// ===== Store Actions =====

export const resetState = () => {
  lagekarteStore.setState(() => ({
    ...initialState,
    selectedShapeIds: new Set<string>(),
  }));
};

export const setShapes = (shapes: GeoJSON.FeatureCollection) => {
  lagekarteStore.setState((state) => ({ ...state, shapes }));
};

export const addShape = (shape: GeoJSON.Feature) => {
  lagekarteStore.setState((state) => ({
    ...state,
    shapes: {
      type: 'FeatureCollection',
      features: [...state.shapes.features, shape],
    },
  }));
};

export const updateShape = (shapeId: string, updater: (feature: GeoJSON.Feature) => GeoJSON.Feature) => {
  lagekarteStore.setState((state) => ({
    ...state,
    shapes: {
      type: 'FeatureCollection',
      features: state.shapes.features.map((feature) => (feature.properties?.id === shapeId ? updater(feature) : feature)),
    },
  }));
};

export const removeShape = (shapeId: string) => {
  lagekarteStore.setState((state) => {
    const newSelectedShapeIds = new Set(state.selectedShapeIds);
    newSelectedShapeIds.delete(shapeId);

    return {
      ...state,
      shapes: {
        type: 'FeatureCollection',
        features: state.shapes.features.filter((f) => f.properties?.id !== shapeId),
      },
      selectedShapeIds: newSelectedShapeIds,
    };
  });
};

export const selectShape = (shapeId: string | null) => {
  lagekarteStore.setState((state) => ({
    ...state,
    selectedShapeIds: shapeId ? new Set([shapeId]) : new Set<string>(),
  }));
};

export const setActiveDrawingTool = (tool: DrawingTool | null) => {
  lagekarteStore.setState((state) => ({ ...state, activeDrawingTool: tool }));
};

export const setToolbarPosition = (position: { x: number; y: number } | null) => {
  lagekarteStore.setState((state) => ({
    ...state,
    toolbarPosition: position,
    toolbarVisible: position !== null,
  }));
};

export const openContextMenu = (shapeId: string, position: { x: number; y: number }) => {
  lagekarteStore.setState((state) => ({
    ...state,
    contextMenu: { isOpen: true, shapeId, position },
  }));
};

export const closeContextMenu = () => {
  lagekarteStore.setState((state) => ({ ...state, contextMenu: null }));
};
