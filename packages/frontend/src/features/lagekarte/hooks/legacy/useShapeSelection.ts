import { useEffect } from 'react';
import * as L from 'leaflet';
import type * as GeoJSON from 'geojson';
import { highlightLayer, unhighlightLayer } from '../../utils/shape-helpers';
import { getShapeIdFromLayer } from '../../utils/layer-utils';
import type { OriginalStyle } from '../../utils/types';

interface UseShapeSelectionProps {
  map: L.Map;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  layersRef: React.MutableRefObject<Map<string, L.Layer>>;
  shapesRef: React.MutableRefObject<GeoJSON.FeatureCollection>;
  originalStylesRef: React.MutableRefObject<Map<string, OriginalStyle>>;
  onShapeSelected?: (shape: GeoJSON.Feature | null) => void;
}

/**
 * Handle Shape Selection via Click
 * - Click auf Shape: Selektiere und highlighte
 * - Click auf leere Karte: Deselektiere
 */
export const useShapeSelection = ({ map, selectedShapeId, setSelectedShapeId, layersRef, shapesRef, originalStylesRef, onShapeSelected }: UseShapeSelectionProps) => {
  useEffect(() => {
    /**
     * Click-Handler für Layer-Selection
     */
    const handleLayerClick = (e: L.LeafletMouseEvent) => {
      // Prevent map click from firing
      L.DomEvent.stopPropagation(e);

      const layer = e.target;
      const shapeId = getShapeIdFromLayer(layer);

      if (shapeId) {
        // Deselect previous shape
        if (selectedShapeId && selectedShapeId !== shapeId) {
          const prevLayer = layersRef.current.get(selectedShapeId);
          if (prevLayer) {
            unhighlightLayer(prevLayer, originalStylesRef.current, selectedShapeId);
          }
        }

        // Select and highlight current shape
        setSelectedShapeId(shapeId);
        highlightLayer(layer, originalStylesRef.current, shapeId);

        // Notify parent about selection
        const selectedFeature = shapesRef.current.features.find((f) => f.properties?.id === shapeId);
        if (selectedFeature) {
          onShapeSelected?.(selectedFeature);
        }
      }
    };

    /**
     * Click-Handler für Map (Deselection)
     */
    const handleMapClick = () => {
      if (selectedShapeId) {
        // Unhighlight previous selected shape
        const prevLayer = layersRef.current.get(selectedShapeId);
        if (prevLayer) {
          unhighlightLayer(prevLayer, originalStylesRef.current, selectedShapeId);
        }
        setSelectedShapeId(null);

        // Notify parent about deselection
        onShapeSelected?.(null);
      }
    };

    // Register click handlers on all existing layers
    layersRef.current.forEach((layer) => {
      layer.on('click', handleLayerClick);
    });

    // Register map click handler
    map.on('click', handleMapClick);

    // Cleanup
    return () => {
      layersRef.current.forEach((layer) => {
        layer.off('click', handleLayerClick);
      });
      map.off('click', handleMapClick);
    };
  }, [map, selectedShapeId, layersRef, shapesRef, originalStylesRef, onShapeSelected, setSelectedShapeId]);
};
