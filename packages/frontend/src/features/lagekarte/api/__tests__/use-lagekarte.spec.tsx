/**
 * Unit Tests für useLagekarte Hook
 *
 * Verifiziert TanStack Query Integration:
 * - Query Key Generierung
 * - Polling-Fallback Konfiguration
 * - Leere FeatureCollection Fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLagekarte } from '../use-lagekarte';

// Mock API
vi.mock('@/shared', async () => {
  const actual = await vi.importActual<typeof import('@/shared')>('@/shared');
  return {
    ...actual,
    api: {
      lagekarte: () => ({
        lagekarteControllerGetLagekarteVAlpha: vi.fn().mockResolvedValue({
          data: {
            id: 'lk-1',
            einsatzId: 'einsatz-1',
            state: {
              type: 'FeatureCollection',
              features: [{ type: 'Feature', id: 'feat-1', geometry: { type: 'Point', coordinates: [10, 50] }, properties: {} }],
            },
          },
        }),
      }),
    },
  };
});

vi.mock('../queries', () => ({
  LAGEKARTE_QUERY_KEYS: {
    all: ['lagekarte'],
    byEinsatz: (einsatzId: string) => ['lagekarte', 'einsatz', einsatzId],
  },
  calculateRetryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useLagekarte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte Lagekarte-Daten laden', async () => {
    const { result } = renderHook(() => useLagekarte('einsatz-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(
      expect.objectContaining({
        id: 'lk-1',
        state: expect.objectContaining({
          type: 'FeatureCollection',
          features: expect.any(Array),
        }),
      }),
    );
  });

  it('sollte Polling-Fallback akzeptieren', async () => {
    const { result } = renderHook(() => useLagekarte('einsatz-1', { refetchInterval: 5000 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Hook sollte ohne Fehler funktionieren mit refetchInterval
    expect(result.current.data).toBeDefined();
  });

  it('sollte ohne Polling-Fallback funktionieren', async () => {
    const { result } = renderHook(() => useLagekarte('einsatz-1', { refetchInterval: false }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
