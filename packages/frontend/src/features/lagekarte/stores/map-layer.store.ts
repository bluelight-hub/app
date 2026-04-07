/**
 * Karten-Layer Store
 *
 * Verwaltet den ausgewählten Grundkarten-Layer und Overlay-Zustand
 * mit @tanstack/react-store.
 */

import type { BaseLayerId } from '@/features/lagekarte/utils/map-config';
import { createStore } from '@tanstack/react-store';

/** Verfügbare NINA-Warnungsquellen */
export type NinaSource = 'katwarn' | 'biwapp' | 'mowas' | 'lhp' | 'police';

/** Aktivierungszustand der einzelnen NINA-Overlay-Quellen */
export interface NinaOverlayState {
  katwarn: boolean;
  biwapp: boolean;
  mowas: boolean;
  lhp: boolean;
  police: boolean;
}

/**
 * State für Karten-Layer-Einstellungen
 */
export interface MapLayerState {
  /** Ausgewählte Grundkarte */
  selectedBaseLayer: BaseLayerId;
  /** DWD Wetterwarnungen-Overlay aktiv */
  dwdOverlayEnabled: boolean;
  /** NINA-Warnungs-Overlays nach Quelle */
  ninaOverlays: NinaOverlayState;
}

const initialState: MapLayerState = {
  selectedBaseLayer: 'osm',
  dwdOverlayEnabled: false,
  ninaOverlays: {
    katwarn: true,
    biwapp: true,
    mowas: true,
    lhp: true,
    police: true,
  },
};

/**
 * Karten-Layer Store Instanz
 */
export const mapLayerStore = createStore<MapLayerState>(initialState);

// ============================================
// Store Actions
// ============================================

/**
 * Setzt die ausgewählte Grundkarte
 */
export const setBaseLayer = (layerId: BaseLayerId) => {
  mapLayerStore.setState((state) => ({
    ...state,
    selectedBaseLayer: layerId,
  }));
};

/**
 * Aktiviert/Deaktiviert das DWD-Wetterwarnungen-Overlay
 */
export const setDwdOverlay = (enabled: boolean) => {
  mapLayerStore.setState((state) => ({
    ...state,
    dwdOverlayEnabled: enabled,
  }));
};

/**
 * Aktiviert/Deaktiviert ein einzelnes NINA-Overlay nach Quelle
 */
export const setNinaOverlay = (source: NinaSource, enabled: boolean) => {
  mapLayerStore.setState((state) => ({
    ...state,
    ninaOverlays: {
      ...state.ninaOverlays,
      [source]: enabled,
    },
  }));
};

/**
 * Prüft ob mindestens ein NINA-Overlay aktiv ist
 */
export const isAnyNinaOverlayActive = (): boolean => {
  const { ninaOverlays } = mapLayerStore.state;
  return Object.values(ninaOverlays).some(Boolean);
};

/**
 * Setzt den kompletten Layer-State (z.B. nach Rehydrierung)
 */
export const setMapLayerState = (partial: Partial<MapLayerState>) => {
  mapLayerStore.setState((state) => ({
    ...state,
    ...partial,
  }));
};
