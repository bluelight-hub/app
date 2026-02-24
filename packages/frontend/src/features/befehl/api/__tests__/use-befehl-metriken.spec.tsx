/**
 * Unit Tests fuer useBefehlMetriken Hook
 *
 * Verifiziert:
 * - Query-Key Konfiguration
 * - API-Aufruf mit korrekten Parametern
 * - Response-Extraktion (.data)
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BEFEHL_QUERY_KEYS } from '../queries';
import { useBefehlMetriken } from '../use-befehl-metriken';

const { mockGetMetriken } = vi.hoisted(() => ({
  mockGetMetriken: vi.fn(),
}));

vi.mock('@/shared', () => ({
  api: {
    befehle: () => ({
      befehlControllerGetMetrikenVAlpha: mockGetMetriken,
    }),
  },
}));

describe('useBefehlMetriken query configuration', () => {
  it('verwendet den korrekten Query-Key via BEFEHL_QUERY_KEYS.metriken', () => {
    const key = BEFEHL_QUERY_KEYS.metriken('2026-01-01', '2026-01-31');
    expect(key).toEqual(['befehl', 'metriken', '2026-01-01', '2026-01-31']);
  });

  it('Query-Key unterscheidet sich bei anderem Zeitraum', () => {
    const key1 = BEFEHL_QUERY_KEYS.metriken('2026-01-01', '2026-01-31');
    const key2 = BEFEHL_QUERY_KEYS.metriken('2026-02-01', '2026-02-28');
    expect(key1).not.toEqual(key2);
  });

  it('Query-Key ohne Parameter enthaelt undefined', () => {
    const key = BEFEHL_QUERY_KEYS.metriken();
    expect(key).toEqual(['befehl', 'metriken', undefined, undefined]);
  });
});

describe('useBefehlMetriken Hook', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  const mockMetriken = {
    erfassungszeitMedianSekunden: 8.5,
    quittierungszeitMedianSekunden: 3.2,
    papierRueckfallquoteProzent: 20,
    adoptionsrateProzent: 80,
    dokumentationsqualitaetProzent: 75,
    gesamtEinsaetze: 5,
    einsaetzeMitBefehlen: 4,
    gesamtBefehle: 12,
    vonDatum: new Date('2026-01-01T00:00:00.000Z'),
    bisDatum: new Date('2026-01-31T23:59:59.999Z'),
    einsatzDetails: [],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetMetriken.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('ruft API mit korrekten Parametern auf', async () => {
    mockGetMetriken.mockResolvedValueOnce({ data: mockMetriken });

    const { result } = renderHook(() => useBefehlMetriken({ von: '2026-01-01', bis: '2026-01-31' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetMetriken).toHaveBeenCalledWith({
      von: '2026-01-01',
      bis: '2026-01-31',
    });
  });

  it('extrahiert data aus Response', async () => {
    mockGetMetriken.mockResolvedValueOnce({ data: mockMetriken });

    const { result } = renderHook(() => useBefehlMetriken(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMetriken);
  });

  it('setzt isError bei API-Fehler', async () => {
    mockGetMetriken.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useBefehlMetriken({}, { retry: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
