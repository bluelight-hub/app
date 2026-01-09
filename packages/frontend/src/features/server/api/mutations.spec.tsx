/**
 * Unit Tests für Server Mutations
 *
 * Tests für useExchangeInvite Hook mit Mocked API Client.
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addServer, setActiveServer } from '../stores/server.store';
import { SERVER_QUERY_KEYS } from './query-keys';
import { useExchangeInvite } from './mutations';

// Create mock function for API
const mockAuthControllerExchangeInvite = vi.fn();

// Create stable mock object
const mockAuthApi = {
  authControllerExchangeInvite: mockAuthControllerExchangeInvite,
};

// Mock API Client
vi.mock('@/shared/api/api', () => ({
  api: {
    auth: () => mockAuthApi,
  },
}));

// Mock Logger
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Server Store with factory
vi.mock('../stores/server.store', () => ({
  addServer: vi.fn(),
  setActiveServer: vi.fn(),
}));

describe('useExchangeInvite', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactElement;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Configure addServer mock to return server ID (Fix #3: Race condition fix)
    vi.mocked(addServer).mockResolvedValue('server-1');

    // Create fresh QueryClient for each test
    // Note: We don't disable mutations.retry globally because useExchangeInvite
    // has its own retry logic (retry: 2) that we want to test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    /**
     * Test Wrapper Component
     *
     * Provides QueryClientProvider context for hooks
     */
    wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  });

  describe('Successful Exchange', () => {
    it('should exchange invite code successfully and add server', async () => {
      // Given (Arrange)
      const inviteCode = 'INV_12345678';
      const mockResponse = {
        data: {
          accessToken: 'token_abc123xyz',
          serverInfo: {
            name: 'Test Server',
            baseUrl: 'https://api.test.de',
            version: '1.0.0',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req_123',
        },
      };

      mockAuthControllerExchangeInvite.mockResolvedValue(mockResponse);

      // Mock query data to simulate server being added
      queryClient.setQueryData(SERVER_QUERY_KEYS.list(), [{ id: 'server-1' }]);

      // When (Act)
      const { result } = renderHook(() => useExchangeInvite(), { wrapper });

      result.current.mutate(inviteCode);

      // Then (Assert)
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify API called with correct payload
      expect(mockAuthControllerExchangeInvite).toHaveBeenCalledWith({
        exchangeInviteDto: { inviteCode },
      });

      // Verify server added to store
      expect(addServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Server',
          url: 'https://api.test.de',
          accessToken: 'token_abc123xyz',
          isDefault: false,
        }),
      );

      // Verify server set as active
      expect(setActiveServer).toHaveBeenCalledWith('server-1');
    });

    it('should handle server info with trailing slash in URL', async () => {
      // Given (Arrange)
      const mockResponse = {
        data: {
          accessToken: 'token_xyz',
          serverInfo: {
            name: 'Server with Slash',
            baseUrl: 'https://api.example.com/',
            version: '1.0.0',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req_456',
        },
      };

      mockAuthControllerExchangeInvite.mockResolvedValue(mockResponse);

      // When (Act)
      const { result } = renderHook(() => useExchangeInvite(), { wrapper });

      result.current.mutate('INV_TESTCODE');

      // Then (Assert)
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify URL stored as-is (validation happens in addServer)
      expect(addServer).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/',
        }),
      );
    });

    it('should invalidate server list query after success', async () => {
      // Given (Arrange)
      const mockResponse = {
        data: {
          accessToken: 'token_invalidate',
          serverInfo: {
            name: 'Cache Test Server',
            baseUrl: 'https://api.cache.test',
            version: '1.0.0',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req_cache',
        },
      };

      mockAuthControllerExchangeInvite.mockResolvedValue(mockResponse);

      // Set initial query data
      queryClient.setQueryData(SERVER_QUERY_KEYS.list(), []);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // When (Act)
      const { result } = renderHook(() => useExchangeInvite(), { wrapper });

      result.current.mutate('INV_CACHE');

      // Then (Assert)
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify invalidation was called
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: SERVER_QUERY_KEYS.list() });
    });
  });

  describe('Error Handling', () => {
    it('should handle store errors after successful API call gracefully', async () => {
      // Given (Arrange)
      const mockResponse = {
        data: {
          accessToken: 'token_store_error',
          serverInfo: {
            name: 'Store Error Server',
            baseUrl: 'https://api.storeerror.test',
            version: '1.0.0',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req_store_err',
        },
      };

      mockAuthControllerExchangeInvite.mockResolvedValue(mockResponse);

      // Simulate store error
      const storeError = new Error('Failed to save to storage');
      vi.mocked(addServer).mockRejectedValue(storeError);

      // When (Act)
      const { result } = renderHook(() => useExchangeInvite(), { wrapper });

      result.current.mutate('INV_STORE_ERR');

      // Then (Assert)
      // Should still be success because API call succeeded
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify API was called successfully
      expect(mockAuthControllerExchangeInvite).toHaveBeenCalled();

      // Verify store was attempted
      expect(addServer).toHaveBeenCalled();

      // No error state (error is only logged, not propagated)
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should track loading state correctly', async () => {
      // Given (Arrange)
      const mockResponse = {
        data: {
          accessToken: 'token_loading',
          serverInfo: {
            name: 'Loading Test Server',
            baseUrl: 'https://api.loading.test',
            version: '1.0.0',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req_loading',
        },
      };

      // Simulate slow API response
      mockAuthControllerExchangeInvite.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockResponse), 100);
          }),
      );

      // When (Act)
      const { result } = renderHook(() => useExchangeInvite(), { wrapper });

      expect(result.current.isPending).toBe(false);

      result.current.mutate('INV_LOADING');

      // Then (Assert)
      // Immediately after mutate, should be pending
      await waitFor(() => expect(result.current.isPending).toBe(true));

      // After completion, should not be pending
      await waitFor(() => expect(result.current.isPending).toBe(false));
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('MutateAsync', () => {
    it('should work with mutateAsync for promise-based usage', async () => {
      // Given (Arrange)
      const mockResponse = {
        data: {
          accessToken: 'token_async',
          serverInfo: {
            name: 'Async Test Server',
            baseUrl: 'https://api.async.test',
            version: '1.0.0',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req_async',
        },
      };

      mockAuthControllerExchangeInvite.mockResolvedValue(mockResponse);

      queryClient.setQueryData(SERVER_QUERY_KEYS.list(), [{ id: 'server-async' }]);

      // When (Act)
      const { result } = renderHook(() => useExchangeInvite(), { wrapper });

      const responsePromise = result.current.mutateAsync('INV_ASYNC');

      // Then (Assert)
      const response = await responsePromise;

      expect(response).toEqual(mockResponse);

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(addServer).toHaveBeenCalled();
    });
  });
});
