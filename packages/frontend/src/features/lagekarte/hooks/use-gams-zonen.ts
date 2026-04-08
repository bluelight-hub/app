/**
 * GAMS-Zonen Hook für die Lagekarte
 *
 * Verwaltet die Platzierung von GAMS-Gefahrenzonen (4 konzentrische Kreise).
 * Folgt dem gleichen Pattern wie useOsmMarkierung: Event → Popup → Features erstellen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { erstelleKreis } from '../utils/geo-calculations';
import { GAMS_ZONEN_FARBEN } from '../drawing/types';
import { setDrawMode } from '../stores/draw.store';

interface UseGamsZonenOptions {
  mapRef: React.RefObject<MapRef | null>;
  drawRef: React.RefObject<MapboxDraw | null>;
  isMapLoaded: boolean;
  /** Auto-Save nach Feature-Erstellung auslösen */
  scheduleAutoSave: () => void;
}

interface UseGamsZonenReturn {
  /** Mittelpunkt der ausstehenden GAMS-Platzierung */
  pendingGamsCenter: [number, number] | null;
  /** GAMS-Zonen mit den angegebenen Radien platzieren */
  confirmiereGamsZonen: (radien: [number, number, number, number]) => void;
  /** Ausstehende GAMS-Platzierung abbrechen */
  abbrechenGamsZonen: () => void;
}

/**
 * Verwaltet GAMS-Gefahrenzonen: Event-Listener, Konfigurations-Popup, Feature-Erstellung.
 */
export function useGamsZonen({ mapRef, drawRef, isMapLoaded, scheduleAutoSave }: UseGamsZonenOptions): UseGamsZonenReturn {
  const [pendingGamsCenter, setPendingGamsCenter] = useState<[number, number] | null>(null);
  const scheduleAutoSaveRef = useRef(scheduleAutoSave);
  useEffect(() => {
    scheduleAutoSaveRef.current = scheduleAutoSave;
  }, [scheduleAutoSave]);

  // Auf gams.platzieren Event lauschen
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleGamsPlatzieren = (e: any) => {
      const center = e.center as [number, number];
      if (center) {
        setPendingGamsCenter(center);
        // Store-Modus auf 'select' setzen (GAMS-Klick ist ein One-Shot)
        setDrawMode('select');
      }
    };

    map.on('gams.platzieren', handleGamsPlatzieren);
    return () => {
      map.off('gams.platzieren', handleGamsPlatzieren);
    };
  }, [isMapLoaded, mapRef]);

  const confirmiereGamsZonen = useCallback(
    (radien: [number, number, number, number]) => {
      const draw = drawRef.current;
      if (!draw || !pendingGamsCenter) return;

      // Zonen von außen nach innen erstellen (größter Kreis zuerst → Rendering-Reihenfolge)
      const sortedIndices = [3, 2, 1, 0]; // Grün, Gelb, Orange, Rot

      for (const i of sortedIndices) {
        const radius = radien[i];
        if (radius <= 0) continue;

        const coords = erstelleKreis(pendingGamsCenter, radius);
        const feature: GeoJSON.Feature = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: coords },
          properties: {
            featureType: 'gams_zone',
            color: GAMS_ZONEN_FARBEN[i],
            fillColor: GAMS_ZONEN_FARBEN[i],
            fillEnabled: true,
            fillOpacity: 0.15,
            strokeWidth: 2,
            shapeType: 'circle',
            shapeCenter: JSON.stringify(pendingGamsCenter),
            shapeRadius: radius,
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        draw.add(feature as any);
      }

      scheduleAutoSaveRef.current();
      setPendingGamsCenter(null);
    },
    [pendingGamsCenter, drawRef],
  );

  const abbrechenGamsZonen = useCallback(() => {
    setPendingGamsCenter(null);
  }, []);

  return { pendingGamsCenter, confirmiereGamsZonen, abbrechenGamsZonen };
}
