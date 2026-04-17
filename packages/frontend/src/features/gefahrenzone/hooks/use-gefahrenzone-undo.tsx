/**
 * useGefahrenzoneUndo (Issue #627, G5)
 *
 * Registriert den globalen `cmd+z`-Shortcut und kapselt:
 *
 * - `recordCreate / recordUpdateGeometry / recordDelete` — nach jeder
 *   erfolgreichen Mutation aufrufen, pusht eine UndoableAction auf den
 *   Stack + startet den 30 s-Timer.
 * - `cmd+z` — pop-t die neueste Action, ruft die passende Revert-Mutation,
 *   zeigt einen „Aktion zurückgenommen · Wiederherstellen"-Toast (30 s).
 * - Redo — ruft die ursprüngliche Mutation erneut auf.
 * - Stale-Handling — wenn die Revert-Mutation fehlschlägt (z. B. Zone
 *   zwischenzeitlich gelöscht), wird ein Error-Toast gezeigt.
 *
 * Offline-Schutz: `cmd+z` ist deaktiviert, wenn `navigator.onLine === false`.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { useCreateGefahrenzone, useDeleteGefahrenzone, useUpdateGefahrenzoneGeometry } from '../api/mutations';
import { createUndoId, undoActions, undoStore, type UndoableAction } from '../stores/undo.store';

const UNDO_WINDOW_MS = 30_000;

export interface UseGefahrenzoneUndoReturn {
  recordCreate: (einsatzId: string, after: GefahrenzoneDto) => void;
  recordUpdateGeometry: (einsatzId: string, before: GefahrenzoneDto, after: GefahrenzoneDto) => void;
  recordDelete: (einsatzId: string, before: GefahrenzoneDto) => void;
}

export function useGefahrenzoneUndo(): UseGefahrenzoneUndoReturn {
  const createMutation = useCreateGefahrenzone();
  const updateGeometryMutation = useUpdateGefahrenzoneGeometry();
  const deleteMutation = useDeleteGefahrenzone();

  // Timer-Registry, damit wir pro Action den Timer wieder löschen können,
  // falls die Action manuell entfernt wird.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleExpire = useCallback((id: string) => {
    const timer = setTimeout(() => {
      undoActions.remove(id);
      timersRef.current.delete(id);
    }, UNDO_WINDOW_MS);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);

  const applyRedo = useCallback(
    (action: UndoableAction) => {
      // Die Original-Aktion erneut ausführen (Redo). Toast-Callback nach Revert.
      if (action.kind === 'create' && action.after) {
        createMutation.mutate(
          {
            einsatzId: action.einsatzId,
            data: {
              gefahrentyp: action.after.gefahrentyp,
              schutzobjekt: action.after.schutzobjekt,
              geometryType: action.after.geometryType,
              geometry: action.after.geometry,
              bezeichnung: action.after.bezeichnung ?? undefined,
            },
          },
          {
            onError: () => toast.error('Wiederherstellen fehlgeschlagen — Zone konnte nicht erneut angelegt werden.'),
          },
        );
        return;
      }
      if (action.kind === 'update-geometry' && action.after) {
        updateGeometryMutation.mutate(
          { einsatzId: action.einsatzId, zoneId: action.after.id, data: { geometry: action.after.geometry } },
          { onError: () => toast.error('Wiederherstellen fehlgeschlagen — Geometrie konnte nicht wiederhergestellt werden.') },
        );
        return;
      }
      if (action.kind === 'delete' && action.before) {
        deleteMutation.mutate({ einsatzId: action.einsatzId, zoneId: action.before.id }, { onError: () => toast.error('Wiederherstellen fehlgeschlagen — Zone konnte nicht erneut gelöscht werden.') });
        return;
      }
    },
    [createMutation, updateGeometryMutation, deleteMutation],
  );

  const performUndo = useCallback(
    (action: UndoableAction) => {
      if (action.kind === 'create' && action.after) {
        deleteMutation.mutate(
          { einsatzId: action.einsatzId, zoneId: action.after.id },
          {
            onError: () => toast.error('Undo nicht mehr möglich — Zone wurde zwischenzeitlich verändert.'),
          },
        );
        return;
      }
      if (action.kind === 'update-geometry' && action.before) {
        updateGeometryMutation.mutate(
          { einsatzId: action.einsatzId, zoneId: action.before.id, data: { geometry: action.before.geometry } },
          { onError: () => toast.error('Undo nicht mehr möglich — Zone wurde zwischenzeitlich verändert.') },
        );
        return;
      }
      if (action.kind === 'delete' && action.before) {
        createMutation.mutate(
          {
            einsatzId: action.einsatzId,
            data: {
              gefahrentyp: action.before.gefahrentyp,
              schutzobjekt: action.before.schutzobjekt,
              geometryType: action.before.geometryType,
              geometry: action.before.geometry,
              bezeichnung: action.before.bezeichnung ?? undefined,
            },
          },
          { onError: () => toast.error('Undo nicht mehr möglich — Zone konnte nicht wiederhergestellt werden.') },
        );
        return;
      }
    },
    [createMutation, updateGeometryMutation, deleteMutation],
  );

  useHotkeys(
    'mod+z',
    (event) => {
      event.preventDefault();
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.info('Undo offline nicht verfügbar — stelle die Netzverbindung wieder her.');
        return;
      }
      const action = undoActions.pop();
      if (!action) return;
      clearTimer(action.id);
      performUndo(action);
      toast('Aktion zurückgenommen', {
        description: 'Wiederherstellen innerhalb von 30 Sekunden möglich.',
        duration: UNDO_WINDOW_MS,
        action: {
          label: 'Wiederherstellen',
          onClick: () => applyRedo(action),
        },
      });
    },
    {
      enableOnFormTags: false,
      preventDefault: true,
    },
  );

  const recordCreate = useCallback(
    (einsatzId: string, after: GefahrenzoneDto) => {
      const id = createUndoId();
      undoActions.push({ id, kind: 'create', timestamp: Date.now(), einsatzId, after });
      scheduleExpire(id);
    },
    [scheduleExpire],
  );

  const recordUpdateGeometry = useCallback(
    (einsatzId: string, before: GefahrenzoneDto, after: GefahrenzoneDto) => {
      const id = createUndoId();
      undoActions.push({ id, kind: 'update-geometry', timestamp: Date.now(), einsatzId, before, after });
      scheduleExpire(id);
    },
    [scheduleExpire],
  );

  const recordDelete = useCallback(
    (einsatzId: string, before: GefahrenzoneDto) => {
      const id = createUndoId();
      undoActions.push({ id, kind: 'delete', timestamp: Date.now(), einsatzId, before });
      scheduleExpire(id);
    },
    [scheduleExpire],
  );

  // Store-Änderungen externer Herkunft (z. B. `clearAll`) müssen die Timer
  // mitaufräumen. Wir subscriben und gleichen ab.
  useEffect(() => {
    const subscription = undoStore.subscribe(() => {
      const stackIds = new Set(undoStore.state.stack.map((a) => a.id));
      for (const id of Array.from(timersRef.current.keys())) {
        if (!stackIds.has(id)) {
          clearTimer(id);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [clearTimer]);

  return { recordCreate, recordUpdateGeometry, recordDelete };
}
