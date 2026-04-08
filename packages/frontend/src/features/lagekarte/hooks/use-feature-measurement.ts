/**
 * Hook für Geo-Messungen von Lagekarte-Features
 *
 * Berechnet Fläche (Polygone), Länge (Linien) und Koordinaten (Punkte)
 * sowohl für selektierte Features als auch live während des Zeichnens.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useStore } from '@tanstack/react-store';
import { drawStore } from '../stores/draw.store';
import type { FeatureMeasurement } from '../utils/geo-calculations';
import { measureFeature } from '../utils/geo-calculations';
import type { DrawMode } from '../drawing/types';

interface UseFeatureMeasurementOptions {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Referenz auf die MapboxDraw-Instanz */
  drawRef: React.RefObject<MapboxDraw | null>;
  /** Ob die Karte geladen ist */
  isMapLoaded: boolean;
}

interface UseFeatureMeasurementReturn {
  /** Messung des aktuell selektierten Features */
  selectedMeasurement: FeatureMeasurement | null;
  /** Live-Messung während des Zeichnens */
  liveMeasurement: FeatureMeasurement | null;
}

/** Zeichenmodi in denen Live-Messung sinnvoll ist */
const LIVE_DRAW_MODES: DrawMode[] = ['draw_polygon', 'draw_line_string', 'draw_freehand'];

/**
 * Berechnet Messungen für selektierte und aktuell gezeichnete Features.
 *
 * - selectedMeasurement: Aktualisiert sich bei Feature-Selektion und Vertex-Bearbeitung
 * - liveMeasurement: Aktualisiert sich bei jedem Render-Cycle während des Zeichnens
 */
export function useFeatureMeasurement({ mapRef, drawRef, isMapLoaded }: UseFeatureMeasurementOptions): UseFeatureMeasurementReturn {
  const [selectedMeasurement, setSelectedMeasurement] = useState<FeatureMeasurement | null>(null);
  const [liveMeasurement, setLiveMeasurement] = useState<FeatureMeasurement | null>(null);

  const selectedFeatureIds = useStore(drawStore, (s) => s.selectedFeatureIds);
  const drawMode = useStore(drawStore, (s) => s.drawMode);

  // Ref für drawMode in Event-Handlern (vermeidet Stale-Closure)
  const drawModeRef = useRef(drawMode);
  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  /**
   * Messung für ein Feature aus der Draw-Instanz berechnen
   */
  const measureDrawFeature = useCallback(
    (featureId: string): FeatureMeasurement | null => {
      const draw = drawRef.current;
      if (!draw) return null;
      const feature = draw.get(featureId);
      if (!feature?.geometry) return null;
      return measureFeature(feature.geometry);
    },
    [drawRef],
  );

  // Messung bei Selektionsänderung aktualisieren
  useEffect(() => {
    if (selectedFeatureIds.length === 0) {
      setSelectedMeasurement(null);
      return;
    }
    setSelectedMeasurement(measureDrawFeature(selectedFeatureIds[0]));
  }, [selectedFeatureIds, measureDrawFeature]);

  // Live-Messung bei Modus-Wechsel zurücksetzen
  useEffect(() => {
    if (!LIVE_DRAW_MODES.includes(drawMode)) {
      setLiveMeasurement(null);
    }
  }, [drawMode]);

  // Event-Listener für draw.update (Vertex-Verschiebung) und draw.render (Live-Zeichnung)
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !isMapLoaded) return;

    /**
     * draw.update: Feature wurde bearbeitet (Vertex verschoben, Feature bewegt).
     * Aktualisiert die selectedMeasurement.
     */
    const handleUpdate = () => {
      const draw = drawRef.current;
      if (!draw) return;

      const selected = draw.getSelectedIds();
      if (selected.length > 0) {
        const feature = draw.get(selected[0]);
        if (feature?.geometry) {
          setSelectedMeasurement(measureFeature(feature.geometry));
        }
      }
    };

    /**
     * draw.render: Feuert bei jedem MapboxDraw-Render (auch während des Zeichnens).
     * MapboxDraw trackt das in-progress Feature ab dem ersten Vertex in seiner
     * internen Collection — es erscheint als letztes Feature in getAll().
     */
    const handleRender = () => {
      const mode = drawModeRef.current;
      if (!LIVE_DRAW_MODES.includes(mode)) return;

      const draw = drawRef.current;
      if (!draw) return;

      const all = draw.getAll();
      if (all.features.length === 0) {
        setLiveMeasurement(null);
        return;
      }

      // Das in-progress Feature ist das letzte in der Collection.
      // Für Polygone brauchen wir mind. 3 Vertices für eine sinnvolle Fläche,
      // für Linien mind. 2 Vertices für eine Länge.
      const lastFeature = all.features[all.features.length - 1];
      if (!lastFeature?.geometry) {
        setLiveMeasurement(null);
        return;
      }

      try {
        setLiveMeasurement(measureFeature(lastFeature.geometry));
      } catch {
        // Unvollständige Geometrie während des Zeichnens
        setLiveMeasurement(null);
      }
    };

    map.on('draw.update', handleUpdate);
    map.on('draw.render', handleRender);

    return () => {
      map.off('draw.update', handleUpdate);
      map.off('draw.render', handleRender);
    };
  }, [mapRef, drawRef, isMapLoaded]);

  return { selectedMeasurement, liveMeasurement };
}
