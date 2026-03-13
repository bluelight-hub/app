import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentUser } from '@/features/auth';
import { serverStore } from '@/features/server/stores/server.store';
import type { EinsatzControllerFindOneVAlpha200Response } from '@/shared';
import { EINSATZ_QUERY_KEYS } from '../../api/queries';
import { loadActiveEinsatzId, loadEinsatzWorkspaceHref, saveActiveEinsatzId, saveEinsatzWorkspaceHref } from '../../stores/persistence/einsatz-persistence';
import { resetActiveEinsatzRuntime } from '../../stores/active-einsatz.store';
import { useActiveEinsatz } from '../use-active-einsatz';

const mockFindOne = vi.fn();
let serverCounter = 0;

vi.mock('@/features/auth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>();

  return {
    ...actual,
    api: {
      ...actual.api,
      einsatz: () => ({
        einsatzControllerFindOneVAlpha: mockFindOne,
      }),
    },
  };
});

const mockUseCurrentUser = vi.mocked(useCurrentUser);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient = createQueryClient()) {
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  };
}

function createResponseError(status: number) {
  return Object.assign(new Error('Response returned an error code'), {
    name: 'ResponseError',
    response: new Response(null, { status }),
  });
}

describe('useActiveEinsatz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    serverCounter += 1;
    const activeServerId = `server-${serverCounter}`;
    serverStore.setState(() => ({
      servers: [],
      activeServerId,
      connectionStatus: new Map(),
      isHydrated: true,
    }));
    resetActiveEinsatzRuntime(activeServerId);
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      isResolved: true,
      authStatus: 'authenticated',
      adminSessionStatus: 'unauthenticated',
      user: {
        id: 'user-1',
        username: 'einsatzleitung',
      },
      adminStatus: undefined,
      isAdminAuthenticated: false,
      query: {} as never,
    });
  });

  it('führt die Resume-Validierung nur einmal für parallele Hook-Consumer aus', async () => {
    saveActiveEinsatzId('einsatz-1');
    mockFindOne.mockResolvedValue({
      data: {
        id: 'einsatz-1',
        nummer: 'E-2026-001',
      },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => [useActiveEinsatz(), useActiveEinsatz()] as const, { wrapper });

    await waitFor(() => {
      expect(result.current[0].activeEinsatz?.id).toBe('einsatz-1');
      expect(result.current[1].activeEinsatz?.id).toBe('einsatz-1');
    });

    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(result.current[0].resumeStatus).toBe('ready');
    expect(result.current[1].resumeStatus).toBe('ready');
  });

  it('bereinigt veraltete Resume-Daten bei fehlender Berechtigung', async () => {
    saveActiveEinsatzId('einsatz-403');
    saveEinsatzWorkspaceHref('einsatz-403', '/app/einsatz/einsatz-403/führung/etb');
    mockFindOne.mockRejectedValue(createResponseError(403));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveEinsatz(), { wrapper });

    await waitFor(() => {
      expect(result.current.resumeStatus).toBe('unavailable');
    });

    expect(result.current.resumeReason).toBe('unauthorized');
    expect(result.current.activeEinsatz).toBeNull();
    expect(loadActiveEinsatzId()).toBeNull();
    expect(loadEinsatzWorkspaceHref('einsatz-403')).toBeNull();
  });

  it('ignoriert eine alte Resume-Antwort nach Logout und schreibt keinen Kontext zurück', async () => {
    let resolveRequest: ((value: EinsatzControllerFindOneVAlpha200Response) => void) | null = null;

    saveActiveEinsatzId('einsatz-late');
    mockFindOne.mockImplementation(
      () =>
        new Promise<EinsatzControllerFindOneVAlpha200Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(() => useActiveEinsatz(), { wrapper });

    await waitFor(() => {
      expect(result.current.resumeStatus).toBe('checking');
    });

    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      isResolved: true,
      authStatus: 'unauthenticated',
      adminSessionStatus: 'unauthenticated',
      user: undefined,
      adminStatus: undefined,
      isAdminAuthenticated: false,
      query: {} as never,
    });

    await act(async () => {
      rerender();
      resolveRequest?.({
        data: {
          id: 'einsatz-late',
          nummer: 'E-2026-099',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.activeEinsatz).toBeNull();
    });

    expect(result.current.resumeStatus).toBe('idle');
  });

  it('räumt ungültige Resume-Daten auch nach Storage-Sync-Validierung wieder auf', async () => {
    saveEinsatzWorkspaceHref('einsatz-sync-404', '/app/einsatz/einsatz-sync-404/übersicht');
    mockFindOne.mockRejectedValue(createResponseError(404));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveEinsatz(), { wrapper });

    act(() => {
      saveActiveEinsatzId('einsatz-sync-404');
    });

    await waitFor(() => {
      expect(result.current.resumeStatus).toBe('unavailable');
    });

    expect(result.current.resumeReason).toBe('invalid-context');
    expect(loadActiveEinsatzId()).toBeNull();
    expect(loadEinsatzWorkspaceHref('einsatz-sync-404')).toBeNull();
  });

  it('ignoriert server-agnostische Detail-Caches aus einem vorherigen Kontext', async () => {
    saveActiveEinsatzId('einsatz-1');
    mockFindOne.mockResolvedValue({
      data: {
        id: 'einsatz-1',
        nummer: 'E-2026-NEU',
      },
    });

    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(EINSATZ_QUERY_KEYS.detail('einsatz-1'), {
      data: {
        id: 'einsatz-1',
        nummer: 'E-2026-ALT',
      },
    });

    const { result } = renderHook(() => useActiveEinsatz(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeEinsatz?.nummer).toBe('E-2026-NEU');
    });

    expect(mockFindOne).toHaveBeenCalledTimes(1);
  });
});
