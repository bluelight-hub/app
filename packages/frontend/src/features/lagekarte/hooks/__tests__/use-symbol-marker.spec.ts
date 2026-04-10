/**
 * Unit Tests für useSymbolMarker Hook
 *
 * Verifiziert die Symbol-Marker-Platzierungslogik:
 * - SVG-Image-Registration bei Map-Load
 * - pendingSymbol State (select/cancel)
 * - isReady State nach Registration
 * - Re-Registration bei style.load Event
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSymbolMarker } from '../use-symbol-marker';
import type { SymbolDefinition } from '../../drawing/symbols/symbol-registry';

// ============================================
// Mocks
// ============================================

const { mockMap, mapEventHandlers } = vi.hoisted(() => {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  const map = {
    hasImage: vi.fn().mockReturnValue(false),
    addImage: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    off: vi.fn(),
  };

  return { mockMap: map, mapEventHandlers: handlers };
});

vi.mock('../../drawing/symbols/symbol-registry', () => ({
  SYMBOL_LIBRARY: [
    {
      id: 'fw-loeschfahrzeug',
      category: 'feuerwehr',
      label: 'Löschfahrzeug',
      svgContent: '<svg></svg>',
      width: 32,
      height: 32,
    },
  ],
  getSymbolImageName: (id: string) => `symbol-${id}`,
}));

// Image-Konstruktor mocken (kein DOM-Image im Test)
const originalImage = globalThis.Image;
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Image = class MockImage {
    width: number;
    height: number;
    src = '';
    onload: (() => void) | null = null;
    onerror: ((err: unknown) => void) | null = null;

    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      // Asynchron onload triggern
      setTimeout(() => this.onload?.(), 0);
    }
  };
});

afterEach(() => {
  globalThis.Image = originalImage;
});

import { afterEach } from 'vitest';

// ============================================
// Test Helpers
// ============================================

function createDefaultOptions() {
  return {
    mapRef: {
      current: {
        getMap: () => mockMap,
      },
    } as any,
    drawRef: { current: null } as any,
    isMapLoaded: true,
  };
}

const testSymbol: SymbolDefinition = {
  id: 'fw-loeschfahrzeug',
  category: 'feuerwehr',
  label: 'Löschfahrzeug',
  svgContent: '<svg></svg>',
  width: 32,
  height: 32,
};

// ============================================
// Tests
// ============================================

describe('useSymbolMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    for (const key of Object.keys(mapEventHandlers)) {
      delete mapEventHandlers[key];
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialisierung', () => {
    it('sollte initial pendingSymbol=null und isReady=false haben', () => {
      const { result } = renderHook(() => useSymbolMarker({ ...createDefaultOptions(), isMapLoaded: false }));

      expect(result.current.pendingSymbol).toBeNull();
      expect(result.current.isReady).toBe(false);
    });

    it('sollte nicht registrieren wenn Map nicht geladen', () => {
      renderHook(() => useSymbolMarker({ ...createDefaultOptions(), isMapLoaded: false }));

      expect(mockMap.addImage).not.toHaveBeenCalled();
    });
  });

  describe('Image-Registration', () => {
    it('sollte Symbol-Images bei Map-Load registrieren', async () => {
      renderHook(() => useSymbolMarker(createDefaultOptions()));

      // MockImage.onload wird per setTimeout(0) getriggert
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(mockMap.addImage).toHaveBeenCalledWith('symbol-fw-loeschfahrzeug', expect.any(Object));
    });

    it('sollte bereits vorhandene Images überspringen', async () => {
      mockMap.hasImage.mockReturnValue(true);

      renderHook(() => useSymbolMarker(createDefaultOptions()));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(mockMap.addImage).not.toHaveBeenCalled();
      mockMap.hasImage.mockReturnValue(false);
    });

    it('sollte style.load Event-Handler registrieren', () => {
      renderHook(() => useSymbolMarker(createDefaultOptions()));

      expect(mockMap.on).toHaveBeenCalledWith('style.load', expect.any(Function));
    });
  });

  describe('Symbol-Auswahl', () => {
    it('sollte selectSymbol pendingSymbol setzen', () => {
      const { result } = renderHook(() => useSymbolMarker(createDefaultOptions()));

      act(() => {
        result.current.selectSymbol(testSymbol);
      });

      expect(result.current.pendingSymbol).toEqual(testSymbol);
    });

    it('sollte cancelSymbol pendingSymbol zurücksetzen', () => {
      const { result } = renderHook(() => useSymbolMarker(createDefaultOptions()));

      act(() => {
        result.current.selectSymbol(testSymbol);
      });

      act(() => {
        result.current.cancelSymbol();
      });

      expect(result.current.pendingSymbol).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('sollte style.load Handler beim Unmount entfernen', () => {
      const { unmount } = renderHook(() => useSymbolMarker(createDefaultOptions()));

      unmount();

      expect(mockMap.off).toHaveBeenCalledWith('style.load', expect.any(Function));
    });
  });
});
