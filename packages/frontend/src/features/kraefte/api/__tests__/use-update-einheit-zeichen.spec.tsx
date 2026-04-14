/**
 * Tests für useUpdateEinheitZeichen Mutation Hook
 *
 * Prüft API-Aufruf, Cache-Invalidierung und Fehlerbehandlung.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { useUpdateEinheitZeichen } from '../use-update-einheit-zeichen';

const mockUpdateZeichen = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    einsatzEinheiten: () => ({
      einsatzEinheitenControllerUpdateZeichenVAlpha: mockUpdateZeichen,
    }),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('useUpdateEinheitZeichen', () => {
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

    const { result } = renderHook(() => useUpdateEinheitZeichen('einsatz-1', 'einheit-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        dto: {
          zeichenDefinition: { grundzeichen: 'stelle' } as any,
          label: 'Neues Label',
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateZeichen).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      einheitId: 'einheit-1',
      updateTaktischesZeichenDto: {
        zeichenDefinition: { grundzeichen: 'stelle' },
        label: 'Neues Label',
      },
    });
  });

  it('invalidiert Einheit-Zeichen und Lagekarte-Zeichen Caches', async () => {
    mockUpdateZeichen.mockResolvedValueOnce({ data: {} });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateEinheitZeichen('einsatz-1', 'einheit-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ dto: { zeichenDefinition: { grundzeichen: 'stelle' } as any } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['kraefte', 'einsatz-1', 'einheiten', 'einheit-1', 'zeichen'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['taktische-zeichen', 'einsatz-1', 'zeichen'],
    });
  });

  it('setzt isError bei API-Fehler', async () => {
    mockUpdateZeichen.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateEinheitZeichen('einsatz-1', 'einheit-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ dto: { zeichenDefinition: { grundzeichen: 'stelle' } as any } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
