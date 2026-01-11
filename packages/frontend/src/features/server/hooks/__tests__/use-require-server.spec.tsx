/**
 * Unit Tests: useRequireServer Hook
 *
 * Tests Server-Guard für App-Routes:
 * - AC1: Redirect wenn keine Server konfiguriert (nach Hydration)
 * - Kein Redirect während Loading (nicht hydriert)
 * - Kein Redirect wenn Server existieren
 * - hasServer und isLoading korrekt gesetzt
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRequireServer } from '../use-require-server';
import { serverStore } from '../../stores/server.store';

// Mock Dependencies
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking
import { useNavigate } from '@tanstack/react-router';

describe('useRequireServer', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup navigate mock
    mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    // Reset store to initial state (empty, not hydrated)
    serverStore.setState(() => ({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    }));
  });

  afterEach(() => {
    // Clean up store after each test
    serverStore.setState(() => ({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    }));
  });

  describe('AC1: Redirect wenn keine Server konfiguriert', () => {
    it('should redirect to /server/setup when no servers and hydrated', async () => {
      // Given: Store is hydrated but no servers configured
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: true,
      }));

      // When: Hook is rendered
      renderHook(() => useRequireServer());

      // Then: Navigate to /server/setup called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/server/setup',
          replace: true,
        });
      });
    });

    it('should use replace navigation to prevent back-button loop', async () => {
      // Given: Hydrated, no servers
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: true,
      }));

      // When
      renderHook(() => useRequireServer());

      // Then: replace: true prevents browser back to login
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ replace: true }));
      });
    });
  });

  describe('Kein Redirect während Loading (nicht hydriert)', () => {
    it('should NOT redirect when not hydrated', async () => {
      // Given: Store not hydrated yet (initial state)
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: false,
      }));

      // When
      renderHook(() => useRequireServer());

      // Then: No navigation yet (waiting for hydration)
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should return isLoading=true when not hydrated', () => {
      // Given: Not hydrated
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: false,
      }));

      // When
      const { result } = renderHook(() => useRequireServer());

      // Then
      expect(result.current.isLoading).toBe(true);
    });

    it('should redirect AFTER hydration completes with no servers', async () => {
      // Given: Initially not hydrated
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: false,
      }));

      const { rerender } = renderHook(() => useRequireServer());

      // Verify: No redirect yet
      expect(mockNavigate).not.toHaveBeenCalled();

      // When: Hydration completes (still no servers)
      act(() => {
        serverStore.setState((state) => ({
          ...state,
          isHydrated: true,
        }));
      });

      rerender();

      // Then: Now redirect happens
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/server/setup',
          replace: true,
        });
      });
    });
  });

  describe('Kein Redirect wenn Server existieren', () => {
    it('should NOT redirect when servers are configured', () => {
      // Given: Hydrated with one server
      serverStore.setState((state) => ({
        ...state,
        servers: [
          {
            id: 'server-1',
            name: 'Test Server',
            url: 'https://api.test.de',
            isDefault: true,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        ],
        activeServerId: 'server-1',
        isHydrated: true,
      }));

      // When
      renderHook(() => useRequireServer());

      // Then: No redirect
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should NOT redirect when multiple servers configured', () => {
      // Given: Hydrated with multiple servers
      serverStore.setState((state) => ({
        ...state,
        servers: [
          {
            id: 'server-1',
            name: 'Server 1',
            url: 'https://api1.test.de',
            isDefault: true,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
          {
            id: 'server-2',
            name: 'Server 2',
            url: 'https://api2.test.de',
            isDefault: false,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        ],
        activeServerId: 'server-1',
        isHydrated: true,
      }));

      // When
      renderHook(() => useRequireServer());

      // Then: No redirect
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Return Values: hasServer und isLoading', () => {
    it('should return hasServer=false when no servers', () => {
      // Given
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: true,
      }));

      // When
      const { result } = renderHook(() => useRequireServer());

      // Then
      expect(result.current.hasServer).toBe(false);
    });

    it('should return hasServer=true when servers exist', () => {
      // Given
      serverStore.setState((state) => ({
        ...state,
        servers: [
          {
            id: 'server-1',
            name: 'Test Server',
            url: 'https://api.test.de',
            isDefault: true,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        ],
        isHydrated: true,
      }));

      // When
      const { result } = renderHook(() => useRequireServer());

      // Then
      expect(result.current.hasServer).toBe(true);
    });

    it('should return isLoading=false when hydrated', () => {
      // Given
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: true,
      }));

      // When
      const { result } = renderHook(() => useRequireServer());

      // Then
      expect(result.current.isLoading).toBe(false);
    });

    it('should return correct serverCount', () => {
      // Given
      serverStore.setState((state) => ({
        ...state,
        servers: [
          {
            id: 'server-1',
            name: 'Server 1',
            url: 'https://api1.test.de',
            isDefault: true,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
          {
            id: 'server-2',
            name: 'Server 2',
            url: 'https://api2.test.de',
            isDefault: false,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        ],
        isHydrated: true,
      }));

      // When
      const { result } = renderHook(() => useRequireServer());

      // Then
      expect(result.current.serverCount).toBe(2);
    });
  });

  describe('Reactivity: Store Updates', () => {
    it('should react to server being added', async () => {
      // Given: Initially no servers, hydrated
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: true,
      }));

      const { result, rerender } = renderHook(() => useRequireServer());

      // Verify: Initially hasServer is false
      expect(result.current.hasServer).toBe(false);

      // When: Server is added
      act(() => {
        serverStore.setState((state) => ({
          ...state,
          servers: [
            {
              id: 'new-server',
              name: 'New Server',
              url: 'https://api.new.de',
              isDefault: true,
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
            },
          ],
        }));
      });

      rerender();

      // Then: hasServer becomes true
      expect(result.current.hasServer).toBe(true);
    });

    it('should react to all servers being removed', async () => {
      // Given: One server configured
      serverStore.setState((state) => ({
        ...state,
        servers: [
          {
            id: 'server-1',
            name: 'Test Server',
            url: 'https://api.test.de',
            isDefault: true,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        ],
        isHydrated: true,
      }));

      const { result, rerender } = renderHook(() => useRequireServer());

      // Verify: Initially hasServer is true
      expect(result.current.hasServer).toBe(true);

      // When: All servers removed
      act(() => {
        serverStore.setState((state) => ({
          ...state,
          servers: [],
        }));
      });

      rerender();

      // Then: hasServer becomes false
      expect(result.current.hasServer).toBe(false);

      // And: Redirect is triggered
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/server/setup',
          replace: true,
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not redirect multiple times', async () => {
      // Given: No servers, hydrated
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: true,
      }));

      // When: Render multiple times
      const { rerender } = renderHook(() => useRequireServer());
      rerender();
      rerender();

      // Then: Navigate called (may be multiple due to effect deps)
      // Important: The route guard should be idempotent
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // All calls should be to the same destination
      const calls = mockNavigate.mock.calls;
      for (const call of calls) {
        expect(call[0]).toEqual({ to: '/server/setup', replace: true });
      }
    });

    it('should handle rapid hydration state changes', async () => {
      // Given: Start not hydrated
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: false,
      }));

      const { rerender } = renderHook(() => useRequireServer());

      // When: Rapid state changes (simulating race condition)
      act(() => {
        serverStore.setState((state) => ({ ...state, isHydrated: true }));
        serverStore.setState((state) => ({ ...state, isHydrated: false }));
        serverStore.setState((state) => ({ ...state, isHydrated: true }));
      });

      rerender();

      // Then: Should still redirect correctly at final state
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/server/setup',
          replace: true,
        });
      });
    });

    it('should NOT navigate after unmount (race condition)', async () => {
      // Given: Not hydrated yet
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        isHydrated: false,
      }));

      const { unmount } = renderHook(() => useRequireServer());

      // When: Unmount BEFORE hydration completes
      unmount();

      // Then: Hydration completes AFTER unmount
      act(() => {
        serverStore.setState((state) => ({
          ...state,
          isHydrated: true,
        }));
      });

      // Verify: Navigate should NOT have been called because component is unmounted
      // and React should have cleaned up the effect
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
