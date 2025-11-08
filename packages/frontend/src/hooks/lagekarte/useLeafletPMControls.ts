import { useEffect } from 'react';
import type * as L from 'leaflet';

/**
 * Initialize Leaflet.PM Controls
 * Adds PM toolbar to map and disables default buttons (we use custom DrawingToolbar)
 */
export const useLeafletPMControls = (map: L.Map, layersRef: React.MutableRefObject<Map<string, L.Layer>>) => {
  useEffect(() => {
    // Defensive check: Ensure PM is available before initialization
    if (!map.pm?.Toolbar) {
      console.warn('[useLeafletPMControls] Leaflet.PM not available on map');
      return;
    }

    // Add Leaflet.PM Controls to map
    map.pm.addControls({
      position: 'topright',
      drawPolygon: false, // We control via DrawingToolbar
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      drawText: false, // We control via DrawingToolbar (Text-Tool)
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });

    // Hide default PM controls (we use custom DrawingToolbar)
    // Defensive check: Toolbar might not be available even after addControls
    if (map.pm.Toolbar) {
      map.pm.Toolbar.setButtonDisabled('drawPolygon', true);
      map.pm.Toolbar.setButtonDisabled('drawPolyline', true);
      map.pm.Toolbar.setButtonDisabled('drawRectangle', true);
    }

    // Cleanup on unmount
    return () => {
      // Defensive check: Ensure PM still available during cleanup
      if (map.pm?.Toolbar) {
        map.pm.removeControls();
      }

      // Clear layer references to prevent memory leaks
      layersRef.current.forEach((layer) => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current.clear();
    };
  }, [map, layersRef]);
};
