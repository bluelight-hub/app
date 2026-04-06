import type { DrawingTool } from '@/features/lagekarte';
import { ShapeContextMenu, SelectedShapeToolbar } from '@/features/lagekarte';
import { useMapDrawing } from '@/features/lagekarte/hooks';
import { useSelectedShapeId } from '@/features/lagekarte/hooks';
import { calculateToolbarPositionFromGeoJSON } from '@/features/lagekarte/utils/layer-utils';
import { setToolbarPosition, lagekarteStore } from '@/features/lagekarte/stores/lagekarte-state.store';
import { useToolbarPosition } from '@/features/lagekarte/hooks';
import { MAPBOX_DRAW_STYLES } from '@/features/lagekarte/utils/drawing-styles';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type * as GeoJSON from 'geojson';
import type React from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { toast } from 'sonner';

interface DrawingLayerProps {
  mapRef: React.RefObject<MapRef | null>;
  einsatzId: string;
  selectedTool: DrawingTool;
  initialState?: GeoJSON.FeatureCollection;
  shapeToUpdate?: GeoJSON.Feature | null;
  onShapesChange: (shapes: GeoJSON.FeatureCollection) => void;
  onShapeLimitReached?: () => void;
  onShapeCreated?: (shape: GeoJSON.Feature) => void;
  onShapeUpdateComplete?: () => void;
  onShapeSelected?: (shape: GeoJSON.Feature | null) => void;
  isPlacementModeActive?: boolean;
}

const DrawingLayerComponent: React.FC<DrawingLayerProps> = ({
  mapRef,
  einsatzId: _einsatzId,
  selectedTool,
  initialState,
  shapeToUpdate,
  onShapesChange,
  onShapeLimitReached,
  onShapeCreated,
  onShapeUpdateComplete,
  onShapeSelected,
  isPlacementModeActive = false,
}) => {
  const [draw, setDraw] = useState<MapboxDraw | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const initialLoadedRef = useRef(false);
  const selectedShapeId = useSelectedShapeId();

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    shapeId: string;
  } | null>(null);

  // MapboxDraw initialisieren und bei Unmount aufräumen
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    let drawInstance: MapboxDraw | null = null;

    const initDraw = () => {
      drawInstance = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        styles: MAPBOX_DRAW_STYLES,
        userProperties: true,
      });

      map.addControl(drawInstance as unknown as maplibregl.IControl);
      setDraw(drawInstance);
      setMapInstance(map);
    };

    if (map.loaded()) {
      initDraw();
    } else {
      map.on('load', initDraw);
    }

    return () => {
      map.off('load', initDraw);
      if (drawInstance) {
        try {
          map.removeControl(drawInstance as unknown as maplibregl.IControl);
        } catch {
          // Map möglicherweise bereits entfernt
        }
      }
      setDraw(null);
      setMapInstance(null);
    };
  }, [mapRef]);

  // Drawing-Hook
  const { activateTool, updateShapeProperties, loadInitialShapes, deleteShape } = useMapDrawing(mapInstance, draw, {
    onShapesChange,
    onShapeCreated,
    onShapeLimitReached,
    onShapeSelected,
    isPlacementModeActive,
  });

  // Initiale Shapes laden (einmalig)
  useEffect(() => {
    if (!draw || initialLoadedRef.current) return;
    if (!initialState?.features?.length) return;

    loadInitialShapes(initialState);
    initialLoadedRef.current = true;
  }, [draw, initialState, loadInitialShapes]);

  // Tool-Änderungen weiterleiten
  useEffect(() => {
    activateTool(isPlacementModeActive ? null : selectedTool);
  }, [selectedTool, isPlacementModeActive, activateTool]);

  // Shape-Update verarbeiten (Label, Typ etc.)
  useEffect(() => {
    if (!shapeToUpdate || !draw) return;

    const shapeId = shapeToUpdate.properties?.id;
    if (!shapeId) return;

    const properties = shapeToUpdate.properties ?? {};
    const propsToUpdate: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (key !== 'id') {
        propsToUpdate[key] = value;
      }
    }

    updateShapeProperties(shapeId, propsToUpdate);
    onShapeUpdateComplete?.();
  }, [shapeToUpdate, draw, updateShapeProperties, onShapeUpdateComplete]);

  // Toolbar-Position berechnen
  useEffect(() => {
    if (!selectedShapeId || !mapInstance) {
      setToolbarPosition(null);
      return;
    }

    const updatePosition = () => {
      const feature = lagekarteStore.state.shapes.features.find((f) => f.properties?.id === selectedShapeId);
      if (!feature) {
        setToolbarPosition(null);
        return;
      }

      const position = calculateToolbarPositionFromGeoJSON(feature, mapInstance);
      setToolbarPosition(position);
    };

    updatePosition();

    mapInstance.on('zoom', updatePosition);
    mapInstance.on('move', updatePosition);

    return () => {
      mapInstance.off('zoom', updatePosition);
      mapInstance.off('move', updatePosition);
    };
  }, [selectedShapeId, mapInstance]);

  // Context Menu via Rechtsklick auf Karte
  useEffect(() => {
    if (!mapInstance || !draw) return;

    const handleContextMenu = (e: maplibregl.MapMouseEvent) => {
      if (isPlacementModeActive) return;

      // Prüfe ob ein Draw-Feature unter dem Cursor liegt
      const features = draw.getAll().features;
      const point = [e.lngLat.lng, e.lngLat.lat];

      // Einfache Prüfung: Ist ein Feature selektiert?
      const selected = draw.getSelected();
      if (selected.features.length > 0) {
        const shapeId = selected.features[0].properties?.id ?? String(selected.features[0].id);
        e.preventDefault();
        setContextMenu({
          isOpen: true,
          position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
          shapeId,
        });
      }
    };

    mapInstance.on('contextmenu', handleContextMenu);
    return () => {
      mapInstance.off('contextmenu', handleContextMenu);
    };
  }, [mapInstance, draw, isPlacementModeActive]);

  // Toolbar-Position reaktiv aus Store
  const toolbarPosition = useToolbarPosition();

  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu || !draw) return;
    try {
      draw.changeMode('direct_select', { featureId: contextMenu.shapeId });
      toast.info('Bearbeitungsmodus aktiviert');
    } catch {
      // Feature möglicherweise nicht vorhanden
    }
    setContextMenu(null);
  }, [contextMenu, draw]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu) return;
    deleteShape(contextMenu.shapeId);
    setContextMenu(null);
  }, [contextMenu, deleteShape]);

  const handleContextMenuChangeStyle = useCallback(() => {
    if (!contextMenu) return;
    toast.info('Stil-Editor kommt bald');
    setContextMenu(null);
  }, [contextMenu]);

  const handleToolbarEdit = useCallback(() => {
    if (!selectedShapeId || !draw) return;
    try {
      draw.changeMode('direct_select', { featureId: selectedShapeId });
      toast.info('Bearbeitungsmodus aktiviert');
    } catch {
      // Feature möglicherweise nicht vorhanden
    }
  }, [selectedShapeId, draw]);

  const handleToolbarDelete = useCallback(() => {
    if (!selectedShapeId) return;
    deleteShape(selectedShapeId);
  }, [selectedShapeId, deleteShape]);

  const handleToolbarChangeStyle = useCallback(() => {
    toast.info('Stil-Editor kommt bald');
  }, []);

  return (
    <>
      <ShapeContextMenu
        isOpen={contextMenu?.isOpen ?? false}
        position={contextMenu?.position ?? null}
        onClose={() => setContextMenu(null)}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onChangeStyle={handleContextMenuChangeStyle}
      />

      {selectedShapeId && toolbarPosition && (
        <SelectedShapeToolbar shapeId={selectedShapeId} position={toolbarPosition} onEdit={handleToolbarEdit} onDelete={handleToolbarDelete} onChangeStyle={handleToolbarChangeStyle} />
      )}
    </>
  );
};

export const DrawingLayer = memo(DrawingLayerComponent);
