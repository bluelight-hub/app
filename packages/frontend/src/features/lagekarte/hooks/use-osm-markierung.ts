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

      // Erstes passendes Feature finden (MapboxDraw-Layer überspringen)
      const match = features.find((f) => {
        if (!f.geometry) return false;
        const layerId = f.layer?.id ?? '';
        if (layerId.startsWith('gl-draw-')) return false;
        return true;
      });

      if (!match) return false;

      // Feature-ID extrahieren
      const osmFeatureId = String(match.id ?? match.properties?.id ?? match.properties?.['@id'] ?? `unknown-${Date.now()}`);
      const osmLayerId = match.layer?.id ?? 'unknown';

      setPendingOsmMark({
        geometry: match.geometry,
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

      const feature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: pendingOsmMark.geometry,
        properties: {},
      };

      // Feature zu MapboxDraw hinzufügen
      const addedIds = draw.add(feature);
      const featureId = Array.isArray(addedIds) ? addedIds[0] : addedIds;

      if (featureId) {
        // User-Properties setzen für Rendering und Persistierung
        draw.setFeatureProperty(String(featureId), 'featureType', 'osm_marking');
        draw.setFeatureProperty(String(featureId), 'osmFeatureId', pendingOsmMark.osmFeatureId);
        draw.setFeatureProperty(String(featureId), 'osmLayerId', pendingOsmMark.osmLayerId);
        draw.setFeatureProperty(String(featureId), 'osmStatus', status);
        draw.setFeatureProperty(String(featureId), 'color', OSM_MARKING_COLORS[status]);
        draw.setFeatureProperty(String(featureId), 'fillColor', OSM_MARKING_COLORS[status]);
        draw.setFeatureProperty(String(featureId), 'fillOpacity', 0.4);
      }

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
