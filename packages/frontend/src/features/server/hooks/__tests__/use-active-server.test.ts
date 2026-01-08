import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActiveServer } from '../use-active-server';
import { serverStore } from '../../stores/server.store';
import type { ServerConfig } from '../../types/server-config';

describe('useActiveServer', () => {
  beforeEach(() => {
    // Reset Store State
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });
  });

  it('should return active server', () => {
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
      activeServerId: '1',
    }));

    // When
    const { result } = renderHook(() => useActiveServer());

    // Then
    expect(result.current).toEqual(
      expect.objectContaining({
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
      }),
    );
  });

  it('should return null when no active server', () => {
    // Given
    serverStore.setState((state) => ({
      ...state,
      servers: [
        {
          id: '1',
          name: 'Server 1',
          url: 'https://server1.com',
          isDefault: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          lastUsedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      activeServerId: null,
    }));

    // When
    const { result } = renderHook(() => useActiveServer());

    // Then
    expect(result.current).toBeNull();
  });

  it('should return null when server list is empty', () => {
    // Given - Empty state

    // When
    const { result } = renderHook(() => useActiveServer());

    // Then
    expect(result.current).toBeNull();
  });

  it('should update when active server changes', async () => {
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

    // Given - Set initial state BEFORE renderHook
    serverStore.setState((state) => ({
      ...state,
      servers: [server1, server2],
      activeServerId: '1',
    }));

    // When
    const { result } = renderHook(() => useActiveServer());

    // Then
    expect(result.current?.id).toBe('1');

    // When - Change active server
    serverStore.setState((state) => ({
      ...state,
      activeServerId: '2',
    }));

    // Then
    await waitFor(() => {
      expect(result.current?.id).toBe('2');
    });
  });
});
