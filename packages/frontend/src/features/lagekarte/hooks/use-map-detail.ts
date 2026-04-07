/**
 * Hook für Karten-Detail-Interaktionen
 *
 * Verwaltet den State für das Layer-Detail-System:
 * - Welche Features sind selektiert? (Popup mit allen Treffern)
 * - Welches Feature wird im Detail-Panel gezeigt? (Navigation)
 * - Läuft gerade eine Feature-Abfrage?
 */

import { useCallback, useRef, useState } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { queryAllDetailProviders } from '../detail-providers/registry';
import type { LayerFeatureInfo } from '../detail-providers/types';

interface MapDetailState {
  /** Alle Treffer aller aktiven Provider am Klick-Punkt */
  results: LayerFeatureInfo[];
  /** Klick-Koordinaten für Popup-Positionierung */
  coordinate: { lng: number; lat: number } | null;
  /** Index des aktuell im Panel angezeigten Treffers */
  panelIndex: number;
  /** Ist das Detail-Panel geöffnet? */
  isPanelOpen: boolean;
  /** Läuft gerade eine Feature-Abfrage? */
  isLoading: boolean;
}

/**
 * Verwaltet Karten-Klick → Provider-Abfrage → Popup/Panel State
 *
 * Fragt alle aktiven Provider parallel ab und sammelt alle Treffer.
 * Das Panel unterstützt Navigation zwischen mehreren Treffern.
 */
export function useMapDetail(mapRef: React.RefObject<MapRef | null>) {
  const [state, setState] = useState<MapDetailState>({
    results: [],
    coordinate: null,
    panelIndex: 0,
    isPanelOpen: false,
    isLoading: false,
  });

  /** Generation-Counter verhindert Race Conditions bei schnellen Klicks */
  const queryGenRef = useRef(0);

  /** Karten-Klick-Handler — fragt alle Provider parallel ab */
  const handleMapClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;

      const generation = ++queryGenRef.current;
      const { lng, lat } = event.lngLat;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const results = await queryAllDetailProviders(lng, lat, map);

        // Veraltete Antwort verwerfen wenn zwischenzeitlich erneut geklickt wurde
        if (generation !== queryGenRef.current) return;

        setState({
          results,
          coordinate: results.length > 0 ? { lng, lat } : null,
          panelIndex: 0,
          isPanelOpen: false,
          isLoading: false,
        });
      } catch {
        if (generation !== queryGenRef.current) return;
        setState({ results: [], coordinate: null, panelIndex: 0, isPanelOpen: false, isLoading: false });
      }
    },
    [mapRef],
  );

  /** Öffnet das Detail-Panel für einen bestimmten Treffer */
  const openPanel = useCallback((index: number) => {
    setState((prev) => ({ ...prev, isPanelOpen: true, panelIndex: index }));
  }, []);

  /** Navigiert im Panel zu einem anderen Treffer */
  const navigatePanel = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      panelIndex: Math.max(0, Math.min(index, prev.results.length - 1)),
    }));
  }, []);

  /** Schließt das Detail-Panel */
  const closePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isPanelOpen: false }));
  }, []);

  /** Schließt Popup und Panel (z.B. bei erneutem Klick auf leere Stelle) */
  const clearSelection = useCallback(() => {
    setState({ results: [], coordinate: null, panelIndex: 0, isPanelOpen: false, isLoading: false });
  }, []);

  return {
    results: state.results,
    coordinate: state.coordinate,
    panelIndex: state.panelIndex,
    isPanelOpen: state.isPanelOpen,
    isLoading: state.isLoading,
    handleMapClick,
    openPanel,
    navigatePanel,
    closePanel,
    clearSelection,
  };
}
