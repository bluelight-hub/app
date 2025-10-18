import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { DrawingTool } from '../toolbar/DrawingToolbar';
import { DEFAULT_SHAPE_STYLE } from '@/utils/drawing-styles';
import type React from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import type * as L from 'leaflet';
import type * as GeoJSON from 'geojson';

/**
 * Maximum number of shapes per Lagekarte (Performance-Limit)
 */
const MAX_SHAPES = 100;

interface DrawingLayerProps {
  /**
   * ID des Einsatzes
   */
  einsatzId: string;
  /**
   * Aktuell ausgewähltes Drawing-Tool
   */
  selectedTool: DrawingTool;
  /**
   * Callback wenn Shapes sich ändern (für Backend-Persistierung)
   */
  onShapesChange: (shapes: GeoJSON.FeatureCollection) => void;
  /**
   * Callback wenn Shape-Limit erreicht wird
   */
  onShapeLimitReached?: () => void;
  /**
   * Callback wenn neuer Shape erstellt wurde (öffnet Label-Modal)
   */
  onShapeCreated?: (shape: GeoJSON.Feature) => void;
}

/**
 * DrawingLayer-Komponente für Lagekarte
 *
 * Integriert Leaflet.PM (Geoman) zum Zeichnen von Polygonen, Linien und Rechtecken
 * auf der Karte. Shapes werden als GeoJSON FeatureCollection gespeichert.
 *
 * @param einsatzId - ID des Einsatzes
 * @param selectedTool - Aktuell ausgewähltes Drawing-Tool
 * @param onShapesChange - Callback für Shape-Änderungen (Backend-Persistierung)
 * @param onShapeLimitReached - Callback wenn Shape-Limit (100) erreicht wird
 * @param onShapeCreated - Callback wenn neuer Shape erstellt wurde
 *
 * @remarks
 * - Verwendet Leaflet.PM (NOT leaflet-draw - veraltet!)
 * - Shape-Limit: Max 100 Shapes per Lagekarte
 * - Event-Handler: pm:create, pm:edit, pm:remove
 * - Shapes haben Default-Style bis Typ-Auswahl im Label-Modal
 *
 * @example
 * ```tsx
 * <DrawingLayer
 *   einsatzId="einsatz-123"
 *   selectedTool={selectedTool}
 *   onShapesChange={(shapes) => saveMutation.mutate(shapes)}
 *   onShapeLimitReached={() => toast.error('Max 100 Shapes')}
 *   onShapeCreated={(shape) => setShapeLabelModalOpen(true)}
 * />
 * ```
 */
const DrawingLayerComponent: React.FC<DrawingLayerProps> = ({ einsatzId: _einsatzId, selectedTool, onShapesChange, onShapeLimitReached, onShapeCreated }) => {
  const map = useMap();
  const [shapes, setShapes] = useState<GeoJSON.FeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  // Ref für Layer-Tracking (avoid duplicate layers)
  const layersRef = useRef<Map<number, L.Layer>>(new Map());

  /**
   * Initialize Leaflet.PM Controls
   */
  useEffect(() => {
    // Add Leaflet.PM Controls to map
    map.pm.addControls({
      position: 'topright',
      drawPolygon: false, // We control via DrawingToolbar
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });

    // Hide default PM controls (we use custom DrawingToolbar)
    map.pm.Toolbar.setButtonDisabled('drawPolygon', true);
    map.pm.Toolbar.setButtonDisabled('drawPolyline', true);
    map.pm.Toolbar.setButtonDisabled('drawRectangle', true);

    // Cleanup on unmount
    return () => {
      map.pm.removeControls();
    };
  }, [map]);

  /**
   * Handle Drawing-Tool selection from Toolbar
   */
  useEffect(() => {
    if (!selectedTool) {
      // Deactivate all drawing modes
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalRemovalMode();
      return;
    }

    // Activate drawing mode based on selected tool
    switch (selectedTool) {
      case 'polygon':
        map.pm.enableDraw('Polygon', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'polyline':
        map.pm.enableDraw('Line', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'rectangle':
        map.pm.enableDraw('Rectangle', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'edit':
        map.pm.disableDraw();
        map.pm.enableGlobalEditMode();
        break;
      case 'delete':
        map.pm.disableDraw();
        map.pm.enableGlobalRemovalMode();
        break;
      default:
        map.pm.disableDraw();
    }

    // Cleanup: Deactivate when tool changes
    return () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalRemovalMode();
    };
  }, [selectedTool, map]);

  /**
   * Event Handler: pm:create
   * Called when user creates a new shape
   */
  useEffect(() => {
    const handleCreate = (e: any) => {
      const layer = e.layer;

      // Check shape limit
      if (shapes.features.length >= MAX_SHAPES) {
        // Remove created layer immediately
        map.removeLayer(layer);
        onShapeLimitReached?.();
        return;
      }

      // Convert to GeoJSON
      const geoJson = layer.toGeoJSON() as GeoJSON.Feature;

      // Add shape ID for tracking
      const shapeId = Date.now();
      geoJson.properties = {
        ...geoJson.properties,
        id: shapeId,
        createdAt: new Date().toISOString(),
      };

      // Track layer
      layersRef.current.set(shapeId, layer);

      // Add to shapes collection
      const updatedShapes: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [...shapes.features, geoJson],
      };
      setShapes(updatedShapes);
      onShapesChange(updatedShapes);

      // Trigger Label-Modal
      onShapeCreated?.(geoJson);
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
    };
  }, [map, shapes, onShapesChange, onShapeLimitReached, onShapeCreated]);

  /**
   * Event Handler: pm:edit
   * Called when user edits an existing shape
   */
  useEffect(() => {
    const handleEdit = (e: any) => {
      const layer = e.layer;
      const updatedGeoJson = layer.toGeoJSON() as GeoJSON.Feature;

      // Find shape by layer
      const shapeId = updatedGeoJson.properties?.id;
      if (!shapeId) return;

      // Update shape in collection
      const updatedShapes: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: shapes.features.map((feature) => (feature.properties?.id === shapeId ? { ...feature, geometry: updatedGeoJson.geometry } : feature)),
      };
      setShapes(updatedShapes);
      onShapesChange(updatedShapes);
    };

    map.on('pm:edit', handleEdit);

    return () => {
      map.off('pm:edit', handleEdit);
    };
  }, [map, shapes, onShapesChange]);

  /**
   * Event Handler: pm:remove
   * Called when user deletes a shape
   */
  useEffect(() => {
    const handleRemove = (e: any) => {
      const layer = e.layer;
      const geoJson = layer.toGeoJSON() as GeoJSON.Feature;
      const shapeId = geoJson.properties?.id;

      if (!shapeId) return;

      // Remove from tracking
      layersRef.current.delete(shapeId);

      // Remove from shapes collection
      const updatedShapes: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: shapes.features.filter((feature) => feature.properties?.id !== shapeId),
      };
      setShapes(updatedShapes);
      onShapesChange(updatedShapes);
    };

    map.on('pm:remove', handleRemove);

    return () => {
      map.off('pm:remove', handleRemove);
    };
  }, [map, shapes, onShapesChange]);

  // DrawingLayer renders nothing (Leaflet.PM renders directly to map)
  return null;
};

/**
 * Performance-optimized DrawingLayer with React.memo()
 * Prevents unnecessary re-renders when parent components update
 */
export const DrawingLayer = memo(DrawingLayerComponent);
