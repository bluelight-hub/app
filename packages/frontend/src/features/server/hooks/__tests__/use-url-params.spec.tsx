/**
 * Unit Tests: useUrlParams Hook
 *
 * Tests URL-Parameter basiertes Server-Setup:
 * - AC1: Auto-Exchange wenn beide Parameter vorhanden
 * - AC2: Prefill wenn nur server-Parameter
 * - AC3: Navigation + URL cleanup nach Erfolg
 * - AC4: Fehlerbehandlung mit Toast
 * - AC5: Bestehende Server erhalten
 * - Fire-and-forget Pattern ohne Memory Leaks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUrlParams } from '../use-url-params';
import * as mutations from '../../api/mutations';
import { toast } from 'sonner';
import type { ResponseError } from '@/shared';

// Mock Dependencies
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/routes/__root', () => ({
  Route: {
    useSearch: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock shared API client to prevent import errors
vi.mock('@/shared', () => ({
  ManagedUserResponseDtoRoleEnum: {
    Admin: 'Admin',
    SuperAdmin: 'SuperAdmin',
    User: 'User',
  },
}));

// Import after mocking
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root';

describe('useUrlParams', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockMutateAsync: ReturnType<typeof vi.fn>;
  let mockUseSearch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup navigate mock
    mockNavigate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    // Setup useSearch mock
    mockUseSearch = vi.fn().mockReturnValue({});
    vi.mocked(Route.useSearch).mockImplementation(mockUseSearch);

    // Setup mutation mock (default: success)
    mockMutateAsync = vi.fn();
    vi.spyOn(mutations, 'useExchangeInvite').mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      reset: vi.fn(),
      data: undefined,
      error: null,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
    } as never);
  });

  describe('AC1: Auto-Exchange with Both Parameters', () => {
    it('should trigger exchange when both server and invite are present', async () => {
      // Given: Valid server + invite parameters
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      const mockResponse = {
        data: {
          accessToken: 'test-token-123',
          serverInfo: {
            name: 'Test Server',
            baseUrl: 'https://api.test.de',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'test-request-id',
        },
      };

      mockMutateAsync.mockResolvedValue(mockResponse);

      // When: Hook is rendered
      renderHook(() => useUrlParams());

      // Then: Loading toast shown
      await waitFor(() => {
        expect(toast.loading).toHaveBeenCalledWith('Verbinde mit Server...', {
          description: 'Tausche Einladungscode ein',
        });
      });

      // Then: Exchange mutation called
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('INV_12345');
      });
    });

    it('should navigate to /auth and clean URL after successful exchange', async () => {
      // Given: Valid parameters and successful exchange
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      mockMutateAsync.mockResolvedValue({
        data: {
          accessToken: 'token',
          serverInfo: {
            name: 'Test',
            baseUrl: 'https://api.test.de',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req-1',
        },
      });

      // When
      renderHook(() => useUrlParams());

      // Then: Navigate to /auth with cleaned URL (AC3)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/auth',
          search: {}, // Parameters removed
        });
      });
    });

    it('should return isExchanging=true during exchange', async () => {
      // Given
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      vi.spyOn(mutations, 'useExchangeInvite').mockReturnValue({
        mutateAsync: mockMutateAsync,
        mutate: vi.fn(),
        isPending: true, // Exchange in progress
        isError: false,
        isSuccess: false,
        isIdle: false,
        reset: vi.fn(),
        data: undefined,
        error: null,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: 'pending',
        submittedAt: Date.now(),
      } as never);

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then
      expect(result.current.isExchanging).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.prefillServerUrl).toBeNull();
    });

    it('should not trigger exchange multiple times on re-render', async () => {
      // Given
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      mockMutateAsync.mockResolvedValue({
        data: {
          accessToken: 'token',
          serverInfo: { name: 'Test', baseUrl: 'https://api.test.de' },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req-1',
        },
      });

      // When: Render and re-render
      const { rerender } = renderHook(() => useUrlParams());
      rerender();
      rerender();

      // Then: Exchange only called once (fire-and-forget pattern)
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('AC2: Prefill with Server-Only Parameter', () => {
    it('should return prefillServerUrl when only server parameter present', () => {
      // Given: Only server parameter (no invite)
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
      });

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then: Prefill data returned (AC2)
      expect(result.current.prefillServerUrl).toBe('https://api.test.de');
      expect(result.current.isExchanging).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should NOT trigger exchange when only server parameter present', async () => {
      // Given
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
      });

      // When
      renderHook(() => useUrlParams());

      // Then: Exchange NOT called
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });

      // No loading toast
      expect(toast.loading).not.toHaveBeenCalled();
    });
  });

  describe('AC4: Error Handling', () => {
    it('should handle INVITE_EXPIRED error', async () => {
      // Given: Exchange fails with INVITE_EXPIRED
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_EXPIRED',
      });

      const errorResponse: ResponseError = {
        name: 'ResponseError',
        message: 'Invite code expired',
        response: {
          status: 400,
          url: 'https://api.test.de/auth/exchange-invite',
        } as Response,
      } as ResponseError;

      mockMutateAsync.mockRejectedValue(errorResponse);

      vi.spyOn(mutations, 'useExchangeInvite').mockReturnValue({
        mutateAsync: mockMutateAsync,
        mutate: vi.fn(),
        isPending: false,
        isError: true,
        isSuccess: false,
        isIdle: false,
        reset: vi.fn(),
        data: undefined,
        error: errorResponse,
        variables: undefined,
        context: undefined,
        failureCount: 1,
        failureReason: null,
        isPaused: false,
        status: 'error',
        submittedAt: Date.now(),
      } as never);

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then: Error returned
      expect(result.current.error).toEqual(errorResponse);
      expect(result.current.isExchanging).toBe(false);
    });

    it('should handle INVITE_ALREADY_USED error', async () => {
      // Given
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_USED',
      });

      const errorResponse: ResponseError = {
        name: 'ResponseError',
        message: 'Invite code already used',
        response: {
          status: 409,
          url: 'https://api.test.de/auth/exchange-invite',
        } as Response,
      } as ResponseError;

      mockMutateAsync.mockRejectedValue(errorResponse);

      vi.spyOn(mutations, 'useExchangeInvite').mockReturnValue({
        mutateAsync: mockMutateAsync,
        mutate: vi.fn(),
        isPending: false,
        isError: true,
        isSuccess: false,
        isIdle: false,
        reset: vi.fn(),
        data: undefined,
        error: errorResponse,
        variables: undefined,
        context: undefined,
        failureCount: 1,
        failureReason: null,
        isPaused: false,
        status: 'error',
        submittedAt: Date.now(),
      } as never);

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then
      expect(result.current.error).toEqual(errorResponse);
    });

    it('should handle network errors', async () => {
      // Given
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      const networkError = new Error('Network request failed');
      mockMutateAsync.mockRejectedValue(networkError);

      vi.spyOn(mutations, 'useExchangeInvite').mockReturnValue({
        mutateAsync: mockMutateAsync,
        mutate: vi.fn(),
        isPending: false,
        isError: true,
        isSuccess: false,
        isIdle: false,
        reset: vi.fn(),
        data: undefined,
        error: networkError,
        variables: undefined,
        context: undefined,
        failureCount: 1,
        failureReason: null,
        isPaused: false,
        status: 'error',
        submittedAt: Date.now(),
      } as never);

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then
      expect(result.current.error).toEqual(networkError);
      expect(result.current.error?.message).toBe('Network request failed');
    });

    it('should NOT navigate on exchange error', async () => {
      // Given
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      mockMutateAsync.mockRejectedValue(new Error('Exchange failed'));

      // When
      renderHook(() => useUrlParams());

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Then: Navigate NOT called
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('AC5: Preserve Existing Servers', () => {
    it('should call useExchangeInvite which handles addServer internally', async () => {
      // Given: Exchange mutation (Story 2.4) calls addServer() in onSuccess
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      mockMutateAsync.mockResolvedValue({
        data: {
          accessToken: 'token',
          serverInfo: { name: 'Test', baseUrl: 'https://api.test.de' },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req-1',
        },
      });

      // When
      renderHook(() => useUrlParams());

      // Then: Exchange mutation called (which internally calls addServer)
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('INV_12345');
      });

      // NOTE: addServer() is called in mutation's onSuccess callback (AC5)
      // This test verifies the mutation is triggered correctly.
      // The mutation itself has tests verifying addServer() is called.
    });
  });

  describe('Default State: No Parameters', () => {
    it('should return null values when no parameters present', () => {
      // Given: No URL parameters
      mockUseSearch.mockReturnValue({});

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then: Default state
      expect(result.current.prefillServerUrl).toBeNull();
      expect(result.current.isExchanging).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should NOT trigger any actions when no parameters', async () => {
      // Given
      mockUseSearch.mockReturnValue({});

      // When
      renderHook(() => useUrlParams());

      // Then: No API calls
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });

      expect(toast.loading).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invite-only parameter (no server)', async () => {
      // Given: Only invite parameter (invalid state)
      mockUseSearch.mockReturnValue({
        invite: 'INV_12345',
      });

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then: No action (requires both for exchange)
      expect(result.current.prefillServerUrl).toBeNull();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should handle empty string parameters', () => {
      // Given: Empty string values
      mockUseSearch.mockReturnValue({
        server: '',
        invite: '',
      });

      // When
      const { result } = renderHook(() => useUrlParams());

      // Then: Treated as no parameters
      expect(result.current.prefillServerUrl).toBeNull();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Fire-and-Forget Pattern', () => {
    it('should not cause memory leaks on unmount during exchange', async () => {
      // Given: Exchange in progress
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      // Slow mutation (simulates network delay)
      mockMutateAsync.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    accessToken: 'token',
                    serverInfo: { name: 'Test', baseUrl: 'https://api.test.de' },
                  },
                  meta: {
                    timestamp: new Date().toISOString(),
                    version: 'alpha',
                    requestId: 'req-1',
                  },
                }),
              100,
            ),
          ),
      );

      // When: Render and immediately unmount
      const { unmount } = renderHook(() => useUrlParams());
      unmount();

      // Then: No errors thrown (fire-and-forget pattern handles cleanup)
      expect(() => unmount()).not.toThrow();
    });

    it('should complete exchange even if component unmounts', async () => {
      // Given
      mockUseSearch.mockReturnValue({
        server: 'https://api.test.de',
        invite: 'INV_12345',
      });

      let resolveExchange: (value: unknown) => void;
      const exchangePromise = new Promise((resolve) => {
        resolveExchange = resolve;
      });

      mockMutateAsync.mockReturnValue(exchangePromise);

      // When: Render and unmount before exchange completes
      const { unmount } = renderHook(() => useUrlParams());

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      unmount();

      // Then: Exchange completes in background (fire-and-forget)
      resolveExchange!({
        data: {
          accessToken: 'token',
          serverInfo: { name: 'Test', baseUrl: 'https://api.test.de' },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'alpha',
          requestId: 'req-1',
        },
      });

      await exchangePromise;

      // No errors thrown
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
  });
});
