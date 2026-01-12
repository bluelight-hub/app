/**
 * Tests für useServerById Hook
 *
 * Testet den Selector-Hook für einzelne Server-Abfragen (Story 3.3).
 *
 * @module features/server/hooks/__tests__/use-server-by-id
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from '../../types/server-config';
import { useServerById } from '../use-server-by-id';

// =====================================================
// Mock Setup
// =====================================================

// Mock serverStore
const mockServers: ServerConfig[] = [
  {
    id: 'server-1',
    name: 'Produktiv-Server',
    url: 'https://prod.example.com',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    lastUsedAt: '2026-01-10T00:00:00Z',
    accessToken: 'token-1',
  },
  {
    id: 'server-2',
    name: 'Test-Server',
    url: 'https://test.example.com',
    isDefault: false,
    createdAt: '2026-01-02T00:00:00Z',
    lastUsedAt: '2026-01-09T00:00:00Z',
    accessToken: 'token-2',
  },
];

vi.mock('@tanstack/react-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-store')>();
  return {
    ...actual,
    useStore: vi.fn((_store: unknown, selector: (state: { servers: ServerConfig[] }) => ServerConfig | null) => {
      const state = { servers: mockServers };
      return selector(state);
    }),
  };
});

// =====================================================
// Tests
// =====================================================

describe('useServerById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return server when ID matches', () => {
    // Given
    const serverId = 'server-1';

    // When
    const { result } = renderHook(() => useServerById(serverId));

    // Then
    expect(result.current).not.toBeNull();
    expect(result.current?.id).toBe('server-1');
    expect(result.current?.name).toBe('Produktiv-Server');
  });

  it('should return null when ID does not match', () => {
    // Given
    const serverId = 'non-existent-id';

    // When
    const { result } = renderHook(() => useServerById(serverId));

    // Then
    expect(result.current).toBeNull();
  });

  it('should return null when serverId is null', () => {
    // Given
    const serverId = null;

    // When
    const { result } = renderHook(() => useServerById(serverId));

    // Then
    expect(result.current).toBeNull();
  });

  it('should return correct server from multiple servers', () => {
    // Given
    const serverId = 'server-2';

    // When
    const { result } = renderHook(() => useServerById(serverId));

    // Then
    expect(result.current).not.toBeNull();
    expect(result.current?.id).toBe('server-2');
    expect(result.current?.name).toBe('Test-Server');
  });
});
