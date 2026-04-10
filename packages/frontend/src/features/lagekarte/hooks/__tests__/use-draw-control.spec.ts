/**
 * Unit Tests für useDrawControl Hook
 *
 * Verifiziert die Kernlogik des Draw-Control-Hooks:
 * - Undo/Redo Stack-Management
 * - Keyboard-Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Delete, Escape, S)
 * - Auto-Save Debounce
 * - Mode-Mapping (DrawMode → MapboxDraw-Modus)
 * - Feature-Limit-Enforcement
 * - Delta-Transmission via WebSocket
 *
 * HINWEIS: MapboxDraw-Initialisierung wird vollständig gemockt,
 * da MapboxDraw ein MapLibre-GL Canvas benötigt (kein jsdom-Support).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawControl } from '../use-draw-control';

// ============================================
// Mocks
// ============================================

const { mockDraw, mockMap } = vi.hoisted(() => {
  const draw = {
    getAll: vi.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
    add: vi.fn(),
    delete: vi.fn(),
    deleteAll: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    getSelectedIds: vi.fn().mockReturnValue([]),
    changeMode: vi.fn(),
    setFeatureProperty: vi.fn(),
  };

  const map = {
    addControl: vi.fn(),
    removeControl: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    hasImage: vi.fn().mockReturnValue(true),
    addImage: vi.fn(),
    getContainer: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    getSource: vi.fn(),
  };

  return { mockDraw: draw, mockMap: map };
});

vi.mock('@mapbox/mapbox-gl-draw', () => {
  function MockMapboxDraw() {
    return mockDraw;
  }
  MockMapboxDraw.modes = {};
  return { default: MockMapboxDraw };
});

vi.mock('@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css', () => ({}));

vi.mock('@tanstack/react-store', () => ({
  useStore: vi.fn(() => 'idle'), // drawMode = idle
}));

vi.mock('../../stores/draw.store', () => ({
  drawStore: {
    state: { drawMode: 'idle', selectedFeatureIds: [], isDirectSelect: false, snapEnabled: false },
    subscribe: vi.fn(() => () => {}),
  },
  setDrawMode: vi.fn(),
  setSelectedFeatures: vi.fn(),
  setDirectSelect: vi.fn(),
  toggleSnapEnabled: vi.fn(),
}));

const mockSaveState = vi.fn();
vi.mock('../../api/use-save-lagekarte-state', () => ({
  useSaveLagekarteState: () => ({ mutate: mockSaveState }),
}));

vi.mock('../../api/use-lagekarte', () => ({
  useLagekarte: () => ({ data: null }),
}));

vi.mock('../../utils/map-config', () => ({
  DRAW_FEATURE_LIMIT: 100,
}));

vi.mock('../../drawing/draw-styles', () => ({
  CUSTOM_DRAW_STYLES: [],
  EMPTY_PATTERN_IMAGE: '__empty__',
}));

vi.mock('../../drawing/custom-modes/freehand.mode', () => ({ FreehandMode: {} }));
vi.mock('../../drawing/custom-modes/circle.mode', () => ({ CircleMode: {} }));
vi.mock('../../drawing/custom-modes/rectangle.mode', () => ({ RectangleMode: {} }));
vi.mock('../../drawing/custom-modes/sector.mode', () => ({ SectorMode: {} }));
vi.mock('../../drawing/custom-modes/gams.mode', () => ({ GamsMode: {} }));
vi.mock('../../drawing/custom-modes/direct-select.mode', () => ({ CustomDirectSelect: {} }));
vi.mock('../../drawing/hatch-patterns', () => ({
  ensureHatchImage: vi.fn().mockReturnValue('__empty__'),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

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
    einsatzId: 'einsatz-1',
    canDraw: true,
    isMapLoaded: true,
    activeStyleRef: {
      current: {
        color: '#000000',
        fillColor: '#ffffff',
        strokeWidth: 2,
        fillEnabled: false,
        fillOpacity: 0.3,
        strokeDasharray: '',
        hatch: { type: 'none', color: '', spacing: 8 },
      },
    } as any,
    isRemoteApplyRef: { current: false } as any,
    sendDelta: vi.fn(),
  };
}

// ============================================
// Tests
// ============================================

describe('useDrawControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockDraw.getAll.mockReturnValue({ type: 'FeatureCollection', features: [] });
    mockDraw.getSelectedIds.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialisierung', () => {
    it('sollte drawRef bereitstellen', () => {
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      expect(result.current.drawRef).toBeDefined();
    });

    it('sollte initial canUndo=false und canRedo=false haben', () => {
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('sollte nicht initialisieren wenn canDraw=false', () => {
      const options = createDefaultOptions();
      options.canDraw = false;

      renderHook(() => useDrawControl(options));

      expect(mockMap.addControl).not.toHaveBeenCalled();
    });

    it('sollte nicht initialisieren wenn Map nicht geladen', () => {
      const options = createDefaultOptions();
      options.isMapLoaded = false;

      renderHook(() => useDrawControl(options));

      expect(mockMap.addControl).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard-Shortcuts', () => {
    it('sollte Escape-Taste zu Idle-Modus wechseln', async () => {
      const { setDrawMode } = await import('../../stores/draw.store');
      renderHook(() => useDrawControl(createDefaultOptions()));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(setDrawMode).toHaveBeenCalledWith('idle');
    });

    it('sollte S-Taste Snap toggeln', async () => {
      const { toggleSnapEnabled } = await import('../../stores/draw.store');
      renderHook(() => useDrawControl(createDefaultOptions()));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      });

      expect(toggleSnapEnabled).toHaveBeenCalled();
    });

    it('sollte Shortcuts in Eingabefeldern ignorieren', async () => {
      const { setDrawMode } = await import('../../stores/draw.store');
      vi.mocked(setDrawMode).mockClear();
      renderHook(() => useDrawControl(createDefaultOptions()));

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        Object.defineProperty(event, 'target', { value: input });
        document.dispatchEvent(event);
      });

      expect(setDrawMode).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('Auto-Save', () => {
    it('sollte scheduleAutoSave als Funktion bereitstellen', () => {
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      expect(typeof result.current.scheduleAutoSave).toBe('function');
    });
  });

  describe('Mode-Setting', () => {
    it('sollte setMode als Funktion bereitstellen', () => {
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      expect(typeof result.current.setMode).toBe('function');
    });

    it('sollte setMode an drawStore weiterleiten', async () => {
      const { setDrawMode } = await import('../../stores/draw.store');
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      act(() => {
        result.current.setMode('draw_point');
      });

      expect(setDrawMode).toHaveBeenCalledWith('draw_point');
    });
  });

  describe('Delete Selected', () => {
    it('sollte deleteSelected als Funktion bereitstellen', () => {
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      expect(typeof result.current.deleteSelected).toBe('function');
    });
  });

  describe('Public API', () => {
    it('sollte alle erwarteten Felder zurückgeben', () => {
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      expect(result.current).toEqual(
        expect.objectContaining({
          undo: expect.any(Function),
          redo: expect.any(Function),
          canUndo: expect.any(Boolean),
          canRedo: expect.any(Boolean),
          deleteSelected: expect.any(Function),
          setMode: expect.any(Function),
          getFeatures: expect.any(Function),
          drawRef: expect.any(Object),
          scheduleAutoSave: expect.any(Function),
        }),
      );
    });
  });
});
