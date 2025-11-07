import { useEffect } from 'react';
import type * as L from 'leaflet';
import type * as GeoJSON from 'geojson';
import { updateLayerStyle } from '@/utils/lagekarte/layer-utils';
import type { OriginalStyle } from '@/utils/lagekarte/types';

interface UseShapeStyleUpdatesProps {
  shapeToUpdate?: GeoJSON.Feature | null;
  layersRef: React.MutableRefObject<Map<string, L.Layer>>;
  shapesRef: React.MutableRefObject<GeoJSON.FeatureCollection>;
  originalStylesRef: React.MutableRefObject<Map<string, OriginalStyle>>;
  setShapes: (shapes: GeoJSON.FeatureCollection) => void;
  onShapesChange: (shapes: GeoJSON.FeatureCollection) => void;
  onShapeUpdateComplete?: () => void;
}

/**
 * Handle shape updates (e.g. label changes from ShapeLabelModal or style changes from PropertyPanel)
 * Updates shape properties and visual style when external updates are received
 */
export const useShapeStyleUpdates = ({ shapeToUpdate, layersRef, shapesRef, originalStylesRef, setShapes, onShapesChange, onShapeUpdateComplete }: UseShapeStyleUpdatesProps) => {
  useEffect(() => {
    if (!shapeToUpdate) return;

    const shapeId = shapeToUpdate.properties?.id;
    if (!shapeId) {
      onShapeUpdateComplete?.();
      return;
    }

    // Update shape in collection
    const updatedShapes: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: shapesRef.current.features.map((feature) => (feature.properties?.id === shapeId ? { ...feature, properties: shapeToUpdate.properties } : feature)),
    };

    setShapes(updatedShapes);
    onShapesChange(updatedShapes);

    // Update visual style on the layer
    const layer = layersRef.current.get(shapeId);
    if (layer && layer.setStyle) {
      const { color, strokeWidth, fillOpacity } = shapeToUpdate.properties || {};

      // Update layer style using helper
      updateLayerStyle(layer, { color, strokeWidth, fillOpacity });

      // CRITICAL FIX: Update originalStylesRef if this shape is currently selected
      // Otherwise the old style will be restored when unhighlighting
      // Use shapesRef.current to get latest selectedShapeId without adding to dependencies
      const currentSelectedId = shapesRef.current.features.find((f) => originalStylesRef.current.has(f.properties?.id || ''))?.properties?.id;

      if (currentSelectedId === shapeId && originalStylesRef.current.has(shapeId)) {
        const newStyle = layer.options;
        originalStylesRef.current.set(shapeId, {
          color: newStyle.color,
          weight: newStyle.weight,
          opacity: newStyle.opacity,
          fillOpacity: newStyle.fillOpacity,
        });
      }
    }

    // Notify parent that update is complete
    onShapeUpdateComplete?.();
  }, [shapeToUpdate, layersRef, shapesRef, originalStylesRef, setShapes, onShapesChange, onShapeUpdateComplete]);
};
