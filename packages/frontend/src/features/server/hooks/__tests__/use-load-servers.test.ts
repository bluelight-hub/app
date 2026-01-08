import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLoadServers } from '../use-load-servers';
import { serverStore } from '../../stores/server.store';
import * as serverStoreModule from '../../stores/server.store';
import type { ServerConfig } from '../../types/server-config';

// Mock hydrateServerStore
vi.mock('../../stores/server.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../stores/server.store')>();
  return {
    ...actual,
    hydrateServerStore: vi.fn(),
  };
});

describe('useLoadServers', () => {
  beforeEach(() => {
    // Reset Store State
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });

    // Clear mocks
    vi.clearAllMocks();
  });

  it('should trigger hydration on mount', async () => {
    // Given
    const servers: ServerConfig[] = [
      {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    vi.mocked(serverStoreModule.hydrateServerStore).mockResolvedValue(undefined);

    // When
    const { result } = renderHook(() => useLoadServers());

    // Then - Initial loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    // Wait for hydration
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Then - Hydration called
    expect(serverStoreModule.hydrateServerStore).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('should only trigger hydration once', async () => {
    // Given
    vi.mocked(serverStoreModule.hydrateServerStore).mockResolvedValue(undefined);

    // When
    const { result, rerender } = renderHook(() => useLoadServers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Re-render multiple times
    rerender();
    rerender();
    rerender();

    // Then - Only called once
    expect(serverStoreModule.hydrateServerStore).toHaveBeenCalledTimes(1);
  });

  it('should handle hydration errors', async () => {
    // Given
    const error = new Error('Storage error');
    vi.mocked(serverStoreModule.hydrateServerStore).mockRejectedValue(error);

    // When
    const { result } = renderHook(() => useLoadServers());

    // Wait for error
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Then
    expect(result.current.error).toEqual(error);
    expect(result.current.isLoading).toBe(false);
  });

  it('should convert non-Error to Error object', async () => {
    // Given
    vi.mocked(serverStoreModule.hydrateServerStore).mockRejectedValue('String error');

    // When
    const { result } = renderHook(() => useLoadServers());

    // Wait for error
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Then
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('String error');
  });

  it('should set loading to false after successful hydration', async () => {
    // Given
    vi.mocked(serverStoreModule.hydrateServerStore).mockResolvedValue(undefined);

    // When
    const { result } = renderHook(() => useLoadServers());

    // Then - Initial state
    expect(result.current.isLoading).toBe(true);

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Then - Final state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
