import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseQuery = vi.fn();
const mockUseStore = vi.fn();

const serverState = {
  isHydrated: false,
  activeServerId: null as string | null,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('@tanstack/react-store', () => ({
  useStore: (...args: unknown[]) => mockUseStore(...args),
}));

vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: {},
}));

vi.mock('@/shared', () => ({
  api: {
    auth: () => ({
      authControllerCheckAuthRaw: vi.fn(),
      authControllerGetAdminStatusRaw: vi.fn(),
    }),
  },
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
  });

  it('liefert authenticated und admin authenticated bei erfolgreicher Session', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';

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
  });

  it('liefert unauthenticated sobald Auth-Check aufgelöst und kein User vorhanden ist', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';

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
});
