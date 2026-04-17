/**
 * undoStore (Issue #627, G5)
 *
 * Client-State für das 30 s-Undo-Fenster auf Gefahrenzone-Mutationen.
 * Jede erfolgreiche Create/Update-Geometry/Delete-Mutation pusht eine
 * `UndoableAction` auf den Stack; nach 30 s Lebenszeit wird sie vom
 * `useGefahrenzoneUndo`-Hook automatisch entfernt.
 *
 * Kein Server-Undo-Command — Undo ruft die bestehenden Mutations mit dem
 * vorigen Zustand erneut auf. Siehe ADR-bezogene Notiz in Spec G5.
 */

import { createStore } from '@tanstack/react-store';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

export type UndoableActionKind = 'create' | 'update-geometry' | 'delete';

export interface UndoableAction {
  /** Stabile Action-ID (UUID-lite, reicht Timestamp+Kind). */
  id: string;
  kind: UndoableActionKind;
  timestamp: number;
  /** Einsatz, zu dem die Zone gehörte — nötig, um die richtige Query zu invalidieren. */
  einsatzId: string;
  /** Snapshot vor der Mutation (für `update-geometry` + `delete`). */
  before?: GefahrenzoneDto;
  /** Snapshot nach der Mutation (für `create` + `update-geometry`). */
  after?: GefahrenzoneDto;
}

export interface UndoState {
  stack: UndoableAction[];
}

const initialState: UndoState = { stack: [] };

export const undoStore = createStore<UndoState>(initialState);

export const undoActions = {
  push(action: UndoableAction): void {
    undoStore.setState((s) => ({ stack: [...s.stack, action] }));
  },
  /** Entfernt die neueste Action und liefert sie zurück (`null`, wenn leer). */
  pop(): UndoableAction | null {
    const current = undoStore.state.stack;
    if (current.length === 0) return null;
    const action = current[current.length - 1];
    undoStore.setState((s) => ({ stack: s.stack.slice(0, -1) }));
    return action;
  },
  /** Entfernt eine Action per ID (Timer-Ablauf oder Redo-Anwendung). */
  remove(id: string): void {
    undoStore.setState((s) => {
      const next = s.stack.filter((a) => a.id !== id);
      return next.length === s.stack.length ? s : { stack: next };
    });
  },
  clearAll(): void {
    undoStore.setState((s) => (s.stack.length === 0 ? s : { stack: [] }));
  },
};

/** Erzeugt eine neue Action-ID — deterministisch genug für Tests. */
export function createUndoId(): string {
  return `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
