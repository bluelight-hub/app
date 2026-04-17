import { Result } from '@domain/common/result';

/**
 * Geometrietyp einer Gefahrenzone.
 *
 * CIRCLE-Zonen werden bei Persistierung als Polygon (64 Punkte, Kugelgeometrie) abgelegt,
 * der CIRCLE-Typ bleibt für UI-Hints erhalten (z. B. Resize-Handles).
 */
export enum GefahrenzoneGeometryType {
  POLYGON = 'POLYGON',
  CIRCLE = 'CIRCLE',
}

/**
 * GeoJSON-Position: [longitude, latitude] gemäß RFC 7946.
 */
export type GeoJsonPosition = [number, number];

/**
 * GeoJSON-Polygon (RFC 7946 §3.1.6) — ein äußerer Ring, optional Löcher.
 * Erster und letzter Punkt jedes Rings sind identisch (geschlossener Ring).
 */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
}

/**
 * GeoJSON-Feature (RFC 7946 §3.2) mit Polygon-Geometrie.
 * Properties sind frei — der Domain-Layer speichert nichts Geometrie-Fremdes dort.
 */
export interface GeoJsonPolygonFeature {
  type: 'Feature';
  geometry: GeoJsonPolygon;
  properties?: Record<string, unknown> | null;
}

/** Error-Codes für Geometrie-Validierung (stabil, werden im Controller zu HTTP-Fehlern gemappt). */
export const GEFAHRENZONE_GEOMETRY_ERROR_CODES = {
  INVALID_FEATURE: 'GEFAHRENZONE_GEOMETRY_INVALID_FEATURE',
  INVALID_GEOMETRY_TYPE: 'GEFAHRENZONE_GEOMETRY_INVALID_TYPE',
  EMPTY_COORDINATES: 'GEFAHRENZONE_GEOMETRY_EMPTY_COORDINATES',
  INVALID_COORDINATE: 'GEFAHRENZONE_GEOMETRY_INVALID_COORDINATE',
  UNCLOSED_RING: 'GEFAHRENZONE_GEOMETRY_UNCLOSED_RING',
  TOO_FEW_POINTS: 'GEFAHRENZONE_GEOMETRY_TOO_FEW_POINTS',
  INVALID_RADIUS: 'GEFAHRENZONE_GEOMETRY_INVALID_RADIUS',
} as const;

/** Mindest-Polygon-Ring-Länge laut RFC 7946: 4 Positionen (Dreieck + geschlossener Abschluss). */
const MIN_POLYGON_RING_LENGTH = 4;

/** Erdradius in Metern für sphärische Circle-zu-Polygon-Konvertierung (WGS-84-Mittelwert). */
const EARTH_RADIUS_METERS = 6_378_137;

/** Punktauflösung für Kreis-Approximation — 64 entspricht MapGL-Konvention von turf.js. */
const CIRCLE_POLYGON_POINTS = 64;

/**
 * Value Object für die Geometrie einer Gefahrenzone.
 *
 * Kapselt Validierung + Kreis-nach-Polygon-Konvertierung. Persistenz und API-Payload
 * nutzen immer GeoJSON-Feature mit Polygon-Geometry; der Circle bleibt nur als
 * Metadaten-Hint auf Entity-Ebene (`geometryType`).
 */
export class GefahrenzoneGeometry {
  private constructor(public readonly feature: GeoJsonPolygonFeature) {}

  /**
   * Erstellt eine Geometrie aus einem GeoJSON-Feature und validiert Struktur + Koordinaten.
   */
  static fromFeature(raw: unknown): Result<GefahrenzoneGeometry> {
    const validationResult = validateFeature(raw);
    if (validationResult.isFailure || !validationResult.value) {
      return Result.fail<GefahrenzoneGeometry>(validationResult.error ?? GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_FEATURE);
    }
    return Result.ok(new GefahrenzoneGeometry(validationResult.value));
  }

  /**
   * Erstellt eine Polygon-Approximation eines Kreises (64 Punkte, Kugelgeometrie).
   *
   * Der resultierende Ring ist geschlossen (erster == letzter Punkt). Keine externe
   * Library — die Formel nutzt Bearing/Distanz auf der Kugel gemäß GeoJSON-üblicher
   * Circle-Darstellung (kompatibel mit turf.js-`circle`).
   *
   * @param center GeoJSON-Position [lng, lat] des Mittelpunkts
   * @param radiusMeters Radius in Metern (muss > 0 sein)
   */
  static fromCircle(center: GeoJsonPosition, radiusMeters: number): Result<GefahrenzoneGeometry> {
    if (!isFiniteCoordinate(center[0]) || !isFiniteCoordinate(center[1]) || !isValidLngLat(center[0], center[1])) {
      return Result.fail<GefahrenzoneGeometry>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_COORDINATE);
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      return Result.fail<GefahrenzoneGeometry>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_RADIUS);
    }

    const ring = circleToRing(center, radiusMeters);
    const feature: GeoJsonPolygonFeature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { circle: { center, radiusMeters } },
    };
    return Result.ok(new GefahrenzoneGeometry(feature));
  }

  /** Liefert die Geometrie als serialisierbares JSON-Objekt (für Prisma-JSONB). */
  public toJSON(): GeoJsonPolygonFeature {
    return this.feature;
  }
}

function validateFeature(raw: unknown): Result<GeoJsonPolygonFeature> {
  if (!isPlainObject(raw) || raw.type !== 'Feature' || !isPlainObject(raw.geometry)) {
    return Result.fail<GeoJsonPolygonFeature>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_FEATURE);
  }

  const geometry = raw.geometry as { type?: unknown; coordinates?: unknown };
  if (geometry.type !== 'Polygon') {
    return Result.fail<GeoJsonPolygonFeature>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_GEOMETRY_TYPE);
  }

  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    return Result.fail<GeoJsonPolygonFeature>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.EMPTY_COORDINATES);
  }

  const rings: GeoJsonPosition[][] = [];
  for (const rawRing of geometry.coordinates) {
    const ringResult = validateRing(rawRing);
    if (ringResult.isFailure || !ringResult.value) {
      return Result.fail<GeoJsonPolygonFeature>(ringResult.error ?? GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_COORDINATE);
    }
    rings.push(ringResult.value);
  }

  const properties = isPlainObject((raw as { properties?: unknown }).properties) ? ((raw as { properties: Record<string, unknown> }).properties ?? null) : null;

  return Result.ok<GeoJsonPolygonFeature>({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: rings },
    properties,
  });
}

function validateRing(rawRing: unknown): Result<GeoJsonPosition[]> {
  if (!Array.isArray(rawRing) || rawRing.length < MIN_POLYGON_RING_LENGTH) {
    return Result.fail<GeoJsonPosition[]>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.TOO_FEW_POINTS);
  }

  const positions: GeoJsonPosition[] = [];
  for (const rawPosition of rawRing) {
    if (!Array.isArray(rawPosition) || rawPosition.length < 2) {
      return Result.fail<GeoJsonPosition[]>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_COORDINATE);
    }
    const lng = rawPosition[0];
    const lat = rawPosition[1];
    if (!isFiniteCoordinate(lng) || !isFiniteCoordinate(lat) || !isValidLngLat(lng, lat)) {
      return Result.fail<GeoJsonPosition[]>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_COORDINATE);
    }
    positions.push([lng, lat]);
  }

  const first = positions[0];
  const last = positions[positions.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    return Result.fail<GeoJsonPosition[]>(GEFAHRENZONE_GEOMETRY_ERROR_CODES.UNCLOSED_RING);
  }

  return Result.ok(positions);
}

function circleToRing(center: GeoJsonPosition, radiusMeters: number): GeoJsonPosition[] {
  const [lngDeg, latDeg] = center;
  const latRad = toRadians(latDeg);
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;

  const ring: GeoJsonPosition[] = [];
  for (let i = 0; i < CIRCLE_POLYGON_POINTS; i++) {
    const bearing = (2 * Math.PI * i) / CIRCLE_POLYGON_POINTS;
    const destLatRad = Math.asin(Math.sin(latRad) * Math.cos(angularDistance) + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing));
    const destLngRad = toRadians(lngDeg) + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad), Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad));
    ring.push([normalizeLongitude(toDegrees(destLngRad)), toDegrees(destLatRad)]);
  }
  const first = ring[0];
  if (!first) {
    // Sollte nie passieren — CIRCLE_POLYGON_POINTS > 0 — aber wir verteidigen die Invariante explizit.
    throw new Error('Circle polygon construction produced empty ring');
  }
  ring.push([first[0], first[1]]);
  return ring;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLngLat(lng: number, lat: number): boolean {
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeLongitude(lng: number): number {
  // Nach der Rückprojektion kann sich ein Longitude > 180 ergeben — wir mappen in [-180, 180].
  if (lng > 180) return lng - 360;
  if (lng < -180) return lng + 360;
  return lng;
}
