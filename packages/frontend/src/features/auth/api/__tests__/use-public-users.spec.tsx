import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useStore: vi.fn(),
  createServerScopedAuthApi: vi.fn(),
  normalizeServerBaseUrl: vi.fn((serverUrl: string) => (serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl)),
}));

const mockUseQuery = mocks.useQuery;
const mockUseStore = mocks.useStore;
const mockCreateServerScopedAuthApi = mocks.createServerScopedAuthApi;

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

vi.mock('@/shared/api/server-scoped-clients', () => ({
  createServerScopedAuthApi: (...args: unknown[]) => mocks.createServerScopedAuthApi(...args),
  normalizeServerBaseUrl: (...args: unknown[]) => mocks.normalizeServerBaseUrl(...args),
}));

import { usePublicUsers } from '../use-public-users';

describe('usePublicUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverState.isHydrated = false;
    serverState.activeServerId = null;
    serverState.servers = [];

    mockUseStore.mockImplementation((_store: unknown, selector: (state: typeof serverState) => unknown) => selector(serverState));
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isPending: false,
      isError: false,
    });
  });

  it('deaktiviert die Query ohne aktiven Server', () => {
    serverState.isHydrated = true;

    renderHook(() => usePublicUsers());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['auth', 'public-users', 'unconfigured'],
        enabled: false,
      }),
    );
  });

  it('scope-t die Benutzerliste auf den aktiven Server', async () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-2';
    serverState.servers = [{ id: 'server-2', url: 'https://server-2.example.com/' }];

    const authApi = {
      authControllerGetPublicUsers: vi.fn().mockResolvedValue({
        users: [{ username: 'anna' }],
      }),
    };
    mockCreateServerScopedAuthApi.mockReturnValue(authApi);

    renderHook(() => usePublicUsers());

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: () => Promise<Array<{ username: string }>>;
      enabled: boolean;
    };

    expect(queryOptions.queryKey).toEqual(['auth', 'public-users', 'https://server-2.example.com']);
    expect(queryOptions.enabled).toBe(true);

    await expect(queryOptions.queryFn()).resolves.toEqual([{ username: 'anna' }]);
    expect(mockCreateServerScopedAuthApi).toHaveBeenCalledWith(
      'https://server-2.example.com',
      expect.objectContaining({
        fetchApi: expect.any(Function),
      }),
    );
    expect(authApi.authControllerGetPublicUsers).toHaveBeenCalledTimes(1);
  });
});
