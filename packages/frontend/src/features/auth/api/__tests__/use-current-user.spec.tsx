import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useStore: vi.fn(),
  fetchAuthCheck: vi.fn(),
  fetchAdminStatus: vi.fn(),
}));

const mockUseQuery = mocks.useQuery;
const mockUseStore = mocks.useStore;
const mockFetchAuthCheck = mocks.fetchAuthCheck;
const mockFetchAdminStatus = mocks.fetchAdminStatus;

const serverState = {
  isHydrated: false,
  activeServerId: null as string | null,
  servers: [] as Array<{
    id: string;
    url: string;
  }>,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mocks.useQuery(...args),
}));

vi.mock('@tanstack/react-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-store')>();
  return {
    ...actual,
    useStore: (...args: unknown[]) => mocks.useStore(...args),
  };
});

vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: {},
}));

vi.mock('@/shared/api/auth-session', () => ({
  fetchAuthCheck: mocks.fetchAuthCheck,
  fetchAdminStatus: mocks.fetchAdminStatus,
}));

import { useCurrentUser } from '../use-current-user';

const createAuthQueryResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  isPending: false,
  isLoading: false,
  isFetching: false,
  isError: false,
  ...overrides,
});

const createAdminQueryResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  isPending: false,
  isLoading: false,
  isFetching: false,
  isError: false,
  isFetched: false,
  ...overrides,
});

function mockQueryPair(authResult: Record<string, unknown>, adminResult: Record<string, unknown>) {
  mockUseQuery.mockReset();
  mockUseQuery.mockImplementationOnce(() => createAuthQueryResult(authResult));
  mockUseQuery.mockImplementationOnce(() => createAdminQueryResult(adminResult));
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverState.isHydrated = false;
    serverState.activeServerId = null;
    serverState.servers = [];

    mockUseStore.mockImplementation((_store: unknown, selector: (state: typeof serverState) => unknown) => selector(serverState));
  });

  it('liefert pending, wenn die Server-Hydration noch läuft', () => {
    mockQueryPair({}, {});

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.authStatus).toBe('pending');
    expect(result.current.adminSessionStatus).toBe('pending');
    expect(result.current.isResolved).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('liefert unauthenticated, wenn hydriert aber kein aktiver Server gesetzt ist', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = null;

    mockQueryPair(
      {
        data: {
          authenticated: true,
          isAdminAuthenticated: true,
          user: {
            id: 'stale-user',
            username: 'stale',
            role: 'ADMIN',
          },
        },
      },
      {},
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.authStatus).toBe('unauthenticated');
    expect(result.current.adminSessionStatus).toBe('unauthenticated');
    expect(result.current.isResolved).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        queryFn: mockFetchAuthCheck,
        enabled: false,
      }),
    );
  });

  it('liefert authenticated und admin authenticated bei erfolgreicher Session', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server-1.example.com/' }];

    mockQueryPair(
      {
        data: {
          authenticated: true,
          isAdminAuthenticated: true,
          user: {
            id: 'user-1',
            username: 'admin',
            role: 'ADMIN',
          },
        },
      },
      {
        isFetched: true,
        data: {
          adminSetupAvailable: false,
        },
      },
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.authStatus).toBe('authenticated');
    expect(result.current.adminSessionStatus).toBe('authenticated');
    expect(result.current.isResolved).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.id).toBe('user-1');
    expect(result.current.adminStatus).toEqual({ adminSetupAvailable: false });
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        queryKey: ['auth', 'check', 'https://server-1.example.com'],
        queryFn: mockFetchAuthCheck,
        enabled: true,
      }),
    );
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        queryKey: ['auth', 'admin', 'status', 'https://server-1.example.com'],
        queryFn: mockFetchAdminStatus,
        enabled: true,
      }),
    );
  });

  it('liefert unauthenticated sobald Auth-Check aufgelöst und kein User vorhanden ist', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server-1.example.com' }];

    mockQueryPair(
      {
        data: {
          authenticated: false,
          isAdminAuthenticated: false,
          user: null,
        },
      },
      {},
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.authStatus).toBe('unauthenticated');
    expect(result.current.adminSessionStatus).toBe('unauthenticated');
    expect(result.current.isResolved).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('bleibt pending solange der Auth-Check noch läuft, obwohl der Server bereits bereit ist', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server-1.example.com' }];

    mockQueryPair(
      {
        isPending: true,
      },
      {},
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.authStatus).toBe('pending');
    expect(result.current.adminSessionStatus).toBe('pending');
    expect(result.current.isResolved).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('scope-t Auth- und Admin-Queries serverbezogen, damit Serverwechsel keinen Cache-Leak erzeugt', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-2';
    serverState.servers = [{ id: 'server-2', url: 'https://server-2.example.com/' }];

    mockQueryPair(
      {
        data: {
          authenticated: true,
          isAdminAuthenticated: true,
          user: {
            id: 'user-2',
            username: 'admin-2',
            role: 'ADMIN',
          },
        },
      },
      {
        isFetched: true,
        data: {
          adminSetupAvailable: true,
        },
      },
    );

    renderHook(() => useCurrentUser());

    const authQueryOptions = mockUseQuery.mock.calls[0][0] as { queryKey: unknown[] };
    const adminQueryOptions = mockUseQuery.mock.calls[1][0] as { queryKey: unknown[] };

    expect(authQueryOptions.queryKey).toEqual(['auth', 'check', 'https://server-2.example.com']);
    expect(adminQueryOptions.queryKey).toEqual(['auth', 'admin', 'status', 'https://server-2.example.com']);
  });
});
