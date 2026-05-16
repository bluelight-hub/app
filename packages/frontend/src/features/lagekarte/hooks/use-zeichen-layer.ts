/**
 * Hook für den taktischen Zeichen-Layer auf der Lagekarte.
 *
 * Registriert SVG-Bilder platzierter taktischer Zeichen als MapLibre-Images
 * und stellt eine GeoJSON-FeatureCollection für den Symbol-Layer bereit.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point } from 'geojson';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { getOrCreateImage } from '@/features/taktische-zeichen/rendering/zeichen-image-cache';

/** GeoJSON-Properties eines Zeichen-Features auf der Karte */
export interface ZeichenFeatureProperties {
  zeichenId: string;
  imageId: string;
  label: string;
}

interface UseZeichenLayerOptions {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Ob die Karte vollständig geladen ist */
  isMapLoaded: boolean;
  /** Alle taktischen Zeichen des Einsatzes */
  zeichen: TaktischesZeichenResponseDto[];
}

interface UseZeichenLayerReturn {
  /** GeoJSON-FeatureCollection der platzierten Zeichen */
  geojson: FeatureCollection<Point, ZeichenFeatureProperties>;
  /** Ob die Images noch registriert werden */
  isRegistering: boolean;
}

/**
 * Registriert SVG-Images aller platzierten Zeichen in MapLibre
 * und gibt eine GeoJSON-FeatureCollection zurück.
 */
export function useZeichenLayer({ mapRef, isMapLoaded, zeichen }: UseZeichenLayerOptions): UseZeichenLayerReturn {
  const [isRegistering, setIsRegistering] = useState(false);
  const registeredKeysRef = useRef<Set<string>>(new Set());
  const registeringRef = useRef(false);

  // Nur platzierte Zeichen (mit lat/lng)
  const platzierteZeichen = useMemo(() => zeichen.filter((z) => z.istPlatziert && z.lat != null && z.lng != null), [zeichen]);

  // GeoJSON aus platzierten Zeichen bauen
  const geojson = useMemo<FeatureCollection<Point, ZeichenFeatureProperties>>(() => {
    return {
      type: 'FeatureCollection',
      features: platzierteZeichen.map((z) => {
        const def = z.zeichenDefinition;
        const imageId = `tz-${[def.grundzeichen ?? '', def.organisation ?? '', def.fachaufgabe ?? '', def.einheit ?? '', def.verwaltungsstufe ?? '', def.symbol ?? '', def.text ?? ''].join('|')}`;

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [z.lng!, z.lat!],
          },
          properties: {
            zeichenId: z.id,
            imageId,
            label: z.label ?? '',
          },
        };
      }),
    };
  }, [platzierteZeichen]);

  // Einzigartiger Zeichen-Definitionen für Image-Registrierung ermitteln
  const uniqueZeichen = useMemo(() => {
    const seen = new Set<string>();
    return platzierteZeichen.filter((z) => {
      const key = `tz-${[
        z.zeichenDefinition.grundzeichen ?? '',
        z.zeichenDefinition.organisation ?? '',
        z.zeichenDefinition.fachaufgabe ?? '',
        z.zeichenDefinition.einheit ?? '',
        z.zeichenDefinition.verwaltungsstufe ?? '',
        z.zeichenDefinition.symbol ?? '',
        z.zeichenDefinition.text ?? '',
      ].join('|')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [platzierteZeichen]);

  // Images in MapLibre registrieren sobald neue Zeichen hinzukommen
  useEffect(() => {
    if (!isMapLoaded || uniqueZeichen.length === 0) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    // `map.hasImage`/`addImage` greifen intern auf `this.style.getImage` zu —
    // nach `map.remove()` (Unmount) crasht das mit "undefined is not an object
    // (evaluating 'this.style.getImage')". MapLibre setzt `_removed = true` in
    // `remove()`; das Flag schützt vor Use-after-destroy nach jedem `await`.
    const isMapAlive = () => !(map as unknown as { _removed?: boolean })._removed;

    // Nur neue Images registrieren (nicht bereits vorhandene)
    const neuaZeichen = uniqueZeichen.filter((z) => {
      const key = `tz-${[
        z.zeichenDefinition.grundzeichen ?? '',
        z.zeichenDefinition.organisation ?? '',
        z.zeichenDefinition.fachaufgabe ?? '',
        z.zeichenDefinition.einheit ?? '',
        z.zeichenDefinition.verwaltungsstufe ?? '',
        z.zeichenDefinition.symbol ?? '',
        z.zeichenDefinition.text ?? '',
      ].join('|')}`;
      return !registeredKeysRef.current.has(key) && !map.hasImage(key);
    });

    if (neuaZeichen.length === 0) return;

    let cancelled = false;

    const registerImages = async () => {
      if (registeringRef.current) return;
      registeringRef.current = true;
      setIsRegistering(true);

      for (const z of neuaZeichen) {
        if (cancelled || !isMapAlive()) break;
        try {
          const { key, image } = await getOrCreateImage(z.zeichenDefinition);
          if (cancelled || !isMapAlive()) break;
          if (!map.hasImage(key)) {
            map.addImage(key, image);
          }
          registeredKeysRef.current.add(key);
        } catch {
          // Zeichen-Image konnte nicht gerendert werden — überspringen
        }
      }

      registeringRef.current = false;
      if (!cancelled) setIsRegistering(false);
    };

    registerImages();

    return () => {
      cancelled = true;
    };
  }, [isMapLoaded, uniqueZeichen, mapRef]);

  // Bei Style-Wechsel alle Images erneut registrieren
  useEffect(() => {
    if (!isMapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleStyleLoad = () => {
      // Cache leeren — alle Images müssen neu registriert werden
      registeredKeysRef.current.clear();
    };
    map.on('style.load', handleStyleLoad);
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [isMapLoaded, mapRef]);

  return { geojson, isRegistering };
}
