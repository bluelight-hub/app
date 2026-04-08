/**
 * Core Draw-Control Hook für die Lagekarte
 *
 * Verwaltet den gesamten MapboxDraw-Lifecycle: Initialisierung, Events,
 * Undo/Redo, Auto-Save und Keyboard-Shortcuts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { FeatureCollection } from 'geojson';
import { useStore } from '@tanstack/react-store';
import { drawStore, setDirectSelect, setDrawMode, setSelectedFeatures } from '../stores/draw.store';
import { useSaveLagekarteState } from '../api/use-save-lagekarte-state';
import { useLagekarte } from '../api/use-lagekarte';
import { DRAW_FEATURE_LIMIT } from '../utils/map-config';
import { CUSTOM_DRAW_STYLES } from '../drawing/draw-styles';
import { FreehandMode } from '../drawing/custom-modes/freehand.mode';
import type { DrawMode, DrawingStyle } from '../drawing/types';
import { ensureHatchImage } from '../drawing/hatch-patterns';

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
  draw_point: 'draw_point',
  draw_line_string: 'draw_line_string',
  draw_polygon: 'draw_polygon',
  draw_freehand: 'draw_freehand',
  draw_text: 'draw_point',
  osm_mark: 'simple_select',
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
export function useDrawControl({ mapRef, einsatzId, canDraw, isMapLoaded, activeStyleRef }: UseDrawControlOptions): UseDrawControlReturn {
  const drawRef = useRef<MapboxDraw | null>(null);
  const undoStack = useRef<FeatureCollection[]>([]);
  const redoStack = useRef<FeatureCollection[]>([]);
  const isUndoInProgress = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Letzter bekannter State VOR der aktuellen Änderung (für korrektes Undo) */
  const lastKnownStateRef = useRef<FeatureCollection>(EMPTY_FC);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const drawMode = useStore(drawStore, (s) => s.drawMode);

  const { data: lagekarte } = useLagekarte(einsatzId);
  const { mutate: saveState } = useSaveLagekarteState(einsatzId);

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
      saveState(draw.getAll() as FeatureCollection);
    }, AUTO_SAVE_DELAY);
  }, [saveState]);

  // ============================================
  // MapboxDraw Initialisierung & Cleanup
  // ============================================
  useEffect(() => {
    if (!isMapLoaded || !canDraw || !mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      userProperties: true,
      modes: {
        ...MapboxDraw.modes,
        draw_freehand: FreehandMode,
      },
      styles: CUSTOM_DRAW_STYLES,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.addControl(draw as any);
    drawRef.current = draw;

    // Initialen State aus Backend laden
    const initialData = initialStateRef.current;
    if (initialData?.features?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draw.add(initialData as any);
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
      if (e.features?.length > 0) {
        const featureId = String(e.features[0].id);
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

      // Undo-Snapshot: State VOR der Änderung auf den Stack pushen
      undoStack.current.push(lastKnownStateRef.current);
      if (undoStack.current.length > MAX_UNDO_DEPTH) undoStack.current.shift();
      redoStack.current = [];
      lastKnownStateRef.current = draw.getAll() as FeatureCollection;
      updateStackState();
      scheduleAutoSave();

      // Zeichenmodus nach Feature-Erstellung erneut aktivieren (kontinuierliches Zeichnen).
      // Text-Modus ausgenommen: Feature bleibt selektiert für Label-Bearbeitung.
      const currentMode = drawModeRef.current;
      const continuousModes: DrawMode[] = ['draw_point', 'draw_line_string', 'draw_polygon', 'draw_freehand'];
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

    const handleUpdate = () => {
      if (isUndoInProgress.current) return;
      undoStack.current.push(lastKnownStateRef.current);
      if (undoStack.current.length > MAX_UNDO_DEPTH) undoStack.current.shift();
      redoStack.current = [];
      lastKnownStateRef.current = draw.getAll() as FeatureCollection;
      updateStackState();
      scheduleAutoSave();
    };

    const handleDelete = () => {
      if (isUndoInProgress.current) return;
      undoStack.current.push(lastKnownStateRef.current);
      if (undoStack.current.length > MAX_UNDO_DEPTH) undoStack.current.shift();
      redoStack.current = [];
      lastKnownStateRef.current = draw.getAll() as FeatureCollection;
      updateStackState();
      scheduleAutoSave();
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

    return () => {
      // Ausstehenden Auto-Save sofort ausführen
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        const currentState = draw.getAll() as FeatureCollection;
        saveState(currentState);
      }

      // Event-Handler entfernen
      map.off('draw.create', handleCreate);
      map.off('draw.update', handleUpdate);
      map.off('draw.delete', handleDelete);
      map.off('draw.selectionchange', handleSelectionChange);
      map.off('draw.modechange', handleModeChange);

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
      setCanUndo(false);
      setCanRedo(false);
    };
  }, [isMapLoaded, canDraw, mapRef, updateStackState, scheduleAutoSave, saveState]);

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

    draw.trash();

    lastKnownStateRef.current = draw.getAll() as FeatureCollection;
    updateStackState();
    scheduleAutoSave();
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

      // Escape → Idle-Modus
      if (e.key === 'Escape') {
        setDrawMode('idle');
        return;
      }

      // Delete / Backspace → Ausgewählte Features löschen
      if (e.key === 'Delete' || e.key === 'Backspace') {
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
