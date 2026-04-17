/**
 * GefahrenzoneHost (Issue #627, G2)
 *
 * Bindeglied zwischen MapGL-Instanz und Gefahrenzone-Feature:
 * - Lauscht auf `draw.create` mit `drawContext === 'gefahrenzone'` → öffnet Create-Popover.
 * - Lauscht auf Zone-Klick via `queryRenderedFeatures` → öffnet Edit-Popover.
 * - Rendert `GefahrenzoneLayer` (alle Zonen des Einsatzes) + Inline-Popover + aktiviert
 *   den WebSocket-Sync-Hook.
 */

import { useStore } from '@tanstack/react-store';
import { useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { CreateGefahrenzoneDto, GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { WARNSTUFEN, type GefahrentypValue, type SchutzobjektValue, type WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { useUpdateGefahrenmatrixBewertung } from '@/features/gefahrenmatrix/api/mutations';
import { drawStore, setDrawContext, setDrawMode } from '@/features/lagekarte/stores/draw.store';
import { useCreateGefahrenzone, useDeleteGefahrenzone, useGefahrenzoneWebSocket, useGefahrenzonen } from '../../api';
import { GefahrenzoneInlinePopover, type GefahrenzonePopoverValues } from '../molecules/GefahrenzoneInlinePopover';
import { GEFAHRENZONE_FILL_LAYER_ID, GefahrenzoneLayer } from './GefahrenzoneLayer';
import { gefahrenzoneDrawStore, rememberLastUsedDefaults, setActiveEinsatzForDrawDefaults } from '../../stores/gefahrenzone-draw.store';

/** Minimal-Form eines MapboxDraw-Create-Events — wir lesen nur `features`. */
interface DrawCreateEvent {
  features: Array<{ id: string; geometry: GeoJSON.Geometry; properties?: Record<string, unknown> }>;
}

type PopoverState =
  | { mode: 'create'; geometry: GeoJSON.Feature; geometryType: 'POLYGON' | 'CIRCLE'; initialValues: GefahrenzonePopoverValues; anchor: { x: number; y: number } | null }
  | { mode: 'edit'; zone: GefahrenzoneDto; initialValues: GefahrenzonePopoverValues; anchor: { x: number; y: number } | null }
  | null;

export interface GefahrenzoneHostProps {
  einsatzId: string;
  mapRef: React.RefObject<MapRef | null>;
}

export function GefahrenzoneHost({ einsatzId, mapRef }: GefahrenzoneHostProps) {
  const { data: zonen = [] } = useGefahrenzonen(einsatzId);
  useGefahrenzoneWebSocket({ einsatzId });

  const createMutation = useCreateGefahrenzone();
  const deleteMutation = useDeleteGefahrenzone();
  const updateMatrixMutation = useUpdateGefahrenmatrixBewertung();

  const drawContext = useStore(drawStore, (s) => s.drawContext);
  const defaults = useStore(gefahrenzoneDrawStore, (s) => ({
    lastUsedGefahrentyp: s.lastUsedGefahrentyp,
    lastUsedSchutzobjekt: s.lastUsedSchutzobjekt,
  }));

  const [popover, setPopover] = useState<PopoverState>(null);

  // Merkt sich aktuelle `drawContext`-Wert (handleCreate wird einmal registriert).
  const drawContextRef = useRef(drawContext);
  drawContextRef.current = drawContext;
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  // Beim Einsatz-Wechsel: Defaults-Store resetten.
  useEffect(() => {
    setActiveEinsatzForDrawDefaults(einsatzId);
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
        mode: 'create',
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

  // ----- Zone-Click-Listener (nur wenn kein Draw-Context aktiv) -----
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleMapClick = (e: { point: { x: number; y: number }; lngLat: { lng: number; lat: number }; features?: unknown[] }) => {
      if (drawContextRef.current === 'gefahrenzone') return; // Draw hat Vorrang
      const features = map.queryRenderedFeatures(e.point, { layers: [GEFAHRENZONE_FILL_LAYER_ID] });
      const zoneHit = features?.[0];
      if (!zoneHit) return;
      const zoneId = (zoneHit.properties as { zoneId?: string } | undefined)?.zoneId;
      if (!zoneId) return;
      const zone = zonen.find((z) => z.id === zoneId);
      if (!zone) return;

      setPopover({
        mode: 'edit',
        zone,
        anchor: { x: e.point.x, y: e.point.y },
        initialValues: {
          gefahrentyp: zone.gefahrentyp as GefahrentypValue,
          schutzobjekt: zone.schutzobjekt as SchutzobjektValue,
          warnstufe: normalizeWarnstufe(zone.warnstufe),
        },
      });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapRef, zonen]);

  const isSubmitting = createMutation.isPending || updateMatrixMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <GefahrenzoneLayer zonen={zonen} />
      {popover ? (
        <GefahrenzoneInlinePopover
          mode={popover.mode}
          anchor={popover.anchor}
          initialValues={popover.initialValues}
          isSubmitting={isSubmitting}
          onCancel={() => setPopover(null)}
          onDelete={
            popover.mode === 'edit'
              ? () => {
                  deleteMutation.mutate({ einsatzId, zoneId: popover.zone.id }, { onSettled: () => setPopover(null) });
                }
              : undefined
          }
          onSubmit={async (values) => {
            if (popover.mode === 'create') {
              const dto: CreateGefahrenzoneDto = {
                gefahrentyp: values.gefahrentyp,
                schutzobjekt: values.schutzobjekt,
                geometryType: popover.geometryType,
                geometry: popover.geometry as unknown as { [key: string]: unknown },
              };
              await createMutation.mutateAsync({ einsatzId, data: dto });
              rememberLastUsedDefaults(values.gefahrentyp, values.schutzobjekt);
              // Matrix-Warnstufe setzen, damit die Zone sofort die korrekte Warnstufe erbt.
              await updateMatrixMutation.mutateAsync({
                einsatzId,
                data: { gefahrentyp: values.gefahrentyp, schutzobjekt: values.schutzobjekt, warnstufe: values.warnstufe },
              });
              setPopover(null);
            } else {
              // Edit-Mode: nur Warnstufe → Matrix-Update (Source-of-Truth).
              await updateMatrixMutation.mutateAsync({
                einsatzId,
                data: {
                  gefahrentyp: popover.zone.gefahrentyp as GefahrentypValue,
                  schutzobjekt: popover.zone.schutzobjekt as SchutzobjektValue,
                  warnstufe: values.warnstufe,
                },
              });
              setPopover(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

function normalizeWarnstufe(input: unknown): WarnstufeValue {
  if (typeof input === 'string' && WARNSTUFEN.includes(input as WarnstufeValue)) {
    return input as WarnstufeValue;
  }
  return 'HOCH';
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
