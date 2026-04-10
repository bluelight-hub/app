/**
 * Shared Arrow-Display-Logik für alle Draw-Modi
 *
 * Zeigt die Linie an und erzeugt die Pfeilspitze als zusätzliches Display-Feature.
 * Mit icon-anchor 'center' (Standard) sitzt der breiteste Teil des Pfeilkopfs
 * am Linien-Endpunkt — die Spitze ragt darüber hinaus, der Strich wird überdeckt.
 *
 * Wird von arrow.mode, simple-select.mode und direct-select.mode verwendet.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { berechneBearing } from '../utils/geo-calculations';

/**
 * Erzeugt Arrow-Display-Features: Linie + Pfeilspitze am Endpunkt.
 *
 * @param _map - MapLibre Map-Instanz (reserviert für zukünftige Nutzung)
 * @param geojson - Das LineString-Feature (mit user_ Properties)
 * @param display - MapboxDraw display-Callback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function erzeugeArrowDisplay(_map: MaplibreMap, geojson: any, display: (feature: any) => void): void {
  const coords = geojson.geometry.coordinates;
  if (!coords || coords.length < 2) return;

  const from: [number, number] = coords[coords.length - 2] as [number, number];
  const to: [number, number] = coords[coords.length - 1] as [number, number];
  const bearing = berechneBearing(from, to);

  // Linie ungekürzt anzeigen — der Pfeilkopf überdeckt das Ende,
  // weil icon-anchor 'center' den breitesten Teil am Endpunkt positioniert.
  display(geojson);

  // Pfeilspitze am Endpunkt
  display({
    type: 'Feature',
    properties: {
      meta: 'arrowhead',
      parent: geojson.properties.id,
      arrowBearing: bearing,
      active: geojson.properties.active,
      user_color: geojson.properties.user_color,
      user_strokeWidth: geojson.properties.user_strokeWidth,
    },
    geometry: { type: 'Point', coordinates: to },
  });
}
