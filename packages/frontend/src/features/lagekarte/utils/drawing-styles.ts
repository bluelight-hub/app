/**
 * Drawing-Styles für Lagekarte Shapes (MapLibre GL JS / MapboxDraw)
 *
 * Definiert die Farbschemata und Stil-Optionen für verschiedene
 * Gefahrenbereiche, Sperrbereiche, Rettungswege und Absperrungen.
 */

/**
 * Shape-Typ-Definitionen
 */
export type ShapeType = 'GEFAHRENBEREICH' | 'SPERRBEREICH' | 'RETTUNGSWEG' | 'ABSPERRUNG' | 'SONSTIGES';

/**
 * Style-Konfiguration für ein Shape
 */
export interface ShapeStyleConfig {
  stroke: string;
  fill: string;
  fillOpacity: number;
  strokeWidth: number;
  label: string;
  description: string;
  dashArray?: number[];
}

/**
 * Zentrale Style-Konfiguration für alle Drawing-Typen
 */
export const DRAWING_STYLES: Record<ShapeType, ShapeStyleConfig> = {
  GEFAHRENBEREICH: {
    stroke: '#ef4444',
    fill: '#ef4444',
    fillOpacity: 0.3,
    strokeWidth: 2,
    label: 'Gefahrenbereich',
    description: 'Bereich mit akuter Gefahr (z.B. Evakuierungszone)',
  },
  SPERRBEREICH: {
    stroke: '#f97316',
    fill: '#f97316',
    fillOpacity: 0.3,
    strokeWidth: 2,
    label: 'Sperrbereich',
    description: 'Gesperrter Bereich (kein Zutritt)',
  },
  RETTUNGSWEG: {
    stroke: '#10b981',
    fill: '#10b981',
    fillOpacity: 0.2,
    strokeWidth: 2,
    label: 'Rettungsweg',
    description: 'Sicherer Flucht- oder Rettungsweg',
    dashArray: [10, 5],
  },
  ABSPERRUNG: {
    stroke: '#eab308',
    fill: '#eab308',
    fillOpacity: 0.2,
    strokeWidth: 2,
    label: 'Absperrung',
    description: 'Temporäre Absperrung oder Barriere',
  },
  SONSTIGES: {
    stroke: '#3b82f6',
    fill: '#3b82f6',
    fillOpacity: 0.2,
    strokeWidth: 2,
    label: 'Sonstiges',
    description: 'Sonstige Markierung',
  },
};

/**
 * Default-Style für neue Shapes (vor Typ-Auswahl)
 */
export const DEFAULT_SHAPE_STYLE: ShapeStyleConfig = {
  stroke: '#6b7280',
  fill: '#6b7280',
  fillOpacity: 0.2,
  strokeWidth: 2,
  label: 'Neu',
  description: '',
};

/**
 * MapboxDraw Custom Styles
 *
 * Überschreibt die Default-Styles von @mapbox/mapbox-gl-draw.
 * Nutzt `user_`-Prefix für Custom Properties aus Feature.properties.
 */
export const MAPBOX_DRAW_STYLES: object[] = [
  // Polygon Fill
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': ['coalesce', ['get', 'user_color'], DEFAULT_SHAPE_STYLE.fill],
      'fill-opacity': ['coalesce', ['get', 'user_fillOpacity'], DEFAULT_SHAPE_STYLE.fillOpacity],
    },
  },
  // Polygon Stroke (active)
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], DEFAULT_SHAPE_STYLE.stroke],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], DEFAULT_SHAPE_STYLE.strokeWidth],
    },
  },
  // Line (active)
  {
    id: 'gl-draw-line-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], DEFAULT_SHAPE_STYLE.stroke],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], DEFAULT_SHAPE_STYLE.strokeWidth + 2],
    },
  },
  // Vertex Points (für Edit-Mode)
  {
    id: 'gl-draw-point-active',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fff',
      'circle-stroke-color': '#3b82f6',
      'circle-stroke-width': 2,
    },
  },
  // Midpoint Points
  {
    id: 'gl-draw-point-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 3,
      'circle-color': '#3b82f6',
    },
  },
  // Static Polygon Fill
  {
    id: 'gl-draw-polygon-fill-static',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
    paint: {
      'fill-color': ['coalesce', ['get', 'user_color'], DEFAULT_SHAPE_STYLE.fill],
      'fill-opacity': ['coalesce', ['get', 'user_fillOpacity'], DEFAULT_SHAPE_STYLE.fillOpacity],
    },
  },
  // Static Polygon Stroke
  {
    id: 'gl-draw-polygon-stroke-static',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], DEFAULT_SHAPE_STYLE.stroke],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], DEFAULT_SHAPE_STYLE.strokeWidth],
    },
  },
  // Static Line
  {
    id: 'gl-draw-line-static',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], DEFAULT_SHAPE_STYLE.stroke],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], DEFAULT_SHAPE_STYLE.strokeWidth + 2],
    },
  },
];
