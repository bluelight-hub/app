import { useEffect } from 'react';
import type * as L from 'leaflet';
import { calculateToolbarPosition } from '../utils/layer-utils';
import { setToolbarPosition } from '../stores/lagekarte-state.store';
import { useSelectedShapeId, useLayers } from './use-lagekarte-state';

/**
 * Hook für Toolbar-Positionierung relativ zu selektiertem Shape
 *
 * Aktualisiert Toolbar-Position bei Map-Zoom/Pan.
 * Ersetzt useToolbarPositioning aus alten Hooks.
 *
 * @param map - Leaflet Map Instanz
 *
 * @example
 * ```tsx
 * const DrawingLayer = () => {
 *   const map = useMap();
 *   useToolbarPositioning(map);
 *
 *   const toolbarPosition = useToolbarPosition();
 *
 *   return toolbarPosition && <SelectedShapeToolbar position={toolbarPosition} />;
 * };
 * ```
 */
export const useToolbarPositioning = (map: L.Map) => {
  const selectedShapeId = useSelectedShapeId();
  const layers = useLayers();

  // Calculate initial toolbar position when shape is selected
  useEffect(() => {
    if (selectedShapeId) {
      const selectedLayer = layers.get(selectedShapeId);
      if (selectedLayer) {
        const position = calculateToolbarPosition(selectedLayer, map);
        setToolbarPosition(position);
      } else {
        setToolbarPosition(null);
      }
    } else {
      // No shape selected, hide toolbar
      setToolbarPosition(null);
    }
  }, [selectedShapeId, map, layers]);

  // Update toolbar position on map zoom/pan
  useEffect(() => {
    if (!selectedShapeId) return;

    const updateToolbarPosition = () => {
      const selectedLayer = layers.get(selectedShapeId);
      if (!selectedLayer) return;

      const position = calculateToolbarPosition(selectedLayer, map);
      if (position) {
        setToolbarPosition(position);
      }
    };

    // Register event handlers
    map.on('zoom', updateToolbarPosition);
    map.on('move', updateToolbarPosition);
    map.on('zoomend', updateToolbarPosition);
    map.on('moveend', updateToolbarPosition);

    // Cleanup
    return () => {
      map.off('zoom', updateToolbarPosition);
      map.off('move', updateToolbarPosition);
      map.off('zoomend', updateToolbarPosition);
      map.off('moveend', updateToolbarPosition);
    };
  }, [map, selectedShapeId, layers]);
};
