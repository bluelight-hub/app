import { beforeEach, describe, expect, it } from 'vitest';
import { createUndoId, undoActions, undoStore, type UndoableAction } from '../undo.store';

function makeAction(overrides: Partial<UndoableAction>): UndoableAction {
  return {
    id: overrides.id ?? createUndoId(),
    kind: overrides.kind ?? 'create',
    timestamp: overrides.timestamp ?? Date.now(),
    einsatzId: overrides.einsatzId ?? 'e1',
    before: overrides.before,
    after: overrides.after,
  };
}

describe('undoStore', () => {
  beforeEach(() => {
    undoActions.clearAll();
  });

  it('push fügt Action ans Ende des Stacks', () => {
    const a1 = makeAction({ kind: 'create' });
    const a2 = makeAction({ kind: 'delete' });
    undoActions.push(a1);
    undoActions.push(a2);
    expect(undoStore.state.stack.map((a) => a.id)).toEqual([a1.id, a2.id]);
  });

  it('pop liefert die neueste Action und entfernt sie', () => {
    const a1 = makeAction({ kind: 'create' });
    const a2 = makeAction({ kind: 'delete' });
    undoActions.push(a1);
    undoActions.push(a2);
    const popped = undoActions.pop();
    expect(popped?.id).toBe(a2.id);
    expect(undoStore.state.stack.map((a) => a.id)).toEqual([a1.id]);
  });

  it('pop auf leerem Stack liefert null', () => {
    expect(undoActions.pop()).toBeNull();
  });

  it('remove entfernt gezielt nach ID', () => {
    const a1 = makeAction({ kind: 'create' });
    const a2 = makeAction({ kind: 'delete' });
    undoActions.push(a1);
    undoActions.push(a2);
    undoActions.remove(a1.id);
    expect(undoStore.state.stack.map((a) => a.id)).toEqual([a2.id]);
  });

  it('remove auf unbekannter ID ist no-op', () => {
    const a1 = makeAction({ kind: 'create' });
    undoActions.push(a1);
    const ref = undoStore.state;
    undoActions.remove('unknown-id');
    expect(undoStore.state).toBe(ref);
  });

  it('clearAll leert den Stack', () => {
    undoActions.push(makeAction({ kind: 'create' }));
    undoActions.clearAll();
    expect(undoStore.state.stack).toHaveLength(0);
  });

  it('createUndoId liefert eindeutige IDs (Smoke)', () => {
    const set = new Set([createUndoId(), createUndoId(), createUndoId()]);
    expect(set.size).toBe(3);
  });
});
