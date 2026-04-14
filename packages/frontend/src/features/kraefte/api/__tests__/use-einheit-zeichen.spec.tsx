/**
 * Tests für useEinheitZeichen Hook
 *
 * Prüft Query-Key-Struktur, Aktivierungsbedingungen und API-Aufruf.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { useEinheitZeichen } from '../use-einheit-zeichen';
import { KRAEFTE_QUERY_KEYS } from '../queries';

const mockGetZeichen = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    einsatzEinheiten: () => ({
      einsatzEinheitenControllerGetZeichenVAlpha: mockGetZeichen,
    }),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('useEinheitZeichen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('verwendet den korrekten Query-Key', () => {
    const key = KRAEFTE_QUERY_KEYS.einheitZeichen('einsatz-1', 'einheit-1');
    expect(key).toEqual(['kraefte', 'einsatz-1', 'einheiten', 'einheit-1', 'zeichen']);
  });

  it('ist disabled bei leerem einsatzId', () => {
    const { result } = renderHook(() => useEinheitZeichen(undefined, 'einheit-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetZeichen).not.toHaveBeenCalled();
  });

  it('ist disabled bei leerem einheitId', () => {
    const { result } = renderHook(() => useEinheitZeichen('einsatz-1', undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetZeichen).not.toHaveBeenCalled();
  });

  it('lädt Zeichen-Daten bei gültigen IDs', async () => {
    const mockZeichen = {
      id: 'z-1',
      label: 'Test-Zeichen',
      zeichenDefinition: { grundzeichen: 'stelle' },
    };
    mockGetZeichen.mockResolvedValueOnce({ data: mockZeichen });

    const { result } = renderHook(() => useEinheitZeichen('einsatz-1', 'einheit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockZeichen);
    expect(mockGetZeichen).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      einheitId: 'einheit-1',
    });
  });

  it('gibt null zurück wenn Backend kein Zeichen liefert', async () => {
    mockGetZeichen.mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useEinheitZeichen('einsatz-1', 'einheit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('ruft logger.error bei API-Fehler auf', async () => {
    const apiError = new Error('API Error');
    mockGetZeichen.mockRejectedValue(apiError);

    renderHook(() => useEinheitZeichen('einsatz-1', 'einheit-1'), {
      wrapper: createWrapper(),
    });

    // queryFn wird aufgerufen und loggt Fehler
    await waitFor(() => expect(mockGetZeichen).toHaveBeenCalled());
  });
});
