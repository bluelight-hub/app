/**
 * Hook für Drag & Drop von taktischen Zeichen auf der Lagekarte.
 *
 * Ermöglicht das Verschieben platzierter Zeichen durch:
 * 1. mousedown auf einen Zeichen-Symbol → Drag-Start
 * 2. mousemove → optimistische Positions-Aktualisierung in der GeoJSON-Source
 * 3. mouseup → API-Call via usePlaceZeichen zur persistenten Speicherung
 *
 * Während des Drags wird die Karte nicht bewegt (dragPan deaktiviert).
 */

import { useCallback, useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { TAKTISCHE_ZEICHEN_LAYER_ID, TAKTISCHE_ZEICHEN_SOURCE_ID } from '@/features/lagekarte/ui/molecules/TaktischeZeichenLayer.molecule';
import type { ZeichenFeatureProperties } from './use-zeichen-layer';
import { usePlaceZeichen } from '@/features/taktische-zeichen';

interface UseZeichenDragOptions {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Ob die Karte vollständig geladen ist */
  isMapLoaded: boolean;
  /** Alle taktischen Zeichen des Einsatzes */
  zeichen: TaktischesZeichenResponseDto[];
  /** Einsatz-ID für den API-Call */
  einsatzId: string;
  /** Ob das Zeichen verschieben erlaubt ist (Berechtigungs-Guard) */
  canDrag?: boolean;
}

/**
 * Aktiviert Drag & Drop für platzierte taktische Zeichen.
 *
 * @returns isDragging — true während ein Zeichen aktiv verschoben wird
 */
export function useZeichenDrag({ mapRef, isMapLoaded, zeichen, einsatzId, canDrag = true }: UseZeichenDragOptions): { isDragging: boolean } {
  const { mutate: placeZeichen } = usePlaceZeichen(einsatzId);

  // Aktueller Drag-Zustand (kein Re-Render nötig — direkte DOM-Interaktion)
  const dragStateRef = useRef<{
    zeichenId: string;
    lagekarteId: string;
  } | null>(null);
  const isDraggingRef = useRef(false);

  // Stable ref für zeichen-Array (Lookup ohne Effect-Dependency)
  const zeichenRef = useRef<TaktischesZeichenResponseDto[]>(zeichen);
  useEffect(() => {
    zeichenRef.current = zeichen;
  }, [zeichen]);

  const setupDragHandlers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !canDrag) return;

    /** Cursor anpassen wenn Maus über einen Zeichen-Symbol fährt */
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'grab';
    };
    const handleMouseLeave = () => {
      if (!isDraggingRef.current) {
        map.getCanvas().style.cursor = '';
      }
    };

    /** Drag-Start: Zeichen-Feature unter dem Cursor ermitteln */
    const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (!canDrag) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: [TAKTISCHE_ZEICHEN_LAYER_ID],
      });
      if (!features.length) return;

      const props = features[0].properties as ZeichenFeatureProperties;
      const foundZeichen = zeichenRef.current.find((z) => z.id === props.zeichenId);
      if (!foundZeichen?.lagekarteId) return;

      // Drag starten
      dragStateRef.current = {
        zeichenId: foundZeichen.id,
        lagekarteId: foundZeichen.lagekarteId,
      };
      isDraggingRef.current = true;

      // Karten-Pan deaktivieren während des Drags
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';

      // Browser-Default verhindern (verhindert Text-Selektion)
      e.originalEvent.preventDefault();
    };

    /** Drag-Move: GeoJSON-Source optimistisch aktualisieren */
    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!isDraggingRef.current || !dragStateRef.current) return;

      const source = map.getSource(TAKTISCHE_ZEICHEN_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      // Aktuelle GeoJSON-Daten laden und das gezogene Feature verschieben
      // Da die Source eine FeatureCollection ist, müssen wir sie aktualisieren
      const { lng, lat } = e.lngLat;
      const { zeichenId } = dragStateRef.current;

      // @ts-expect-error — _data ist intern, aber stabil in MapLibre
      const currentData = source._data as GeoJSON.FeatureCollection<GeoJSON.Point, ZeichenFeatureProperties> | undefined;
      if (!currentData) return;

      const updatedFeatures = currentData.features.map((feature) => {
        if (feature.properties.zeichenId === zeichenId) {
          return {
            ...feature,
            geometry: { ...feature.geometry, coordinates: [lng, lat] },
          };
        }
        return feature;
      });

      source.setData({ ...currentData, features: updatedFeatures });
    };

    /** Drag-End: Position via API persistieren */
    const handleMouseUp = (e: maplibregl.MapMouseEvent) => {
      if (!isDraggingRef.current || !dragStateRef.current) return;

      const { zeichenId, lagekarteId } = dragStateRef.current;
      const { lng, lat } = e.lngLat;

      // Drag-Zustand zurücksetzen
      isDraggingRef.current = false;
      dragStateRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';

      // Position via API persistieren
      placeZeichen({
        zeichenId,
        dto: { lagekarteId, lat, lng },
      });
    };

    map.on('mouseenter', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseLeave);
    map.on('mousedown', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mouseenter', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseLeave);
      map.off('mousedown', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);

      // Sicherheits-Cleanup: dragPan reaktivieren falls noch deaktiviert
      if (isDraggingRef.current) {
        map.dragPan.enable();
        isDraggingRef.current = false;
        dragStateRef.current = null;
      }
    };
  }, [mapRef, canDrag, placeZeichen]);

  useEffect(() => {
    if (!isMapLoaded) return;
    return setupDragHandlers();
  }, [isMapLoaded, setupDragHandlers]);

  return { isDragging: isDraggingRef.current };
}
