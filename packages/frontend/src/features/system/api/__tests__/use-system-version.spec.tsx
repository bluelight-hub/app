import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseQuery = vi.fn();
const mockUseStore = vi.fn();
const mockFetchBackendVersion = vi.fn();

const serverState = {
  isHydrated: false,
  activeServerId: null as string | null,
  servers: [] as Array<{
    id: string;
    url: string;
  }>,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('@tanstack/react-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-store')>();
  return {
    ...actual,
    useStore: (...args: unknown[]) => mockUseStore(...args),
  };
});

vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: {},
}));

vi.mock('@/shared/api/backend-root', () => ({
  fetchBackendVersion: (...args: unknown[]) => mockFetchBackendVersion(...args),
}));

import { useSystemVersion } from '../use-system-version';

const createQueryResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  ...overrides,
});

describe('useSystemVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__APP_VERSION__', '1.0.0');
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server.example.com/' }];
    mockUseStore.mockImplementation((_store: unknown, selector: (state: typeof serverState) => unknown) => selector(serverState));
    mockUseQuery.mockImplementation((options: Record<string, unknown>) => {
      return createQueryResult({
        queryKey: options.queryKey,
      });
    });
  });

  it('deaktiviert die Query, wenn kein aktiver Server konfiguriert ist', () => {
    serverState.activeServerId = null;
    serverState.servers = [];

    renderHook(() => useSystemVersion());

    expect(mockUseQuery).toHaveBeenCalledTimes(1);

    const queryOptions = mockUseQuery.mock.calls[0][0] as { enabled?: boolean };
    expect(queryOptions.enabled).toBe(false);
    expect(mockFetchBackendVersion).not.toHaveBeenCalled();
  });

  it('delegiert den Root-Response-Flow an den zentralen Backend-Helper', async () => {
    mockFetchBackendVersion.mockResolvedValue('1.0.1');

    renderHook(() => useSystemVersion());

    const queryOptions = mockUseQuery.mock.calls[0][0] as { enabled?: boolean; queryFn?: () => Promise<string | undefined> };

    expect(queryOptions.enabled).toBe(true);
    await expect(queryOptions.queryFn?.()).resolves.toBe('1.0.1');
    expect(mockFetchBackendVersion).toHaveBeenCalledWith('https://server.example.com');
  });

  it('berechnet den Versions-Mismatch aus Frontend- und Backend-Version', () => {
    mockUseQuery.mockReturnValue(
      createQueryResult({
        data: '2.0.0',
      }),
    );

    const { result } = renderHook(() => useSystemVersion());

    expect(result.current.frontendVersion).toBe('1.0.0');
    expect(result.current.backendVersion).toBe('2.0.0');
    expect(result.current.mismatchSeverity).not.toBe('none');
  });

  it('verwendet einen serverbezogenen Query Key, damit Serverwechsel nicht denselben Cache teilen', () => {
    serverState.activeServerId = 'server-2';
    serverState.servers = [{ id: 'server-2', url: 'https://server-2.example.com/' }];

    renderHook(() => useSystemVersion());

    const queryOptions = mockUseQuery.mock.calls[0][0] as { queryKey: unknown[] };
    expect(queryOptions.queryKey).toEqual(['system', 'version', 'https://server-2.example.com']);
  });
});
