import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from '../use-reduced-motion';

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
}

describe('useReducedMotion (Story 3.2 AC7)', () => {
  let mql: MockMediaQueryList;
  let listener: ((event: MediaQueryListEvent) => void) | null = null;
  // Original-`window.matchMedia` sichern, damit Folge-Specs in derselben
  // Suite nicht den Mock erben (P17 — Test-Pollution-Fix).
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    mql = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn((_type: string, l: (event: MediaQueryListEvent) => void) => {
        listener = l;
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    window.matchMedia = vi.fn().mockReturnValue(mql);
  });

  afterEach(() => {
    listener = null;
    // Original wiederherstellen, sonst leakt der Mock in Folge-Tests.
    window.matchMedia = originalMatchMedia;
  });

  it('liefert false, wenn das System keine Reduced-Motion-Präferenz hat', () => {
    mql.matches = false;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('liefert true, wenn `prefers-reduced-motion: reduce` aktiv ist', () => {
    mql.matches = true;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('reagiert auf change-Events der MediaQueryList', () => {
    mql.matches = false;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => {
      listener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });
});
