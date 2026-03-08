/**
 * Unit Tests für useEinsatzRollen Hook
 *
 * Verifiziert:
 * - Query-Key Konfiguration
 * - API-Aufruf mit korrekten Parametern
 * - Response-Extraktion (.data)
 * - Disabled-State bei leerem einsatzId
 *
 * Story 5.2 AC4
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EINSATZ_QUERY_KEYS } from '../queries';
import { useEinsatzRollen } from '@/features/einsatz';

const { mockGetRollen } = vi.hoisted(() => ({
  mockGetRollen: vi.fn(),
}));

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>();
  return {
    ...actual,
    api: {
      einsatz: () => ({
        einsatzControllerGetRollenVAlpha: mockGetRollen,
      }),
    },
  };
});

// retryDelay auf 0 setzen für schnelle Fehler-Tests
vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

describe('useEinsatzRollen query configuration', () => {
  it('verwendet den korrekten Query-Key via EINSATZ_QUERY_KEYS.rollen', () => {
    const key = EINSATZ_QUERY_KEYS.rollen('einsatz-123');
    expect(key).toEqual(['einsatz', 'detail', 'einsatz-123', 'rollen']);
  });

  it('Query-Key unterscheidet sich bei anderer einsatzId', () => {
    const key1 = EINSATZ_QUERY_KEYS.rollen('einsatz-1');
    const key2 = EINSATZ_QUERY_KEYS.rollen('einsatz-2');
    expect(key1).not.toEqual(key2);
  });
});

describe('useEinsatzRollen Hook', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  const mockRollen = [
    { userId: 'user-1', userName: 'Max Mustermann', rolle: 'BEFEHLSGEBER' },
    { userId: 'user-2', userName: 'Erika Musterfrau', rolle: 'EMPFAENGER' },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetRollen.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('ruft API mit korrekter einsatzId auf', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: mockRollen });

    const { result } = renderHook(() => useEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetRollen).toHaveBeenCalledWith({ id: 'einsatz-123' });
  });

  it('extrahiert data aus Response', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: mockRollen });

    const { result } = renderHook(() => useEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRollen);
  });

  it('ist disabled bei leerem einsatzId', () => {
    const { result } = renderHook(() => useEinsatzRollen(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetRollen).not.toHaveBeenCalled();
  });

  it('setzt isError bei API-Fehler', async () => {
    mockGetRollen.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });

  it('gibt leeres Array zurück wenn keine Rollen zugewiesen', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
