import type { HazardZoneDto } from '@bluelight-hub/shared/client';

const EARTH_RADIUS_METERS = 6_371_008.8;
const CIRCLE_POINTS = 64;

/**
 * Konvertiert Kreis (Mittelpunkt + Radius in Metern) in ein GeoJSON-Polygon.
 * Verwendet eine einfache sphärische Näherung mit {@link CIRCLE_POINTS}
 * Segmenten — ausreichend für die visuelle Darstellung.
 */
export function circleToPolygon(center: [number, number], radiusMeters: number): [number, number][] {
  const [lng, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const points: [number, number][] = [];

  for (let i = 0; i <= CIRCLE_POINTS; i++) {
    const bearing = (i / CIRCLE_POINTS) * 2 * Math.PI;
    const bLat = Math.asin(Math.sin(latRad) * Math.cos(angularDistance) + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing));
    const bLng = (lng * Math.PI) / 180 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad), Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(bLat));
    points.push([(bLng * 180) / Math.PI, (bLat * 180) / Math.PI]);
  }

  return points;
}

/**
 * Wandelt eine HazardZone in ein GeoJSON Polygon-Feature um. Für Kreise wird
 * der Mittelpunkt + Radius in ein polygonales Approximation konvertiert.
 */
export function hazardZoneToGeoJsonFeature(zone: HazardZoneDto): GeoJSON.Feature<GeoJSON.Polygon, HazardZoneDto> {
  let ring: [number, number][];

  if (zone.geometryType === 'CIRCLE') {
    const center = (zone.geometry as { coordinates: [number, number] }).coordinates;
    ring = circleToPolygon(center, zone.radiusMeters ?? 0);
  } else {
    ring = ((zone.geometry as { coordinates: [number, number][][] }).coordinates[0] ?? []) as [number, number][];
  }

  return {
    type: 'Feature',
    id: zone.id,
    properties: zone,
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

/**
 * Baut eine FeatureCollection aus einer Liste von HazardZones.
 */
export function hazardZonesToFeatureCollection(zones: HazardZoneDto[]): GeoJSON.FeatureCollection<GeoJSON.Polygon, HazardZoneDto> {
  return {
    type: 'FeatureCollection',
    features: zones.map(hazardZoneToGeoJsonFeature),
  };
}
