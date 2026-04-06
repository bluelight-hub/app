import type * as GeoJSON from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { ShapeProperties } from './types';

/**
 * Berechnet die Toolbar-Position auf Basis einer GeoJSON Feature-Geometrie
 *
 * @param feature - Das GeoJSON Feature dessen Zentrum berechnet wird
 * @param map - MapLibre Map-Instanz
 * @param offset - Vertikaler Offset in Pixeln (Default: 20)
 */
export const calculateToolbarPositionFromGeoJSON = (feature: GeoJSON.Feature, map: MapLibreMap, offset = 20): { x: number; y: number } | null => {
  try {
    const geometry = feature.geometry;
    let center: [number, number];

    if (geometry.type === 'Point') {
      center = geometry.coordinates as [number, number];
    } else if (geometry.type === 'Polygon') {
      center = calculateCentroid(geometry.coordinates[0] as [number, number][]);
    } else if (geometry.type === 'LineString') {
      const coords = geometry.coordinates as [number, number][];
      const midIndex = Math.floor(coords.length / 2);
      center = coords[midIndex];
    } else {
      return null;
    }

    const point = map.project(center);
    return { x: point.x, y: point.y + offset };
  } catch {
    return null;
  }
};

/**
 * Berechnet den Centroid eines Polygons (einfacher Schwerpunkt)
 */
const calculateCentroid = (coordinates: [number, number][]): [number, number] => {
  let sumLng = 0;
  let sumLat = 0;
  // Letzter Punkt = erster Punkt bei geschlossenem Polygon, überspringen
  const count = coordinates.length > 1 ? coordinates.length - 1 : coordinates.length;

  for (let i = 0; i < count; i++) {
    sumLng += coordinates[i][0];
    sumLat += coordinates[i][1];
  }

  return [sumLng / count, sumLat / count];
};

/**
 * Normalisiert ein MapboxDraw-Feature mit Standard-Properties
 */
export const normalizeDrawFeature = (drawFeature: GeoJSON.Feature, additionalProperties?: Partial<ShapeProperties>): GeoJSON.Feature => {
  return {
    ...drawFeature,
    properties: {
      ...drawFeature.properties,
      id: String(drawFeature.id ?? drawFeature.properties?.id),
      createdAt: drawFeature.properties?.createdAt ?? new Date().toISOString(),
      ...additionalProperties,
    },
  };
};
