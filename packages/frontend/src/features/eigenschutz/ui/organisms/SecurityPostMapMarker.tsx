/**
 * MapLibre-Symbol-Layer für aktive Sicherungsposten (Story 4.3, FR28).
 *
 * Rendert Posten mit Coordinate-Standort als visuell von taktischen
 * Zeichen abgesetzte Marker (Phosphor-`shield-check` auf weißem Kreis,
 * Brand-Blau #1d4ed8).
 *
 * Story 4.4 erweitert die Komponente um:
 * - Click-Popover mit „Details öffnen"-Action (ersetzt Hover-Tooltip).
 * - `focus`-Prop (`sicherungsposten:<id>`) → FlyTo + Highlight-Ring.
 *
 * Muss innerhalb von `<Map>` aus `react-map-gl/maplibre` montiert werden.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Marker, Popup, Source } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { SicherungspostenDto } from '@bluelight-hub/shared/client';
import { truncateAbloesezeitenForTooltip } from '@bluelight-hub/shared';
import { useNavigate } from '@tanstack/react-router';
import { useListSicherungsposten } from '../../api/use-sicherungsposten';
import './SecurityPostMapMarker.css';

/** ID der GeoJSON-Source */
export const SICHERUNGSPOSTEN_SOURCE_ID = 'sicherungsposten';
/** ID des Marker-Layers (für Story-4.4-Click-Handler-Lookup wiederverwendbar) */
export const SICHERUNGSPOSTEN_LAYER_ID = 'sicherungsposten-symbols';
/** Image-Name in MapLibre (für Story-4.4-Wiederverwendung) */
export const SICHERUNGSPOSTEN_MARKER_IMAGE = 'sicherungsposten-marker';

/** Dauer des Highlight-Rings in ms (Story 4.4, AC8). */
const HIGHLIGHT_DURATION_MS = 1500;

/**
 * Phosphor `shield-check`-Symbol (256×256-ViewBox, original-Pfad) auf
 * weißem Kreis. Identisch zum `PiShieldCheck` in der Legende.
 * `Image(40, 40)` skaliert das SVG beim Laden auf 40×40 px.
 */
const SICHERUNGSPOSTEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <circle cx="128" cy="128" r="120" fill="#ffffff" stroke="#1d4ed8" stroke-width="12" filter="url(#shadow)"/>
  <g transform="matrix(0.78 0 0 0.78 28.16 28.16)">
    <path fill="#1d4ed8" d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z"/>
  </g>
</svg>`;

interface SicherungspostenFeatureProperties {
  postenId: string;
  bezeichnung: string;
  abloesezeitenTooltip: string;
  /** Anzahl Personal (Story 4.4, AC5 — Popover-Anzeige). */
  personalCount: number;
}

interface SecurityPostMapMarkerProps {
  readonly einsatzId: string;
  readonly mapRef: React.RefObject<MapRef | null>;
  readonly isMapLoaded: boolean;
  /**
   * Deep-Link-Fokus (Story 4.4, AC7). Schema `sicherungsposten:<id>`.
   * Andere Schemas (z. B. `zone:`) werden silent ignoriert.
   */
  readonly focus?: string;
}

interface PopupState {
  longitude: number;
  latitude: number;
  postenId: string;
  bezeichnung: string;
  personalCount: number;
  abloesezeitenTooltip: string;
}

interface HighlightState {
  postenId: string;
  longitude: number;
  latitude: number;
}

/**
 * Lädt einen SVG-String als HTMLImageElement für `map.addImage(...)`.
 *
 * Lokale Kopie aus `lagekarte/hooks/use-symbol-marker.ts:36-43` —
 * Public-Promotion-Refactor wäre ein Cross-Feature-Eingriff in
 * `lagekarte/`-Internas und ist hier explizit aus-Scope.
 */
function loadSvgImage(svgContent: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(width, height);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCoordinateStandort(posten: SicherungspostenDto): boolean {
  const standort = posten.standort;
  if (!standort || typeof standort !== 'object') return false;
  const s = standort as { kind?: unknown; longitude?: unknown; latitude?: unknown };
  if (s.kind !== 'coordinate') return false;
  if (!isFiniteNumber(s.longitude) || !isFiniteNumber(s.latitude)) return false;
  if (s.longitude < -180 || s.longitude > 180) return false;
  if (s.latitude < -90 || s.latitude > 90) return false;
  return true;
}

export function SecurityPostMapMarker({ einsatzId, mapRef, isMapLoaded, focus }: SecurityPostMapMarkerProps) {
  const query = useListSicherungsposten(einsatzId, 'AKTIV');
  const navigate = useNavigate();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [triggerCount, setTriggerCount] = useState(0);
  const registeredRef = useRef(false);
  const registeringRef = useRef(false);
  const lastHandledTriggerRef = useRef<number>(-1);

  const aktivePostenMitCoordinate = useMemo(() => (query.data ?? []).filter(isCoordinateStandort), [query.data]);

  const geojson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, SicherungspostenFeatureProperties>>(
    () => ({
      type: 'FeatureCollection',
      features: aktivePostenMitCoordinate.map((posten) => {
        const standort = posten.standort as { kind: 'coordinate'; longitude: number; latitude: number };
        const abloesezeitenTooltip = truncateAbloesezeitenForTooltip((posten.abloesezeiten as string | null | undefined) ?? null, 120);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [standort.longitude, standort.latitude] },
          properties: {
            postenId: posten.id,
            bezeichnung: posten.bezeichnung,
            abloesezeitenTooltip,
            personalCount: Array.isArray(posten.personal) ? posten.personal.length : 0,
          },
        };
      }),
    }),
    [aktivePostenMitCoordinate],
  );

  // Image-Registrierung (idempotent + Re-Entrancy-Guard + Style-Reload-Re-Register)
  useEffect(() => {
    if (!isMapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    let cancelled = false;

    const register = async () => {
      if (cancelled) return;
      if (registeredRef.current) return;
      if (registeringRef.current) return;
      if (map.hasImage(SICHERUNGSPOSTEN_MARKER_IMAGE)) {
        registeredRef.current = true;
        return;
      }
      registeringRef.current = true;
      try {
        const img = await loadSvgImage(SICHERUNGSPOSTEN_SVG, 40, 40);
        if (cancelled) return;
        if (!map.hasImage(SICHERUNGSPOSTEN_MARKER_IMAGE)) {
          map.addImage(SICHERUNGSPOSTEN_MARKER_IMAGE, img);
        }
        registeredRef.current = true;
      } catch (error) {
        // Logging — fehlende Marker sind im Einsatzkontext sicherheitskritisch.
        console.error('SecurityPostMapMarker: Image-Registrierung fehlgeschlagen', error);
      } finally {
        registeringRef.current = false;
      }
    };

    register();

    const handleStyleLoad = () => {
      // MapLibre verwirft beim Style-Wechsel alle Images — Guard zurücksetzen.
      registeredRef.current = false;
      register();
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      cancelled = true;
      map.off('style.load', handleStyleLoad);
      if (map.hasImage(SICHERUNGSPOSTEN_MARKER_IMAGE)) {
        map.removeImage(SICHERUNGSPOSTEN_MARKER_IMAGE);
      }
      registeredRef.current = false;
      registeringRef.current = false;
    };
  }, [isMapLoaded, mapRef]);

  // Click-Popover-Listener (Story 4.4, AC5).
  // - Layer-Click pinnt das Popover an der Marker-Stelle.
  // - Outer-Click schließt es.
  // - mouseenter/mouseleave nur für Cursor-Affordanz, kein Popup-Trigger.
  useEffect(() => {
    if (!isMapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const openPopupFromFeature = (feature: GeoJSON.Feature | undefined) => {
      if (!feature || feature.geometry.type !== 'Point') return;
      const props = feature.properties as SicherungspostenFeatureProperties | null;
      if (!props) return;
      const [longitude, latitude] = (feature.geometry as GeoJSON.Point).coordinates;
      if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude)) return;
      setPopup({
        longitude,
        latitude,
        postenId: props.postenId,
        bezeichnung: props.bezeichnung,
        personalCount: props.personalCount ?? 0,
        abloesezeitenTooltip: props.abloesezeitenTooltip,
      });
    };

    const handleClick = (event: { features?: GeoJSON.Feature[] }) => {
      openPopupFromFeature(event.features?.[0]);
    };
    const handleOuterTap = (event: { defaultPrevented?: boolean; features?: GeoJSON.Feature[] }) => {
      if (event.defaultPrevented) return;
      // Layer-Click setzt `event.features.length > 0` — den eigenen Layer-Handler
      // nicht doppelt behandeln; nur tatsächliche Outer-Taps schließen den Popover.
      if (event.features && event.features.length > 0) return;
      setPopup(null);
    };
    const handleMouseEnter = () => {
      const canvas = map.getCanvas?.();
      if (canvas?.style) canvas.style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      const canvas = map.getCanvas?.();
      if (canvas?.style) canvas.style.cursor = '';
    };

    map.on('click', SICHERUNGSPOSTEN_LAYER_ID, handleClick);
    map.on('click', handleOuterTap);
    map.on('mouseenter', SICHERUNGSPOSTEN_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', SICHERUNGSPOSTEN_LAYER_ID, handleMouseLeave);

    return () => {
      map.off('click', SICHERUNGSPOSTEN_LAYER_ID, handleClick);
      map.off('click', handleOuterTap);
      map.off('mouseenter', SICHERUNGSPOSTEN_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', SICHERUNGSPOSTEN_LAYER_ID, handleMouseLeave);
    };
  }, [isMapLoaded, mapRef]);

  // Re-Trigger-Pattern: Jede Änderung der `focus`-Prop (auch identische
  // URL durch erneuten Listen-Klick) triggert FlyTo+Highlight neu (AC7).
  useEffect(() => {
    setTriggerCount((t) => t + 1);
  }, [focus]);

  // FlyTo + Highlight-Ring (Story 4.4, AC7 + AC8).
  // Idempotenz-Guard via `lastHandledTriggerRef`: ein einmal verarbeiteter
  // `triggerCount` darf durch Re-Renders (`query.data`-Referenz-Wechsel) den
  // Effect-Body nicht erneut ausführen — sonst entsteht eine Endlos-Loop
  // (Render → Effect → setHighlight → Render → Effect …).
  useEffect(() => {
    // Initialer triggerCount=0 wird ignoriert — der setTriggerCount-Effect
    // oben inkrementiert beim Mount auf 1; das ist der erste „echte" Trigger.
    if (triggerCount === 0) return;
    if (lastHandledTriggerRef.current === triggerCount) return;
    if (!focus || !isMapLoaded) {
      lastHandledTriggerRef.current = triggerCount;
      return;
    }
    const match = /^sicherungsposten:(.+)$/.exec(focus);
    if (!match) {
      lastHandledTriggerRef.current = triggerCount;
      return;
    }
    const postenId = match[1];

    // Suche in der vollen Posten-Liste (nicht nur coordinate-gefiltert),
    // damit Address-only-Posten korrekt erkannt und silent verworfen werden (AC9).
    const allPosten = query.data ?? [];
    const target = allPosten.find((p) => p.id === postenId);
    if (!target) {
      // Daten womöglich noch nicht geladen — Trigger NICHT als „handled"
      // markieren, damit ein späterer Render mit geladenen Daten erneut prüft.
      return;
    }

    const standort = target.standort as { kind?: string; longitude?: number; latitude?: number } | null | undefined;
    if (!standort || standort.kind !== 'coordinate') {
      lastHandledTriggerRef.current = triggerCount;
      return;
    }
    if (!isFiniteNumber(standort.longitude) || !isFiniteNumber(standort.latitude)) {
      lastHandledTriggerRef.current = triggerCount;
      return;
    }

    const map = mapRef.current?.getMap();
    if (!map) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : 10;
    map.flyTo({
      center: [standort.longitude, standort.latitude],
      zoom: Math.max(currentZoom, 15),
      duration: prefersReducedMotion ? 0 : 1200,
    });
    setHighlight({ postenId, longitude: standort.longitude, latitude: standort.latitude });
    lastHandledTriggerRef.current = triggerCount;
    // `focus` ist bewusst nicht in den Deps — `triggerCount` bündelt das
    // Re-Trigger-Signal (siehe Effect oben).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCount, isMapLoaded, mapRef, query.data]);

  // Highlight nach 1.5 s ausblenden (BITV: kein Pulse-Loop).
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => {
      setHighlight(null);
    }, HIGHLIGHT_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [highlight]);

  if (!isMapLoaded || query.isPending || aktivePostenMitCoordinate.length === 0) {
    return null;
  }

  const handleDetailNavigate = () => {
    if (!popup) return;
    const postenId = popup.postenId;
    setPopup(null);
    navigate({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id',
      params: { einsatzId, id: postenId },
    });
  };

  return (
    <>
      <Source id={SICHERUNGSPOSTEN_SOURCE_ID} type="geojson" data={geojson} promoteId="postenId">
        <Layer
          id={SICHERUNGSPOSTEN_LAYER_ID}
          type="symbol"
          layout={{
            'icon-image': SICHERUNGSPOSTEN_MARKER_IMAGE,
            'icon-size': 0.8,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom',
          }}
        />
      </Source>

      {highlight && (
        <Marker longitude={highlight.longitude} latitude={highlight.latitude} anchor="center">
          <div className="sicherungsposten-highlight-ring" data-testid="sicherungsposten-highlight-ring" aria-hidden="true" />
        </Marker>
      )}

      {popup && (
        <Popup longitude={popup.longitude} latitude={popup.latitude} anchor="bottom" offset={20} closeOnClick={false} closeButton={true} onClose={() => setPopup(null)}>
          <div className="max-w-[260px] px-1 py-0.5" aria-label={`Sicherungsposten ${popup.bezeichnung}`}>
            <p className="truncate text-sm font-medium text-text-primary" title={popup.bezeichnung}>
              {popup.bezeichnung}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">{popup.personalCount > 0 ? `Personal: ${popup.personalCount} Person(en)` : 'Kein Personal hinterlegt'}</p>
            {popup.abloesezeitenTooltip.length > 0 && <p className="mt-0.5 text-xs text-text-muted">{popup.abloesezeitenTooltip}</p>}
            <button
              type="button"
              onClick={handleDetailNavigate}
              data-testid="sicherungsposten-popover-detail-link"
              className="mt-2 inline-flex items-center rounded border border-blue-700 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              Details öffnen
            </button>
          </div>
        </Popup>
      )}
    </>
  );
}
