/**
 * Hook für OSM-Objekt-Markierungen auf der Lagekarte
 *
 * Ermöglicht das Klicken auf Vektor-Tile-Features (Gebäude, Straßen etc.)
 * und das Zuweisen eines Status (betroffen/gesperrt/evakuiert).
 */

import { useCallback, useState } from 'react';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { OsmMarkierungStatus } from '../drawing/types';
import { OSM_MARKING_COLORS } from '../drawing/types';

/**
 * Ausstehende OSM-Markierung — zeigt Popup für Statusauswahl
 */
export interface PendingOsmMark {
  /** Geometrie des OSM-Features */
  geometry: GeoJSON.Geometry;
  /** ID des OSM-Features (aus Vektor-Tile) */
  osmFeatureId: string;
  /** Layer-ID des OSM-Features */
  osmLayerId: string;
  /** Name/Typ des Features (z.B. "Gebäude", "Straße") */
  featureName: string;
  /** Koordinaten für Popup-Positionierung */
  coordinate: { lng: number; lat: number };
}

interface UseOsmMarkierungOptions {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Referenz auf die MapboxDraw-Instanz */
  drawRef: React.RefObject<MapboxDraw | null>;
  /** Ob der Basislayer Vektor-Features hat (true für OSM, false für Topo/Satellit) */
  isVectorBaseLayer: boolean;
}

interface UseOsmMarkierungReturn {
  /** Verarbeitet einen Karten-Klick im OSM-Markierungsmodus */
  handleOsmClick: (event: MapLayerMouseEvent) => boolean;
  /** Ausstehende OSM-Markierung (für Popup-Anzeige) */
  pendingOsmMark: PendingOsmMark | null;
  /** Bestätigt die OSM-Markierung mit einem Status */
  confirmOsmMark: (status: OsmMarkierungStatus) => void;
  /** Bricht die ausstehende Markierung ab */
  cancelOsmMark: () => void;
}

/**
 * Ermittelt einen lesbaren Feature-Namen anhand der Layer-ID
 */
function resolveFeatureName(layerId: string): string {
  const id = layerId.toLowerCase();
  if (id.includes('building')) return 'Gebäude';
  if (id.includes('road') || id.includes('highway')) return 'Straße';
  if (id.includes('water')) return 'Gewässer';
  if (id.includes('landuse') || id.includes('landcover')) return 'Fläche';
  return 'Objekt';
}

/**
 * Layer-Priorität für Feature-Auswahl.
 * Spezifische Features (Gebäude) werden gegenüber großflächigen Features
 * (Landuse/Landcover) bevorzugt, damit beim Klick auf ein Gebäude nicht
 * das darunterliegende Stadtviertel-Polygon selektiert wird.
 *
 * Niedrigerer Wert = höhere Priorität.
 */
function getLayerPriority(layerId: string): number {
  const id = layerId.toLowerCase();
  if (id.includes('building')) return 1;
  if (id.includes('road') || id.includes('highway') || id.includes('transport')) return 2;
  if (id.includes('water')) return 3;
  if (id.includes('landuse') || id.includes('landcover') || id.includes('park')) return 99;
  return 50;
}

/**
 * Prüft ob ein Punkt innerhalb eines Polygon-Rings liegt (Ray-Casting-Algorithmus).
 */
function isPointInRing(point: [number, number], ring: GeoJSON.Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Quadrierte Distanz zwischen Punkt und einem Liniensegment (A→B).
 * Vermeidet Math.sqrt für Performance.
 */
function sqDistToSegment(p: [number, number], a: GeoJSON.Position, b: GeoJSON.Position): number {
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];
  if (dx !== 0 || dy !== 0) {
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    dx = a[0] + t * dx - p[0];
    dy = a[1] + t * dy - p[1];
  } else {
    dx = a[0] - p[0];
    dy = a[1] - p[1];
  }
  return dx * dx + dy * dy;
}

/**
 * Minimale quadrierte Distanz von einem Punkt zu einer Linie (Array von Koordinaten).
 */
function sqDistToLine(point: [number, number], line: GeoJSON.Position[]): number {
  let minDist = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    minDist = Math.min(minDist, sqDistToSegment(point, line[i], line[i + 1]));
  }
  return minDist;
}

/**
 * Extrahiert die einzelne Geometrie am Klickpunkt aus Multi*-Geometrien.
 *
 * In Vektor-Tiles werden Features häufig pro Tile zu Multi*-Geometrien
 * zusammengefasst. Ohne diese Zerlegung würde ein Klick auf ein einzelnes
 * Gebäude/Straßensegment alle Features im Tile einfärben.
 */
function extractClickedGeometry(geometry: GeoJSON.Geometry, clickPoint: [number, number]): GeoJSON.Geometry {
  if (geometry.type === 'MultiPolygon') {
    for (const polygonCoords of geometry.coordinates) {
      if (isPointInRing(clickPoint, polygonCoords[0])) {
        return { type: 'Polygon', coordinates: polygonCoords };
      }
    }
    return geometry;
  }

  if (geometry.type === 'MultiLineString') {
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < geometry.coordinates.length; i++) {
      const dist = sqDistToLine(clickPoint, geometry.coordinates[i]);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    return { type: 'LineString', coordinates: geometry.coordinates[closestIdx] };
  }

  if (geometry.type === 'MultiPoint') {
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < geometry.coordinates.length; i++) {
      const dx = geometry.coordinates[i][0] - clickPoint[0];
      const dy = geometry.coordinates[i][1] - clickPoint[1];
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    return { type: 'Point', coordinates: geometry.coordinates[closestIdx] };
  }

  return geometry;
}

/**
 * Hook für OSM-Objekt-Markierungen
 *
 * Verarbeitet Klicks auf Vektor-Tile-Features und ermöglicht das Zuweisen
 * eines Markierungsstatus. Die markierten Features werden als GeoJSON-Features
 * in die MapboxDraw-Kollektion aufgenommen.
 *
 * @param options - Konfiguration mit Map-Ref, Draw-Ref und Basislayer-Info
 * @returns API zum Verarbeiten von OSM-Markierungen
 */
export function useOsmMarkierung({ mapRef, drawRef, isVectorBaseLayer }: UseOsmMarkierungOptions): UseOsmMarkierungReturn {
  const [pendingOsmMark, setPendingOsmMark] = useState<PendingOsmMark | null>(null);

  /**
   * Verarbeitet einen Karten-Klick im OSM-Markierungsmodus.
   * Gibt true zurück wenn ein OSM-Feature gefunden wurde (Klick wird konsumiert),
   * false wenn kein Feature gefunden wurde.
   */
  const handleOsmClick = useCallback(
    (event: MapLayerMouseEvent): boolean => {
      if (!isVectorBaseLayer) return false;

      const map = mapRef.current?.getMap();
      if (!map) return false;

      // Alle gerenderten Features am Klickpunkt abfragen
      const point: [number, number] = [event.point.x, event.point.y];
      const features = map.queryRenderedFeatures(point);

      if (!features || features.length === 0) return false;

      // Kandidaten filtern (MapboxDraw-Layer überspringen) und nach
      // Layer-Priorität sortieren, damit spezifische Features (Gebäude)
      // vor großflächigen Features (Landuse) bevorzugt werden
      const candidates = features.filter((f) => {
        if (!f.geometry) return false;
        const layerId = f.layer?.id ?? '';
        if (layerId.startsWith('gl-draw-')) return false;
        return true;
      });

      if (candidates.length === 0) return false;

      candidates.sort((a, b) => getLayerPriority(a.layer?.id ?? '') - getLayerPriority(b.layer?.id ?? ''));

      const match = candidates[0];

      // Feature-ID extrahieren
      const osmFeatureId = String(match.id ?? match.properties?.id ?? match.properties?.['@id'] ?? `unknown-${Date.now()}`);
      const osmLayerId = match.layer?.id ?? 'unknown';

      // Bei MultiPolygons (häufig in Vektor-Tiles: Gebäude pro Tile
      // zusammengefasst) nur das angeklickte Einzelpolygon extrahieren
      const resolvedGeometry = extractClickedGeometry(match.geometry, [event.lngLat.lng, event.lngLat.lat]);

      setPendingOsmMark({
        geometry: resolvedGeometry,
        osmFeatureId,
        osmLayerId,
        featureName: resolveFeatureName(osmLayerId),
        coordinate: { lng: event.lngLat.lng, lat: event.lngLat.lat },
      });

      return true;
    },
    [isVectorBaseLayer, mapRef],
  );

  /**
   * Bestätigt die ausstehende OSM-Markierung mit dem gewählten Status.
   * Fügt das Feature als GeoJSON in die MapboxDraw-Kollektion ein.
   */
  const confirmOsmMark = useCallback(
    (status: OsmMarkierungStatus) => {
      const draw = drawRef.current;
      if (!draw || !pendingOsmMark) return;

      // Alle Properties VOR dem Hinzufügen setzen, damit draw.create
      // den vollständigen State erfasst und Auto-Save korrekt auslöst
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: pendingOsmMark.geometry,
        properties: {
          featureType: 'osm_marking',
          osmFeatureId: pendingOsmMark.osmFeatureId,
          osmLayerId: pendingOsmMark.osmLayerId,
          osmStatus: status,
          color: OSM_MARKING_COLORS[status],
          fillColor: OSM_MARKING_COLORS[status],
          fillOpacity: 0.4,
        },
      };

      // Feature zu MapboxDraw hinzufügen (löst draw.create Event aus)
      draw.add(feature);

      setPendingOsmMark(null);
    },
    [drawRef, pendingOsmMark],
  );

  /**
   * Bricht die ausstehende Markierung ab
   */
  const cancelOsmMark = useCallback(() => {
    setPendingOsmMark(null);
  }, []);

  return {
    handleOsmClick,
    pendingOsmMark,
    confirmOsmMark,
    cancelOsmMark,
  };
}
