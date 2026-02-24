/**
 * Unit Tests fuer useOffeneRueckfragen Hook
 *
 * Verifiziert:
 * - Query-Key Konfiguration
 * - offeneRueckfragen Key ist hierarchisch unter lists()
 * - Echte Hook-Tests mit renderHook (API-Aufruf, enabled-Logik)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { BEFEHL_QUERY_KEYS } from '../queries';
import { useOffeneRueckfragen } from '../use-offene-rueckfragen';

// Hoisted mock fuer API
const { mockFindByEinsatz } = vi.hoisted(() => ({
  mockFindByEinsatz: vi.fn(),
}));

// Mock API Client
vi.mock('@/shared', () => ({
  api: {
    befehle: () => ({
      befehlControllerFindByEinsatzVAlpha: mockFindByEinsatz,
    }),
  },
}));

// Mock queries - calculateRetryDelay auf 0ms setzen fuer schnelle Tests
vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

describe('useOffeneRueckfragen query configuration', () => {
  it('verwendet den korrekten Query-Key via BEFEHL_QUERY_KEYS.offeneRueckfragen', () => {
    const key = BEFEHL_QUERY_KEYS.offeneRueckfragen('einsatz-1');
    expect(key).toEqual(['befehl', 'list', 'einsatz-1', 'offeneRueckfragen']);
  });

  it('Query-Key aendert sich bei anderer einsatzId', () => {
    const key1 = BEFEHL_QUERY_KEYS.offeneRueckfragen('einsatz-1');
    const key2 = BEFEHL_QUERY_KEYS.offeneRueckfragen('einsatz-2');
    expect(key1).not.toEqual(key2);
  });

  it('offeneRueckfragen Key ist hierarchisch unter lists()', () => {
    const listsKey = BEFEHL_QUERY_KEYS.lists();
    const offeneKey = BEFEHL_QUERY_KEYS.offeneRueckfragen('einsatz-1');
    // Die ersten Elemente des offeneKey muessen den listsKey enthalten
    expect(offeneKey.slice(0, listsKey.length)).toEqual(listsKey);
  });

  it('offeneRueckfragen Key unterscheidet sich von list Key', () => {
    const listKey = BEFEHL_QUERY_KEYS.list('einsatz-1');
    const offeneKey = BEFEHL_QUERY_KEYS.offeneRueckfragen('einsatz-1');
    expect(offeneKey).not.toEqual(listKey);
  });
});

describe('useOffeneRueckfragen Hook', () => {
  let queryClient: QueryClient;
  const einsatzId = 'einsatz-1';

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('ruft die API mit hasOpenRueckfragen: true auf', async () => {
    // Given
    mockFindByEinsatz.mockResolvedValue({ data: [] });

    // When
    renderHook(() => useOffeneRueckfragen(einsatzId), {
      wrapper: createWrapper(),
    });

    // Then
    await waitFor(() => {
      expect(mockFindByEinsatz).toHaveBeenCalledWith({
        einsatzId,
        hasOpenRueckfragen: true,
      });
    });
  });

  it('verwendet den korrekten Query-Key im Result', async () => {
    // Given
    mockFindByEinsatz.mockResolvedValue({ data: [] });

    // When
    const { result } = renderHook(() => useOffeneRueckfragen(einsatzId), {
      wrapper: createWrapper(),
    });

    // Then: Query-Key im internen State pruefen
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Pruefen ob die Daten unter dem erwarteten Key gecacht sind
    const cachedData = queryClient.getQueryData(BEFEHL_QUERY_KEYS.offeneRueckfragen(einsatzId));
    expect(cachedData).toEqual([]);
  });

  it('fuehrt keinen Fetch aus wenn enabled false ist', async () => {
    // Given
    mockFindByEinsatz.mockResolvedValue({ data: [] });

    // When
    const { result } = renderHook(() => useOffeneRueckfragen(einsatzId, false), { wrapper: createWrapper() });

    // Then
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFindByEinsatz).not.toHaveBeenCalled();
  });

  it('fuehrt keinen Fetch aus wenn einsatzId leer ist', async () => {
    // Given
    mockFindByEinsatz.mockResolvedValue({ data: [] });

    // When
    const { result } = renderHook(() => useOffeneRueckfragen(''), {
      wrapper: createWrapper(),
    });

    // Then
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFindByEinsatz).not.toHaveBeenCalled();
  });
});
