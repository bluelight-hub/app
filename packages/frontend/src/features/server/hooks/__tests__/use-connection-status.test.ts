import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConnectionStatus } from '../use-connection-status';
import { serverStore } from '../../stores/server.store';
import type { ServerConfig } from '../../types/server-config';

describe('useConnectionStatus', () => {
  beforeEach(() => {
    // Reset Store State
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });
  });

  it('should return connection status for server', () => {
    // Given
    const server: ServerConfig = {
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };

    const statusMap = new Map([['1', 'connected' as const]]);

    serverStore.setState((state) => ({
      ...state,
      servers: [server],
      connectionStatus: statusMap,
    }));

    // When
    const { result } = renderHook(() => useConnectionStatus('1'));

    // Then
    expect(result.current).toBe('connected');
  });

  it('should return undefined when server has no status', () => {
    // Given
    const server: ServerConfig = {
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };

    serverStore.setState((state) => ({
      ...state,
      servers: [server],
      connectionStatus: new Map(),
    }));

    // When
    const { result } = renderHook(() => useConnectionStatus('1'));

    // Then
    expect(result.current).toBeUndefined();
  });

  it('should return undefined for non-existent server ID', () => {
    // Given - Empty state

    // When
    const { result } = renderHook(() => useConnectionStatus('non-existent'));

    // Then
    expect(result.current).toBeUndefined();
  });

  it('should update when connection status changes', async () => {
    // Given
    const server: ServerConfig = {
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
    };

    // Given - Set initial state BEFORE renderHook
    const statusMap = new Map([['1', 'checking' as const]]);
    serverStore.setState((state) => ({
      ...state,
      servers: [server],
      connectionStatus: statusMap,
    }));

    // When
    const { result } = renderHook(() => useConnectionStatus('1'));

    // Then
    expect(result.current).toBe('checking');

    // When - Change status
    const newStatusMap = new Map([['1', 'connected' as const]]);
    serverStore.setState((state) => ({
      ...state,
      connectionStatus: newStatusMap,
    }));

    // Then
    await waitFor(() => {
      expect(result.current).toBe('connected');
    });
  });

  it('should support all connection status values', async () => {
    // Given
    const server: ServerConfig = {
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
      servers: [server],
      connectionStatus: new Map([['1', 'checking']]),
    }));

    // When
    const { result: result1 } = renderHook(() => useConnectionStatus('1'));

    // Then - Test "checking"
    expect(result1.current).toBe('checking');

    // When - Test "connected"
    serverStore.setState((state) => ({
      ...state,
      connectionStatus: new Map([['1', 'connected']]),
    }));
    await waitFor(() => {
      expect(result1.current).toBe('connected');
    });

    // When - Test "disconnected"
    serverStore.setState((state) => ({
      ...state,
      connectionStatus: new Map([['1', 'disconnected']]),
    }));
    await waitFor(() => {
      expect(result1.current).toBe('disconnected');
    });
  });
});
