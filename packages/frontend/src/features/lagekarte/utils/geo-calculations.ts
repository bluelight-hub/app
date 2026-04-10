/**
 * Geo-Berechnungen für die Lagekarte
 *
 * Kapselt alle @turf/turf-Aufrufe hinter domänenspezifischen Funktionen.
 * Einzige Datei im Feature, die direkt von turf importiert.
 */

import * as turf from '@turf/turf';

// ============================================
// Berechnungen
// ============================================

/**
 * Berechnet die Fläche einer Polygon-Geometrie in Quadratmetern.
 */
export function berechneFlaeche(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  return turf.area(turf.feature(geometry));
}

/**
 * Berechnet die Länge einer Linien-Geometrie in Metern.
 */
export function berechneLaenge(geometry: GeoJSON.LineString | GeoJSON.MultiLineString): number {
  return turf.length(turf.feature(geometry), { units: 'meters' });
}

// ============================================
// Formatierung (automatisch skaliert)
// ============================================

/**
 * Formatiert Quadratmeter als lesbaren String.
 * Unter 10.000 m² → "1.234 m²", darüber → "1,23 km²"
 */
export function formatiereFlaeche(m2: number): string {
  if (m2 < 10_000) {
    return `${Math.round(m2).toLocaleString('de-DE')} m²`;
  }
  const km2 = m2 / 1_000_000;
  return `${km2.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km²`;
}

/**
 * Formatiert Meter als lesbaren String.
 * Unter 1.000 m → "450 m", darüber → "1,23 km"
 */
export function formatiereLaenge(meter: number): string {
  if (meter < 1_000) {
    return `${Math.round(meter).toLocaleString('de-DE')} m`;
  }
  const km = meter / 1_000;
  return `${km.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

/**
 * Formatiert Koordinaten als lesbaren String (Dezimalgrad).
 */
export function formatiereKoordinaten(lng: number, lat: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

// ============================================
// Feature-Messung (Dispatch nach Geometrie-Typ)
// ============================================

/** Ergebnis einer Feature-Messung */
export interface FeatureMeasurement {
  /** Anzeige-String, z.B. "1,23 km²", "450 m" */
  label: string;
  /** Art der Messung */
  type: 'area' | 'length' | 'point';
  /** Roher Wert (m² oder m, null für Punkte) */
  rawValue: number | null;
}

/**
 * Berechnet die passende Messung für eine beliebige GeoJSON-Geometrie.
 * Gibt null zurück für GeometryCollections oder unbekannte Typen.
 */
export function measureFeature(geometry: GeoJSON.Geometry): FeatureMeasurement | null {
  switch (geometry.type) {
    case 'Polygon':
    case 'MultiPolygon': {
      const m2 = berechneFlaeche(geometry);
      return { label: formatiereFlaeche(m2), type: 'area', rawValue: m2 };
    }
    case 'LineString':
    case 'MultiLineString': {
      const meter = berechneLaenge(geometry);
      return { label: formatiereLaenge(meter), type: 'length', rawValue: meter };
    }
    case 'Point': {
      const [lng, lat] = geometry.coordinates;
      return { label: formatiereKoordinaten(lng, lat), type: 'point', rawValue: null };
    }
    case 'MultiPoint': {
      const [lng, lat] = geometry.coordinates[0] ?? [0, 0];
      return { label: formatiereKoordinaten(lng, lat), type: 'point', rawValue: null };
    }
    default:
      return null;
  }
}

// ============================================
// Geometrie-Erzeugung (parametrische Formen)
// ============================================

/**
 * Erzeugt einen Kreis als Polygon (64-Punkt-Approximation).
 * @param center - [lng, lat]
 * @param radiusMeters - Radius in Metern
 */
export function erstelleKreis(center: [number, number], radiusMeters: number): GeoJSON.Position[][] {
  const circle = turf.circle(turf.point(center), radiusMeters, { steps: 64, units: 'meters' });
  return circle.geometry.coordinates;
}

/**
 * Erzeugt ein Rechteck aus zwei gegenüberliegenden Ecken.
 */
export function erstelleRechteck(corner1: [number, number], corner2: [number, number]): GeoJSON.Position[][] {
  const [lng1, lat1] = corner1;
  const [lng2, lat2] = corner2;
  return [
    [
      [lng1, lat1],
      [lng2, lat1],
      [lng2, lat2],
      [lng1, lat2],
      [lng1, lat1],
    ],
  ];
}

/**
 * Erzeugt einen Kreissektor (Kegel/Fächer) als Polygon.
 * @param center - [lng, lat]
 * @param radiusMeters - Radius in Metern
 * @param bearing - Hauptrichtung in Grad (0=Nord, 90=Ost)
 * @param openingAngle - Öffnungswinkel in Grad (symmetrisch um bearing)
 */
export function erstelleSektor(center: [number, number], radiusMeters: number, bearing: number, openingAngle: number): GeoJSON.Position[][] {
  const half = openingAngle / 2;
  const sector = turf.sector(turf.point(center), radiusMeters, bearing - half, bearing + half, { units: 'meters', steps: 32 });
  return sector.geometry.coordinates;
}

/**
 * Berechnet den Abstand zwischen zwei Koordinaten in Metern.
 */
export function berechneAbstand(from: [number, number], to: [number, number]): number {
  return turf.distance(turf.point(from), turf.point(to), { units: 'meters' });
}

/**
 * Berechnet einen Zielpunkt ausgehend von einem Startpunkt, einer Distanz und einem Bearing.
 * @param from - Startpunkt [lng, lat]
 * @param distanceMeters - Entfernung in Metern
 * @param bearing - Kompassrichtung in Grad (0=Nord, 90=Ost)
 * @returns Zielpunkt [lng, lat]
 */
export function berechneZielpunkt(from: [number, number], distanceMeters: number, bearing: number): [number, number] {
  const dest = turf.destination(turf.point(from), distanceMeters, bearing, { units: 'meters' });
  return dest.geometry.coordinates as [number, number];
}

/**
 * Erzeugt eine Ellipse als Polygon.
 * @param center - [lng, lat]
 * @param radiusXMeters - Radius in Metern (Horizontalachse)
 * @param radiusYMeters - Radius in Metern (Vertikalachse)
 * @param steps - Anzahl der Polygon-Punkte (Standard: 64)
 */
export function erstelleEllipse(center: [number, number], radiusXMeters: number, radiusYMeters: number, steps = 64): GeoJSON.Position[][] {
  const ellipse = turf.ellipse(turf.point(center), radiusXMeters, radiusYMeters, { units: 'meters', steps });
  return ellipse.geometry.coordinates;
}

/**
 * Berechnet den Kompasswinkel (Bearing) von einem Punkt zum anderen.
 * @returns Bearing in Grad (0–360)
 */
export function berechneBearing(from: [number, number], to: [number, number]): number {
  const raw = turf.bearing(turf.point(from), turf.point(to));
  return (raw + 360) % 360;
}

// ============================================
// Geo-Algorithmen (Ersatz für manuelle Implementierungen)
// ============================================

/**
 * Prüft ob ein Punkt innerhalb eines Polygons liegt.
 * Ersetzt die manuelle isPointInRing-Implementierung.
 */
export function istPunktInPolygon(point: [number, number], polygonCoords: GeoJSON.Position[][]): boolean {
  return turf.booleanPointInPolygon(turf.point(point), turf.polygon(polygonCoords));
}

/**
 * Berechnet die Distanz (in Metern) von einem Punkt zur nächsten Stelle auf einer Linie.
 * Gibt Infinity zurück für degenerierte Linien (< 2 Koordinaten).
 */
export function distanzZuLinie(point: [number, number], line: GeoJSON.Position[]): number {
  if (line.length < 2) return Infinity;
  const snapped = turf.nearestPointOnLine(turf.lineString(line), turf.point(point), { units: 'meters' });
  return snapped.properties.dist ?? 0;
}

/**
 * Extrahiert die einzelne Geometrie am Klickpunkt aus Multi*-Geometrien.
 *
 * In Vektor-Tiles werden Features häufig pro Tile zu Multi*-Geometrien
 * zusammengefasst. Ohne diese Zerlegung würde ein Klick auf ein einzelnes
 * Gebäude/Straßensegment alle Features im Tile einfärben.
 */
export function extractClickedGeometry(geometry: GeoJSON.Geometry, clickPoint: [number, number]): GeoJSON.Geometry {
  if (geometry.type === 'MultiPolygon') {
    for (const polygonCoords of geometry.coordinates) {
      if (istPunktInPolygon(clickPoint, polygonCoords)) {
        return { type: 'Polygon', coordinates: polygonCoords };
      }
    }
    return geometry;
  }

  if (geometry.type === 'MultiLineString') {
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < geometry.coordinates.length; i++) {
      const dist = distanzZuLinie(clickPoint, geometry.coordinates[i]);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    return { type: 'LineString', coordinates: geometry.coordinates[closestIdx] };
  }

  if (geometry.type === 'MultiPoint') {
    const nearest = turf.nearestPoint(turf.point(clickPoint), turf.featureCollection(geometry.coordinates.map((c) => turf.point(c))));
    const idx = nearest.properties.featureIndex ?? 0;
    return { type: 'Point', coordinates: geometry.coordinates[idx] };
  }

  return geometry;
}
