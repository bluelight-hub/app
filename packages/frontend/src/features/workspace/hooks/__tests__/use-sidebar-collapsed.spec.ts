/**
 * Unit-Tests für den Hook `useSidebarCollapsed`.
 *
 * Abdeckung:
 * - Initialer Zustand bei leerem localStorage (false)
 * - Initialer Zustand aus bestehendem localStorage-Wert
 * - `toggle()` wechselt Zustand und persistiert
 * - `setCollapsed()` setzt Zustand und persistiert
 * - Graceful Handling von Storage-Fehlern (Private Browsing)
 * - Persistenz über Re-Mount
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetMemoryFallbackForTesting, useSidebarCollapsed } from '../use-sidebar-collapsed';

const STORAGE_KEY = 'bluelight:workspace:sidebar-collapsed';

describe('useSidebarCollapsed', () => {
  let originalGetItem: typeof window.localStorage.getItem;
  let originalSetItem: typeof window.localStorage.setItem;

  beforeEach(() => {
    vi.clearAllMocks();
    _resetMemoryFallbackForTesting();
    originalGetItem = window.localStorage.getItem.bind(window.localStorage);
    originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.getItem = originalGetItem;
    window.localStorage.setItem = originalSetItem;
    window.localStorage.clear();
  });

  describe('Initialer Zustand', () => {
    it('liefert false wenn localStorage leer ist', () => {
      const { result } = renderHook(() => useSidebarCollapsed());
      expect(result.current.isCollapsed).toBe(false);
    });

    it('liefert true wenn localStorage "true" enthält', () => {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useSidebarCollapsed());
      expect(result.current.isCollapsed).toBe(true);
    });

    it('liefert false wenn localStorage einen anderen Wert enthält', () => {
      window.localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useSidebarCollapsed());
      expect(result.current.isCollapsed).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('wechselt den Zustand von false auf true', () => {
      const { result } = renderHook(() => useSidebarCollapsed());
      expect(result.current.isCollapsed).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isCollapsed).toBe(true);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('wechselt den Zustand zurück auf false', () => {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useSidebarCollapsed());
      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isCollapsed).toBe(false);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('hat eine stabile Funktionsreferenz (useCallback)', () => {
      const { result, rerender } = renderHook(() => useSidebarCollapsed());
      const firstToggleRef = result.current.toggle;
      rerender();
      expect(result.current.toggle).toBe(firstToggleRef);
    });
  });

  describe('setCollapsed()', () => {
    it('setzt den Zustand explizit und schreibt in localStorage', () => {
      const { result } = renderHook(() => useSidebarCollapsed());
      act(() => {
        result.current.setCollapsed(true);
      });
      expect(result.current.isCollapsed).toBe(true);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('kann den Zustand auf false zurücksetzen', () => {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useSidebarCollapsed());
      act(() => {
        result.current.setCollapsed(false);
      });
      expect(result.current.isCollapsed).toBe(false);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
    });
  });

  describe('Fehlertoleranz', () => {
    it('liefert false wenn localStorage.getItem wirft', () => {
      window.localStorage.getItem = vi.fn(() => {
        throw new DOMException('SecurityError', 'SecurityError');
      });

      const { result } = renderHook(() => useSidebarCollapsed());
      expect(result.current.isCollapsed).toBe(false);
    });

    it('aktualisiert den Zustand auch wenn setItem wirft', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      const { result } = renderHook(() => useSidebarCollapsed());
      act(() => {
        result.current.toggle();
      });

      expect(result.current.isCollapsed).toBe(true);
      expect(setItemSpy).toHaveBeenCalled();
      setItemSpy.mockRestore();
    });

    it('nutzt Memory-Fallback wenn Storage in beiden Richtungen fehlschlägt', () => {
      window.localStorage.getItem = vi.fn(() => {
        throw new DOMException('SecurityError', 'SecurityError');
      });
      window.localStorage.setItem = vi.fn(() => {
        throw new DOMException('SecurityError', 'SecurityError');
      });

      const { result: result1, unmount } = renderHook(() => useSidebarCollapsed());
      act(() => {
        result1.current.toggle();
      });
      expect(result1.current.isCollapsed).toBe(true);

      unmount();

      const { result: result2 } = renderHook(() => useSidebarCollapsed());
      expect(result2.current.isCollapsed).toBe(true);
    });
  });

  describe('Persistenz über Re-Mount', () => {
    it('persistiert den Zustand über Re-Mount hinweg', () => {
      const { result: result1, unmount } = renderHook(() => useSidebarCollapsed());
      act(() => {
        result1.current.toggle();
      });
      expect(result1.current.isCollapsed).toBe(true);
      unmount();

      const { result: result2 } = renderHook(() => useSidebarCollapsed());
      expect(result2.current.isCollapsed).toBe(true);
    });
  });
});
