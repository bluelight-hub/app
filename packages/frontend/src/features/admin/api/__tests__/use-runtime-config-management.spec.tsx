import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeleteRuntimeConfig, useMigrateLegacyRuntimeConfig, useUpsertRuntimeConfig } from '../use-runtime-config-management';

const { mockUpsertRaw, mockMigrateRaw, mockDeleteRaw, mockFetchWithRefresh, toastSuccess, toastError, mockAdminApiFactory } = vi.hoisted(() => ({
  mockUpsertRaw: vi.fn(),
  mockMigrateRaw: vi.fn(),
  mockDeleteRaw: vi.fn(),
  mockFetchWithRefresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  mockAdminApiFactory: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock('@/shared', () => ({
  api: {
    admin: mockAdminApiFactory,
  },
  ResponseError: class ResponseError extends Error {
    readonly response: Response;

    constructor(response: Response) {
      super(`HTTP ${response.status}`);
      this.response = response;
    }
  },
}));

vi.mock('@/shared/api/api', () => ({
  getBaseUrl: () => 'http://localhost:3091',
}));

vi.mock('@/shared/api/fetchWithRefresh', () => ({
  fetchWithRefresh: mockFetchWithRefresh,
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn().mockResolvedValue('API Error'),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useRuntimeConfigManagement Fallback Bodies', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('sendet im Upsert-Fallback den flachen DTO-Body ohne Wrapper', async () => {
    mockAdminApiFactory.mockReturnValue({
      adminRuntimeConfigControllerUpsertRuntimeConfigVAlphaRaw: mockUpsertRaw.mockRejectedValue(
        new TypeError("Cannot read properties of undefined (reading 'adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha')"),
      ),
    });

    mockFetchWithRefresh.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            key: 'JWT_SECRET',
            value: '********',
            source: 'db',
            sensitive: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderHook(() => useUpsertRuntimeConfig(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        key: 'JWT_SECRET',
        value: 'super-secret',
        sensitive: false,
        sourceHint: 'ui',
      });
    });

    expect(mockFetchWithRefresh).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetchWithRefresh.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('http://localhost:3091/api/v-alpha/admin/runtime-config/JWT_SECRET');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({
      value: 'super-secret',
      sensitive: false,
      sourceHint: 'ui',
    });
  });

  it('sendet im Migrations-Fallback den flachen DTO-Body ohne Wrapper', async () => {
    mockAdminApiFactory.mockReturnValue({
      adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlphaRaw: mockMigrateRaw.mockRejectedValue(
        new TypeError("Cannot read properties of undefined (reading 'adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlphaRaw')"),
      ),
    });

    mockFetchWithRefresh.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            migratedKeys: ['JWT_SECRET'],
            skippedKeys: [],
            failedKeys: [],
            summary: {
              requested: 1,
              migrated: 1,
              skipped: 0,
              failed: 0,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderHook(() => useMigrateLegacyRuntimeConfig(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        keys: ['JWT_SECRET'],
        dryRun: true,
      });
    });

    expect(mockFetchWithRefresh).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetchWithRefresh.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('http://localhost:3091/api/v-alpha/admin/runtime-config/migrate-legacy');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      keys: ['JWT_SECRET'],
      dryRun: true,
    });
  });

  it('sendet im Delete-Fallback einen DELETE-Request ohne Body-Wrapper', async () => {
    mockAdminApiFactory.mockReturnValue({
      adminRuntimeConfigControllerDeleteRuntimeConfigVAlphaRaw: mockDeleteRaw.mockRejectedValue(
        new TypeError("Cannot read properties of undefined (reading 'adminRuntimeConfigControllerDeleteRuntimeConfigVAlphaRaw')"),
      ),
    });

    mockFetchWithRefresh.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            key: 'HIORG_OAUTH_CLIENT_SECRET',
            deleted: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderHook(() => useDeleteRuntimeConfig(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        key: 'HIORG_OAUTH_CLIENT_SECRET',
      });
    });

    expect(mockFetchWithRefresh).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetchWithRefresh.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('http://localhost:3091/api/v-alpha/admin/runtime-config/HIORG_OAUTH_CLIENT_SECRET');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });
});
