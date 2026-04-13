/**
 * Hook für Auswahl & Drag von taktischen Zeichen auf der Lagekarte.
 *
 * Zweistufiges Verschieben:
 * 1. Klick auf Symbol → Auswahl (visuelles Highlight)
 * 2. Drag auf ausgewähltes Symbol → Ghost folgt dem Cursor, Original bleibt gedimmt
 *
 * Klick auf leere Karte oder anderes Symbol → Auswahl wechseln/aufheben.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { TAKTISCHE_ZEICHEN_LAYER_ID, TAKTISCHE_ZEICHEN_SOURCE_ID } from '@/features/lagekarte/ui/molecules/TaktischeZeichenLayer.molecule';
import type { ZeichenFeatureProperties } from './use-zeichen-layer';
import { usePlaceZeichen } from '@/features/taktische-zeichen';

const DRAG_THRESHOLD_PX = 5;

const DRAG_GHOST_SOURCE = 'drag-ghost-source';
const DRAG_GHOST_LAYER = 'drag-ghost-layer';

interface UseZeichenDragOptions {
  mapRef: React.RefObject<MapRef | null>;
  isMapLoaded: boolean;
  zeichen: TaktischesZeichenResponseDto[];
  einsatzId: string;
  canDrag?: boolean;
  /** Wird aufgerufen wenn ein Zeichen selektiert/deselektiert wird */
  onSelect?: (zeichenId: string | null) => void;
}

export function useZeichenDrag({ mapRef, isMapLoaded, zeichen, einsatzId, canDrag = true, onSelect }: UseZeichenDragOptions) {
  const { mutate: placeZeichen } = usePlaceZeichen(einsatzId);
  const [selectedZeichenId, setSelectedZeichenId] = useState<string | null>(null);

  const dragStateRef = useRef<{
    zeichenId: string;
    lagekarteId: string;
    originLng: number;
    originLat: number;
    imageId: string;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const isPendingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedZeichenId;
  }, [selectedZeichenId]);

  const zeichenRef = useRef<TaktischesZeichenResponseDto[]>(zeichen);
  useEffect(() => {
    zeichenRef.current = zeichen;
  }, [zeichen]);

  const setFeatureState = useCallback(
    (zeichenId: string, state: Record<string, boolean>) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      try {
        map.setFeatureState({ source: TAKTISCHE_ZEICHEN_SOURCE_ID, id: zeichenId }, state);
      } catch {
        // Feature evtl. noch nicht in der Source
      }
    },
    [mapRef],
  );

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const selectZeichen = useCallback(
    (zeichenId: string | null) => {
      if (selectedIdRef.current && selectedIdRef.current !== zeichenId) {
        setFeatureState(selectedIdRef.current, { selected: false });
      }
      if (zeichenId) {
        setFeatureState(zeichenId, { selected: true });
      }
      setSelectedZeichenId(zeichenId);
      onSelectRef.current?.(zeichenId);
    },
    [setFeatureState],
  );

  /** Ghost-Symbol am Cursor anzeigen (halbtransparenter Klon) */
  const showGhost = useCallback(
    (lng: number, lat: number, imageId: string) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const data: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { imageId } }],
      };

      const source = map.getSource(DRAG_GHOST_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      } else {
        map.addSource(DRAG_GHOST_SOURCE, { type: 'geojson', data });
        map.addLayer({
          id: DRAG_GHOST_LAYER,
          source: DRAG_GHOST_SOURCE,
          type: 'symbol',
          layout: {
            'icon-image': ['get', 'imageId'],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom',
          },
          paint: {
            'icon-opacity': 0.5,
          },
        });
      }
    },
    [mapRef],
  );

  /** Ghost-Position aktualisieren */
  const updateGhost = useCallback(
    (lng: number, lat: number, imageId: string) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const source = map.getSource(DRAG_GHOST_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { imageId } }],
        });
      }
    },
    [mapRef],
  );

  /** Ghost ausblenden */
  const hideGhost = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (map.getLayer(DRAG_GHOST_LAYER)) {
      map.removeLayer(DRAG_GHOST_LAYER);
    }
    if (map.getSource(DRAG_GHOST_SOURCE)) {
      map.removeSource(DRAG_GHOST_SOURCE);
    }
  }, [mapRef]);

  const setupHandlers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !canDrag) return;

    const handleMouseEnter = (e: maplibregl.MapMouseEvent) => {
      if (isDraggingRef.current) return;
      const features = map.queryRenderedFeatures(e.point, { layers: [TAKTISCHE_ZEICHEN_LAYER_ID] });
      if (!features.length) return;
      const props = features[0].properties as ZeichenFeatureProperties;
      map.getCanvas().style.cursor = props.zeichenId === selectedIdRef.current ? 'grab' : 'pointer';
    };

    const handleMouseLeave = () => {
      if (!isDraggingRef.current) {
        map.getCanvas().style.cursor = '';
      }
    };

    /** Mousedown: Drag nur für ausgewähltes Symbol vorbereiten */
    const handleLayerMouseDown = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [TAKTISCHE_ZEICHEN_LAYER_ID] });
      if (!features.length) return;

      const props = features[0].properties as ZeichenFeatureProperties;
      if (props.zeichenId !== selectedIdRef.current) return;

      const foundZeichen = zeichenRef.current.find((z) => z.id === props.zeichenId);
      if (!foundZeichen?.lagekarteId || foundZeichen.lng == null || foundZeichen.lat == null) return;

      dragStateRef.current = {
        zeichenId: foundZeichen.id,
        lagekarteId: foundZeichen.lagekarteId,
        originLng: foundZeichen.lng,
        originLat: foundZeichen.lat,
        imageId: props.imageId,
      };
      isPendingRef.current = true;
      startPointRef.current = { x: e.point.x, y: e.point.y };

      map.dragPan.disable();
      e.originalEvent.preventDefault();
    };

    /** Mousemove: Threshold prüfen, Ghost aktualisieren */
    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!dragStateRef.current) return;

      if (isPendingRef.current && startPointRef.current) {
        const dx = e.point.x - startPointRef.current.x;
        const dy = e.point.y - startPointRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;

        // Drag aktivieren — Original dimmen, Ghost starten
        isPendingRef.current = false;
        isDraggingRef.current = true;
        map.getCanvas().style.cursor = 'grabbing';
        setFeatureState(dragStateRef.current.zeichenId, { selected: true, dragging: true });
        showGhost(e.lngLat.lng, e.lngLat.lat, dragStateRef.current.imageId);
      }

      if (!isDraggingRef.current) return;

      // Ghost dem Cursor folgen lassen (Original bleibt am Ursprung)
      updateGhost(e.lngLat.lng, e.lngLat.lat, dragStateRef.current.imageId);
    };

    /** Mouseup: Drag abschließen */
    const handleMouseUp = (e: maplibregl.MapMouseEvent) => {
      const wasDragging = isDraggingRef.current;
      const wasPending = isPendingRef.current;
      const state = dragStateRef.current;

      if (wasDragging || wasPending) {
        map.dragPan.enable();
      }

      if (wasDragging && state) {
        setFeatureState(state.zeichenId, { selected: true, dragging: false });
        hideGhost();
        map.getCanvas().style.cursor = 'grab';

        // API-Call mit optimistischem Cache-Update (aktualisiert sofort die GeoJSON-Source via React)
        const { lng, lat } = e.lngLat;
        placeZeichen({
          zeichenId: state.zeichenId,
          dto: { lagekarteId: state.lagekarteId, lat, lng },
        });
      }

      isDraggingRef.current = false;
      isPendingRef.current = false;
      startPointRef.current = null;
      dragStateRef.current = null;
    };

    /** Klick: Auswahl verwalten */
    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (isDraggingRef.current) return;

      const features = map.queryRenderedFeatures(e.point, { layers: [TAKTISCHE_ZEICHEN_LAYER_ID] });

      if (features.length > 0) {
        const props = features[0].properties as ZeichenFeatureProperties;

        if (props.zeichenId === selectedIdRef.current) {
          selectZeichen(null);
          map.getCanvas().style.cursor = 'pointer';
        } else {
          selectZeichen(props.zeichenId);
          map.getCanvas().style.cursor = 'grab';
        }
      } else if (selectedIdRef.current) {
        selectZeichen(null);
      }
    };

    map.on('mouseenter', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseLeave);
    map.on('mousedown', TAKTISCHE_ZEICHEN_LAYER_ID, handleLayerMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    map.on('click', handleMapClick);

    return () => {
      map.off('mouseenter', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', TAKTISCHE_ZEICHEN_LAYER_ID, handleMouseLeave);
      map.off('mousedown', TAKTISCHE_ZEICHEN_LAYER_ID, handleLayerMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('click', handleMapClick);

      if (isDraggingRef.current) {
        map.dragPan.enable();
        isDraggingRef.current = false;
        isPendingRef.current = false;
        dragStateRef.current = null;
        hideGhost();
      }
    };
  }, [mapRef, canDrag, placeZeichen, selectZeichen, setFeatureState, showGhost, updateGhost, hideGhost]);

  useEffect(() => {
    if (!isMapLoaded) return;
    return setupHandlers();
  }, [isMapLoaded, setupHandlers]);

  const deselectZeichen = useCallback(() => selectZeichen(null), [selectZeichen]);

  return { isDragging: isDraggingRef.current, selectedZeichenId, deselectZeichen };
}
