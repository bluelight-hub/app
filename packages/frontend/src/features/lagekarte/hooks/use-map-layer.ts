/**
 * Hook für Karten-Layer-Management
 *
 * Kombiniert Store-State, Dark-Mode-Auflösung und lokale Persistierung
 * zu einer einheitlichen API für die LagekarteView.
 */

import { useColorMode } from '@/shared/hooks/use-color-mode';
import { useStore } from '@tanstack/react-store';
import { useEffect, useMemo, useRef } from 'react';
import type { BaseLayerConfig } from '../utils/map-config';
import { getAvailableBaseLayers, resolveMapStyle } from '../utils/map-config';
import type { MapLayerState } from '../stores/map-layer.store';
import { mapLayerStore, setMapLayerState } from '../stores/map-layer.store';
import { loadMapLayerState, saveMapLayerState } from '../stores/persistence/map-layer-persistence';

/**
 * Verwaltet Layer-Auswahl, Persistierung und Style-Auflösung
 *
 * @param einsatzId - Einsatz-ID für die Persistierung
 */
export function useMapLayer(einsatzId: string) {
  const selectedBaseLayer = useStore(mapLayerStore, (s) => s.selectedBaseLayer);
  const dwdOverlayEnabled = useStore(mapLayerStore, (s) => s.dwdOverlayEnabled);
  const ninaOverlays = useStore(mapLayerStore, (s) => s.ninaOverlays);
  const { resolvedColorMode } = useColorMode();
  const isInitialized = useRef(false);

  // Verfügbare Layer (gefiltert nach API-Key)
  const availableLayers: BaseLayerConfig[] = useMemo(() => getAvailableBaseLayers(), []);

  // MapLibre-Style basierend auf Layer + Dark Mode auflösen
  const resolvedStyle = useMemo(() => resolveMapStyle(selectedBaseLayer, resolvedColorMode === 'dark'), [selectedBaseLayer, resolvedColorMode]);

  // State beim Mount aus Persistierung laden
  useEffect(() => {
    isInitialized.current = false;
    loadMapLayerState(einsatzId).then((saved) => {
      if (saved) {
        // Prüfen ob gespeicherter Layer noch verfügbar ist
        const available = getAvailableBaseLayers();
        const validatedState: Partial<MapLayerState> = {
          ...saved,
          ...(saved.selectedBaseLayer && !available.some((l) => l.id === saved.selectedBaseLayer) ? { selectedBaseLayer: 'osm' as const } : {}),
        };
        setMapLayerState(validatedState);
      }
      isInitialized.current = true;
    });
  }, [einsatzId]);

  // Bei Änderungen persistieren (aber nicht beim initialen Mount)
  useEffect(() => {
    if (!isInitialized.current) {
      return;
    }
    saveMapLayerState(einsatzId, { selectedBaseLayer, dwdOverlayEnabled, ninaOverlays });
  }, [einsatzId, selectedBaseLayer, dwdOverlayEnabled, ninaOverlays]);

  return {
    resolvedStyle,
    selectedBaseLayer,
    dwdOverlayEnabled,
    availableLayers,
    ninaOverlays,
  };
}
