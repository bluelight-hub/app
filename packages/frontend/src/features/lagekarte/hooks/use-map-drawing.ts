import { useCallback, useEffect, useRef } from 'react';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type * as GeoJSON from 'geojson';
import type { DrawingTool } from '@/features/lagekarte/ui';
import { addShape, removeShape, updateShape, setShapes, selectShape, setActiveDrawingTool } from '../stores/lagekarte-state.store';
import { lagekarteStore } from '../stores/lagekarte-state.store';
import { normalizeDrawFeature } from '../utils/layer-utils';
import { DRAW_FEATURE_LIMIT } from '../utils/map-config';
import { toast } from 'sonner';

interface UseMapDrawingOptions {
  onShapesChange: (shapes: GeoJSON.FeatureCollection) => void;
  onShapeCreated?: (shape: GeoJSON.Feature) => void;
  onShapeLimitReached?: () => void;
  onShapeSelected?: (shape: GeoJSON.Feature | null) => void;
  isPlacementModeActive: boolean;
}

/**
 * Kernhook für MapboxDraw-Integration
 *
 * Verwaltet alle Draw-Events (create, update, delete, selectionchange)
 * und synchronisiert den State mit dem TanStack Store.
 */
export const useMapDrawing = (map: MapLibreMap | null, draw: MapboxDraw | null, options: UseMapDrawingOptions) => {
  const { onShapesChange, onShapeCreated, onShapeLimitReached, onShapeSelected, isPlacementModeActive } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Synchronisiere Store-Shapes mit Draw
  const syncStoreToDraw = useCallback(() => {
    const shapes = lagekarteStore.state.shapes;
    onShapesChange(shapes);
  }, [onShapesChange]);

  // Draw-Events registrieren
  useEffect(() => {
    if (!map || !draw) return;

    const handleCreate = (e: { features: GeoJSON.Feature[] }) => {
      let currentCount = lagekarteStore.state.shapes.features.length;

      for (const feature of e.features) {
        if (currentCount >= DRAW_FEATURE_LIMIT) {
          draw.delete(String(feature.id));
          optionsRef.current.onShapeLimitReached?.();
          continue;
        }

        const normalized = normalizeDrawFeature(feature);
        addShape(normalized);
        currentCount++;
        optionsRef.current.onShapeCreated?.(normalized);
      }

      syncStoreToDraw();
    };

    const handleUpdate = (e: { features: GeoJSON.Feature[] }) => {
      for (const feature of e.features) {
        const shapeId = feature.properties?.id ?? String(feature.id);
        updateShape(shapeId, (existing) => ({
          ...existing,
          geometry: feature.geometry,
        }));
      }
      syncStoreToDraw();
    };

    const handleDelete = (e: { features: GeoJSON.Feature[] }) => {
      for (const feature of e.features) {
        const shapeId = feature.properties?.id ?? String(feature.id);
        removeShape(shapeId);
      }
      syncStoreToDraw();
    };

    const handleSelectionChange = (e: { features: GeoJSON.Feature[] }) => {
      if (optionsRef.current.isPlacementModeActive) return;

      if (e.features.length > 0) {
        const feature = e.features[0];
        const shapeId = feature.properties?.id ?? String(feature.id);
        selectShape(shapeId);

        const storeFeature = lagekarteStore.state.shapes.features.find((f) => f.properties?.id === shapeId);
        optionsRef.current.onShapeSelected?.(storeFeature ?? feature);
      } else {
        selectShape(null);
        optionsRef.current.onShapeSelected?.(null);
      }
    };

    map.on('draw.create', handleCreate);
    map.on('draw.update', handleUpdate);
    map.on('draw.delete', handleDelete);
    map.on('draw.selectionchange', handleSelectionChange);

    return () => {
      map.off('draw.create', handleCreate);
      map.off('draw.update', handleUpdate);
      map.off('draw.delete', handleDelete);
      map.off('draw.selectionchange', handleSelectionChange);
    };
  }, [map, draw, syncStoreToDraw]);

  // Keyboard-Shortcut: Delete/Backspace
  useEffect(() => {
    if (!draw) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Nicht löschen wenn ein Input/Textarea fokussiert ist
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        const selected = draw.getSelected();
        if (selected.features.length > 0) {
          const ids = selected.features.map((f) => String(f.id));
          draw.delete(ids);

          for (const feature of selected.features) {
            const shapeId = feature.properties?.id ?? String(feature.id);
            removeShape(shapeId);
          }

          selectShape(null);
          onShapeSelected?.(null);
          syncStoreToDraw();
          toast.success('Shape gelöscht');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [draw, syncStoreToDraw, onShapeSelected]);

  /** Drawing-Tool aktivieren */
  const activateTool = useCallback(
    (tool: DrawingTool | null) => {
      if (!draw || isPlacementModeActive) return;

      switch (tool) {
        case 'polygon':
          draw.changeMode('draw_polygon');
          break;
        case 'polyline':
          draw.changeMode('draw_line_string');
          break;
        case 'rectangle':
          // MapboxDraw hat keinen nativen Rectangle-Mode
          // Fallback: draw_polygon (User zeichnet als Polygon)
          draw.changeMode('draw_polygon');
          break;
        case 'edit':
        case 'select':
          draw.changeMode('simple_select');
          break;
        case 'delete': {
          const selected = draw.getSelected();
          if (selected.features.length > 0) {
            const ids = selected.features.map((f) => String(f.id));
            draw.delete(ids);
            for (const feature of selected.features) {
              const shapeId = feature.properties?.id ?? String(feature.id);
              removeShape(shapeId);
            }
            syncStoreToDraw();
            toast.success('Shape gelöscht');
          }
          draw.changeMode('simple_select');
          break;
        }
        default:
          draw.changeMode('simple_select');
          break;
      }

      selectShape(null);
      setActiveDrawingTool(tool);
    },
    [draw, isPlacementModeActive, syncStoreToDraw],
  );

  /** Shape-Properties aktualisieren (Label, Typ, Farbe etc.) */
  const updateShapeProperties = useCallback(
    (shapeId: string, properties: Record<string, unknown>) => {
      if (!draw) return;

      // MapboxDraw Feature updaten
      for (const [key, value] of Object.entries(properties)) {
        draw.setFeatureProperty(shapeId, key, value);
      }

      // Store updaten
      updateShape(shapeId, (feature) => ({
        ...feature,
        properties: { ...feature.properties, ...properties },
      }));

      syncStoreToDraw();
    },
    [draw, syncStoreToDraw],
  );

  /** Initiale Shapes in Draw laden */
  const loadInitialShapes = useCallback(
    (initialState: GeoJSON.FeatureCollection | undefined) => {
      if (!draw || !initialState?.features?.length) return;

      // Shapes in Draw laden (MapboxDraw erwartet FeatureCollection mit string IDs)
      const withStringIds: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: initialState.features
          .filter((f) => f.properties?.id)
          .map((f) => ({
            ...f,
            id: f.properties?.id,
          })),
      };

      try {
        draw.set(withStringIds);
      } catch (error) {
        console.warn('[useMapDrawing] Fehler beim Laden initialer Shapes:', error);
      }

      // Store synchronisieren
      setShapes(initialState);
    },
    [draw],
  );

  /** Shape in Draw löschen */
  const deleteShape = useCallback(
    (shapeId: string) => {
      if (!draw) return;

      try {
        draw.delete(shapeId);
        removeShape(shapeId);
        selectShape(null);
        syncStoreToDraw();
        toast.success('Shape gelöscht');
      } catch (error) {
        console.error('[useMapDrawing] Fehler beim Löschen:', error);
        toast.error('Fehler beim Löschen des Shapes');
      }
    },
    [draw, syncStoreToDraw],
  );

  return {
    activateTool,
    updateShapeProperties,
    loadInitialShapes,
    deleteShape,
  };
};
