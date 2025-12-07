import { useCallback } from 'react';
import type * as L from 'leaflet';
import type * as GeoJSON from 'geojson';
import { toast } from 'sonner';
import { selectShape, addShape, updateShape as updateShapeAction, removeShape, registerLayer, saveOriginalStyle, clearOriginalStyle, setShapes } from '../stores/lagekarte-state.store';
import { lagekarteStore } from '../stores/lagekarte-state.store';
import { highlightLayer, unhighlightLayer } from '../utils/shape-helpers';
import { setShapeIdOnLayer } from '../utils/layer-utils';
import type { LayerWithStyle } from '../utils/types';

/**
 * Konsolidierter Hook für alle Shape-Aktionen
 *
 * Ersetzt folgende alte Hooks:
 * - useShapeSelection → selectShapeById(), deselectShape()
 * - useShapeHighlighting → applyHighlight(), removeHighlight()
 * - useShapeEventHandlers → createShape(), updateShape(), deleteShape()
 * - useKeyboardShortcuts → deleteSelectedShape()
 * - useTextMarkerHandling → updateTextMarker()
 * - useShapeStyleUpdates → updateShapeStyle()
 *
 * @param map - Leaflet Map Instanz
 * @returns Objekt mit allen Shape-Aktionen
 *
 * @example
 * ```tsx
 * const shapeActions = useShapeActions(map);
 *
 * // Shape selektieren
 * shapeActions.selectShapeById('shape-123');
 *
 * // Shape löschen
 * shapeActions.deleteShape('shape-123');
 * ```
 */
export const useShapeActions = (map: L.Map) => {
  /**
   * Selektiert ein Shape und highlighted es visuell
   *
   * Konsolidiert Logik aus useShapeSelection + useShapeHighlighting
   */
  const selectShapeById = useCallback((shapeId: string | null, onShapeSelected?: (shape: GeoJSON.Feature | null) => void) => {
    const state = lagekarteStore.state;

    // Deselect previous shape
    const previousShapeId = state.selectedShapeIds.size > 0 ? Array.from(state.selectedShapeIds)[0] : null;

    if (previousShapeId && previousShapeId !== shapeId) {
      const prevLayer = state.layers.get(previousShapeId);
      if (prevLayer) {
        unhighlightLayer(prevLayer, state.originalStyles, previousShapeId);
        clearOriginalStyle(previousShapeId);
      }
    }

    // Select new shape
    if (shapeId) {
      const layer = state.layers.get(shapeId);
      if (layer) {
        highlightLayer(layer, state.originalStyles, shapeId);

        // Store original style
        if ('setStyle' in layer && 'options' in layer) {
          const currentStyle = (layer as LayerWithStyle).options;
          saveOriginalStyle(shapeId, {
            color: currentStyle.color,
            weight: currentStyle.weight,
            opacity: currentStyle.opacity,
            fillOpacity: currentStyle.fillOpacity,
          });
        }
      }

      selectShape(shapeId);

      // Notify parent
      const selectedFeature = state.shapes.features.find((f) => f.properties?.id === shapeId);
      onShapeSelected?.(selectedFeature ?? null);
    } else {
      selectShape(null);
      onShapeSelected?.(null);
    }
  }, []);

  /**
   * Deselektiert aktuelles Shape
   */
  const deselectShape = useCallback(
    (onShapeSelected?: (shape: GeoJSON.Feature | null) => void) => {
      selectShapeById(null, onShapeSelected);
    },
    [selectShapeById],
  );

  /**
   * Erstellt ein neues Shape und fügt es zur Map hinzu
   *
   * Konsolidiert Logik aus useShapeEventHandlers (pm:create)
   */
  const createShape = useCallback(
    (shape: GeoJSON.Feature, layer: L.Layer, onShapeCreated?: (feature: GeoJSON.Feature) => void) => {
      const state = lagekarteStore.state;
      const shapeId = shape.properties?.id;

      if (!shapeId) {
        console.error('[useShapeActions] Shape has no ID, cannot create');
        return;
      }

      // Check shape limit
      if (state.shapes.features.length >= state.maxShapes) {
        map.removeLayer(layer);
        toast.error(`Maximum ${state.maxShapes} Shapes erreicht`);
        return;
      }

      // Store shape ID on layer
      setShapeIdOnLayer(layer, shapeId);

      // Add to store
      addShape(shape);
      registerLayer(shapeId, layer);

      // Notify parent
      onShapeCreated?.(shape);
    },
    [map],
  );

  /**
   * Aktualisiert ein existierendes Shape
   *
   * Konsolidiert Logik aus useShapeEventHandlers (pm:edit) + useShapeStyleUpdates
   */
  const updateShape = useCallback((shapeId: string, updater: (feature: GeoJSON.Feature) => GeoJSON.Feature, updateLayer = true) => {
    const state = lagekarteStore.state;

    updateShapeAction(shapeId, updater);

    // Update visual layer if requested
    if (updateLayer) {
      const layer = state.layers.get(shapeId);
      if (layer && 'setStyle' in layer) {
        const updatedFeature = state.shapes.features.find((f) => f.properties?.id === shapeId);
        if (updatedFeature?.properties) {
          const { color, strokeWidth, fillOpacity } = updatedFeature.properties;

          (layer as LayerWithStyle).setStyle({
            ...(color && { color }),
            ...(strokeWidth && { weight: strokeWidth }),
            ...(fillOpacity !== undefined && { fillOpacity }),
          });

          // Update originalStyles if shape is currently highlighted
          if (state.highlightedShapeIds.has(shapeId)) {
            const currentStyle = (layer as LayerWithStyle).options;
            saveOriginalStyle(shapeId, {
              color: currentStyle.color,
              weight: currentStyle.weight,
              opacity: currentStyle.opacity,
              fillOpacity: currentStyle.fillOpacity,
            });
          }
        }
      }
    }
  }, []);

  /**
   * Löscht ein Shape
   *
   * Konsolidiert Logik aus useShapeEventHandlers (pm:remove) + useKeyboardShortcuts
   */
  const deleteShape = useCallback(
    (shapeId: string) => {
      const state = lagekarteStore.state;
      const layer = state.layers.get(shapeId);

      if (!layer) {
        toast.error('Shape nicht gefunden');
        return;
      }

      try {
        // Remove from map
        map.removeLayer(layer);

        // Remove from store (includes cleanup of layers, originalStyles, selectedShapeIds)
        removeShape(shapeId);

        toast.success('Shape gelöscht');
      } catch (error) {
        console.error('[useShapeActions] Error deleting shape:', error);
        toast.error('Fehler beim Löschen des Shapes');
      }
    },
    [map],
  );

  /**
   * Löscht aktuell selektiertes Shape (für Keyboard Shortcuts)
   */
  const deleteSelectedShape = useCallback(() => {
    const state = lagekarteStore.state;
    const selectedShapeId = state.selectedShapeIds.size > 0 ? Array.from(state.selectedShapeIds)[0] : null;

    if (selectedShapeId) {
      deleteShape(selectedShapeId);
    }
  }, [deleteShape]);

  /**
   * Aktualisiert Text-Content eines Text-Markers
   *
   * Konsolidiert Logik aus useTextMarkerHandling
   */
  const updateTextMarker = useCallback((shapeId: string, text: string) => {
    updateShapeAction(shapeId, (feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        text,
      },
    }));
  }, []);

  /**
   * Aktualisiert Style eines Shapes (Farbe, Stroke, Opacity)
   *
   * Konsolidiert Logik aus useShapeStyleUpdates
   */
  const updateShapeStyle = useCallback(
    (shapeId: string, style: { color?: string; strokeWidth?: number; fillOpacity?: number }) => {
      updateShape(
        shapeId,
        (feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            ...style,
          },
        }),
        true, // Update layer visuals
      );
    },
    [updateShape],
  );

  /**
   * Lädt initiale Shapes und fügt sie zur Map hinzu
   *
   * Konsolidiert Logik aus useShapeLoading
   *
   * @param shapes - GeoJSON FeatureCollection
   * @param createLayerFn - Factory Function zum Erstellen von Leaflet Layers
   */
  const loadShapes = useCallback(
    (shapes: GeoJSON.FeatureCollection, createLayerFn: (feature: GeoJSON.Feature) => L.Layer | null) => {
      const state = lagekarteStore.state;

      // Deduplizierung: Nur neue Features laden
      const existingShapeIds = new Set(state.shapes.features.map((f) => f.properties?.id).filter(Boolean));
      const newFeatures = shapes.features.filter((f) => !existingShapeIds.has(f.properties?.id));

      if (newFeatures.length === 0) return;

      // Add shapes to store
      setShapes({
        type: 'FeatureCollection',
        features: [...state.shapes.features, ...newFeatures],
      });

      // Add layers to map
      newFeatures.forEach((feature) => {
        const shapeId = feature.properties?.id;
        if (!shapeId) return;

        const layer = createLayerFn(feature);
        if (layer) {
          layer.addTo(map);
          setShapeIdOnLayer(layer, shapeId);
          registerLayer(shapeId, layer);
        }
      });
    },
    [map],
  );

  return {
    selectShapeById,
    deselectShape,
    createShape,
    updateShape,
    deleteShape,
    deleteSelectedShape,
    updateTextMarker,
    updateShapeStyle,
    loadShapes,
  };
};
