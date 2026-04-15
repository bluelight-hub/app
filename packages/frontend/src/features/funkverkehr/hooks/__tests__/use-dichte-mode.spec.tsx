/**
 * Tests für `useDichteMode`.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { funkprotokollFilterStore } from '../../stores/funkprotokoll-filter.store';
import { useDichteMode } from '../use-dichte-mode';

describe('useDichteMode', () => {
  beforeEach(() => {
    funkprotokollFilterStore.setState(() => ({ byEinsatz: {} }));
  });

  it('gibt per Default "bubbles" zurück', () => {
    const { result } = renderHook(() => useDichteMode('e1'));
    expect(result.current.dichteMode).toBe('bubbles');
  });

  it('wechselt den Modus über setDichteMode', () => {
    const { result } = renderHook(() => useDichteMode('e1'));

    act(() => {
      result.current.setDichteMode('kompakt');
    });

    expect(result.current.dichteMode).toBe('kompakt');
  });

  it('toggelt zwischen bubbles und kompakt', () => {
    const { result } = renderHook(() => useDichteMode('e1'));

    act(() => {
      result.current.toggleDichteMode();
    });
    expect(result.current.dichteMode).toBe('kompakt');

    act(() => {
      result.current.toggleDichteMode();
    });
    expect(result.current.dichteMode).toBe('bubbles');
  });

  it('verhält sich pro Einsatz-ID isoliert', () => {
    const { result: h1 } = renderHook(() => useDichteMode('e1'));
    const { result: h2 } = renderHook(() => useDichteMode('e2'));

    act(() => {
      h1.current.setDichteMode('kompakt');
    });

    expect(h1.current.dichteMode).toBe('kompakt');
    expect(h2.current.dichteMode).toBe('bubbles');
  });
});
