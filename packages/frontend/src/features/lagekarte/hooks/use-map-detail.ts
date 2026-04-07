/**
 * Hook für Karten-Detail-Interaktionen
 *
 * Verwaltet den State für das Layer-Detail-System:
 * - Welches Feature ist selektiert? (Popup)
 * - Ist das Detail-Panel geöffnet?
 * - Läuft gerade eine Feature-Abfrage?
 */

import { useCallback, useState } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { queryDetailProviders } from '../detail-providers/registry';
import type { LayerFeatureInfo } from '../detail-providers/types';

interface MapDetailState {
  /** Aktuell selektierte Feature-Info (null = nichts selektiert) */
  featureInfo: LayerFeatureInfo | null;
  /** Ist das Detail-Panel geöffnet? */
  isPanelOpen: boolean;
  /** Läuft gerade eine Feature-Abfrage? */
  isLoading: boolean;
}

/**
 * Verwaltet Karten-Klick → Provider-Abfrage → Popup/Panel State
 */
export function useMapDetail(mapRef: React.RefObject<MapRef | null>) {
  const [state, setState] = useState<MapDetailState>({
    featureInfo: null,
    isPanelOpen: false,
    isLoading: false,
  });

  /** Karten-Klick-Handler — fragt alle Provider ab */
  const handleMapClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;

      const { lng, lat } = event.lngLat;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const result = await queryDetailProviders(lng, lat, map);

        setState({
          featureInfo: result,
          isPanelOpen: false,
          isLoading: false,
        });
      } catch {
        setState({ featureInfo: null, isPanelOpen: false, isLoading: false });
      }
    },
    [mapRef],
  );

  /** Öffnet das Detail-Panel für das aktuell selektierte Feature */
  const openPanel = useCallback(() => {
    setState((prev) => ({ ...prev, isPanelOpen: true }));
  }, []);

  /** Schließt das Detail-Panel */
  const closePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isPanelOpen: false }));
  }, []);

  /** Schließt Popup und Panel (z.B. bei erneutem Klick auf leere Stelle) */
  const clearSelection = useCallback(() => {
    setState({ featureInfo: null, isPanelOpen: false, isLoading: false });
  }, []);

  return {
    featureInfo: state.featureInfo,
    isPanelOpen: state.isPanelOpen,
    isLoading: state.isLoading,
    handleMapClick,
    openPanel,
    closePanel,
    clearSelection,
  };
}
