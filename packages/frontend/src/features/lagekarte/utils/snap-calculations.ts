/**
 * Snap-Berechnungen für die Lagekarte
 *
 * Findet den nächsten Snap-Punkt (Vertex oder Kante) auf existierenden
 * Features innerhalb einer Pixel-Toleranz.
 */

import * as turf from '@turf/turf';
import type maplibregl from 'maplibre-gl';

/** Ergebnis eines Snap-Vorgangs */
export interface SnapResult {
  /** Gesnappte Position */
  lngLat: { lng: number; lat: number };
  /** Typ des Snap-Targets */
  type: 'vertex' | 'edge';
}

/**
 * Extrahiert alle Koordinaten aus einer GeoJSON-Geometrie als flaches Array.
 */
function extractCoordinates(geometry: GeoJSON.Geometry): GeoJSON.Position[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates;
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.flat();
    case 'MultiPolygon':
      return geometry.coordinates.flat(2);
    default:
      return [];
  }
}

/**
 * Extrahiert alle Linien-Segmente (für Edge-Snapping) aus einer Geometrie.
 */
function extractLineSegments(geometry: GeoJSON.Geometry): GeoJSON.Position[][] {
  switch (geometry.type) {
    case 'LineString':
      return [geometry.coordinates];
    case 'MultiLineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates;
    case 'MultiPolygon':
      return geometry.coordinates.flat();
    default:
      return [];
  }
}

/**
 * Berechnet die euklidische Pixel-Distanz zwischen zwei Punkten.
 */
function pixelDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Findet den nächsten Snap-Punkt unter allen Features.
 *
 * Prüft zuerst Vertices (exakte Punkte), dann Kanten (nächster Punkt auf Linie).
 * Gibt null zurück wenn kein Feature innerhalb der Pixel-Toleranz liegt.
 *
 * @param cursorPixel - Cursor-Position in Pixel
 * @param features - Alle Features zum Snappen
 * @param map - MapLibre-Instanz für Koordinaten-Projektion
 * @param snapPxThreshold - Snap-Distanz in Pixel (default 12)
 * @param excludeFeatureIds - Feature-IDs die vom Snapping ausgeschlossen werden (z.B. aktuell bearbeitetes Feature)
 */
export function findSnapPoint(
  cursorPixel: { x: number; y: number },
  features: GeoJSON.Feature[],
  map: maplibregl.Map,
  snapPxThreshold = 12,
  excludeFeatureIds: Set<string> = new Set(),
): SnapResult | null {
  let bestVertex: SnapResult | null = null;
  let bestVertexDist = snapPxThreshold;

  // Phase 1: Vertex-Snapping (exakte Punkte)
  for (const feature of features) {
    if (excludeFeatureIds.has(String(feature.id ?? ''))) continue;

    const coords = extractCoordinates(feature.geometry);
    for (const coord of coords) {
      const projected = map.project([coord[0], coord[1]]);
      const dist = pixelDistance(cursorPixel, projected);
      if (dist < bestVertexDist) {
        bestVertexDist = dist;
        bestVertex = { lngLat: { lng: coord[0], lat: coord[1] }, type: 'vertex' };
      }
    }
  }

  // Vertex-Treffer hat Vorrang
  if (bestVertex) return bestVertex;

  // Phase 2: Edge-Snapping (nächster Punkt auf Linie)
  let bestEdge: SnapResult | null = null;
  let bestEdgeDist = snapPxThreshold;

  // Cursor in Geo-Koordinaten einmalig berechnen
  const cursorLngLat = map.unproject(cursorPixel);
  const cursorTurfPoint = turf.point([cursorLngLat.lng, cursorLngLat.lat]);

  for (const feature of features) {
    if (excludeFeatureIds.has(String(feature.id ?? ''))) continue;

    const lines = extractLineSegments(feature.geometry);
    for (const line of lines) {
      if (line.length < 2) continue;

      const snapped = turf.nearestPointOnLine(turf.lineString(line), cursorTurfPoint);
      const snappedCoord = snapped.geometry.coordinates;
      const projected = map.project([snappedCoord[0], snappedCoord[1]]);
      const dist = pixelDistance(cursorPixel, projected);

      if (dist < bestEdgeDist) {
        bestEdgeDist = dist;
        bestEdge = { lngLat: { lng: snappedCoord[0], lat: snappedCoord[1] }, type: 'edge' };
      }
    }
  }

  return bestEdge;
}
