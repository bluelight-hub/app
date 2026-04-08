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
import { berechneFlaeche, extractClickedGeometry } from '../utils/geo-calculations';

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
 * Berechnet die Fläche eines Features für die Sortierung.
 * Gibt 0 zurück für Nicht-Polygon-Geometrien.
 */
function getFeatureArea(geometry: GeoJSON.Geometry): number {
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    try {
      return berechneFlaeche(geometry);
    } catch {
      // Degenerierte Geometrien aus Vektor-Tiles (nicht-geschlossene Ringe etc.)
      return 0;
    }
  }
  return 0;
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

      candidates.sort((a, b) => {
        const priorityDiff = getLayerPriority(a.layer?.id ?? '') - getLayerPriority(b.layer?.id ?? '');
        if (priorityDiff !== 0) return priorityDiff;
        // Bei gleicher Layer-Priorität: kleinstes Feature bevorzugen
        return getFeatureArea(a.geometry) - getFeatureArea(b.geometry);
      });

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
