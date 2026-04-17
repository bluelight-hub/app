import { beforeEach, describe, expect, it } from 'vitest';
import { focusEquals, parseFocus, serializeFocus, splitViewActions, splitViewStore } from '../split-view.store';

describe('splitViewStore', () => {
  beforeEach(() => {
    splitViewActions.deactivate();
  });

  it('startet inaktiv ohne Focus', () => {
    expect(splitViewStore.state).toEqual({ isActive: false, focus: null });
  });

  it('toggle() schaltet isActive um', () => {
    splitViewActions.toggle();
    expect(splitViewStore.state.isActive).toBe(true);
    splitViewActions.toggle();
    expect(splitViewStore.state.isActive).toBe(false);
  });

  it('activate(focus) setzt beides atomar', () => {
    splitViewActions.activate({ kind: 'cell', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' });
    expect(splitViewStore.state.isActive).toBe(true);
    expect(splitViewStore.state.focus).toEqual({ kind: 'cell', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' });
  });

  it('deactivate() räumt Focus mit auf', () => {
    splitViewActions.activate({ kind: 'zone', zoneId: 'z1' });
    splitViewActions.deactivate();
    expect(splitViewStore.state).toEqual({ isActive: false, focus: null });
  });

  it('setFocus() ändert nur den Focus, nicht isActive', () => {
    splitViewActions.activate(null);
    splitViewActions.setFocus({ kind: 'zone', zoneId: 'abc' });
    expect(splitViewStore.state.isActive).toBe(true);
    expect(splitViewStore.state.focus).toEqual({ kind: 'zone', zoneId: 'abc' });
  });
});

describe('focusEquals', () => {
  it('true für strukturell gleiche zone-Focus', () => {
    expect(focusEquals({ kind: 'zone', zoneId: 'z' }, { kind: 'zone', zoneId: 'z' })).toBe(true);
  });

  it('false für unterschiedliche Kinds', () => {
    expect(focusEquals({ kind: 'zone', zoneId: 'z' }, { kind: 'cell', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' })).toBe(false);
  });

  it('true für beide null', () => {
    expect(focusEquals(null, null)).toBe(true);
  });
});

describe('serializeFocus / parseFocus', () => {
  it('roundtrips zone-Focus', () => {
    const f = { kind: 'zone', zoneId: 'abc-123' } as const;
    expect(parseFocus(serializeFocus(f))).toEqual(f);
  });

  it('roundtrips cell-Focus', () => {
    const f = { kind: 'cell', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' } as const;
    expect(parseFocus(serializeFocus(f))).toEqual(f);
  });

  it('null → undefined', () => {
    expect(serializeFocus(null)).toBeUndefined();
    expect(parseFocus(undefined)).toBeNull();
  });

  it('ignoriert invalides Format', () => {
    expect(parseFocus('cell:BRAND')).toBeNull();
    expect(parseFocus('unknown:foo')).toBeNull();
    expect(parseFocus('zone:')).toBeNull();
  });
});
