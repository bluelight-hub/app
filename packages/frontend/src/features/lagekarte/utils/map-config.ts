/**
 * Karten-Konfiguration für MapLibre GL JS
 *
 * Enthält alle Konstanten für Tile-Quellen, Default-Positionen und Zoom-Level.
 */

/**
 * OpenFreeMap Vector Tile Styles
 * Kostenlos, kein API-Key erforderlich
 */
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/**
 * Default-Kartenansicht (Deutschland-Zentrum)
 * Koordinaten in GeoJSON-Reihenfolge: [longitude, latitude]
 */
export const MAP_DEFAULTS = {
  longitude: 10.4515,
  latitude: 51.1657,
  zoom: 6,
  maxZoom: 18,
  minZoom: 3,
} as const;

/**
 * Maximale Anzahl an Zeichnungen pro Lagekarte
 */
export const DRAW_FEATURE_LIMIT = 100;
