import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseQuery = vi.fn();
const mockUseStore = vi.fn();
const mockHealthControllerCheck = vi.fn();

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

vi.mock('@/shared/api/api', () => ({
  api: {
    health: () => ({
      healthControllerCheck: (...args: unknown[]) => mockHealthControllerCheck(...args),
    }),
  },
}));

import { useSystemHealth } from '../use-system-health';

const createQueryResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  ...overrides,
});

describe('useSystemHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverState.isHydrated = false;
    serverState.activeServerId = null;
    serverState.servers = [];

    mockUseStore.mockImplementation((_store: unknown, selector: (state: typeof serverState) => unknown) => selector(serverState));
    mockUseQuery.mockImplementation((options: Record<string, unknown>) =>
      createQueryResult({
        queryKey: options.queryKey,
      }),
    );
  });

  it('deaktiviert die Query, wenn noch kein aktiver Server bereit ist', () => {
    renderHook(() => useSystemHealth());

    const queryOptions = mockUseQuery.mock.calls[0][0] as { enabled?: boolean };
    expect(queryOptions.enabled).toBe(false);
    expect(mockHealthControllerCheck).not.toHaveBeenCalled();
  });

  it('nutzt den generierten Health-Client, sobald Hydration und aktiver Server vorliegen', async () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server-1.example.com/' }];
    mockHealthControllerCheck.mockResolvedValue({ status: 'ok' });

    renderHook(() => useSystemHealth());

    const queryOptions = mockUseQuery.mock.calls[0][0] as { enabled?: boolean; queryFn?: () => Promise<unknown>; queryKey?: unknown[] };
    expect(queryOptions.enabled).toBe(true);
    expect(queryOptions.queryKey).toEqual(['system', 'health', 'https://server-1.example.com']);

    await expect(queryOptions.queryFn?.()).resolves.toEqual({ status: 'ok' });
    expect(mockHealthControllerCheck).toHaveBeenCalledTimes(1);
  });

  it('priorisiert error vor loading und API-Modus bei connectionMode', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server-1.example.com' }];
    mockUseQuery.mockReturnValue(
      createQueryResult({
        isError: true,
        isLoading: true,
        error: new Error('boom'),
        data: {
          details: {
            connection_status: {
              details: {
                mode: 'offline',
              },
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useSystemHealth());

    expect(result.current.connectionMode).toBe('error');
    expect(result.current.isError).toBe(true);
  });

  it('priorisiert checking vor dem Backend-Modus während laufender Query', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server-1.example.com' }];
    mockUseQuery.mockReturnValue(
      createQueryResult({
        isLoading: true,
        data: {
          details: {
            connection_status: {
              details: {
                mode: 'offline',
              },
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useSystemHealth());

    expect(result.current.connectionMode).toBe('checking');
  });

  it('fällt auf online zurück, wenn kein expliziter connectionMode geliefert wird', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-1';
    serverState.servers = [{ id: 'server-1', url: 'https://server-1.example.com' }];
    mockUseQuery.mockReturnValue(
      createQueryResult({
        data: {
          details: {},
          setupComplete: true,
          version: '1.2.3',
        },
      }),
    );

    const { result } = renderHook(() => useSystemHealth());

    expect(result.current.connectionMode).toBe('online');
    expect(result.current.setupComplete).toBe(true);
    expect(result.current.version).toBe('1.2.3');
  });

  it('verwendet bei Serverwechsel einen eigenen Health-Query-Key pro Server', () => {
    serverState.isHydrated = true;
    serverState.activeServerId = 'server-2';
    serverState.servers = [{ id: 'server-2', url: 'https://server-2.example.com/' }];

    renderHook(() => useSystemHealth());

    const queryOptions = mockUseQuery.mock.calls[0][0] as { queryKey: unknown[] };
    expect(queryOptions.queryKey).toEqual(['system', 'health', 'https://server-2.example.com']);
  });
});
