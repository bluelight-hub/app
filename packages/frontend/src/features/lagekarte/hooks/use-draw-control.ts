/**
 * Core Draw-Control Hook für die Lagekarte
 *
 * Verwaltet den gesamten MapboxDraw-Lifecycle: Initialisierung, Events,
 * Undo/Redo, Auto-Save und Keyboard-Shortcuts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, FeatureCollection } from 'geojson';
import { useStore } from '@tanstack/react-store';
import { drawStore, setDirectSelect, setDrawMode, setSelectedFeatures } from '../stores/draw.store';
import { useSaveLagekarteState } from '../api/use-save-lagekarte-state';
import { useLagekarte } from '../api/use-lagekarte';
import { DRAW_FEATURE_LIMIT } from '../utils/map-config';
import { CUSTOM_DRAW_STYLES, EMPTY_PATTERN_IMAGE } from '../drawing/draw-styles';
import { FreehandMode } from '../drawing/custom-modes/freehand.mode';
import { CircleMode } from '../drawing/custom-modes/circle.mode';
import { RectangleMode } from '../drawing/custom-modes/rectangle.mode';
import { SectorMode } from '../drawing/custom-modes/sector.mode';
import { ArrowMode } from '../drawing/custom-modes/arrow.mode';
import { EllipseMode } from '../drawing/custom-modes/ellipse.mode';
import { GamsMode } from '../drawing/custom-modes/gams.mode';
import { ContinuousPointMode } from '../drawing/custom-modes/continuous-point.mode';
import { CustomDirectSelect } from '../drawing/custom-modes/direct-select.mode';
import { CustomSimpleSelect } from '../drawing/custom-modes/simple-select.mode';
import type { DrawMode, DrawingStyle } from '../drawing/types';
import { ensureHatchImage } from '../drawing/hatch-patterns';
import { registerArrowHeadImage } from '../drawing/arrow-head-image';
import { toggleSnapEnabled } from '../stores/draw.store';

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

/** Maximale Undo-Stack-Tiefe */
const MAX_UNDO_DEPTH = 50;

/** Debounce-Verzögerung für Auto-Save in ms */
const AUTO_SAVE_DELAY = 2000;

/**
 * Mapping von DrawMode auf MapboxDraw-interne Modusnamen
 */
const DRAW_MODE_MAP: Record<DrawMode, string> = {
  idle: 'simple_select',
  select: 'simple_select',
  draw_point: 'draw_continuous_point',
  draw_line_string: 'draw_line_string',
  draw_polygon: 'draw_polygon',
  draw_freehand: 'draw_freehand',
  draw_text: 'draw_point',
  osm_mark: 'simple_select',
  draw_circle: 'draw_circle',
  draw_rectangle: 'draw_rectangle',
  draw_sector: 'draw_sector',
  draw_arrow: 'draw_arrow',
  draw_ellipse: 'draw_ellipse',
  draw_symbol: 'draw_point',
  draw_gams: 'draw_gams',
};

interface UseDrawControlOptions {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Einsatz-ID für Persistierung */
  einsatzId: string;
  /** Ob der Nutzer Zeichnen darf */
  canDraw: boolean;
  /** Ob die Karte vollständig geladen ist */
  isMapLoaded: boolean;
  /** Ref auf den aktuellen Zeichenstil (wird auf neue Features angewendet) */
  activeStyleRef: React.RefObject<DrawingStyle>;
  /** Flag das anzeigt ob gerade ein Remote-Update angewendet wird (WS-Sync) */
  isRemoteApplyRef?: React.RefObject<boolean>;
  /** Callback zum Senden von Feature-Deltas über WebSocket */
  sendDelta?: (type: 'create' | 'update' | 'delete', payload: { features?: GeoJSON.Feature[]; featureIds?: string[] }) => void;
  /** Ref auf das aktuell ausgewählte Symbol für Platzierung */
  pendingSymbolRef?: React.RefObject<{ id: string; category: string } | null>;
}

interface UseDrawControlReturn {
  /** Letzte Aktion rückgängig machen */
  undo: () => void;
  /** Rückgängig gemachte Aktion wiederherstellen */
  redo: () => void;
  /** Ob Undo verfügbar ist */
  canUndo: boolean;
  /** Ob Redo verfügbar ist */
  canRedo: boolean;
  /** Ausgewählte Features löschen */
  deleteSelected: () => void;
  /** Zeichenmodus setzen */
  setMode: (mode: DrawMode) => void;
  /** Alle aktuellen Features als FeatureCollection */
  getFeatures: () => FeatureCollection;
  /** Referenz auf die MapboxDraw-Instanz (für externe Nutzung, z.B. OSM-Markierung) */
  drawRef: React.RefObject<MapboxDraw | null>;
  /** Auto-Save mit Debounce auslösen */
  scheduleAutoSave: () => void;
}

/** Leere FeatureCollection als Fallback */
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Verwaltet MapboxDraw-Lifecycle, Events, Undo/Redo und Auto-Save
 *
 * @param options - Konfiguration für den Draw-Control
 * @returns API zum Steuern des Zeichenmodus
 */
export function useDrawControl({ mapRef, einsatzId, canDraw, isMapLoaded, activeStyleRef, isRemoteApplyRef, sendDelta, pendingSymbolRef }: UseDrawControlOptions): UseDrawControlReturn {
  const drawRef = useRef<MapboxDraw | null>(null);
  const undoStack = useRef<FeatureCollection[]>([]);
  const redoStack = useRef<FeatureCollection[]>([]);
  const isUndoInProgress = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Letzter bekannter State VOR der aktuellen Änderung (für korrektes Undo) */
  const lastKnownStateRef = useRef<FeatureCollection>(EMPTY_FC);
  /** Flag: Initiale Backend-Daten wurden in MapboxDraw geladen */
  const initialDataLoadedRef = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const drawMode = useStore(drawStore, (s) => s.drawMode);

  const { data: lagekarte } = useLagekarte(einsatzId);
  const { mutate: saveState } = useSaveLagekarteState(einsatzId);

  // Ref für saveState (vermeidet Stale-Closure UND verhindert dass der
  // Haupt-Effect bei Identitäts-Wechsel von useMutation.mutate neu läuft)
  const saveStateRef = useRef(saveState);
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  // Referenz auf lagekarte.state für Initialisierung (vermeidet Stale-Closure)
  const initialStateRef = useRef<FeatureCollection | null>(null);
  useEffect(() => {
    if (lagekarte?.state) {
      initialStateRef.current = lagekarte.state;
    }
  }, [lagekarte?.state]);

  // Ref für aktuellen drawMode (vermeidet Stale-Closure in Event-Handlern)
  const drawModeRef = useRef(drawMode);
  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  // Ref für sendDelta (vermeidet Stale-Closure in Event-Handlern)
  const sendDeltaRef = useRef(sendDelta);
  useEffect(() => {
    sendDeltaRef.current = sendDelta;
  }, [sendDelta]);

  /**
   * Undo/Redo-Stack-Status aktualisieren
   */
  const updateStackState = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  /**
   * Auto-Save mit Debounce auslösen
   */
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const draw = drawRef.current;
      if (!draw) return;
      saveStateRef.current(draw.getAll() as FeatureCollection);
    }, AUTO_SAVE_DELAY);
  }, []);

  // ============================================
  // MapboxDraw Initialisierung & Cleanup
  // ============================================
  useEffect(() => {
    if (!isMapLoaded || !canDraw || !mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    // Fallback-Image und styleimagemissing Handler VOR addControl registrieren:
    // MapboxDraw ruft beim addControl synchron addLayers → Store.render → setData
    // auf, was MapLibre's Worker triggert. Fehlende Sprite-Images (z.B. "circle-11"
    // aus dem Base-Style) werden mit styleimagemissing abgefangen.
    if (!map.hasImage(EMPTY_PATTERN_IMAGE)) {
      map.addImage(EMPTY_PATTERN_IMAGE, { width: 1, height: 1, data: new Uint8Array(4) });
    }
    registerArrowHeadImage(map);
    const handleMissingImage = (e: { id: string }) => {
      if (!map.hasImage(e.id)) {
        map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      }
    };
    map.on('styleimagemissing', handleMissingImage);

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      userProperties: true,
      modes: {
        ...MapboxDraw.modes,
        simple_select: CustomSimpleSelect,
        direct_select: CustomDirectSelect,
        draw_continuous_point: ContinuousPointMode,
        draw_freehand: FreehandMode,
        draw_circle: CircleMode,
        draw_rectangle: RectangleMode,
        draw_sector: SectorMode,
        draw_arrow: ArrowMode,
        draw_ellipse: EllipseMode,
        draw_gams: GamsMode,
      },
      styles: CUSTOM_DRAW_STYLES,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.addControl(draw as any);
    drawRef.current = draw;

    // Workaround: MapboxDraw v1.5.x deferred addLayers() wenn map.loaded() === false.
    // react-map-gl feuert onLoad (→ isMapLoaded) bei MapLibre's "load"-Event,
    // aber map.loaded() kann danach noch false sein (Tiles noch nicht fertig geladen).
    // MapboxDraw's interner Polling-Interval (16ms) erstellt die Sources erst wenn
    // map.loaded() === true (~2s). Bis dahin verwirft render() alle dirty-States
    // (render.js Zeile 6-7: "if (!mapExists) return cleanup()"), sodass draw.add()
    // Features zwar im JS-Store landen, aber nie in die MapLibre-Sources geschrieben werden.
    // Fix: Sobald die Sources erscheinen, erzwingen wir einen vollständigen Re-Render.
    const drawSourcesExist = !!map.getSource('mapbox-gl-draw-cold');
    let waitForSourcesInterval: ReturnType<typeof setInterval> | null = null;
    if (!drawSourcesExist) {
      waitForSourcesInterval = setInterval(() => {
        if (map.getSource('mapbox-gl-draw-cold') && draw.getAll().features.length > 0) {
          clearInterval(waitForSourcesInterval!);
          waitForSourcesInterval = null;
          // Vollständigen Re-Render erzwingen: draw.set() ersetzt die gesamte
          // FeatureCollection und schreibt direkt in die MapLibre-Sources.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          draw.set(draw.getAll() as any);
        }
      }, 100);
      // Sicherheit: nach 10s aufhören zu pollen
      setTimeout(() => {
        if (waitForSourcesInterval) clearInterval(waitForSourcesInterval);
      }, 10_000);
    }

    // Initialen State aus Backend laden (falls API-Daten bereits verfügbar)
    const initialData = initialStateRef.current;
    if (initialData?.features?.length) {
      // Hatch-Images VOR draw.add() registrieren — sonst versucht MapLibre
      // fill-pattern Expressions auf nicht-existierende Sprite-Images aufzulösen,
      // was den Render-Pfad crasht ("undefined is not an object (evaluating 't[n][0]')").
      for (const feature of initialData.features) {
        const props = feature.properties;
        if (!props?.hatch) continue;
        try {
          const hatchConfig = typeof props.hatch === 'string' ? JSON.parse(props.hatch) : props.hatch;
          if (hatchConfig.type && hatchConfig.type !== 'none') {
            const fallbackColor = props.color ?? '#000000';
            ensureHatchImage(map, hatchConfig, fallbackColor);
          }
        } catch {
          // Ungültiges JSON — überspringen
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draw.add(initialData as any);
      initialDataLoadedRef.current = true;

      // Repaint erzwingen: draw.add() rendert Features nicht sofort wenn die
      // Draw-Sources noch nicht vollständig registriert sind.
      // draw.set() ersetzt die gesamte FeatureCollection und erzwingt Source-Update.
      setTimeout(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          draw.set(draw.getAll() as any);
        } catch {
          // Draw könnte bereits entfernt sein
        }
      }, 50);
    } else {
      initialDataLoadedRef.current = false;
    }

    // Initialen Snapshot für Undo
    undoStack.current = [];
    redoStack.current = [];
    lastKnownStateRef.current = draw.getAll() as FeatureCollection;

    // ----------------------------------------
    // Event-Handler
    // ----------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreate = (e: any) => {
      if (isUndoInProgress.current) return;
      if (isRemoteApplyRef?.current) return;

      // Feature-Limit prüfen
      const allFeatures = draw.getAll();
      if (allFeatures.features.length > DRAW_FEATURE_LIMIT) {
        const newFeatureId = e.features?.[0]?.id;
        if (newFeatureId) {
          draw.delete(String(newFeatureId));
        }
        console.warn(`Feature-Limit (${DRAW_FEATURE_LIMIT}) erreicht. Neues Feature wurde entfernt.`);
        return;
      }

      // Aktuellen Stil auf das neue Feature anwenden
      // GAMS-Zonen und Symbole bringen eigene Properties mit → Style-Override überspringen
      const isGamsMode = drawModeRef.current === 'draw_gams';
      const isSymbolMode = drawModeRef.current === 'draw_symbol';
      if (e.features?.length > 0 && !isGamsMode) {
        const featureId = String(e.features[0].id);

        // Symbol-Modus: Nur Symbol-Properties setzen, keine Zeichnungsstile
        if (isSymbolMode && pendingSymbolRef?.current) {
          draw.setFeatureProperty(featureId, 'featureType', 'symbol');
          draw.setFeatureProperty(featureId, 'symbolId', pendingSymbolRef.current.id);
          draw.setFeatureProperty(featureId, 'symbolCategory', pendingSymbolRef.current.category);
          pendingSymbolRef.current = null;
        } else {
          // Standard-Zeichnungsstile anwenden
          const currentStyle = activeStyleRef.current;
          draw.setFeatureProperty(featureId, 'color', currentStyle.color);
          draw.setFeatureProperty(featureId, 'fillColor', currentStyle.fillColor);
          draw.setFeatureProperty(featureId, 'strokeWidth', currentStyle.strokeWidth);
          draw.setFeatureProperty(featureId, 'fillEnabled', currentStyle.fillEnabled);
          draw.setFeatureProperty(featureId, 'fillOpacity', currentStyle.fillOpacity);
          draw.setFeatureProperty(featureId, 'hatch', JSON.stringify(currentStyle.hatch));
          const map = mapRef.current?.getMap();
          const imageName = ensureHatchImage(map, currentStyle.hatch, currentStyle.color);
          draw.setFeatureProperty(featureId, 'fillPattern', imageName);
          draw.setFeatureProperty(featureId, 'featureType', 'drawing');

          // Text-Modus: Standard-Label setzen
          if (drawModeRef.current === 'draw_text') {
            draw.setFeatureProperty(featureId, 'label', 'Text');
            setSelectedFeatures([featureId]);
          }
        }
      }

      // Undo-Snapshot: State VOR der Änderung auf den Stack pushen
      undoStack.current.push(lastKnownStateRef.current);
      if (undoStack.current.length > MAX_UNDO_DEPTH) undoStack.current.shift();
      redoStack.current = [];
      lastKnownStateRef.current = draw.getAll() as FeatureCollection;
      updateStackState();
      scheduleAutoSave();

      // Delta an andere Clients senden (nach Undo-Snapshot)
      if (e.features?.[0]) {
        const createdFeature = draw.get(String(e.features[0].id));
        if (createdFeature) {
          sendDeltaRef.current?.('create', { features: [createdFeature as Feature] });
        }
      }

      // Zeichenmodus nach Feature-Erstellung erneut aktivieren (kontinuierliches Zeichnen).
      // Text-Modus ausgenommen: Feature bleibt selektiert für Label-Bearbeitung.
      const currentMode = drawModeRef.current;
      const continuousModes: DrawMode[] = ['draw_line_string', 'draw_polygon', 'draw_freehand', 'draw_circle', 'draw_rectangle', 'draw_sector', 'draw_arrow', 'draw_ellipse'];
      if (continuousModes.includes(currentMode)) {
        const targetMapboxMode = DRAW_MODE_MAP[currentMode];
        setTimeout(() => {
          try {
            draw.changeMode(targetMapboxMode);
          } catch {
            // Draw-Instanz könnte bereits entfernt sein
          }
        }, 0);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdate = (e: any) => {
      if (isUndoInProgress.current) return;
      if (isRemoteApplyRef?.current) return;
      undoStack.current.push(lastKnownStateRef.current);
      if (undoStack.current.length > MAX_UNDO_DEPTH) undoStack.current.shift();
      redoStack.current = [];
      lastKnownStateRef.current = draw.getAll() as FeatureCollection;
      updateStackState();
      scheduleAutoSave();

      // Delta an andere Clients senden (nach Undo-Snapshot)
      if (e.features?.length) {
        sendDeltaRef.current?.('update', { features: e.features as Feature[] });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDelete = (e: any) => {
      if (isUndoInProgress.current) return;
      if (isRemoteApplyRef?.current) return;
      undoStack.current.push(lastKnownStateRef.current);
      if (undoStack.current.length > MAX_UNDO_DEPTH) undoStack.current.shift();
      redoStack.current = [];
      lastKnownStateRef.current = draw.getAll() as FeatureCollection;
      updateStackState();
      scheduleAutoSave();

      // Delta an andere Clients senden (nach Undo-Snapshot)
      if (e.features?.length) {
        sendDeltaRef.current?.('delete', { featureIds: e.features.map((f: { id?: string }) => String(f.id ?? '')) });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionChange = (e: any) => {
      const ids = (e.features ?? []).map((f: { id?: string }) => String(f.id ?? ''));
      setSelectedFeatures(ids);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleModeChange = (e: any) => {
      setDirectSelect(e.mode === 'direct_select');
    };

    map.on('draw.create', handleCreate);
    map.on('draw.update', handleUpdate);
    map.on('draw.delete', handleDelete);
    map.on('draw.selectionchange', handleSelectionChange);
    map.on('draw.modechange', handleModeChange);

    // MapboxDraw's interne Key-Behandlung für Delete/Backspace blockieren.
    // Deletion wird ausschließlich über unseren deleteSelected Handler gesteuert
    // (draw.delete() + Mode-Reset statt draw.trash()).
    const mapContainer = map.getContainer();
    const blockDrawKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.stopImmediatePropagation();
      }
    };
    mapContainer.addEventListener('keyup', blockDrawKeyUp, true);

    return () => {
      // Deferred-Source-Polling stoppen
      if (waitForSourcesInterval) clearInterval(waitForSourcesInterval);

      // Ausstehenden Auto-Save sofort ausführen
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        const currentState = draw.getAll() as FeatureCollection;
        saveStateRef.current(currentState);
      }

      // Event-Handler entfernen
      map.off('draw.create', handleCreate);
      map.off('draw.update', handleUpdate);
      map.off('draw.delete', handleDelete);
      map.off('draw.selectionchange', handleSelectionChange);
      map.off('draw.modechange', handleModeChange);
      map.off('styleimagemissing', handleMissingImage);
      mapContainer.removeEventListener('keyup', blockDrawKeyUp, true);

      // Control entfernen
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.removeControl(draw as any);
      } catch {
        // Map könnte bereits zerstört sein
      }

      drawRef.current = null;
      undoStack.current = [];
      redoStack.current = [];
      initialDataLoadedRef.current = false;
      setCanUndo(false);
      setCanRedo(false);
    };
    // saveState wird via saveStateRef gelesen (Ref statt Dependency),
    // damit der Effect nicht bei Identitäts-Wechsel von useMutation.mutate neu läuft.
  }, [isMapLoaded, canDraw, mapRef, updateStackState, scheduleAutoSave]);

  // ============================================
  // Nachträgliches Laden: API-Daten kamen NACH MapboxDraw-Init
  // (Race Condition: Map lädt schneller als API-Call)
  // ============================================
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || initialDataLoadedRef.current) return;
    if (!lagekarte?.state?.features?.length) return;
    // Hatch-Images VOR draw.add() registrieren (siehe Kommentar oben)
    const map = mapRef.current?.getMap();
    if (map) {
      for (const feature of lagekarte.state.features) {
        const props = feature.properties;
        if (!props?.hatch) continue;
        try {
          const hatchConfig = typeof props.hatch === 'string' ? JSON.parse(props.hatch) : props.hatch;
          if (hatchConfig.type && hatchConfig.type !== 'none') {
            const fallbackColor = props.color ?? '#000000';
            ensureHatchImage(map, hatchConfig, fallbackColor);
          }
        } catch {
          // Ungültiges JSON — überspringen
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draw.add(lagekarte.state as any);
    initialDataLoadedRef.current = true;
    lastKnownStateRef.current = draw.getAll() as FeatureCollection;

    // Repaint erzwingen: Wenn Sources bereits existieren, reicht draw.set().
    // Falls Sources noch nicht erstellt (map.loaded() war false bei addControl),
    // wird der Workaround-Interval aus Phase 1 den Render übernehmen.
    if (map && map.getSource('mapbox-gl-draw-cold')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        draw.set(draw.getAll() as any);
      } catch {
        // Draw könnte noch nicht bereit sein
      }
    }
  }, [lagekarte?.state, mapRef]);

  // ============================================
  // Modus-Synchronisierung: Store → MapboxDraw
  // ============================================
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const targetMode = DRAW_MODE_MAP[drawMode];
    if (!targetMode) return;

    try {
      draw.changeMode(targetMode);
    } catch {
      // Modus-Wechsel kann fehlschlagen wenn Draw nicht bereit ist
    }
  }, [drawMode]);

  // ============================================
  // Öffentliche API
  // ============================================

  /**
   * Rückgängig: Letzten Snapshot wiederherstellen
   */
  const undo = useCallback(() => {
    const draw = drawRef.current;
    if (!draw || undoStack.current.length === 0) return;

    isUndoInProgress.current = true;

    // Aktuellen Zustand auf Redo-Stack
    const current = draw.getAll() as FeatureCollection;
    redoStack.current.push(current);

    // Vorherigen Zustand wiederherstellen
    const prev = undoStack.current.pop()!;
    draw.deleteAll();
    if (prev.features.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draw.add(prev as any);
    }

    lastKnownStateRef.current = draw.getAll() as FeatureCollection;
    isUndoInProgress.current = false;
    updateStackState();
    scheduleAutoSave();
  }, [updateStackState, scheduleAutoSave]);

  /**
   * Wiederherstellen: Redo-Snapshot anwenden
   */
  const redo = useCallback(() => {
    const draw = drawRef.current;
    if (!draw || redoStack.current.length === 0) return;

    isUndoInProgress.current = true;

    // Aktuellen Zustand auf Undo-Stack
    const current = draw.getAll() as FeatureCollection;
    undoStack.current.push(current);

    // Nächsten Zustand wiederherstellen
    const next = redoStack.current.pop()!;
    draw.deleteAll();
    if (next.features.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draw.add(next as any);
    }

    lastKnownStateRef.current = draw.getAll() as FeatureCollection;
    isUndoInProgress.current = false;
    updateStackState();
    scheduleAutoSave();
  }, [updateStackState, scheduleAutoSave]);

  /**
   * Ausgewählte Features löschen
   *
   * Nuklearer Ansatz: Statt draw.trash() oder draw.delete() (die beide
   * Timing-Probleme mit MapboxDraw's RAF-basiertem Render haben), wird der
   * gesamte Draw-State durch draw.set() ersetzt. Das erzwingt einen
   * vollständigen Source-Update ohne Ghost-Features.
   */
  const deleteSelected = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const selected = draw.getSelectedIds();
    if (selected.length === 0) return;

    // Undo-Snapshot: State VOR dem Löschen
    undoStack.current.push(lastKnownStateRef.current);
    if (undoStack.current.length > MAX_UNDO_DEPTH) undoStack.current.shift();
    redoStack.current = [];

    // Remaining Features ohne die selektierten berechnen
    const selectedSet = new Set(selected.map(String));
    const allFeatures = draw.getAll() as FeatureCollection;
    const remaining: FeatureCollection = {
      type: 'FeatureCollection',
      features: allFeatures.features.filter((f) => !selectedSet.has(String(f.id))),
    };

    // Nuklear: draw.set() ersetzt den gesamten State und erzwingt Full-Render.
    // isUndoInProgress verhindert, dass handleCreate/handleDelete den Undo-Stack
    // doppelt befüllen (draw.set löst intern add/delete Events aus).
    isUndoInProgress.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draw.set(remaining as any);
    } catch {
      // Fallback: direkt löschen falls set() fehlschlägt
      draw.delete(selected);
    }
    isUndoInProgress.current = false;

    // MapboxDraw updated Sources per requestAnimationFrame (asynchron).
    // Bis der RAF feuert, sind die gelöschten Features noch in den MapLibre-Tiles
    // sichtbar und per queryRenderedFeatures klickbar ("Ghost-Features").
    // → Sources sofort synchron clearen, damit Klicks auf Ghost-Features unmöglich werden.
    // Der nächste RAF von draw.set() re-populiert die Sources korrekt.
    const map = mapRef.current?.getMap();
    if (map) {
      try {
        const emptyFC = { type: 'FeatureCollection' as const, features: [] as Feature[] };
        const hotSource = map.getSource('mapbox-gl-draw-hot');
        const coldSource = map.getSource('mapbox-gl-draw-cold');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (hotSource && 'setData' in hotSource) (hotSource as any).setData(emptyFC);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (coldSource && 'setData' in coldSource) (coldSource as any).setData(emptyFC);
      } catch {
        // Source könnte noch nicht registriert sein
      }
    }

    lastKnownStateRef.current = draw.getAll() as FeatureCollection;

    // React-Selection sofort clearen
    setSelectedFeatures([]);

    updateStackState();
    scheduleAutoSave();

    // Delta an andere Clients senden
    sendDeltaRef.current?.('delete', { featureIds: selected.map(String) });
  }, [updateStackState, scheduleAutoSave]);

  // ============================================
  // Refs für Keyboard-Shortcuts (C1: Stale-Closure vermeiden)
  // ============================================
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const deleteSelectedRef = useRef(deleteSelected);

  useEffect(() => {
    undoRef.current = undo;
  }, [undo]);
  useEffect(() => {
    redoRef.current = redo;
  }, [redo]);
  useEffect(() => {
    deleteSelectedRef.current = deleteSelected;
  }, [deleteSelected]);

  // ============================================
  // Keyboard-Shortcuts
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nicht in Eingabefeldern reagieren
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // S → Snap-Toggle (nur ohne Modifier)
      if (e.key === 's' && !isMeta && !e.shiftKey && !e.altKey) {
        toggleSnapEnabled();
        return;
      }

      // Escape → Idle-Modus
      if (e.key === 'Escape') {
        setDrawMode('idle');
        return;
      }

      // Delete / Backspace → Ausgewählte Features löschen
      // stopPropagation verhindert dass MapboxDraw's interner onKeyUp-Handler
      // zusätzlich trash() auf bereits gelöschte Features aufruft.
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedRef.current();
        return;
      }

      // Ctrl/Cmd+Shift+Z → Redo
      if (isMeta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redoRef.current();
        return;
      }

      // Ctrl/Cmd+Z → Undo
      if (isMeta && e.key === 'z') {
        e.preventDefault();
        undoRef.current();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Zeichenmodus setzen
   */
  const setMode = useCallback((mode: DrawMode) => {
    setDrawMode(mode);
  }, []);

  /**
   * Alle aktuellen Features als FeatureCollection zurückgeben
   */
  const getFeatures = useCallback((): FeatureCollection => {
    const draw = drawRef.current;
    if (!draw) return EMPTY_FC;
    return draw.getAll() as FeatureCollection;
  }, []);

  return useMemo(
    () => ({
      undo,
      redo,
      canUndo,
      canRedo,
      deleteSelected,
      setMode,
      getFeatures,
      drawRef,
      scheduleAutoSave,
    }),
    [undo, redo, canUndo, canRedo, deleteSelected, setMode, getFeatures, scheduleAutoSave],
  );
}
