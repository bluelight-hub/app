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

const { mockDraw, mockMap, mapEventHandlers } = vi.hoisted(() => {
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

  /** Gespeicherte Event-Handler für manuelle Trigger in Tests */
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};

  const map = {
    addControl: vi.fn(),
    removeControl: vi.fn(),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    off: vi.fn(),
    hasImage: vi.fn().mockReturnValue(true),
    addImage: vi.fn(),
    getContainer: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    getSource: vi.fn(),
  };

  return { mockDraw: draw, mockMap: map, mapEventHandlers: handlers };
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
vi.mock('../../drawing/custom-modes/continuous-point.mode', () => ({ ContinuousPointMode: {} }));
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
  /** Holt den letzten registrierten Handler für ein Map-Event */
  function getMapHandler(eventName: string) {
    const handlers = mapEventHandlers[eventName];
    return handlers?.[handlers.length - 1];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockDraw.getAll.mockReturnValue({ type: 'FeatureCollection', features: [] });
    mockDraw.getSelectedIds.mockReturnValue([]);
    // Event-Handler-Registry leeren
    for (const key of Object.keys(mapEventHandlers)) {
      delete mapEventHandlers[key];
    }
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

    it('sollte draw_point auf den internen Continuous-Point-Modus abbilden', async () => {
      const { useStore } = await import('@tanstack/react-store');
      vi.mocked(useStore).mockReturnValue('draw_point');

      renderHook(() => useDrawControl(createDefaultOptions()));

      expect(mockDraw.changeMode).toHaveBeenLastCalledWith('draw_continuous_point');

      vi.mocked(useStore).mockReturnValue('idle');
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

  describe('Draw Event-Handler', () => {
    it('sollte bei draw.create sendDelta aufrufen', () => {
      const options = createDefaultOptions();
      const createdFeature = { type: 'Feature', id: 'feat-1', geometry: { type: 'Point', coordinates: [10, 50] }, properties: {} };
      mockDraw.get.mockReturnValue(createdFeature);

      renderHook(() => useDrawControl(options));

      const handleCreate = getMapHandler('draw.create');
      expect(handleCreate).toBeDefined();

      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });

      expect(options.sendDelta).toHaveBeenCalledWith('create', { features: [createdFeature] });
    });

    it('sollte bei draw.create Stil auf Feature anwenden', () => {
      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      renderHook(() => useDrawControl(options));

      const handleCreate = getMapHandler('draw.create');

      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });

      expect(mockDraw.setFeatureProperty).toHaveBeenCalledWith('feat-1', 'color', '#000000');
      expect(mockDraw.setFeatureProperty).toHaveBeenCalledWith('feat-1', 'fillColor', '#ffffff');
      expect(mockDraw.setFeatureProperty).toHaveBeenCalledWith('feat-1', 'strokeWidth', 2);
      expect(mockDraw.setFeatureProperty).toHaveBeenCalledWith('feat-1', 'featureType', 'drawing');
    });

    it('sollte bei draw.create mit isRemoteApplyRef=true nichts tun', () => {
      const options = createDefaultOptions();
      options.isRemoteApplyRef = { current: true } as any;

      renderHook(() => useDrawControl(options));

      const handleCreate = getMapHandler('draw.create');

      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });

      expect(options.sendDelta).not.toHaveBeenCalled();
      expect(mockDraw.setFeatureProperty).not.toHaveBeenCalled();
    });

    it('sollte bei Feature-Limit-Überschreitung das Feature entfernen', () => {
      const options = createDefaultOptions();
      // 101 Features (Limit ist 100)
      const features = Array.from({ length: 101 }, (_, i) => ({ id: `f-${i}` }));
      mockDraw.getAll.mockReturnValue({ type: 'FeatureCollection', features });

      renderHook(() => useDrawControl(options));

      const handleCreate = getMapHandler('draw.create');

      act(() => {
        handleCreate!({ features: [{ id: 'f-100' }] });
      });

      expect(mockDraw.delete).toHaveBeenCalledWith('f-100');
      expect(options.sendDelta).not.toHaveBeenCalled();
    });

    it('sollte bei draw.update sendDelta mit Features aufrufen', () => {
      const options = createDefaultOptions();
      const updatedFeatures = [{ type: 'Feature', id: 'feat-1', properties: {} }];

      renderHook(() => useDrawControl(options));

      const handleUpdate = getMapHandler('draw.update');
      expect(handleUpdate).toBeDefined();

      act(() => {
        handleUpdate!({ features: updatedFeatures });
      });

      expect(options.sendDelta).toHaveBeenCalledWith('update', { features: updatedFeatures });
    });

    it('sollte bei draw.update mit isRemoteApplyRef=true nichts tun', () => {
      const options = createDefaultOptions();
      options.isRemoteApplyRef = { current: true } as any;

      renderHook(() => useDrawControl(options));

      const handleUpdate = getMapHandler('draw.update');

      act(() => {
        handleUpdate!({ features: [{ id: 'feat-1' }] });
      });

      expect(options.sendDelta).not.toHaveBeenCalled();
    });

    it('sollte bei draw.delete sendDelta mit featureIds aufrufen', () => {
      const options = createDefaultOptions();

      renderHook(() => useDrawControl(options));

      const handleDelete = getMapHandler('draw.delete');
      expect(handleDelete).toBeDefined();

      act(() => {
        handleDelete!({ features: [{ id: 'feat-1' }, { id: 'feat-2' }] });
      });

      expect(options.sendDelta).toHaveBeenCalledWith('delete', { featureIds: ['feat-1', 'feat-2'] });
    });

    it('sollte bei draw.delete mit isRemoteApplyRef=true nichts tun', () => {
      const options = createDefaultOptions();
      options.isRemoteApplyRef = { current: true } as any;

      renderHook(() => useDrawControl(options));

      const handleDelete = getMapHandler('draw.delete');

      act(() => {
        handleDelete!({ features: [{ id: 'feat-1' }] });
      });

      expect(options.sendDelta).not.toHaveBeenCalled();
    });

    it('sollte selectionchange den Store aktualisieren', async () => {
      const { setSelectedFeatures } = await import('../../stores/draw.store');

      renderHook(() => useDrawControl(createDefaultOptions()));

      const handleSelectionChange = getMapHandler('draw.selectionchange');

      act(() => {
        handleSelectionChange!({ features: [{ id: 'feat-1' }, { id: 'feat-2' }] });
      });

      expect(setSelectedFeatures).toHaveBeenCalledWith(['feat-1', 'feat-2']);
    });

    it('sollte modechange den directSelect-State aktualisieren', async () => {
      const { setDirectSelect } = await import('../../stores/draw.store');

      renderHook(() => useDrawControl(createDefaultOptions()));

      const handleModeChange = getMapHandler('draw.modechange');

      act(() => {
        handleModeChange!({ mode: 'direct_select' });
      });

      expect(setDirectSelect).toHaveBeenCalledWith(true);
    });
  });

  describe('Undo/Redo mit Draw-Operationen', () => {
    it('sollte nach draw.create canUndo=true setzen', () => {
      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      const { result } = renderHook(() => useDrawControl(options));

      const handleCreate = getMapHandler('draw.create');

      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('sollte undo nach draw.create den alten State wiederherstellen', () => {
      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      const { result } = renderHook(() => useDrawControl(options));

      // Feature erstellen
      const handleCreate = getMapHandler('draw.create');
      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });

      // Undo
      act(() => {
        result.current.undo();
      });

      expect(mockDraw.deleteAll).toHaveBeenCalled();
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('sollte redo nach undo den State wiederherstellen', () => {
      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      const { result } = renderHook(() => useDrawControl(options));

      // Feature erstellen → Undo → Redo
      const handleCreate = getMapHandler('draw.create');
      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });
      act(() => {
        result.current.undo();
      });
      act(() => {
        result.current.redo();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('deleteSelected', () => {
    it('sollte selektierte Features löschen und sendDelta aufrufen', () => {
      const options = createDefaultOptions();
      mockDraw.getSelectedIds.mockReturnValue(['feat-1', 'feat-2']);
      mockDraw.getAll.mockReturnValue({
        type: 'FeatureCollection',
        features: [
          { id: 'feat-1', type: 'Feature', properties: {} },
          { id: 'feat-2', type: 'Feature', properties: {} },
          { id: 'feat-3', type: 'Feature', properties: {} },
        ],
      });

      const { result } = renderHook(() => useDrawControl(options));

      act(() => {
        result.current.deleteSelected();
      });

      // draw.set wird mit den verbleibenden Features aufgerufen
      expect(mockDraw.set).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'FeatureCollection',
          features: [expect.objectContaining({ id: 'feat-3' })],
        }),
      );

      expect(options.sendDelta).toHaveBeenCalledWith('delete', { featureIds: ['feat-1', 'feat-2'] });
    });

    it('sollte nichts tun wenn keine Features selektiert sind', () => {
      const options = createDefaultOptions();
      mockDraw.getSelectedIds.mockReturnValue([]);

      const { result } = renderHook(() => useDrawControl(options));

      act(() => {
        result.current.deleteSelected();
      });

      expect(mockDraw.set).not.toHaveBeenCalled();
      expect(options.sendDelta).not.toHaveBeenCalled();
    });

    it('sollte Ghost-Features clearen via Source-SetData', () => {
      const options = createDefaultOptions();
      mockDraw.getSelectedIds.mockReturnValue(['feat-1']);
      mockDraw.getAll.mockReturnValue({
        type: 'FeatureCollection',
        features: [{ id: 'feat-1', type: 'Feature', properties: {} }],
      });

      const mockHotSource = { setData: vi.fn() };
      const mockColdSource = { setData: vi.fn() };
      mockMap.getSource.mockImplementation((name: string) => {
        if (name === 'mapbox-gl-draw-hot') return mockHotSource;
        if (name === 'mapbox-gl-draw-cold') return mockColdSource;
        return undefined;
      });

      const { result } = renderHook(() => useDrawControl(options));

      act(() => {
        result.current.deleteSelected();
      });

      expect(mockHotSource.setData).toHaveBeenCalledWith(expect.objectContaining({ type: 'FeatureCollection', features: [] }));
      expect(mockColdSource.setData).toHaveBeenCalledWith(expect.objectContaining({ type: 'FeatureCollection', features: [] }));
    });
  });

  describe('Auto-Save Debounce', () => {
    it('sollte nach Debounce-Verzögerung saveState aufrufen', () => {
      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      act(() => {
        result.current.scheduleAutoSave();
      });

      // Vor Ablauf der 2000ms
      expect(mockSaveState).not.toHaveBeenCalled();

      // Nach 2000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockSaveState).toHaveBeenCalled();
    });
  });

  describe('getFeatures', () => {
    it('sollte leere FeatureCollection zurückgeben wenn kein Draw', () => {
      const options = createDefaultOptions();
      options.canDraw = false; // Draw wird nicht initialisiert

      const { result } = renderHook(() => useDrawControl(options));

      expect(result.current.getFeatures()).toEqual({ type: 'FeatureCollection', features: [] });
    });

    it('sollte Features von Draw zurückgeben', () => {
      const expectedFC = { type: 'FeatureCollection', features: [{ id: 'f1' }] };
      mockDraw.getAll.mockReturnValue(expectedFC);

      const { result } = renderHook(() => useDrawControl(createDefaultOptions()));

      expect(result.current.getFeatures()).toEqual(expectedFC);
    });
  });

  describe('Keyboard-Shortcut: Ctrl+Z / Ctrl+Shift+Z', () => {
    it('sollte Ctrl+Z undo auslösen', () => {
      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      const { result } = renderHook(() => useDrawControl(options));

      // Erst einen Eintrag auf den Undo-Stack bringen
      const handleCreate = getMapHandler('draw.create');
      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });
      expect(result.current.canUndo).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
      });

      expect(mockDraw.deleteAll).toHaveBeenCalled();
    });

    it('sollte Ctrl+Shift+Z redo auslösen', () => {
      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      const { result } = renderHook(() => useDrawControl(options));

      // Create → Undo → dann Redo via Keyboard
      const handleCreate = getMapHandler('draw.create');
      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });
      act(() => {
        result.current.undo();
      });
      expect(result.current.canRedo).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }));
      });

      // Redo wurde ausgelöst — canRedo sollte jetzt false sein
      expect(result.current.canRedo).toBe(false);
    });

    it('sollte Delete-Taste deleteSelected auslösen', () => {
      const options = createDefaultOptions();
      mockDraw.getSelectedIds.mockReturnValue(['feat-1']);
      mockDraw.getAll.mockReturnValue({
        type: 'FeatureCollection',
        features: [{ id: 'feat-1', type: 'Feature', properties: {} }],
      });

      renderHook(() => useDrawControl(options));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
      });

      expect(mockDraw.set).toHaveBeenCalled();
    });
  });

  describe('Kontinuierliches Zeichnen', () => {
    it('sollte nach Punkt-Erstellung keinen zusätzlichen Mode-Reentry auslösen', async () => {
      const { useStore } = await import('@tanstack/react-store');
      vi.mocked(useStore).mockReturnValue('draw_point');

      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      renderHook(() => useDrawControl(options));
      mockDraw.changeMode.mockClear();

      const handleCreate = getMapHandler('draw.create');

      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(mockDraw.changeMode).not.toHaveBeenCalled();

      vi.mocked(useStore).mockReturnValue('idle');
    });

    it('sollte nach Feature-Erstellung den Zeichenmodus erneut aktivieren', async () => {
      // drawMode = 'draw_polygon' via useStore Mock
      const { useStore } = await import('@tanstack/react-store');
      vi.mocked(useStore).mockReturnValue('draw_polygon');

      const options = createDefaultOptions();
      mockDraw.get.mockReturnValue({ type: 'Feature', id: 'feat-1', properties: {} });

      renderHook(() => useDrawControl(options));

      const handleCreate = getMapHandler('draw.create');

      act(() => {
        handleCreate!({ features: [{ id: 'feat-1' }] });
      });

      // changeMode wird per setTimeout(fn, 0) aufgerufen
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(mockDraw.changeMode).toHaveBeenCalledWith('draw_polygon');

      // Reset
      vi.mocked(useStore).mockReturnValue('idle');
    });
  });
});
