/**
 * Unit Tests: useBrowserWarningDismissed Hook
 *
 * Tests Session-Storage für Browser-Security-Warning Dismiss-Status:
 * - Initial State bei leerem sessionStorage (false)
 * - Initial State bei gesetztem sessionStorage (true)
 * - dismiss() aktualisiert State und schreibt in sessionStorage
 * - Graceful Handling von Storage-Fehlern
 * - SSR-Safety (window undefined)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBrowserWarningDismissed, _resetMemoryFallbackForTesting } from '../use-browser-warning-dismissed';

describe('useBrowserWarningDismissed', () => {
  // Original sessionStorage methods für Restore
  let originalGetItem: typeof sessionStorage.getItem;
  let originalSetItem: typeof sessionStorage.setItem;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset memory fallback für isolierte Tests
    _resetMemoryFallbackForTesting();

    // Store original sessionStorage methods
    originalGetItem = sessionStorage.getItem.bind(sessionStorage);
    originalSetItem = sessionStorage.setItem.bind(sessionStorage);

    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Restore original sessionStorage methods
    sessionStorage.getItem = originalGetItem;
    sessionStorage.setItem = originalSetItem;

    // Clear sessionStorage after each test
    sessionStorage.clear();
  });

  describe('Initial State', () => {
    it('should return isDismissed=false when sessionStorage is empty', () => {
      // Given: sessionStorage has no value for the key

      // When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: isDismissed should be false
      expect(result.current.isDismissed).toBe(false);
    });

    it('should return isDismissed=true when sessionStorage has "true"', () => {
      // Given: sessionStorage has 'true' for the key
      sessionStorage.setItem('browser-security-warning-dismissed', 'true');

      // When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: isDismissed should be true
      expect(result.current.isDismissed).toBe(true);
    });

    it('should return isDismissed=false when sessionStorage has other value', () => {
      // Given: sessionStorage has a different value
      sessionStorage.setItem('browser-security-warning-dismissed', 'false');

      // When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: isDismissed should be false (only 'true' string is truthy)
      expect(result.current.isDismissed).toBe(false);
    });

    it('should return isDismissed=false when sessionStorage has empty string', () => {
      // Given: sessionStorage has empty string
      sessionStorage.setItem('browser-security-warning-dismissed', '');

      // When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: isDismissed should be false
      expect(result.current.isDismissed).toBe(false);
    });
  });

  describe('dismiss() Function', () => {
    it('should update state to true when dismiss() is called', () => {
      // Given: Initial state (not dismissed)
      const { result } = renderHook(() => useBrowserWarningDismissed());
      expect(result.current.isDismissed).toBe(false);

      // When: dismiss() is called
      act(() => {
        result.current.dismiss();
      });

      // Then: isDismissed should be true
      expect(result.current.isDismissed).toBe(true);
    });

    it('should write "true" to sessionStorage when dismiss() is called', () => {
      // Given: Initial state (not dismissed)
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // When: dismiss() is called
      act(() => {
        result.current.dismiss();
      });

      // Then: sessionStorage should have 'true'
      expect(sessionStorage.getItem('browser-security-warning-dismissed')).toBe('true');
    });

    it('should be idempotent - calling dismiss() multiple times has same effect', () => {
      // Given: Initial state
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // When: dismiss() is called multiple times
      act(() => {
        result.current.dismiss();
        result.current.dismiss();
        result.current.dismiss();
      });

      // Then: State should still be true
      expect(result.current.isDismissed).toBe(true);
      expect(sessionStorage.getItem('browser-security-warning-dismissed')).toBe('true');
    });

    it('should have stable dismiss function reference (useCallback)', () => {
      // Given: Hook is rendered
      const { result, rerender } = renderHook(() => useBrowserWarningDismissed());
      const firstDismissRef = result.current.dismiss;

      // When: Hook re-renders
      rerender();

      // Then: dismiss function reference should be the same
      expect(result.current.dismiss).toBe(firstDismissRef);
    });
  });

  describe('Error Handling', () => {
    it('should handle sessionStorage.getItem errors gracefully', () => {
      // Given: sessionStorage.getItem throws an error
      sessionStorage.getItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: isDismissed should default to false (no error thrown)
      expect(result.current.isDismissed).toBe(false);
    });

    it('should handle sessionStorage.setItem errors gracefully', () => {
      // Given: Mock den tatsächlich aufgerufenen sessionStorage setter
      const setItemSpy = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // When: dismiss() is called
      act(() => {
        result.current.dismiss();
      });

      // Then: State should still update (graceful degradation)
      expect(result.current.isDismissed).toBe(true);
      // Storage was attempted
      expect(setItemSpy).toHaveBeenCalledWith('browser-security-warning-dismissed', 'true');

      // Cleanup
      setItemSpy.mockRestore();
    });

    it('should still update state when storage fails', () => {
      // Given: Both storage operations fail
      sessionStorage.getItem = vi.fn(() => {
        throw new Error('SecurityError');
      });
      sessionStorage.setItem = vi.fn(() => {
        throw new Error('SecurityError');
      });

      // When: Hook is rendered and dismiss() is called
      const { result } = renderHook(() => useBrowserWarningDismissed());

      act(() => {
        result.current.dismiss();
      });

      // Then: State should still be updated (in-memory fallback)
      expect(result.current.isDismissed).toBe(true);
    });
  });

  describe('Private Browsing Memory Fallback', () => {
    it('should persist dismissed state via memory fallback when sessionStorage throws on read AND write', () => {
      // Given: Private Browsing - sessionStorage wirft bei getItem UND setItem
      sessionStorage.getItem = vi.fn(() => {
        throw new DOMException('SecurityError: The operation is insecure.', 'SecurityError');
      });
      sessionStorage.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      // When: Erste Hook-Instanz dismissed
      const { result: result1, unmount: unmount1 } = renderHook(() => useBrowserWarningDismissed());
      expect(result1.current.isDismissed).toBe(false);

      act(() => {
        result1.current.dismiss();
      });
      expect(result1.current.isDismissed).toBe(true);

      // Simuliere Navigation: Component unmountet
      unmount1();

      // Then: Neue Hook-Instanz liest den Memory-Fallback
      const { result: result2 } = renderHook(() => useBrowserWarningDismissed());
      expect(result2.current.isDismissed).toBe(true);
    });

    it('should use memory fallback when sessionStorage.getItem throws SecurityError', () => {
      // Given: Safari Private Browsing Szenario
      sessionStorage.getItem = vi.fn(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });
      sessionStorage.setItem = vi.fn(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });

      // When: Hook rendert, erwartet false (Memory-Fallback ist initial false)
      const { result } = renderHook(() => useBrowserWarningDismissed());
      expect(result.current.isDismissed).toBe(false);
    });

    it('should use memory fallback when sessionStorage.getItem throws QuotaExceededError', () => {
      // Given: Firefox Private Browsing Szenario (manchmal QuotaExceeded statt Security)
      sessionStorage.getItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      // When: Hook rendert
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: Sollte Memory-Fallback nutzen (initial false)
      expect(result.current.isDismissed).toBe(false);
    });

    it('should set memory fallback when dismiss() is called and setItem throws', () => {
      // Given: sessionStorage funktioniert beim Lesen, aber nicht beim Schreiben
      const getItemMock = vi.fn(() => null);
      const setItemMock = vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });
      sessionStorage.getItem = getItemMock;
      sessionStorage.setItem = setItemMock;

      // When: Hook rendert und dismiss() aufgerufen wird
      const { result: result1, unmount } = renderHook(() => useBrowserWarningDismissed());

      act(() => {
        result1.current.dismiss();
      });

      // State wird aktualisiert
      expect(result1.current.isDismissed).toBe(true);

      // Simuliere Navigation
      unmount();

      // Jetzt wirft auch getItem (wie in echtem Private Browsing)
      sessionStorage.getItem = vi.fn(() => {
        throw new DOMException('SecurityError', 'SecurityError');
      });

      // Then: Neue Instanz sollte Memory-Fallback nutzen
      const { result: result2 } = renderHook(() => useBrowserWarningDismissed());
      expect(result2.current.isDismissed).toBe(true);
    });

    it('should start fresh after reset (test isolation helper)', () => {
      // Given: Memory fallback wurde gesetzt in vorherigen Schritten
      sessionStorage.getItem = vi.fn(() => {
        throw new Error('SecurityError');
      });
      sessionStorage.setItem = vi.fn(() => {
        throw new Error('SecurityError');
      });

      const { result: result1, unmount: unmount1 } = renderHook(() => useBrowserWarningDismissed());
      act(() => {
        result1.current.dismiss();
      });
      expect(result1.current.isDismissed).toBe(true);
      unmount1();

      // Verifiziere dass der Memory-Fallback jetzt gesetzt ist
      const { result: resultBefore, unmount: unmountBefore } = renderHook(() => useBrowserWarningDismissed());
      expect(resultBefore.current.isDismissed).toBe(true);
      unmountBefore();

      // When: Reset aufgerufen wird (wie in beforeEach)
      _resetMemoryFallbackForTesting();

      // Restore sessionStorage to normal behavior
      sessionStorage.getItem = originalGetItem;
      sessionStorage.setItem = originalSetItem;
      sessionStorage.clear();

      // Then: Neuer Hook sollte false zurückgeben (normales Verhalten)
      const { result: result2 } = renderHook(() => useBrowserWarningDismissed());
      expect(result2.current.isDismissed).toBe(false);
    });
  });

  describe('SSR Safety', () => {
    it('should handle window being undefined', () => {
      // Given: Mock window as undefined
      // Note: In JSDOM, window is always defined, but we test the code path
      // by mocking sessionStorage to throw when window would be undefined

      // This test verifies the code structure handles the case,
      // though in JSDOM we can't truly simulate window === undefined

      // Given: sessionStorage behaves as if in SSR
      // Temporarily override window check in sessionStorage access
      sessionStorage.getItem = vi.fn(() => {
        // Simulate what would happen in SSR
        throw new ReferenceError('sessionStorage is not defined');
      });

      // When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: Should default to false without throwing
      expect(result.current.isDismissed).toBe(false);
    });
  });

  describe('Persistence Across Component Mounts', () => {
    it('should persist dismissed state across component remounts', () => {
      // Given: First component dismisses the warning
      const { result: result1, unmount: unmount1 } = renderHook(() => useBrowserWarningDismissed());

      act(() => {
        result1.current.dismiss();
      });

      expect(result1.current.isDismissed).toBe(true);

      // When: Component unmounts and remounts
      unmount1();

      // Then: New component should read the persisted state
      const { result: result2 } = renderHook(() => useBrowserWarningDismissed());
      expect(result2.current.isDismissed).toBe(true);
    });

    it('should NOT persist across page reloads (sessionStorage vs localStorage)', () => {
      // Given: User dismisses the warning
      const { result } = renderHook(() => useBrowserWarningDismissed());

      act(() => {
        result.current.dismiss();
      });

      // Verify: Value is stored in sessionStorage (not localStorage)
      expect(sessionStorage.getItem('browser-security-warning-dismissed')).toBe('true');
      expect(localStorage.getItem('browser-security-warning-dismissed')).toBeNull();
    });
  });

  describe('Return Value Structure', () => {
    it('should return object with isDismissed boolean and dismiss function', () => {
      // Given & When: Hook is rendered
      const { result } = renderHook(() => useBrowserWarningDismissed());

      // Then: Return value should have correct shape
      expect(typeof result.current.isDismissed).toBe('boolean');
      expect(typeof result.current.dismiss).toBe('function');
    });
  });
});
