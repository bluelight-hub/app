/**
 * Unit Tests für useLagekarteWebSocket Hook
 *
 * Verifiziert die WebSocket-Integration für Echtzeit-Lagekarte-Synchronisierung:
 * - Verbindungs-Lifecycle (connect, disconnect, reconnect)
 * - Event-Deduplizierung via processedEventIds Set
 * - Sende-Funktionen (create, update, delete)
 * - Status-Management (globaler Store + lokaler State)
 * - State.geändert Event mit Query-Cache-Invalidierung
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useLagekarteWebSocket,
  useLagekarteWebSocketStatus,
  type LagekarteFeatureCreatedPayload,
  type LagekarteFeatureUpdatedPayload,
  type LagekarteFeatureDeletedPayload,
  type LagekarteStateGeaendertPayload,
} from '../use-lagekarte-websocket';

// ============================================
// Mocks
// ============================================

const { mockSocket, mockIo } = vi.hoisted(() => {
  const socket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  };
  return {
    mockSocket: socket,
    mockIo: vi.fn(() => socket),
  };
});

vi.mock('socket.io-client', () => ({
  io: mockIo,
}));

const mockInvalidateQueries = vi.fn();
const mockFind = vi.fn().mockReturnValue(undefined);

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    getMutationCache: () => ({
      find: mockFind,
    }),
  }),
  QueryClient: class {
    getQueryCache() {
      return { subscribe: vi.fn() };
    }
    getMutationCache() {
      return { subscribe: vi.fn() };
    }
    setDefaultOptions() {}
  },
  QueryCache: class {
    subscribe() {}
  },
  MutationCache: class {
    subscribe() {}
  },
}));

vi.mock('@/shared/api/client', () => ({
  getBaseUrl: () => 'http://localhost:3091',
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../queries', () => ({
  LAGEKARTE_QUERY_KEYS: {
    all: ['lagekarte'],
    byEinsatz: (einsatzId: string) => ['lagekarte', 'einsatz', einsatzId],
  },
}));

// ============================================
// Test Helpers
// ============================================

/** Flusht den setTimeout(fn, 0) aus dem useEffect Auto-Connect */
const flushConnectTimer = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

/** Holt einen registrierten Event-Handler vom Mock-Socket */
const getEventHandler = (eventName: string) => {
  return mockSocket.on.mock.calls.find((call) => call[0] === eventName)?.[1];
};

// ============================================
// Tests
// ============================================

describe('useLagekarteWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockFind.mockReturnValue(undefined);
  });

  describe('Verbindungs-Lifecycle', () => {
    it('sollte beim Mount automatisch verbinden', async () => {
      // Given: Simulate connect event
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });

      // When
      renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      // Then
      expect(mockIo).toHaveBeenCalledWith(
        'http://localhost:3091/ws/v-alpha/lagekarte',
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          reconnection: true,
          withCredentials: true,
        }),
      );
    });

    it('sollte dem Einsatz-Room beitreten nach Verbindung', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });

      renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-42' }));
      await flushConnectTimer();

      expect(mockSocket.emit).toHaveBeenCalledWith('join:einsatz', { einsatzId: 'einsatz-42' });
    });

    it('sollte nicht verbinden wenn enabled=false', async () => {
      renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1', enabled: false }));
      await flushConnectTimer();

      expect(mockIo).not.toHaveBeenCalled();
    });

    it('sollte nicht verbinden wenn einsatzId leer ist', async () => {
      renderHook(() => useLagekarteWebSocket({ einsatzId: '' }));
      await flushConnectTimer();

      expect(mockIo).not.toHaveBeenCalled();
    });

    it('sollte beim Unmount disconnecten', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });

      const { unmount } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('sollte Status "connected" nach erfolgreicher Verbindung setzen', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });

      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      expect(result.current.status).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });

    it('sollte Status "error" bei Verbindungsfehler setzen', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          callback(new Error('Connection refused'));
        }
      });

      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      expect(result.current.status).toBe('error');
      expect(result.current.isConnected).toBe(false);
    });

    it('sollte Status "disconnected" bei Trennung setzen', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
        if (event === 'disconnect') {
          callback('io server disconnect');
        }
      });

      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      expect(result.current.status).toBe('disconnected');
    });

    it('sollte leave:einsatz senden beim Disconnect wenn verbunden', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });

      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      act(() => {
        result.current.disconnect();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('leave:einsatz', { einsatzId: 'einsatz-1' });
    });

    it('sollte nicht doppelt verbinden wenn bereits verbunden', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });

      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      // Manuell connect aufrufen während bereits verbunden
      act(() => {
        result.current.connect();
      });

      // io() sollte nur einmal aufgerufen worden sein
      expect(mockIo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event-Handler', () => {
    beforeEach(() => {
      // Standard: connect Event simulieren, alle Events registrieren
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });
    });

    it('sollte onFeatureCreated Callback aufrufen', async () => {
      const onFeatureCreated = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureCreated,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.created');
      expect(handler).toBeDefined();

      const payload: LagekarteFeatureCreatedPayload = {
        einsatzId: 'einsatz-1',
        feature: { type: 'Feature', id: 'feat-1', geometry: { type: 'Point', coordinates: [10, 50] }, properties: {} },
        timestamp: '2026-04-09T12:00:00Z',
      };

      await act(async () => {
        handler(payload);
      });

      expect(onFeatureCreated).toHaveBeenCalledWith(payload);
    });

    it('sollte onFeatureUpdated Callback aufrufen', async () => {
      const onFeatureUpdated = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureUpdated,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.updated');
      const payload: LagekarteFeatureUpdatedPayload = {
        einsatzId: 'einsatz-1',
        features: [{ type: 'Feature', id: 'feat-1', geometry: { type: 'Point', coordinates: [10, 50] }, properties: {} }],
        timestamp: '2026-04-09T12:00:00Z',
      };

      await act(async () => {
        handler(payload);
      });

      expect(onFeatureUpdated).toHaveBeenCalledWith(payload);
    });

    it('sollte onFeatureDeleted Callback aufrufen', async () => {
      const onFeatureDeleted = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureDeleted,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.deleted');
      const payload: LagekarteFeatureDeletedPayload = {
        einsatzId: 'einsatz-1',
        featureIds: ['feat-1', 'feat-2'],
        timestamp: '2026-04-09T12:00:00Z',
      };

      await act(async () => {
        handler(payload);
      });

      expect(onFeatureDeleted).toHaveBeenCalledWith(payload);
    });

    it('sollte ungültiges feature.created Payload ignorieren', async () => {
      const onFeatureCreated = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureCreated,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.created');

      await act(async () => {
        handler({ einsatzId: 'einsatz-1' }); // Kein feature-Feld
      });

      expect(onFeatureCreated).not.toHaveBeenCalled();
    });

    it('sollte ungültiges feature.updated Payload ignorieren', async () => {
      const onFeatureUpdated = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureUpdated,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.updated');

      await act(async () => {
        handler({ einsatzId: 'einsatz-1' }); // Kein features-Feld
      });

      expect(onFeatureUpdated).not.toHaveBeenCalled();
    });

    it('sollte ungültiges feature.deleted Payload ignorieren', async () => {
      const onFeatureDeleted = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureDeleted,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.deleted');

      await act(async () => {
        handler({ einsatzId: 'einsatz-1' }); // Kein featureIds-Feld
      });

      expect(onFeatureDeleted).not.toHaveBeenCalled();
    });

    it('sollte ungültiges state.geaendert Payload ignorieren', async () => {
      renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:state.geaendert');

      await act(async () => {
        handler({}); // Kein einsatzId-Feld
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('Event-Deduplizierung', () => {
    beforeEach(() => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });
    });

    it('sollte doppelte Events ignorieren', async () => {
      const onFeatureCreated = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureCreated,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.created');
      const payload: LagekarteFeatureCreatedPayload = {
        einsatzId: 'einsatz-1',
        feature: { type: 'Feature', id: 'feat-1', geometry: { type: 'Point', coordinates: [10, 50] }, properties: {} },
        timestamp: '2026-04-09T12:00:00Z',
      };

      // Erstes Mal: wird verarbeitet
      await act(async () => {
        handler(payload);
      });
      expect(onFeatureCreated).toHaveBeenCalledTimes(1);

      // Zweites Mal: wird dedupliziert
      await act(async () => {
        handler(payload);
      });
      expect(onFeatureCreated).toHaveBeenCalledTimes(1);
    });

    it('sollte verschiedene Events nicht deduplizieren', async () => {
      const onFeatureCreated = vi.fn();
      renderHook(() =>
        useLagekarteWebSocket({
          einsatzId: 'einsatz-1',
          onFeatureCreated,
        }),
      );
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:feature.created');

      const payload1: LagekarteFeatureCreatedPayload = {
        einsatzId: 'einsatz-1',
        feature: { type: 'Feature', id: 'feat-1', geometry: { type: 'Point', coordinates: [10, 50] }, properties: {} },
        timestamp: '2026-04-09T12:00:00Z',
      };

      const payload2: LagekarteFeatureCreatedPayload = {
        einsatzId: 'einsatz-1',
        feature: { type: 'Feature', id: 'feat-2', geometry: { type: 'Point', coordinates: [11, 51] }, properties: {} },
        timestamp: '2026-04-09T12:00:01Z',
      };

      await act(async () => {
        handler(payload1);
        handler(payload2);
      });

      expect(onFeatureCreated).toHaveBeenCalledTimes(2);
    });
  });

  describe('State.geändert Event', () => {
    beforeEach(() => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });
    });

    it('sollte Query-Cache invalidieren bei state.geaendert', async () => {
      renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:state.geaendert');
      const payload: LagekarteStateGeaendertPayload = {
        einsatzId: 'einsatz-1',
        lagekarteId: 'lk-1',
        timestamp: '2026-04-09T12:00:00Z',
      };

      await act(async () => {
        handler(payload);
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['lagekarte', 'einsatz', 'einsatz-1'],
      });
    });

    it('sollte Query-Cache NICHT invalidieren wenn Save-Mutation pending', async () => {
      // Simuliere pending Mutation
      mockFind.mockReturnValue({ state: { status: 'pending' } });

      renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      const handler = getEventHandler('lagekarte:state.geaendert');
      const payload: LagekarteStateGeaendertPayload = {
        einsatzId: 'einsatz-1',
        lagekarteId: 'lk-1',
        timestamp: '2026-04-09T12:00:00Z',
      };

      await act(async () => {
        handler(payload);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('Sende-Funktionen', () => {
    beforeEach(() => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          callback();
        }
      });
    });

    it('sollte Feature-Created senden wenn verbunden', async () => {
      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      const feature = { type: 'Feature' as const, id: 'feat-1', geometry: { type: 'Point' as const, coordinates: [10, 50] }, properties: {} };

      act(() => {
        result.current.sendFeatureCreated('einsatz-1', feature);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'lagekarte:feature.created',
        expect.objectContaining({
          einsatzId: 'einsatz-1',
          feature,
        }),
      );
    });

    it('sollte Feature-Updated senden wenn verbunden', async () => {
      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      const features = [{ type: 'Feature' as const, id: 'feat-1', geometry: { type: 'Point' as const, coordinates: [10, 50] }, properties: {} }];

      act(() => {
        result.current.sendFeatureUpdated('einsatz-1', features);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'lagekarte:feature.updated',
        expect.objectContaining({
          einsatzId: 'einsatz-1',
          features,
        }),
      );
    });

    it('sollte Feature-Deleted senden wenn verbunden', async () => {
      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1' }));
      await flushConnectTimer();

      act(() => {
        result.current.sendFeatureDeleted('einsatz-1', ['feat-1', 'feat-2']);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'lagekarte:feature.deleted',
        expect.objectContaining({
          einsatzId: 'einsatz-1',
          featureIds: ['feat-1', 'feat-2'],
        }),
      );
    });

    it('sollte NICHT senden wenn nicht verbunden', async () => {
      // Nicht verbinden
      const { result } = renderHook(() => useLagekarteWebSocket({ einsatzId: 'einsatz-1', enabled: false }));
      await flushConnectTimer();

      act(() => {
        result.current.sendFeatureCreated('einsatz-1', { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} });
      });

      // emit sollte nicht aufgerufen werden (kein Socket)
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('useLagekarteWebSocketStatus', () => {
    it('sollte initial false zurückgeben', () => {
      const { result } = renderHook(() => useLagekarteWebSocketStatus());
      expect(result.current).toBe(false);
    });
  });
});
