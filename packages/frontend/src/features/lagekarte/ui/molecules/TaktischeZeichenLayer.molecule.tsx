/**
 * MapLibre Layer für taktische Zeichen (DV 102).
 *
 * Rendert platzierte taktische Zeichen als Symbol-Layer auf der Lagekarte.
 * Zeichen werden als SVG-Images in MapLibre registriert und als Punkt-Symbole
 * mit optionalem Text-Label angezeigt.
 */

import type * as React from 'react';
import { useCallback, useState } from 'react';
import { Layer, Popup, Source } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { useZeichenLayer, type ZeichenFeatureProperties } from '@/features/lagekarte/hooks/use-zeichen-layer';

/** ID des Zeichen-Layers (für Click-Interaktion referenzierbar) */
export const TAKTISCHE_ZEICHEN_LAYER_ID = 'taktische-zeichen-symbols';
/** ID der GeoJSON-Source */
export const TAKTISCHE_ZEICHEN_SOURCE_ID = 'taktische-zeichen';

interface TaktischeZeichenLayerProps {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Ob die Karte vollständig geladen ist */
  isMapLoaded: boolean;
  /** Alle taktischen Zeichen des Einsatzes */
  zeichen: TaktischesZeichenResponseDto[];
  /** Callback wenn ein Zeichen angeklickt wird */
  onZeichenClick?: (zeichen: TaktischesZeichenResponseDto) => void;
}

interface PopupState {
  longitude: number;
  latitude: number;
  zeichen: TaktischesZeichenResponseDto;
}

/**
 * Symbol-Layer für taktische Zeichen auf der MapLibre-Karte.
 *
 * Muss innerhalb der `<Map>`-Komponente platziert werden.
 */
export const TaktischeZeichenLayer: React.FC<TaktischeZeichenLayerProps> = ({ mapRef, isMapLoaded, zeichen, onZeichenClick }) => {
  const { geojson } = useZeichenLayer({ mapRef, isMapLoaded, zeichen });
  const [popup, setPopup] = useState<PopupState | null>(null);

  // Zeichen-Map für schnellen Lookup beim Klick
  const zeichenById = new Map(zeichen.map((z) => [z.id, z]));

  const handleLayerClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;

      const props = feature.properties as ZeichenFeatureProperties;
      const clicked = zeichenById.get(props.zeichenId);
      if (!clicked) return;

      if (onZeichenClick) {
        onZeichenClick(clicked);
      } else {
        // Standard: Mini-Popup mit Zeichen-Info anzeigen
        const coords = (feature.geometry as GeoJSON.Point).coordinates;
        setPopup({ longitude: coords[0], latitude: coords[1], zeichen: clicked });
      }
    },
    // zeichenById wird pro Render neu erstellt — kein stabiles Dep nötig
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onZeichenClick, zeichen],
  );

  if (geojson.features.length === 0) return null;

  return (
    <>
      <Source id={TAKTISCHE_ZEICHEN_SOURCE_ID} type="geojson" data={geojson}>
        {/* Symbol-Layer: rendert das SVG-Bild des taktischen Zeichens */}
        <Layer
          id={TAKTISCHE_ZEICHEN_LAYER_ID}
          type="symbol"
          layout={{
            'icon-image': ['get', 'imageId'],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom',
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 0.2],
            'text-allow-overlap': false,
            'text-optional': true,
          }}
          paint={{
            'text-color': '#1a1a1a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          }}
          onClick={handleLayerClick}
        />
      </Source>

      {/* Mini-Popup bei Klick auf ein Zeichen (ohne externen onZeichenClick-Handler) */}
      {popup && (
        <Popup longitude={popup.longitude} latitude={popup.latitude} onClose={() => setPopup(null)} closeOnClick anchor="bottom" offset={10}>
          <div className="min-w-[140px] px-1 py-0.5">
            <p className="text-sm font-medium text-text-primary">{popup.zeichen.label ?? popup.zeichen.zeichenDefinition.grundzeichen}</p>
            {popup.zeichen.notiz && <p className="mt-0.5 text-xs text-text-muted">{popup.zeichen.notiz}</p>}
            {popup.zeichen.mgrs && <p className="mt-0.5 font-mono text-xs text-text-muted">{popup.zeichen.mgrs}</p>}
          </div>
        </Popup>
      )}
    </>
  );
};
