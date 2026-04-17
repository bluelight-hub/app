import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSplitViewUrlSync } from '../use-split-view-url-sync';
import { splitViewActions, splitViewStore } from '../../stores/split-view.store';

const navigateMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

describe('useSplitViewUrlSync', () => {
  beforeEach(() => {
    splitViewActions.deactivate();
    navigateMock.mockReset();
  });

  it('schreibt URL-Param-Änderungen zurück in den Store', () => {
    renderHook(({ split, focus }) => useSplitViewUrlSync({ split, focus }), {
      initialProps: { split: true as boolean | undefined, focus: 'cell:BRAND:MENSCHEN' as string | undefined },
    });
    expect(splitViewStore.state.isActive).toBe(true);
    expect(splitViewStore.state.focus).toEqual({ kind: 'cell', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' });
  });

  it('schreibt Store-Änderungen zurück in die URL', () => {
    const { rerender } = renderHook(({ split, focus }) => useSplitViewUrlSync({ split, focus }), {
      initialProps: { split: undefined as boolean | undefined, focus: undefined as string | undefined },
    });
    navigateMock.mockClear();

    act(() => {
      splitViewActions.activate({ kind: 'zone', zoneId: 'z-42' });
    });
    rerender({ split: undefined, focus: undefined });
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '.', replace: true }));
  });

  it('ignoriert keine-Änderungen (kein navigate-Call im Steady-State)', () => {
    renderHook(() => useSplitViewUrlSync({ split: undefined, focus: undefined }));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('Race-Guard: initialer Mount mit URL-Focus löscht den Param nicht', () => {
    // Regression: vor dem Fix hat Store→URL im selben Flush mit altem
    // state={focus:null} einen navigate({focus: undefined}) abgesetzt,
    // obwohl URL→Store gerade focus=cell gesetzt hat. Endlosschleife.
    renderHook(({ split, focus }) => useSplitViewUrlSync({ split, focus }), {
      initialProps: { split: true as boolean | undefined, focus: 'cell:BRAND:MENSCHEN' as string | undefined },
    });
    expect(splitViewStore.state.focus).toEqual({ kind: 'cell', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' });
    // Kein navigate-Call, der focus=undefined schreiben würde.
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('Race-Guard: Cell-Click im Store nach URL-getriebenem Mount löst genau einen navigate aus', () => {
    const { rerender } = renderHook(({ split, focus }) => useSplitViewUrlSync({ split, focus }), {
      initialProps: { split: true as boolean | undefined, focus: 'cell:BRAND:MENSCHEN' as string | undefined },
    });
    navigateMock.mockClear();

    // Simuliert User-Action: Matrix-Cell-Klick ändert Store-Focus. URL-Props bleiben (alt) → rerender.
    act(() => {
      splitViewActions.setFocus({ kind: 'cell', gefahrentyp: 'EXPLOSION', schutzobjekt: 'UMWELT' });
    });
    rerender({ split: true, focus: 'cell:BRAND:MENSCHEN' });

    // Genau ein navigate-Call mit dem neuen Focus; kein zweiter mit undefined.
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });
});
