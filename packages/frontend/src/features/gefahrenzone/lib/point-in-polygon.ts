/**
 * Point-in-Polygon-Test via Ray-Casting (Issue #627, G3).
 *
 * Keine externe Dependency (kein `turf`). RFC 7946 GeoJSON-Features mit
 * `geometry.type === 'Polygon'` sind unterstützt; der äußere Ring wird gegen
 * den Punkt getestet, Löcher (innere Ringe) werden — falls vorhanden — als
 * Ausschluss abgezogen.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

/** Ein GeoJSON-Feature, Geometry, oder blankes `{ coordinates }`-Objekt. */
type GeoJsonInput =
  | {
      type?: string;
      geometry?: { type?: string; coordinates?: unknown };
      coordinates?: unknown;
    }
  | null
  | undefined;

/**
 * Entpackt die Polygon-Coordinates aus verschiedenen GeoJSON-Hüllen.
 * Rückgabe ist `number[][][]` (äußerer Ring + optionale Löcher) oder `null`.
 */
function extractPolygonCoordinates(input: GeoJsonInput): number[][][] | null {
  if (!input) return null;
  if (input.type === 'Feature' && input.geometry) {
    return extractPolygonCoordinates(input.geometry as GeoJsonInput);
  }
  if (input.type === 'Polygon' && Array.isArray(input.coordinates)) {
    return input.coordinates as number[][][];
  }
  return null;
}

/** Klassischer Ray-Casting-Algorithmus auf einem einzelnen Ring (2D). */
function isPointInRing(point: LngLat, ring: number[][]): boolean {
  const { lng: x, lat: y } = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Prüft, ob `point` innerhalb des Polygons liegt. Rings[0] ist der äußere
 * Ring; rings[1..n] sind Löcher. Der Punkt ist „drin", wenn er im äußeren
 * Ring liegt, aber in keinem der Löcher.
 */
export function isPointInGeoJsonPolygon(point: LngLat, polygon: GeoJsonInput): boolean {
  const rings = extractPolygonCoordinates(polygon);
  if (!rings || rings.length === 0) return false;
  if (!isPointInRing(point, rings[0])) return false;
  for (let r = 1; r < rings.length; r++) {
    if (isPointInRing(point, rings[r])) return false;
  }
  return true;
}
