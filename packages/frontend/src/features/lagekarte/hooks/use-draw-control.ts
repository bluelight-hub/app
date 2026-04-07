/**
 * Core Draw-Control Hook für die Lagekarte
 *
 * Verwaltet den gesamten MapboxDraw-Lifecycle: Initialisierung, Events,
 * Undo/Redo, Auto-Save und Keyboard-Shortcuts.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { FeatureCollection } from 'geojson';
import { useStore } from '@tanstack/react-store';
import { drawStore, setDrawMode, setSelectedFeatures } from '../stores/draw.store';
import { useSaveLagekarteState } from '../api/use-save-lagekarte-state';
import { useLagekarte } from '../api/use-lagekarte';
import { DRAW_FEATURE_LIMIT } from '../utils/map-config';
import { CUSTOM_DRAW_STYLES } from '../drawing/draw-styles';
import { FreehandMode } from '../drawing/custom-modes/freehand.mode';
import type { DrawMode } from '../drawing/types';

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
}

/** Leere FeatureCollection als Fallback */
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Verwaltet MapboxDraw-Lifecycle, Events, Undo/Redo und Auto-Save
 *
 * @param options - Konfiguration für den Draw-Control
 * @returns API zum Steuern des Zeichenmodus
 */
export function useDrawControl({ mapRef, einsatzId, canDraw, isMapLoaded }: UseDrawControlOptions): UseDrawControlReturn {
  const drawRef = useRef<MapboxDraw | null>(null);
  const undoStack = useRef<FeatureCollection[]>([]);
  const redoStack = useRef<FeatureCollection[]>([]);
  const isUndoInProgress = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /**
   * Undo/Redo-Stack-Status aktualisieren
   */
  const updateStackState = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  /**
   * Aktuellen Zustand als Snapshot auf den Undo-Stack pushen
   */
  const pushUndoSnapshot = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const snapshot = draw.getAll() as FeatureCollection;
    undoStack.current.push(snapshot);

    // Stack-Tiefe begrenzen
    if (undoStack.current.length > MAX_UNDO_DEPTH) {
      undoStack.current.shift();
    }

    // Redo-Stack leeren bei neuer Aktion
    redoStack.current = [];
    updateStackState();
  }, [updateStackState]);

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

    // ----------------------------------------
    // Event-Handler
    // ----------------------------------------
    const handleCreate = () => {
      if (isUndoInProgress.current) return;

      // Feature-Limit prüfen
      const allFeatures = draw.getAll();
      if (allFeatures.features.length > DRAW_FEATURE_LIMIT) {
        const lastFeature = allFeatures.features.at(-1);
        if (lastFeature?.id) {
          draw.delete(String(lastFeature.id));
        }
        console.warn(`Feature-Limit (${DRAW_FEATURE_LIMIT}) erreicht. Neues Feature wurde entfernt.`);
        return;
      }

      pushUndoSnapshot();
      scheduleAutoSave();
    };

    const handleUpdate = () => {
      if (isUndoInProgress.current) return;
      pushUndoSnapshot();
      scheduleAutoSave();
    };

    const handleDelete = () => {
      if (isUndoInProgress.current) return;
      pushUndoSnapshot();
      scheduleAutoSave();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionChange = (e: any) => {
      const ids = (e.features ?? []).map((f: { id?: string }) => String(f.id ?? ''));
      setSelectedFeatures(ids);
    };

    map.on('draw.create', handleCreate);
    map.on('draw.update', handleUpdate);
    map.on('draw.delete', handleDelete);
    map.on('draw.selectionchange', handleSelectionChange);

    return () => {
      // Timer aufräumen
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      // Event-Handler entfernen
      map.off('draw.create', handleCreate);
      map.off('draw.update', handleUpdate);
      map.off('draw.delete', handleDelete);
      map.off('draw.selectionchange', handleSelectionChange);

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
    // pushUndoSnapshot und scheduleAutoSave sind stabile Callbacks,
    // aber wir listen sie trotzdem für Korrektheit
  }, [isMapLoaded, canDraw, mapRef, pushUndoSnapshot, scheduleAutoSave]);

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
        deleteSelected();
        return;
      }

      // Ctrl/Cmd+Shift+Z → Redo
      if (isMeta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl/Cmd+Z → Undo
      if (isMeta && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- undo/redo sind stabile Refs
  }, []);

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

    pushUndoSnapshot();
    draw.trash();
    scheduleAutoSave();
  }, [pushUndoSnapshot, scheduleAutoSave]);

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

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    deleteSelected,
    setMode,
    getFeatures,
  };
}
