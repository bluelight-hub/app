import { useEffect } from 'react';
import type * as L from 'leaflet';
import type * as GeoJSON from 'geojson';

interface UseTextMarkerHandlingProps {
  map: L.Map;
  shapesRef: React.MutableRefObject<GeoJSON.FeatureCollection>;
  setShapes: (shapes: GeoJSON.FeatureCollection) => void;
  onShapesChange: (shapes: GeoJSON.FeatureCollection) => void;
}

/**
 * Event Handler: Text content changes (input/change on Leaflet.PM textarea)
 * Leaflet.PM text markers use a textarea element for editing,
 * and don't trigger pm:edit for text changes.
 * We use a debounced input handler to save changes.
 */
export const useTextMarkerHandling = ({ map, shapesRef, setShapes, onShapesChange }: UseTextMarkerHandlingProps) => {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Use useCallback-equivalent pattern by defining handler inside useEffect
    // but with stable dependencies to prevent "wrong listener type" errors
    const handleTextChange = (event: Event) => {
      const target = event.target as HTMLTextAreaElement;

      // Check if this is a Leaflet.PM text marker textarea
      if (!target.matches('textarea.pm-textarea')) {
        return;
      }

      const newText = target.value || '';

      // Find the parent marker element
      const markerIcon = target.closest('.leaflet-marker-icon.pm-text-marker');
      if (!markerIcon) {
        return;
      }

      // Find the layer associated with this marker
      let shapeId: string | null = null;

      map.eachLayer((layer: any) => {
        if (layer.getElement && layer.getElement() === markerIcon) {
          // Get shape ID directly from layer (stored during initialization or creation)
          shapeId = layer._shapeId;
        }
      });

      if (!shapeId) {
        return;
      }

      // Debounce: Wait 500ms after last input before saving
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Update shape in collection (use shapesRef to avoid stale closure)
        const updatedShapes: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: shapesRef.current.features.map((feature) => {
            if (feature.properties?.id === shapeId) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  text: newText,
                },
              };
            }
            return feature;
          }),
        };

        setShapes(updatedShapes);
        onShapesChange(updatedShapes);
      }, 500);
    };

    // Listen for input events (fires while typing)
    const mapContainer = map.getContainer();

    // Add event listeners with capturing phase
    // IMPORTANT: Must use same options in removeEventListener
    const listenerOptions = { capture: true };
    mapContainer.addEventListener('input', handleTextChange, listenerOptions);
    mapContainer.addEventListener('change', handleTextChange, listenerOptions);

    return () => {
      clearTimeout(timeoutId);
      // CRITICAL: Must use same options as addEventListener
      mapContainer.removeEventListener('input', handleTextChange, listenerOptions);
      mapContainer.removeEventListener('change', handleTextChange, listenerOptions);
    };
  }, [map, shapesRef, setShapes, onShapesChange]);
};
