/**
 * Snap-Control Hook für die Lagekarte
 *
 * Verwaltet Node-Snapping: Registriert einen mousemove-Handler auf dem
 * Map-Canvas, der Snap-Punkte berechnet und als MapLibre-Layer visualisiert.
 * Die gesnappte Position wird über ein Custom-Event bereitgestellt,
 * sodass Custom-Modes sie nutzen können.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useStore } from '@tanstack/react-store';
import { drawStore } from '../stores/draw.store';
import { findSnapPoint } from '../utils/snap-calculations';
import { SNAP_INDICATOR_LAYER, SNAP_INDICATOR_LAYER_ID, SNAP_INDICATOR_SOURCE_ID } from '../drawing/snap-indicator-styles';
import type { GeoJSON as GeoJSONType } from 'geojson';

/** Leere FeatureCollection für den Snap-Indikator */
const EMPTY_FC: GeoJSONType.FeatureCollection = { type: 'FeatureCollection', features: [] };

interface UseSnapControlOptions {
  mapRef: React.RefObject<MapRef | null>;
  drawRef: React.RefObject<MapboxDraw | null>;
  isMapLoaded: boolean;
}

/**
 * Verwaltet Node-Snapping mit visuellem Indikator.
 * Snap-Punkte werden berechnet und als MapLibre-Layer angezeigt.
 */
export function useSnapControl({ mapRef, drawRef, isMapLoaded }: UseSnapControlOptions): void {
  const snapEnabled = useStore(drawStore, (s) => s.snapEnabled);
  const snapEnabledRef = useRef(snapEnabled);
  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
  }, [snapEnabled]);

  /**
   * Source-Daten aktualisieren (zeigt/versteckt den Snap-Indikator)
   */
  const updateIndicator = useCallback(
    (lngLat: { lng: number; lat: number } | null) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const source = map.getSource(SNAP_INDICATOR_SOURCE_ID);
      if (!source || source.type !== 'geojson') return;

      if (lngLat) {
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] },
              properties: {},
            },
          ],
        });
      } else {
        source.setData(EMPTY_FC);
      }
    },
    [mapRef],
  );

  // Source und Layer beim Map-Load registrieren
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    // Guard gegen Doppelregistrierung (React Strict Mode)
    if (!map.getSource(SNAP_INDICATOR_SOURCE_ID)) {
      map.addSource(SNAP_INDICATOR_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
    }
    if (!map.getLayer(SNAP_INDICATOR_LAYER_ID)) {
      map.addLayer(SNAP_INDICATOR_LAYER);
    }

    // Bei Style-Wechsel Source/Layer erneut registrieren
    const handleStyleLoad = () => {
      if (!map.getSource(SNAP_INDICATOR_SOURCE_ID)) {
        map.addSource(SNAP_INDICATOR_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
      }
      if (!map.getLayer(SNAP_INDICATOR_LAYER_ID)) {
        map.addLayer(SNAP_INDICATOR_LAYER);
      }
    };

    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
      try {
        if (map.getLayer(SNAP_INDICATOR_LAYER_ID)) map.removeLayer(SNAP_INDICATOR_LAYER_ID);
        if (map.getSource(SNAP_INDICATOR_SOURCE_ID)) map.removeSource(SNAP_INDICATOR_SOURCE_ID);
      } catch {
        // Map könnte bereits zerstört sein
      }
    };
  }, [isMapLoaded, mapRef]);

  // Mousemove-Handler auf Canvas (capture-Phase)
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    const canvas = map.getCanvas();

    const handleMouseMove = (e: MouseEvent) => {
      if (!snapEnabledRef.current) {
        updateIndicator(null);
        return;
      }

      const draw = drawRef.current;
      if (!draw) return;

      // Im Freehand-Modus kein Snapping
      try {
        const currentMode = draw.getMode();
        if (currentMode === 'draw_freehand') {
          updateIndicator(null);
          return;
        }
      } catch {
        return;
      }

      // Aktuell bearbeitete Features vom Snapping ausschließen
      const excludeIds = new Set<string>();
      try {
        for (const id of draw.getSelectedIds()) {
          excludeIds.add(id);
        }
      } catch {
        // Ignorieren
      }

      const rect = canvas.getBoundingClientRect();
      const cursorPixel = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const features = draw.getAll()?.features ?? [];
      let snap: ReturnType<typeof findSnapPoint> = null;
      try {
        snap = findSnapPoint(cursorPixel, features, map, 12, excludeIds);
      } catch {
        // Ungültige Koordinaten (z.B. leerer Point aus draw_point.onSetup) — ignorieren
      }

      if (snap) {
        updateIndicator(snap.lngLat);
      } else {
        updateIndicator(null);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove, { capture: true });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove, { capture: true } as EventListenerOptions);
    };
  }, [isMapLoaded, mapRef, drawRef, updateIndicator]);
}
