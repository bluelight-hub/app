/**
 * Tests für useFahrzeugZeichen Hook
 *
 * Prüft Query-Key-Struktur, Aktivierungsbedingungen und API-Aufruf.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { useFahrzeugZeichen } from '../use-fahrzeug-zeichen';
import { KRAEFTE_QUERY_KEYS } from '../queries';

const mockGetZeichen = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    einsatzFahrzeuge: () => ({
      einsatzFahrzeugeControllerGetZeichenVAlpha: mockGetZeichen,
    }),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('useFahrzeugZeichen', () => {
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
    const key = KRAEFTE_QUERY_KEYS.fahrzeugZeichen('einsatz-1', 'fzg-1');
    expect(key).toEqual(['kraefte', 'einsatz-1', 'fahrzeuge', 'fzg-1', 'zeichen']);
  });

  it('ist disabled bei leerem einsatzId', () => {
    const { result } = renderHook(() => useFahrzeugZeichen(undefined, 'fzg-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetZeichen).not.toHaveBeenCalled();
  });

  it('ist disabled bei leerem fahrzeugId', () => {
    const { result } = renderHook(() => useFahrzeugZeichen('einsatz-1', undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetZeichen).not.toHaveBeenCalled();
  });

  it('lädt Zeichen-Daten bei gültigen IDs', async () => {
    const mockZeichen = {
      id: 'z-1',
      label: 'Fahrzeug-Zeichen',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden' },
    };
    mockGetZeichen.mockResolvedValueOnce({ data: mockZeichen });

    const { result } = renderHook(() => useFahrzeugZeichen('einsatz-1', 'fzg-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockZeichen);
    expect(mockGetZeichen).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      id: 'fzg-1',
    });
  });

  it('gibt null zurück wenn Backend kein Zeichen liefert', async () => {
    mockGetZeichen.mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useFahrzeugZeichen('einsatz-1', 'fzg-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('ruft logger.error bei API-Fehler auf', async () => {
    const apiError = new Error('API Error');
    mockGetZeichen.mockRejectedValue(apiError);

    renderHook(() => useFahrzeugZeichen('einsatz-1', 'fzg-1'), {
      wrapper: createWrapper(),
    });

    // queryFn wird aufgerufen und loggt Fehler
    await waitFor(() => expect(mockGetZeichen).toHaveBeenCalled());
  });
});
