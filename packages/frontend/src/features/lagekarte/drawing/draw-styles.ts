/**
 * Benutzerdefinierte MapboxDraw-Styles
 *
 * Unterstützt farbige Zeichnungsobjekte über user_ Properties.
 * MapboxDraw speichert benutzerdefinierte Properties intern mit dem Präfix `user_`.
 */

export const CUSTOM_DRAW_STYLES: object[] = [
  // Polygon-Füllung (inaktiv)
  {
    id: 'gl-draw-polygon-fill-inactive',
    type: 'fill',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': ['coalesce', ['get', 'user_fillColor'], '#3b82f6'],
      'fill-outline-color': ['coalesce', ['get', 'user_color'], '#3b82f6'],
      'fill-opacity': ['coalesce', ['get', 'user_fillOpacity'], 0.2],
    },
  },
  // Polygon-Füllung (aktiv)
  {
    id: 'gl-draw-polygon-fill-active',
    type: 'fill',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': ['coalesce', ['get', 'user_fillColor'], '#fbbf24'],
      'fill-outline-color': ['coalesce', ['get', 'user_color'], '#fbbf24'],
      'fill-opacity': 0.3,
    },
  },
  // Polygon-Kontur (inaktiv)
  {
    id: 'gl-draw-polygon-stroke-inactive',
    type: 'line',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], '#3b82f6'],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], 2],
      // Hinweis: line-dasharray unterstützt keine data-driven Expressions in MapboxDraw,
      // daher wird hier ein fester Wert verwendet
      'line-dasharray': [1],
    },
  },
  // Polygon-Kontur (aktiv)
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], '#fbbf24'],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], 2],
    },
  },
  // Linie (inaktiv)
  {
    id: 'gl-draw-line-inactive',
    type: 'line',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], '#3b82f6'],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], 2],
    },
  },
  // Linie (aktiv)
  {
    id: 'gl-draw-line-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], '#fbbf24'],
      'line-width': ['coalesce', ['get', 'user_strokeWidth'], 2],
    },
  },
  // Punkt (inaktiv)
  {
    id: 'gl-draw-point-inactive',
    type: 'circle',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 6,
      'circle-color': ['coalesce', ['get', 'user_color'], '#3b82f6'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  },
  // Punkt (aktiv)
  {
    id: 'gl-draw-point-active',
    type: 'circle',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
    paint: {
      'circle-radius': 8,
      'circle-color': ['coalesce', ['get', 'user_color'], '#fbbf24'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  },
  // Vertex-Punkte (Bearbeitungsgriffe)
  {
    id: 'gl-draw-polygon-and-line-vertex-inactive',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#3b82f6',
    },
  },
  // Midpoint-Punkte
  {
    id: 'gl-draw-polygon-midpoint',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
    paint: {
      'circle-radius': 3,
      'circle-color': '#3b82f6',
    },
  },
  // Text-Label-Layer (für draw_text Modus Features)
  {
    id: 'gl-draw-text-label',
    type: 'symbol',
    filter: ['all', ['==', '$type', 'Point'], ['has', 'user_label'], ['==', 'meta', 'feature']],
    layout: {
      'text-field': ['get', 'user_label'],
      'text-size': 14,
      'text-anchor': 'center',
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': ['coalesce', ['get', 'user_color'], '#1e293b'],
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
    },
  },
];
