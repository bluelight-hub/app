/**
 * Unit Tests für useLagekarteSync Hook
 *
 * Verifiziert die Koordination zwischen WebSocket-Events und MapboxDraw:
 * - Remote-Feature-Anwendung mit isRemoteApplyRef Guard
 * - Remote-Feature-Löschung mit isRemoteApplyRef Guard
 * - Repaint-Erzwingung nach Remote-Änderungen
 * - sendDelta Dispatch-Logik
 * - Fehlerbehandlung bei fehlender Draw-Instanz
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLagekarteSync } from '../use-lagekarte-sync';
import type { LagekarteFeatureCreatedPayload, LagekarteFeatureUpdatedPayload, LagekarteFeatureDeletedPayload } from '../../api/use-lagekarte-websocket';

// ============================================
// Mocks
// ============================================

const mockSendFeatureCreated = vi.fn();
const mockSendFeatureUpdated = vi.fn();
const mockSendFeatureDeleted = vi.fn();

vi.mock('../../api/use-lagekarte-websocket', () => ({
  useLagekarteWebSocket: vi.fn(({ onFeatureCreated, onFeatureUpdated, onFeatureDeleted }) => {
    // Event-Handler speichern für spätere Aufrufe in Tests
    latestCallbacks.onFeatureCreated = onFeatureCreated;
    latestCallbacks.onFeatureUpdated = onFeatureUpdated;
    latestCallbacks.onFeatureDeleted = onFeatureDeleted;

    return {
      status: 'connected',
      isConnected: true,
      sendFeatureCreated: mockSendFeatureCreated,
      sendFeatureUpdated: mockSendFeatureUpdated,
      sendFeatureDeleted: mockSendFeatureDeleted,
    };
  }),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Callbacks die der Hook an useLagekarteWebSocket übergibt
const latestCallbacks: {
  onFeatureCreated?: (p: LagekarteFeatureCreatedPayload) => void;
  onFeatureUpdated?: (p: LagekarteFeatureUpdatedPayload) => void;
  onFeatureDeleted?: (p: LagekarteFeatureDeletedPayload) => void;
} = {};

// ============================================
// Test Helpers
// ============================================

function createMockDraw() {
  return {
    add: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
    set: vi.fn(),
    get: vi.fn(),
  };
}

function createDrawRef(draw: ReturnType<typeof createMockDraw> | null = null) {
  return { current: draw };
}

function createIsRemoteApplyRef() {
  return { current: false };
}

const testFeature: GeoJSON.Feature = {
  type: 'Feature',
  id: 'feat-1',
  geometry: { type: 'Point', coordinates: [10, 50] },
  properties: {},
};

// ============================================
// Tests
// ============================================

describe('useLagekarteSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Remote-Feature-Anwendung', () => {
    it('sollte Remote-Feature via draw.add anwenden', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      // Feature-Created Event simulieren
      act(() => {
        latestCallbacks.onFeatureCreated?.({
          einsatzId: 'einsatz-1',
          feature: testFeature,
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      expect(draw.add).toHaveBeenCalledWith(testFeature);
    });

    it('sollte isRemoteApplyRef während Remote-Add setzen und zurücksetzen', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      // Prüfe isRemoteApplyRef innerhalb von draw.add
      let wasRemoteApplyDuringAdd = false;
      draw.add.mockImplementation(() => {
        wasRemoteApplyDuringAdd = isRemoteApplyRef.current;
      });

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        latestCallbacks.onFeatureCreated?.({
          einsatzId: 'einsatz-1',
          feature: testFeature,
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      expect(wasRemoteApplyDuringAdd).toBe(true);
      expect(isRemoteApplyRef.current).toBe(false); // Nach Anwendung zurückgesetzt
    });

    it('sollte isRemoteApplyRef auch bei Fehler zurücksetzen', () => {
      const draw = createMockDraw();
      draw.add.mockImplementation(() => {
        throw new Error('Draw error');
      });
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        latestCallbacks.onFeatureCreated?.({
          einsatzId: 'einsatz-1',
          feature: testFeature,
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      // Guard muss trotz Fehler zurückgesetzt werden (finally Block)
      expect(isRemoteApplyRef.current).toBe(false);
    });

    it('sollte Repaint nach Remote-Add erzwingen (50ms Timeout)', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        latestCallbacks.onFeatureCreated?.({
          einsatzId: 'einsatz-1',
          feature: testFeature,
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      // Vor Timeout: kein set() Aufruf
      expect(draw.set).not.toHaveBeenCalled();

      // Nach 50ms: Repaint via draw.set(draw.getAll())
      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(draw.getAll).toHaveBeenCalled();
      expect(draw.set).toHaveBeenCalled();
    });

    it('sollte bei fehlender Draw-Instanz warnen und nichts tun', async () => {
      const drawRef = createDrawRef(null);
      const isRemoteApplyRef = createIsRemoteApplyRef();
      const { logger } = await import('@/shared/lib/logger');

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        latestCallbacks.onFeatureCreated?.({
          einsatzId: 'einsatz-1',
          feature: testFeature,
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Draw-Instanz nicht verfügbar'));
    });

    it('sollte mehrere Features bei Update einzeln anwenden', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      const feature2: GeoJSON.Feature = {
        type: 'Feature',
        id: 'feat-2',
        geometry: { type: 'Point', coordinates: [11, 51] },
        properties: {},
      };

      act(() => {
        latestCallbacks.onFeatureUpdated?.({
          einsatzId: 'einsatz-1',
          features: [testFeature, feature2],
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      expect(draw.add).toHaveBeenCalledTimes(2);
      expect(draw.add).toHaveBeenCalledWith(testFeature);
      expect(draw.add).toHaveBeenCalledWith(feature2);
    });
  });

  describe('Remote-Feature-Löschung', () => {
    it('sollte Features via draw.delete löschen', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        latestCallbacks.onFeatureDeleted?.({
          einsatzId: 'einsatz-1',
          featureIds: ['feat-1', 'feat-2'],
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      expect(draw.delete).toHaveBeenCalledWith(['feat-1', 'feat-2']);
    });

    it('sollte isRemoteApplyRef während Remote-Delete setzen', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      let wasRemoteApplyDuringDelete = false;
      draw.delete.mockImplementation(() => {
        wasRemoteApplyDuringDelete = isRemoteApplyRef.current;
      });

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        latestCallbacks.onFeatureDeleted?.({
          einsatzId: 'einsatz-1',
          featureIds: ['feat-1'],
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      expect(wasRemoteApplyDuringDelete).toBe(true);
      expect(isRemoteApplyRef.current).toBe(false);
    });

    it('sollte Repaint nach Remote-Delete erzwingen', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        latestCallbacks.onFeatureDeleted?.({
          einsatzId: 'einsatz-1',
          featureIds: ['feat-1'],
          timestamp: '2026-04-09T12:00:00Z',
        });
      });

      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(draw.set).toHaveBeenCalled();
    });
  });

  describe('sendDelta Dispatch', () => {
    it('sollte sendFeatureCreated für create-Typ aufrufen', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      const { result } = renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        result.current.sendDelta('create', { features: [testFeature] });
      });

      expect(mockSendFeatureCreated).toHaveBeenCalledWith('einsatz-1', testFeature);
    });

    it('sollte sendFeatureUpdated für update-Typ aufrufen', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      const { result } = renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        result.current.sendDelta('update', { features: [testFeature] });
      });

      expect(mockSendFeatureUpdated).toHaveBeenCalledWith('einsatz-1', [testFeature]);
    });

    it('sollte sendFeatureDeleted für delete-Typ aufrufen', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      const { result } = renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        result.current.sendDelta('delete', { featureIds: ['feat-1'] });
      });

      expect(mockSendFeatureDeleted).toHaveBeenCalledWith('einsatz-1', ['feat-1']);
    });

    it('sollte bei leerem Payload nichts senden', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      const { result } = renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      act(() => {
        result.current.sendDelta('create', {});
        result.current.sendDelta('update', {});
        result.current.sendDelta('delete', {});
      });

      expect(mockSendFeatureCreated).not.toHaveBeenCalled();
      expect(mockSendFeatureUpdated).not.toHaveBeenCalled();
      expect(mockSendFeatureDeleted).not.toHaveBeenCalled();
    });
  });

  describe('Hook Return Values', () => {
    it('sollte wsStatus und isConnected zurückgeben', () => {
      const draw = createMockDraw();
      const drawRef = createDrawRef(draw);
      const isRemoteApplyRef = createIsRemoteApplyRef();

      const { result } = renderHook(() =>
        useLagekarteSync({
          einsatzId: 'einsatz-1',
          drawRef: drawRef as any,
          isRemoteApplyRef,
        }),
      );

      expect(result.current.wsStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
      expect(typeof result.current.sendDelta).toBe('function');
    });
  });
});
