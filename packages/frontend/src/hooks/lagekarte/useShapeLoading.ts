import { useEffect, useRef } from 'react';
import type * as L from 'leaflet';
import type * as GeoJSON from 'geojson';
import { createTextMarker } from '@/utils/lagekarte/shape-helpers';
import { createGeoJSONLayer, setShapeIdOnLayer } from '@/utils/lagekarte/layer-utils';

interface UseShapeLoadingProps {
  map: L.Map;
  initialState?: GeoJSON.FeatureCollection;
  layersRef: React.MutableRefObject<Map<string, L.Layer>>;
  onLayerClick: (e: L.LeafletMouseEvent) => void;
  onLayerContextMenu: (e: L.LeafletMouseEvent) => void;
}

/**
 * Load initial shapes from backend (on mount)
 *
 * BUGFIX: Deduplizierung verhindert doppelte Shapes nach TanStack Query Refetch
 * - Problem: initialState Objektreferenz ändert sich bei Query-Invalidierung
 * - Lösung: Prüfe existierende Shape-IDs in layersRef vor Layer-Add
 */
export const useShapeLoading = ({ map, initialState, layersRef, onLayerClick, onLayerContextMenu }: UseShapeLoadingProps) => {
  // Ref zum Tracking welche Features bereits geladen wurden (verhindert Duplikate)
  const loadedFeatureIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initialState?.features || initialState.features.length === 0) return;

    // INTELLIGENTE DEDUPLIZIERUNG: Nur neue Features laden
    const newFeatures = initialState.features.filter((feature) => {
      const featureId = feature.properties?.id;
      if (!featureId) return false; // Skip features ohne ID

      // Nur laden wenn nicht bereits geladen
      return !loadedFeatureIdsRef.current.has(String(featureId));
    });

    // Keine neuen Features → nichts zu tun
    if (newFeatures.length === 0) return;

    // Add nur neue shapes to map
    newFeatures.forEach((feature) => {
      const shapeId = feature.properties?.id;
      if (!shapeId) return;

      // Check if this is a Text marker (Point geometry with text property)
      const isTextMarker = feature.geometry.type === 'Point' && feature.properties?.text;

      let layer: L.Layer | null = null;

      if (isTextMarker) {
        // Create Text marker using helper
        layer = createTextMarker(feature, map);
        if (layer) {
          layer.addTo(map);
        }
      } else {
        // Normal shapes (Polygon, LineString, etc.)
        layer = createGeoJSONLayer(feature);
        if (layer) {
          layer.addTo(map);
        }
      }

      if (layer) {
        // Track layer and store shapeId directly on the layer
        setShapeIdOnLayer(layer, shapeId);
        layersRef.current.set(shapeId, layer);

        // Add click handler for selection
        layer.on('click', onLayerClick);

        // Add context menu handler for right-click
        layer.on('contextmenu', onLayerContextMenu);
      }

      // Markiere Feature als geladen
      loadedFeatureIdsRef.current.add(String(shapeId));
    });
  }, [map, initialState, layersRef, onLayerClick, onLayerContextMenu]);
};
