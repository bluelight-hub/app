import { useEffect } from 'react';
import type * as L from 'leaflet';
import type * as GeoJSON from 'geojson';
import { toast } from 'sonner';
import type { OriginalStyle } from '@/utils/lagekarte/types';

interface UseKeyboardShortcutsProps {
  map: L.Map;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  layersRef: React.MutableRefObject<Map<string, L.Layer>>;
  shapesRef: React.MutableRefObject<GeoJSON.FeatureCollection>;
  originalStylesRef: React.MutableRefObject<Map<string, OriginalStyle>>;
  setShapes: (shapes: GeoJSON.FeatureCollection) => void;
  onShapesChange: (shapes: GeoJSON.FeatureCollection) => void;
}

/**
 * Keyboard Delete Handler
 * Deletes selected shape when user presses Delete or Backspace key
 * - Only activates when selectedShapeId is set
 * - Prevents default browser behavior
 * - Shows toast notification on success
 */
export const useKeyboardShortcuts = ({ map, selectedShapeId, setSelectedShapeId, layersRef, shapesRef, originalStylesRef, setShapes, onShapesChange }: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId) {
        e.preventDefault();

        const layer = layersRef.current.get(selectedShapeId);
        if (!layer) {
          toast.error('Shape konnte nicht gelöscht werden');
          return;
        }

        try {
          // Remove from map
          map.removeLayer(layer);

          // Remove from state
          const updatedShapes: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: shapesRef.current.features.filter((f) => f.properties?.id !== selectedShapeId),
          };

          setShapes(updatedShapes);
          onShapesChange(updatedShapes);

          // Cleanup references
          layersRef.current.delete(selectedShapeId);
          originalStylesRef.current.delete(selectedShapeId);
          setSelectedShapeId(null);

          toast.success('Shape gelöscht');
        } catch (error) {
          console.error('[DrawingLayer] Error deleting shape:', error);
          toast.error('Fehler beim Löschen des Shapes');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [map, selectedShapeId, layersRef, shapesRef, originalStylesRef, setSelectedShapeId, setShapes, onShapesChange]);
};
