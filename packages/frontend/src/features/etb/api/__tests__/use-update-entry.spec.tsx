import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ETB_QUERY_KEYS } from '../queries';
import { useUpdateEtbEntry } from '../use-update-entry';

const { mockUpdateEintrag, mockGetApiErrorMessage, mockToast, mockLogger } = vi.hoisted(() => ({
  mockUpdateEintrag: vi.fn(),
  mockGetApiErrorMessage: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  mockLogger: {
    error: vi.fn(),
  },
}));

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>();
  return {
    ...actual,
    api: {
      etb: () => ({
        etbCqrsControllerUpdateEintragVAlpha: mockUpdateEintrag,
      }),
    },
  };
});

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: mockGetApiErrorMessage,
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

describe('useUpdateEtbEntry', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockGetApiErrorMessage.mockResolvedValue('Der ETB-Eintrag konnte nicht aktualisiert werden.');
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('ruft die Update-API mit korrekten Parametern auf', async () => {
    mockUpdateEintrag.mockResolvedValueOnce({ id: 'entry-1', text: 'Aktualisiert' });

    const { result } = renderHook(() => useUpdateEtbEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        etbId: 'etb-1',
        eintragId: 'entry-1',
        data: {
          newText: 'Aktualisiert',
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateEintrag).toHaveBeenCalledWith({
      etbId: 'etb-1',
      eintragId: 'entry-1',
      updateEintragDto: {
        newText: 'Aktualisiert',
      },
    });
  });

  it('zeigt einen Success-Toast bei erfolgreicher Aktualisierung', async () => {
    mockUpdateEintrag.mockResolvedValueOnce({ id: 'entry-1', text: 'Aktualisiert' });

    const { result } = renderHook(() => useUpdateEtbEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        etbId: 'etb-1',
        eintragId: 'entry-1',
        data: {
          newText: 'Aktualisiert',
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockToast.success).toHaveBeenCalledWith('Eintrag aktualisiert', {
      description: 'Der ETB-Eintrag wurde erfolgreich aktualisiert.',
    });
  });

  it('zeigt einen Error-Toast bei fehlgeschlagener Aktualisierung', async () => {
    const error = new Error('Server Error');
    mockUpdateEintrag.mockRejectedValue(error);
    mockGetApiErrorMessage.mockResolvedValueOnce('Validierung fehlgeschlagen');

    const { result } = renderHook(() => useUpdateEtbEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        etbId: 'etb-1',
        eintragId: 'entry-1',
        data: {
          newText: 'Ungültig',
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockGetApiErrorMessage).toHaveBeenCalledWith(error, 'Der ETB-Eintrag konnte nicht aktualisiert werden.', 'updateEtbEintrag');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to update ETB entry', error);
    expect(mockToast.error).toHaveBeenCalledWith('Fehler', {
      description: 'Validierung fehlgeschlagen',
    });
  });

  it('invalidiert ETB-Queries nach der Mutation', async () => {
    mockUpdateEintrag.mockResolvedValueOnce({ id: 'entry-1', text: 'Aktualisiert' });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateEtbEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        etbId: 'etb-1',
        eintragId: 'entry-1',
        data: {
          newText: 'Aktualisiert',
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ETB_QUERY_KEYS.all,
    });
  });
});
