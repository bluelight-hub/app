/**
 * GhostZeichenMarker — Halbtransparenter Vorschau-Marker, der dem Cursor folgt.
 *
 * Wird im Platzierungsmodus angezeigt, damit der Nutzer sieht,
 * wo das taktische Zeichen auf der Karte platziert wird.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point } from 'geojson';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import { getOrCreateImage } from '@/features/taktische-zeichen/rendering/zeichen-image-cache';

const GHOST_SOURCE_ID = 'ghost-zeichen-source';
const GHOST_LAYER_ID = 'ghost-zeichen-layer';

interface GhostZeichenMarkerProps {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Definition des zu platzierenden Zeichens */
  definition: ZeichenDefinition;
  /** Ob die Karte vollständig geladen ist */
  isMapLoaded: boolean;
}

/**
 * Rendert einen halbtransparenten Marker, der dem Cursor auf der Karte folgt.
 * Registriert das Symbol-Image bei Bedarf in MapLibre.
 */
export function GhostZeichenMarker({ mapRef, definition, isMapLoaded }: GhostZeichenMarkerProps) {
  const [cursorPosition, setCursorPosition] = useState<{ lng: number; lat: number } | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const imageRegisteredRef = useRef(false);

  // Symbol-Image in MapLibre registrieren
  useEffect(() => {
    if (!isMapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    imageRegisteredRef.current = false;

    getOrCreateImage(definition).then(({ key, image }) => {
      if (!map.hasImage(key)) {
        map.addImage(key, image);
      }
      setImageId(key);
      imageRegisteredRef.current = true;
    });
  }, [definition, isMapLoaded, mapRef]);

  // Maus-Position auf der Karte verfolgen
  const handleMouseMove = useCallback((e: maplibregl.MapMouseEvent) => {
    setCursorPosition({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  }, []);

  // Cursor ausblenden wenn Maus die Karte verlässt
  const handleMouseLeave = useCallback(() => {
    setCursorPosition(null);
  }, []);

  useEffect(() => {
    if (!isMapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.on('mousemove', handleMouseMove);
    map.on('mouseout', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseLeave);
      setCursorPosition(null);
    };
  }, [isMapLoaded, mapRef, handleMouseMove, handleMouseLeave]);

  if (!imageId || !cursorPosition) return null;

  const geojson: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [cursorPosition.lng, cursorPosition.lat],
        },
        properties: {
          imageId,
        },
      },
    ],
  };

  return (
    <Source id={GHOST_SOURCE_ID} type="geojson" data={geojson}>
      <Layer
        id={GHOST_LAYER_ID}
        type="symbol"
        layout={{
          'icon-image': ['get', 'imageId'],
          'icon-size': 0.5,
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
        }}
        paint={{
          'icon-opacity': 0.5,
        }}
      />
    </Source>
  );
}
