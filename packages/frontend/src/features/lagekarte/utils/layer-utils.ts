import * as L from 'leaflet';
import type * as GeoJSON from 'geojson';
import { DEFAULT_SHAPE_STYLE } from '@/utils/drawing-styles';
import type { LayerWithStyle, LayerWithBounds, LayerWithLatLng, LayerWithShapeId } from './types';

/**
 * Type guards for layer types
 */
const isLayerWithBounds = (layer: L.Layer): layer is LayerWithBounds => {
  return 'getBounds' in layer && typeof (layer as LayerWithBounds).getBounds === 'function';
};

const isLayerWithLatLng = (layer: L.Layer): layer is LayerWithLatLng => {
  return 'getLatLng' in layer && typeof (layer as LayerWithLatLng).getLatLng === 'function';
};

const isLayerWithStyle = (layer: L.Layer): layer is LayerWithStyle => {
  return 'setStyle' in layer && typeof (layer as LayerWithStyle).setStyle === 'function';
};

/**
 * Calculate toolbar position from layer bounds or center
 */
export const calculateToolbarPosition = (layer: L.Layer, map: L.Map, offset = 20): { x: number; y: number } | null => {
  try {
    // For layers with bounds (Polygon, Rectangle, etc.)
    if (isLayerWithBounds(layer)) {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      const point = map.latLngToContainerPoint(center);
      return { x: point.x, y: point.y + offset };
    }

    // For markers (Point geometry)
    if (isLayerWithLatLng(layer)) {
      const latLng = layer.getLatLng();
      const point = map.latLngToContainerPoint(latLng);
      return { x: point.x, y: point.y + offset };
    }

    return null;
  } catch (error) {
    console.warn('[layer-utils] Could not calculate toolbar position:', error);
    return null;
  }
};

/**
 * Create GeoJSON layer from feature with proper styling
 */
export const createGeoJSONLayer = (feature: GeoJSON.Feature): L.Layer | null => {
  const savedColor = feature.properties?.color;
  const savedStrokeWidth = feature.properties?.strokeWidth;
  const savedFillOpacity = feature.properties?.fillOpacity;

  const layers = L.geoJSON(feature, {
    style: {
      ...DEFAULT_SHAPE_STYLE,
      // Override with saved properties if available
      ...(savedColor && { color: savedColor }),
      ...(savedStrokeWidth !== undefined && { weight: savedStrokeWidth }),
      ...(savedFillOpacity !== undefined && { fillOpacity: savedFillOpacity }),
    },
  }).getLayers();

  return layers.length > 0 ? layers[0] : null;
};

/**
 * Update layer style with new properties
 */
export const updateLayerStyle = (layer: L.Layer, properties: { color?: string; strokeWidth?: number; fillOpacity?: number }): void => {
  if (!isLayerWithStyle(layer)) {
    return;
  }

  const { color, strokeWidth, fillOpacity } = properties;

  // Build style update object - only include defined properties
  const styleUpdate: Partial<L.PathOptions> = {};

  if (color) {
    styleUpdate.color = color;
  }
  if (strokeWidth !== undefined) {
    styleUpdate.weight = strokeWidth;
  }
  if (fillOpacity !== undefined) {
    styleUpdate.fillOpacity = fillOpacity;
  }

  // Apply style update if any properties changed
  if (Object.keys(styleUpdate).length > 0) {
    const newStyle: L.PathOptions = {
      ...layer.options, // Keep existing options
      ...styleUpdate, // Override with new values
      opacity: 1.0, // Keep stroke fully opaque
    };

    layer.setStyle(newStyle);
  }
};

/**
 * Find shape ID from layer
 */
export const getShapeIdFromLayer = (layer: L.Layer): string | null => {
  return (layer as LayerWithShapeId)._shapeId || null;
};

/**
 * Store shape ID on layer
 */
export const setShapeIdOnLayer = (layer: L.Layer, shapeId: string): void => {
  (layer as LayerWithShapeId)._shapeId = shapeId;
};
