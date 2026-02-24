/**
 * Unit Tests fuer useBefehlHistorie Hook
 *
 * Verifiziert:
 * - Query-Key Konfiguration
 * - Enabled-Logik (disabled bei undefined befehlId)
 * - API-Aufruf mit korrektem Parameter
 * - Response-Extraktion (.data)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BEFEHL_QUERY_KEYS } from '../queries';
import { useBefehlHistorie } from '../use-befehl-historie';

// Hoisted mock fuer API
const { mockGetHistorie } = vi.hoisted(() => ({
  mockGetHistorie: vi.fn(),
}));

// Mock API Client
vi.mock('@/shared', () => ({
  api: {
    befehle: () => ({
      befehlControllerGetHistorieVAlpha: mockGetHistorie,
    }),
  },
}));

describe('useBefehlHistorie query configuration', () => {
  it('verwendet den korrekten Query-Key via BEFEHL_QUERY_KEYS.historie', () => {
    const key = BEFEHL_QUERY_KEYS.historie('befehl-1');
    expect(key).toEqual(['befehl', 'detail', 'befehl-1', 'historie']);
  });

  it('Query-Key aendert sich bei anderer befehlId', () => {
    const key1 = BEFEHL_QUERY_KEYS.historie('befehl-1');
    const key2 = BEFEHL_QUERY_KEYS.historie('befehl-2');
    expect(key1).not.toEqual(key2);
  });

  it('historie Key ist hierarchisch unter detail()', () => {
    const detailKey = BEFEHL_QUERY_KEYS.detail('befehl-1');
    const historieKey = BEFEHL_QUERY_KEYS.historie('befehl-1');
    expect(historieKey.slice(0, detailKey.length)).toEqual(detailKey);
  });
});

describe('useBefehlHistorie Hook', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  const mockTimeline = {
    befehlId: 'befehl-1',
    befehlNummer: 'B2026-001',
    aktuellerStatus: 'ERTEILT',
    events: [
      {
        typ: 'ERTEILT',
        status: 'ABGESCHLOSSEN',
        zeitpunkt: new Date('2026-01-15T10:00:00Z'),
        beschreibung: 'Befehl erteilt',
        akteur: 'Befehlsgeber-1',
      },
    ],
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

  it('ruft die API mit korrekter befehlId auf', async () => {
    mockGetHistorie.mockResolvedValue({ data: mockTimeline });

    renderHook(() => useBefehlHistorie('befehl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetHistorie).toHaveBeenCalledWith({ id: 'befehl-1' });
    });
  });

  it('extrahiert .data aus der Response', async () => {
    mockGetHistorie.mockResolvedValue({ data: mockTimeline });

    const { result } = renderHook(() => useBefehlHistorie('befehl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTimeline);
  });

  it('fuehrt keinen Fetch aus wenn befehlId undefined ist', () => {
    const { result } = renderHook(() => useBefehlHistorie(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetHistorie).not.toHaveBeenCalled();
  });

  it('cacht Daten unter dem korrekten Key', async () => {
    mockGetHistorie.mockResolvedValue({ data: mockTimeline });

    const { result } = renderHook(() => useBefehlHistorie('befehl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const cachedData = queryClient.getQueryData(BEFEHL_QUERY_KEYS.historie('befehl-1'));
    expect(cachedData).toEqual(mockTimeline);
  });
});
