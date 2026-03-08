import { useEffect, useState } from 'react';
import type * as L from 'leaflet';
import { calculateToolbarPosition } from '@/features/lagekarte';

interface UseToolbarPositioningProps {
  map: L.Map;
  selectedShapeId: string | null;
  layersRef: React.MutableRefObject<Map<string, L.Layer>>;
}

/**
 * Calculate and update toolbar position based on selected shape
 * Updates position on map zoom/pan to keep toolbar attached to shape
 */
export const useToolbarPositioning = ({ map, selectedShapeId, layersRef }: UseToolbarPositioningProps) => {
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);

  // Calculate initial toolbar position when shape is selected
  useEffect(() => {
    if (selectedShapeId) {
      const selectedLayer = layersRef.current.get(selectedShapeId);
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
  }, [selectedShapeId, map, layersRef]);

  // Update toolbar position on map zoom/pan
  useEffect(() => {
    if (!selectedShapeId) return;

    const updateToolbarPosition = () => {
      const selectedLayer = layersRef.current.get(selectedShapeId);
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
  }, [map, selectedShapeId, layersRef]);

  return { toolbarPosition };
};
