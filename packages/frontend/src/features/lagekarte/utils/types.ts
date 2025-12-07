import type * as L from 'leaflet';

/**
 * Leaflet Layer mit Style-Properties (Polygon, Polyline, etc.)
 */
export interface LayerWithStyle extends L.Layer {
  setStyle: (style: L.PathOptions) => this;
  options: L.PathOptions;
}

/**
 * Leaflet Layer mit Bounds (Polygon, Rectangle, etc.)
 */
export interface LayerWithBounds extends L.Layer {
  getBounds: () => L.LatLngBounds;
}

/**
 * Leaflet Marker mit LatLng
 */
export interface LayerWithLatLng extends L.Layer {
  getLatLng: () => L.LatLng;
}

/**
 * Leaflet Layer mit Geoman PM support
 */
export interface LayerWithPM extends L.Layer {
  pm: {
    enable: () => void;
    disable: () => void;
    enabled: () => boolean;
  };
}

/**
 * Leaflet Layer mit Shape-ID (custom property)
 */
export interface LayerWithShapeId extends L.Layer {
  _shapeId?: string;
}

/**
 * Leaflet Layer mit Text-Content (für Text-Marker)
 */
export interface LayerWithTextContent extends L.Layer {
  _textContent?: string;
  getElement?: () => HTMLElement | null;
}

/**
 * Leaflet Layer mit GeoJSON
 */
export interface LayerWithGeoJSON extends L.Layer {
  toGeoJSON: () => GeoJSON.Feature;
}

/**
 * Original style for highlighting
 */
export interface OriginalStyle {
  color?: string;
  weight?: number;
  opacity?: number;
  fillOpacity?: number;
}
