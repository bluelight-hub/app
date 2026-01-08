import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useServerList } from '../use-server-list';
import { serverStore } from '../../stores/server.store';
import type { ServerConfig } from '../../types/server-config';

describe('useServerList', () => {
  beforeEach(() => {
    // Reset Store State
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });
  });

  it('should return all servers', () => {
    // Given
    const server1: ServerConfig = {
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };
    const server2: ServerConfig = {
      id: '2',
      name: 'Server 2',
      url: 'https://server2.com',
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };

    serverStore.setState((state) => ({
      ...state,
      servers: [server1, server2],
    }));

    // When
    const { result } = renderHook(() => useServerList());

    // Then
    expect(result.current).toHaveLength(2);
    expect(result.current[0].id).toBe('1');
    expect(result.current[1].id).toBe('2');
  });

  it('should return empty array when no servers', () => {
    // Given - Empty state

    // When
    const { result } = renderHook(() => useServerList());

    // Then
    expect(result.current).toEqual([]);
  });

  it('should sort servers by lastUsedAt (newest first)', () => {
    // Given
    const oldServer: ServerConfig = {
      id: '1',
      name: 'Old Server',
      url: 'https://old.com',
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };
    const newServer: ServerConfig = {
      id: '2',
      name: 'New Server',
      url: 'https://new.com',
      isDefault: true,
      createdAt: '2025-01-05T00:00:00.000Z',
      lastUsedAt: '2025-01-05T00:00:00.000Z',
    };

    serverStore.setState((state) => ({
      ...state,
      servers: [oldServer, newServer],
    }));

    // When
    const { result } = renderHook(() => useServerList());

    // Then
    expect(result.current[0].id).toBe('2'); // New Server first
    expect(result.current[1].id).toBe('1'); // Old Server second
  });

  it('should handle servers without lastUsedAt', () => {
    // Given
    const serverWithLastUsed: ServerConfig = {
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-05T00:00:00.000Z',
    };
    const serverWithoutLastUsed: ServerConfig = {
      id: '2',
      name: 'Server 2',
      url: 'https://server2.com',
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: null,
    };

    serverStore.setState((state) => ({
      ...state,
      servers: [serverWithoutLastUsed, serverWithLastUsed],
    }));

    // When
    const { result } = renderHook(() => useServerList());

    // Then
    expect(result.current[0].id).toBe('1'); // Server with lastUsedAt first
    expect(result.current[1].id).toBe('2'); // Server without lastUsedAt second
  });

  it('should update when server list changes', async () => {
    // Given
    const server1: ServerConfig = {
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };

    // Given - Set initial state BEFORE renderHook
    serverStore.setState((state) => ({
      ...state,
      servers: [server1],
    }));

    // When
    const { result } = renderHook(() => useServerList());

    // Then
    expect(result.current).toHaveLength(1);

    // When - Add another server
    const server2: ServerConfig = {
      id: '2',
      name: 'Server 2',
      url: 'https://server2.com',
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };

    serverStore.setState((state) => ({
      ...state,
      servers: [server1, server2],
    }));

    // Then
    await waitFor(() => {
      expect(result.current).toHaveLength(2);
    });
  });
});
