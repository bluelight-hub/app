/**
 * Geometrie-Typ einer Gefahrenzone (Issue #627).
 *
 * Eine Zone ist entweder ein Polygon (mehrere Punkte, geschlossene Linie) oder
 * ein Kreis (Mittelpunkt + Radius in Metern).
 */
export enum HazardZoneGeometryType {
  POLYGON = 'POLYGON',
  CIRCLE = 'CIRCLE',
}

/**
 * GeoJSON-Polygon-Geometrie (ohne Löcher).
 *
 * Erste und letzte Koordinate des äußeren Rings MÜSSEN identisch sein.
 */
export interface HazardZonePolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][]; // Rings: [outer, ...holes]; hier nur outer
}

/**
 * GeoJSON-Point-Geometrie für Kreis-Darstellung (Mittelpunkt).
 *
 * Der Radius wird separat in {@link HazardZoneGeometryData.radiusMeters} gespeichert.
 */
export interface HazardZoneCircleGeometry {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

/**
 * Vollständige Geometrie einer HazardZone, inkl. Diskriminator und (bei Kreis)
 * dem Radius in Metern.
 */
export type HazardZoneGeometry = HazardZonePolygonGeometry | HazardZoneCircleGeometry;

export interface HazardZoneGeometryData {
  geometryType: HazardZoneGeometryType;
  geometry: HazardZoneGeometry;
  /** Radius in Metern — nur für geometryType === CIRCLE. */
  radiusMeters: number | null;
}

/**
 * Validiert eine HazardZoneGeometryData-Struktur.
 *
 * @returns string mit Fehler-Code oder null bei Erfolg.
 */
export function validateHazardZoneGeometry(data: HazardZoneGeometryData): string | null {
  if (data.geometryType === HazardZoneGeometryType.POLYGON) {
    if (data.geometry.type !== 'Polygon') {
      return 'HAZARD_ZONE_GEOMETRY_TYPE_MISMATCH';
    }
    const coords = (data.geometry as HazardZonePolygonGeometry).coordinates;
    if (!Array.isArray(coords) || coords.length === 0) {
      return 'HAZARD_ZONE_POLYGON_RINGS_REQUIRED';
    }
    const outer = coords[0];
    if (!Array.isArray(outer) || outer.length < 4) {
      return 'HAZARD_ZONE_POLYGON_MIN_POINTS';
    }
    const first = outer[0];
    const last = outer[outer.length - 1];
    if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
      return 'HAZARD_ZONE_POLYGON_NOT_CLOSED';
    }
    if (data.radiusMeters !== null && data.radiusMeters !== undefined) {
      return 'HAZARD_ZONE_RADIUS_NOT_ALLOWED';
    }
    return null;
  }

  if (data.geometryType === HazardZoneGeometryType.CIRCLE) {
    if (data.geometry.type !== 'Point') {
      return 'HAZARD_ZONE_GEOMETRY_TYPE_MISMATCH';
    }
    const point = (data.geometry as HazardZoneCircleGeometry).coordinates;
    if (!Array.isArray(point) || point.length !== 2) {
      return 'HAZARD_ZONE_CIRCLE_CENTER_INVALID';
    }
    if (typeof data.radiusMeters !== 'number' || !Number.isFinite(data.radiusMeters) || data.radiusMeters <= 0) {
      return 'HAZARD_ZONE_RADIUS_INVALID';
    }
    return null;
  }

  return 'HAZARD_ZONE_GEOMETRY_TYPE_INVALID';
}
