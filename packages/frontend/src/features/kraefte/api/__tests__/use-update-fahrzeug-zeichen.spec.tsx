/**
 * Tests für useUpdateFahrzeugZeichen Mutation Hook
 *
 * Prüft API-Aufruf, Cache-Invalidierung und Fehlerbehandlung.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { useUpdateFahrzeugZeichen } from '../use-update-fahrzeug-zeichen';

const mockUpdateZeichen = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    einsatzFahrzeuge: () => ({
      einsatzFahrzeugeControllerUpdateZeichenVAlpha: mockUpdateZeichen,
    }),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('useUpdateFahrzeugZeichen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('ruft den API-Endpoint mit korrekten Parametern auf', async () => {
    const mockResponse = { data: { id: 'z-1', label: 'Updated' } };
    mockUpdateZeichen.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useUpdateFahrzeugZeichen('einsatz-1', 'fzg-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        dto: {
          zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden' } as any,
          label: 'KTW 1',
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateZeichen).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      id: 'fzg-1',
      updateTaktischesZeichenDto: {
        zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden' },
        label: 'KTW 1',
      },
    });
  });

  it('invalidiert Fahrzeug-Zeichen und Lagekarte-Zeichen Caches', async () => {
    mockUpdateZeichen.mockResolvedValueOnce({ data: {} });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateFahrzeugZeichen('einsatz-1', 'fzg-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ dto: { zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden' } as any } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['kraefte', 'einsatz-1', 'fahrzeuge', 'fzg-1', 'zeichen'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['taktische-zeichen', 'einsatz-1', 'zeichen'],
    });
  });

  it('setzt isError bei API-Fehler', async () => {
    mockUpdateZeichen.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateFahrzeugZeichen('einsatz-1', 'fzg-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ dto: { zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden' } as any } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
