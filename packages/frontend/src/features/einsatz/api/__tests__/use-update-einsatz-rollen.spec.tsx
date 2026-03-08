/**
 * Unit Tests für useUpdateEinsatzRollen Hook
 *
 * Verifiziert:
 * - API-Aufruf mit korrekten Parametern
 * - Toast-Notifications bei Success/Error
 * - Cache-Invalidierung nach Mutation
 *
 * Story 5.2 AC3
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateEinsatzRollen } from '@/features/einsatz';

const { mockUpdateRollen, mockToast } = vi.hoisted(() => ({
  mockUpdateRollen: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>();
  return {
    ...actual,
    api: {
      einsatz: () => ({
        einsatzControllerUpdateRollenVAlpha: mockUpdateRollen,
      }),
    },
  };
});

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// retryDelay auf 0 setzen für schnelle Tests
vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

describe('useUpdateEinsatzRollen Hook', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  const mockResponse = [
    { userId: 'user-1', userName: 'Max', rolle: 'BEFEHLSGEBER' },
    { userId: 'user-2', userName: 'Erika', rolle: 'EMPFAENGER' },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockUpdateRollen.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('ruft API mit korrekten Parametern auf', async () => {
    mockUpdateRollen.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useUpdateEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        zuweisungen: [
          { userId: 'user-1', rolle: 'BEFEHLSGEBER' as const },
          { userId: 'user-2', rolle: 'EMPFAENGER' as const },
        ],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateRollen).toHaveBeenCalledWith({
      id: 'einsatz-123',
      updateEinsatzRollenDto: {
        zuweisungen: [
          { userId: 'user-1', rolle: 'BEFEHLSGEBER' },
          { userId: 'user-2', rolle: 'EMPFAENGER' },
        ],
      },
    });
  });

  it('zeigt Success-Toast bei erfolgreicher Mutation', async () => {
    mockUpdateRollen.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useUpdateEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ zuweisungen: [{ userId: 'user-1', rolle: 'BEFEHLSGEBER' as const }] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith('Rollen aktualisiert');
  });

  it('zeigt Error-Toast bei fehlgeschlagener Mutation', async () => {
    mockUpdateRollen.mockRejectedValue(new Error('Server Error'));

    const { result } = renderHook(() => useUpdateEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ zuweisungen: [] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(mockToast.error).toHaveBeenCalledWith('Fehler beim Aktualisieren der Rollen');
  });

  it('invalidiert Rollen-Query nach Mutation', async () => {
    mockUpdateRollen.mockResolvedValueOnce({ data: mockResponse });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateEinsatzRollen('einsatz-123'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ zuweisungen: [] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['einsatz', 'detail', 'einsatz-123', 'rollen']),
      }),
    );
  });
});
