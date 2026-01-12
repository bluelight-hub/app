import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useServerListHealth } from '../use-server-list-health';
import { serverStore } from '../../stores/server.store';
import type { ServerConfig } from '../../types/server-config';

// Mock HealthApi - muss als Funktion definiert werden, da Vitest Klassen erwartet
const mockHealthControllerCheck = vi.fn();

vi.mock('@bluelight-hub/shared/client', () => {
  return {
    Configuration: function Configuration() {
      return {};
    },
    HealthApi: function HealthApi() {
      return {
        healthControllerCheck: mockHealthControllerCheck,
      };
    },
  };
});

// Mock logger
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useServerListHealth', () => {
  const createMockServer = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
    id: 'server-1',
    name: 'Test Server',
    url: 'https://test.example.com',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    lastUsedAt: '2026-01-10T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ============================================
  // Initialization Tests
  // ============================================

  describe('Initialization', () => {
    it('should not check when store is not hydrated', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        isHydrated: false, // Store nicht hydratisiert
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then - HealthApi sollte nicht aufgerufen werden
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockHealthControllerCheck).not.toHaveBeenCalled();
    });

    it('should not check when no servers are present', async () => {
      // Given
      serverStore.setState((state) => ({
        ...state,
        servers: [], // Keine Server
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then - HealthApi sollte nicht aufgerufen werden
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockHealthControllerCheck).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Health Check Tests
  // ============================================

  describe('Health Check Execution', () => {
    it('should set all servers to checking before health check', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });

      // Mock langsamen Health-Check um Status zu beobachten
      mockHealthControllerCheck.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ status: 'ok' }), 100)));

      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then - Beide Server sollten auf 'checking' gesetzt werden
      await waitFor(() => {
        const status1 = serverStore.state.connectionStatus.get('server-1');
        const status2 = serverStore.state.connectionStatus.get('server-2');
        expect(status1).toBe('checking');
        expect(status2).toBe('checking');
      });
    });

    it('should set status to connected on successful health check', async () => {
      // Given
      const server = createMockServer();
      mockHealthControllerCheck.mockImplementation(() => Promise.resolve({ status: 'ok' }));

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then
      await waitFor(() => {
        const status = serverStore.state.connectionStatus.get('server-1');
        expect(status).toBe('connected');
      });
    });

    it('should set status to disconnected on failed health check', async () => {
      // Given
      const server = createMockServer();
      mockHealthControllerCheck.mockImplementation(() => Promise.reject(new Error('Connection failed')));

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then
      await waitFor(() => {
        const status = serverStore.state.connectionStatus.get('server-1');
        expect(status).toBe('disconnected');
      });
    });

    it('should set status to disconnected when health response is not ok', async () => {
      // Given
      const server = createMockServer();
      mockHealthControllerCheck.mockImplementation(() => Promise.resolve({ status: 'error' })); // Status nicht 'ok'

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then
      await waitFor(() => {
        const status = serverStore.state.connectionStatus.get('server-1');
        expect(status).toBe('disconnected');
      });
    });

    it('should perform parallel health checks for all servers', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      const server3 = createMockServer({ id: 'server-3', name: 'Server 3' });

      mockHealthControllerCheck.mockImplementation(() => Promise.resolve({ status: 'ok' }));

      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2, server3],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then - Alle drei Server sollten geprüft werden
      await waitFor(() => {
        expect(mockHealthControllerCheck).toHaveBeenCalledTimes(3);
      });

      // Alle Server sollten connected sein
      await waitFor(() => {
        const status1 = serverStore.state.connectionStatus.get('server-1');
        const status2 = serverStore.state.connectionStatus.get('server-2');
        const status3 = serverStore.state.connectionStatus.get('server-3');
        expect(status1).toBe('connected');
        expect(status2).toBe('connected');
        expect(status3).toBe('connected');
      });
    });
  });

  // ============================================
  // Timeout Tests
  // ============================================

  describe('Timeout Handling', () => {
    it('should mark server as disconnected on timeout', async () => {
      // Given
      vi.useFakeTimers();
      const server = createMockServer();

      // Mock einen Health-Check der nie resolved (simuliert Timeout)
      mockHealthControllerCheck.mockImplementation(
        ({ signal }: { signal: AbortSignal }) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => {
              reject(new Error('Aborted'));
            });
          }),
      );

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Status sollte initial auf 'checking' sein
      await vi.waitFor(() => {
        const status = serverStore.state.connectionStatus.get('server-1');
        expect(status).toBe('checking');
      });

      // Advance past timeout (5000ms)
      await act(async () => {
        vi.advanceTimersByTime(5001);
      });

      // Then - Server sollte als disconnected markiert werden
      await vi.waitFor(() => {
        const status = serverStore.state.connectionStatus.get('server-1');
        expect(status).toBe('disconnected');
      });
    });
  });

  // ============================================
  // Cleanup Tests
  // ============================================

  describe('Cleanup Behavior', () => {
    it('should abort running checks on unmount', async () => {
      // Given
      const server = createMockServer();
      let abortSignal: AbortSignal | undefined;

      mockHealthControllerCheck.mockImplementation(({ signal }: { signal: AbortSignal }) => {
        abortSignal = signal;
        return new Promise<{ status: string }>(() => {
          // Simuliert einen langen Request, der abgebrochen werden kann
        });
      });

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        isHydrated: true,
      }));

      // When
      const { unmount } = renderHook(() => useServerListHealth());

      // Wait for check to start
      await waitFor(() => {
        expect(mockHealthControllerCheck).toHaveBeenCalled();
        expect(abortSignal).toBeDefined();
      });

      // Unmount sollte Check abbrechen
      unmount();

      // Then - Signal sollte aborted sein
      expect(abortSignal?.aborted).toBe(true);
    });

    it('should abort old checks when server list changes', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });

      let capturedSignal: AbortSignal | undefined;
      let callCount = 0;

      mockHealthControllerCheck.mockImplementation(({ signal }: { signal: AbortSignal }) => {
        callCount++;
        if (callCount === 1) {
          capturedSignal = signal;
        }
        return new Promise<{ status: string }>((resolve) => {
          // Simuliert langsamen Request
          const timeoutId = setTimeout(() => resolve({ status: 'ok' }), 500);
          signal.addEventListener('abort', () => clearTimeout(timeoutId));
        });
      });

      serverStore.setState((state) => ({
        ...state,
        servers: [server1],
        isHydrated: true,
      }));

      // When - Render mit erstem Server
      renderHook(() => useServerListHealth());

      // Wait for first check to start
      await waitFor(() => {
        expect(callCount).toBeGreaterThanOrEqual(1);
        expect(capturedSignal).toBeDefined();
      });

      // Change server list - dies sollte den vorherigen Check abbrechen
      act(() => {
        serverStore.setState((state) => ({
          ...state,
          servers: [server2],
        }));
      });

      // Then - Erster Check sollte abgebrochen werden
      await waitFor(() => {
        expect(capturedSignal?.aborted).toBe(true);
      });
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle mixed health check results', async () => {
      // Given
      const server1 = createMockServer({
        id: 'server-1',
        name: 'Server 1',
        url: 'https://server1.example.com',
      });
      const server2 = createMockServer({
        id: 'server-2',
        name: 'Server 2',
        url: 'https://server2.example.com',
      });

      // Mock basierend auf URL unterschiedlich reagieren
      let callIndex = 0;
      mockHealthControllerCheck.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({ status: 'ok' });
        }
        return Promise.reject(new Error('Connection refused'));
      });

      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then
      await waitFor(() => {
        const status1 = serverStore.state.connectionStatus.get('server-1');
        const status2 = serverStore.state.connectionStatus.get('server-2');
        expect(status1).toBe('connected');
        expect(status2).toBe('disconnected');
      });
    });

    it('should normalize server URLs with trailing slash', async () => {
      // Given
      const server = createMockServer({ url: 'https://test.example.com/' }); // Mit Trailing Slash
      mockHealthControllerCheck.mockImplementation(() => Promise.resolve({ status: 'ok' }));

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        isHydrated: true,
      }));

      // When
      renderHook(() => useServerListHealth());

      // Then - Check sollte erfolgreich durchgeführt werden
      await waitFor(() => {
        const status = serverStore.state.connectionStatus.get('server-1');
        expect(status).toBe('connected');
      });
    });
  });
});
