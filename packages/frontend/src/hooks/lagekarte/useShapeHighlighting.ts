import { useEffect } from 'react';
import type * as L from 'leaflet';
import type { OriginalStyle } from '@/utils/lagekarte/types';

interface UseShapeHighlightingProps {
  selectedShapeId: string | null;
  layersRef: React.MutableRefObject<Map<string, L.Layer>>;
  originalStylesRef: React.MutableRefObject<Map<string, OriginalStyle>>;
}

/**
 * Apply/Remove highlighting when selectedShapeId changes
 * Manages visual highlight state for selected shapes
 */
export const useShapeHighlighting = ({ selectedShapeId, layersRef, originalStylesRef }: UseShapeHighlightingProps) => {
  useEffect(() => {
    // Remove highlight from all shapes
    layersRef.current.forEach((layer, shapeId) => {
      const originalStyle = originalStylesRef.current.get(shapeId);
      if (originalStyle && (layer as any).setStyle) {
        (layer as any).setStyle(originalStyle);
        originalStylesRef.current.delete(shapeId);
      }
    });

    // Apply highlight to selected shape
    if (selectedShapeId) {
      const selectedLayer = layersRef.current.get(selectedShapeId);
      if (selectedLayer && (selectedLayer as any).setStyle) {
        // Store original style
        const currentStyle = (selectedLayer as any).options;
        originalStylesRef.current.set(selectedShapeId, {
          color: currentStyle.color,
          weight: currentStyle.weight,
          opacity: currentStyle.opacity,
          fillOpacity: currentStyle.fillOpacity,
        });

        // Apply highlight
        (selectedLayer as any).setStyle({
          color: '#3b82f6', // blue-500
          weight: 4,
          opacity: 1.0,
          fillOpacity: 0.5,
        });
      }
    }
  }, [selectedShapeId, layersRef, originalStylesRef]);
};
