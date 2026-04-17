/**
 * GefahrenzoneHost (Issue #627, G2/G3)
 *
 * Bindeglied zwischen MapGL-Instanz und Gefahrenzone-Feature:
 * - Lauscht auf `draw.create` mit `drawContext === 'gefahrenzone'` → öffnet Create-Popover.
 * - Rendert `GefahrenzoneLayer` (alle Zonen des Einsatzes) + aktiviert den WebSocket-Sync-Hook.
 * - Trackt die aktuelle Einsatz-ID für den `GefahrenzonenDetailProvider` (G3).
 *
 * Zone-Klicks werden seit G3 vom `GefahrenzonenDetailProvider` via `queryAllDetailProviders`
 * konsumiert (Popup → Panel) — nicht mehr vom Host direkt.
 */

import { useStore } from '@tanstack/react-store';
import { useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { CreateGefahrenzoneDto } from '@bluelight-hub/shared/client';
import { useUpdateGefahrenmatrixBewertung } from '@/features/gefahrenmatrix/api/mutations';
import { useGefahrenmatrix } from '@/features/gefahrenmatrix/api/queries';
import { useAkutConfirm } from '@/features/gefahrenmatrix/hooks/use-akut-confirm';
import type { GefahrentypValue, SchutzobjektValue, WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { drawStore, setDrawContext, setDrawMode } from '@/features/lagekarte/stores/draw.store';
import { useCreateGefahrenzone, useGefahrenzoneWebSocket, useGefahrenzonen } from '../../api';
import { GefahrenzoneInlinePopover, type GefahrenzonePopoverValues } from '../molecules/GefahrenzoneInlinePopover';
import { useNavigate } from '@tanstack/react-router';
import { setGefahrenzonenProviderEinsatzId } from '@/features/lagekarte/detail-providers';
import { GefahrenzoneDetailPanel } from './GefahrenzoneDetailPanel';
import { GefahrenzoneLayer } from './GefahrenzoneLayer';
import { gefahrenzoneDrawStore, rememberLastUsedDefaults, setActiveEinsatzForDrawDefaults } from '../../stores/gefahrenzone-draw.store';
import { useGefahrenzoneUndo } from '../../hooks/use-gefahrenzone-undo';

/** Minimal-Form eines MapboxDraw-Create-Events — wir lesen nur `features`. */
interface DrawCreateEvent {
  features: Array<{ id: string; geometry: GeoJSON.Geometry; properties?: Record<string, unknown> }>;
}

interface CreatePopoverState {
  geometry: GeoJSON.Feature;
  geometryType: 'POLYGON' | 'CIRCLE';
  initialValues: GefahrenzonePopoverValues;
  anchor: { x: number; y: number } | null;
}

export interface GefahrenzoneHostProps {
  einsatzId: string;
  mapRef: React.RefObject<MapRef | null>;
  /** Deep-Link-Fokus, z. B. `zone:{zoneId}` — öffnet das DetailPanel für die Zone (G3). */
  focus?: string;
}

export function GefahrenzoneHost({ einsatzId, mapRef, focus }: GefahrenzoneHostProps) {
  const { data: zonen = [] } = useGefahrenzonen(einsatzId);
  useGefahrenzoneWebSocket({ einsatzId });

  const createMutation = useCreateGefahrenzone();
  const updateMatrixMutation = useUpdateGefahrenmatrixBewertung();
  const { recordCreate } = useGefahrenzoneUndo();
  const { data: matrixData } = useGefahrenmatrix(einsatzId);
  const currentWarnstufeFor = (typ: GefahrentypValue, objekt: SchutzobjektValue): WarnstufeValue => {
    const hit = matrixData?.bewertungen?.find((b) => b.gefahrentyp === typ && b.schutzobjekt === objekt);
    return (hit?.warnstufe as WarnstufeValue) ?? 'KEINE';
  };

  const drawContext = useStore(drawStore, (s) => s.drawContext);
  const defaults = useStore(gefahrenzoneDrawStore, (s) => ({
    lastUsedGefahrentyp: s.lastUsedGefahrentyp,
    lastUsedSchutzobjekt: s.lastUsedSchutzobjekt,
  }));

  const [popover, setPopover] = useState<CreatePopoverState | null>(null);

  // Merkt sich aktuelle `drawContext`-Wert (handleCreate wird einmal registriert).
  const drawContextRef = useRef(drawContext);
  drawContextRef.current = drawContext;
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  // Beim Einsatz-Wechsel: Defaults-Store resetten + Detail-Provider mit aktuellem Einsatz verdrahten.
  useEffect(() => {
    setActiveEinsatzForDrawDefaults(einsatzId);
    setGefahrenzonenProviderEinsatzId(einsatzId);
    return () => {
      setGefahrenzonenProviderEinsatzId(null);
    };
  }, [einsatzId]);

  // ----- Draw-Create-Listener -----
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleCreate = (e: DrawCreateEvent) => {
      if (drawContextRef.current !== 'gefahrenzone') return;
      const feature = e.features?.[0];
      if (!feature) return;

      const geometryType: 'POLYGON' | 'CIRCLE' = drawStore.state.drawMode === 'draw_circle' ? 'CIRCLE' : 'POLYGON';
      const wrappedFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: feature.geometry,
        properties: feature.properties ?? {},
      };
      const anchor = computeAnchorFromGeometry(feature.geometry, mapRef);

      setPopover({
        geometry: wrappedFeature,
        geometryType,
        anchor,
        initialValues: {
          gefahrentyp: defaultsRef.current.lastUsedGefahrentyp ?? 'BRAND',
          schutzobjekt: defaultsRef.current.lastUsedSchutzobjekt,
          warnstufe: 'HOCH',
        },
      });

      // Draw-Controls aus-toggeln, sodass die Toolbar wieder idle ist.
      setDrawContext(null);
      setDrawMode('select');

      // Das Draw-Feature selbst entfernen — die Zone wird nach Save vom Layer gerendert.
      try {
        // MapboxDraw liegt intern via Map-Control; der sauberste Weg ist, via getMap() die Controls zu finden.
        // Wir löschen Feature via draw.delete falls erreichbar.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controls = (map as any)._controls ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const draw = controls.find((c: any) => typeof c?.delete === 'function' && typeof c?.getAll === 'function');
        draw?.delete(feature.id);
      } catch {
        // Wenn Delete nicht erreichbar: Feature bleibt sichtbar, bis Popover-Save die Zone speichert —
        // dann überlagert der Layer es. Kein harter Fehler.
      }
    };

    map.on('draw.create', handleCreate);
    return () => {
      map.off('draw.create', handleCreate);
    };
  }, [mapRef]);

  const { requestChange, dialog: akutDialog } = useAkutConfirm({
    onCommit: ({ gefahrentyp, schutzobjekt, warnstufe }) => {
      updateMatrixMutation.mutate({ einsatzId, data: { gefahrentyp, schutzobjekt, warnstufe } });
      setPopover(null);
    },
    onCancel: () => {
      // Zone ist erstellt; die Matrix-Warnstufe bleibt unverändert. Popover schließen
      // und den Nutzer auf die Detailansicht fallen lassen.
      setPopover(null);
    },
  });

  const isSubmitting = createMutation.isPending || updateMatrixMutation.isPending;

  // ----- Deep-Link: `focus=zone:<id>` → Panel öffnen + flyTo (G3) -----
  const navigate = useNavigate();
  const deepLinkZoneId = focus?.startsWith('zone:') ? focus.slice('zone:'.length) : null;
  const deepLinkZone = deepLinkZoneId ? (zonen.find((z) => z.id === deepLinkZoneId) ?? null) : null;
  const lastFlownZoneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!deepLinkZone) {
      lastFlownZoneRef.current = null;
      return;
    }
    if (lastFlownZoneRef.current === deepLinkZone.id) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const anchor = computeAnchorFromZone(deepLinkZone);
    if (anchor) {
      try {
        map.flyTo({ center: [anchor.lng, anchor.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
      } catch {
        // flyTo kann in jsdom fehlen — ok, Panel öffnet trotzdem.
      }
    }
    lastFlownZoneRef.current = deepLinkZone.id;
  }, [deepLinkZone, mapRef]);

  // ----- Split-View: `focus=cell:<typ>:<objekt>` → BBox aller zugehörigen Zonen anfliegen (G4) -----
  const cellFocus = focus?.startsWith('cell:') ? focus.split(':') : null;
  const cellTyp = cellFocus?.length === 3 ? cellFocus[1] : null;
  const cellObj = cellFocus?.length === 3 ? cellFocus[2] : null;
  const lastFlownCellRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cellTyp || !cellObj) {
      lastFlownCellRef.current = null;
      return;
    }
    const cellKey = `${cellTyp}:${cellObj}`;
    if (lastFlownCellRef.current === cellKey) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const matchingZonen = zonen.filter((z) => z.gefahrentyp === cellTyp && z.schutzobjekt === cellObj);
    if (matchingZonen.length === 0) {
      lastFlownCellRef.current = cellKey;
      return;
    }
    const bbox = computeBboxFromZonen(matchingZonen);
    if (bbox) {
      try {
        map.fitBounds(
          [
            [bbox.minLng, bbox.minLat],
            [bbox.maxLng, bbox.maxLat],
          ],
          { padding: 80, duration: 600, maxZoom: 16 },
        );
      } catch {
        // fitBounds kann in jsdom fehlen — ok.
      }
    }
    lastFlownCellRef.current = cellKey;
  }, [cellTyp, cellObj, zonen, mapRef]);

  const clearDeepLinkFocus = () => {
    navigate({
      to: '/app/einsatz/$einsatzId/übersicht/karte',
      params: { einsatzId },
      search: (prev) => ({ ...(prev as Record<string, unknown>), focus: undefined }) as never,
    });
  };

  return (
    <>
      {akutDialog}
      <GefahrenzoneLayer zonen={zonen} />
      {deepLinkZone ? (
        <aside
          className="pointer-events-auto absolute top-4 right-4 z-20 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-panel border border-border-subtle bg-surface-panel shadow-panel"
          data-gefahrenzone-deeplink-panel
        >
          <GefahrenzoneDetailPanel zone={deepLinkZone} einsatzId={einsatzId} onClose={clearDeepLinkFocus} />
        </aside>
      ) : null}
      {popover ? (
        <GefahrenzoneInlinePopover
          mode="create"
          anchor={popover.anchor}
          initialValues={popover.initialValues}
          isSubmitting={isSubmitting}
          onCancel={() => setPopover(null)}
          onSubmit={async (values) => {
            const dto: CreateGefahrenzoneDto = {
              gefahrentyp: values.gefahrentyp,
              schutzobjekt: values.schutzobjekt,
              geometryType: popover.geometryType,
              geometry: popover.geometry as unknown as { [key: string]: unknown },
            };
            const createdZone = await createMutation.mutateAsync({ einsatzId, data: dto });
            recordCreate(einsatzId, createdZone);
            rememberLastUsedDefaults(values.gefahrentyp, values.schutzobjekt);
            // Matrix-Warnstufe setzen — bei Hochstufe auf AKUT wird vorher der Confirm-Dialog gezeigt.
            requestChange({
              gefahrentyp: values.gefahrentyp,
              schutzobjekt: values.schutzobjekt,
              previous: currentWarnstufeFor(values.gefahrentyp, values.schutzobjekt),
              next: values.warnstufe,
            });
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Berechnet die Bounding-Box über alle übergebenen Zonen (Issue #627, G4).
 * Iteriert über Polygon-Ringe und sammelt Min/Max-Lng/Lat. `null`, wenn
 * keine brauchbaren Koordinaten gefunden werden.
 */
function computeBboxFromZonen(zonen: Array<{ geometry: unknown }>): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let hasAny = false;
  for (const zone of zonen) {
    const geom = zone.geometry as { type?: string; geometry?: { type?: string; coordinates?: unknown }; coordinates?: unknown } | undefined;
    if (!geom) continue;
    const polygon = geom.type === 'Feature' ? (geom.geometry as { type?: string; coordinates?: unknown } | undefined) : geom;
    if (!polygon || polygon.type !== 'Polygon') continue;
    const rings = polygon.coordinates as number[][][] | undefined;
    const ring = rings?.[0];
    if (!ring) continue;
    for (const [x, y] of ring) {
      if (x < minLng) minLng = x;
      if (y < minLat) minLat = y;
      if (x > maxLng) maxLng = x;
      if (y > maxLat) maxLat = y;
      hasAny = true;
    }
  }
  if (!hasAny) return null;
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Berechnet Lng/Lat-Zentrum aus einer Zone. Unwrapped GeoJSON-Feature bzw.
 * Geometry-Objekt auf Polygon-Koordinaten.
 */
function computeAnchorFromZone(zone: { geometry: unknown }): { lng: number; lat: number } | null {
  const geom = zone.geometry as { type?: string; geometry?: { type?: string; coordinates?: unknown }; coordinates?: unknown } | undefined;
  if (!geom) return null;
  const polygon = geom.type === 'Feature' ? (geom.geometry as { type?: string; coordinates?: unknown } | undefined) : geom;
  if (!polygon || polygon.type !== 'Polygon') return null;
  const rings = polygon.coordinates as number[][][] | undefined;
  const ring = rings?.[0];
  if (!ring || ring.length === 0) return null;
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return { lng: lng / ring.length, lat: lat / ring.length };
}

/**
 * Berechnet einen Screen-Anchor aus dem Feature-Schwerpunkt. Für Polygon:
 * arithmetischer Mittelpunkt der äußeren Ring-Koordinaten; andere Geometrien:
 * null → Popover wird zentriert.
 */
function computeAnchorFromGeometry(geometry: GeoJSON.Geometry, mapRef: React.RefObject<MapRef | null>): { x: number; y: number } | null {
  const map = mapRef.current?.getMap();
  if (!map) return null;

  let lng = 0;
  let lat = 0;
  if (geometry.type === 'Polygon' && geometry.coordinates[0]?.length > 0) {
    const ring = geometry.coordinates[0];
    for (const [x, y] of ring) {
      lng += x;
      lat += y;
    }
    lng /= ring.length;
    lat /= ring.length;
  } else {
    return null;
  }
  const projected = map.project([lng, lat]);
  return { x: projected.x, y: projected.y };
}
