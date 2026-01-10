/**
 * Integration Tests: useDeepLinkEffect
 *
 * Testet vollständige Deep Link Integration:
 * - DeepLinkService Event Emission
 * - useExchangeInvite Mutation
 * - Navigation zu Login Screen
 * - Toast Notifications
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeepLinkEffect } from './useDeepLinkEffect';
import { DeepLinkService } from '../services/deep-link.service';
import { DeepLinkError } from '../types/deep-link';
import * as mutations from '../api/mutations';
import { toast } from 'sonner';

// Mock Dependencies
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
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

// Import after mocking
import { useNavigate } from '@tanstack/react-router';

describe('useDeepLinkEffect Integration', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockMutateAsync: ReturnType<typeof vi.fn>;
  let deepLinkService: DeepLinkService;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup navigate mock
    mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    // Setup mutation mock
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

    // Get DeepLinkService instance (fresh for each test)
    DeepLinkService.reset();
    deepLinkService = DeepLinkService.getInstance();
  });

  afterEach(() => {
    DeepLinkService.reset();
  });

  describe('Success Flow', () => {
    it('should handle deep link → exchange → navigate flow', async () => {
      // Given: Successful API response
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

      // When: Render hook and emit deep link event
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-received', {
        serverUrl: 'https://api.test.de',
        inviteCode: 'INV_12345678',
        expiresAt: null,
      });

      // Then: Wait for async operations
      await waitFor(() => {
        // Verify loading toast shown
        expect(toast.loading).toHaveBeenCalledWith('Verbinde mit Server...', {
          description: 'Tausche Einladungscode ein',
        });
      });

      await waitFor(() => {
        // Verify mutation called with correct invite code and server URL
        expect(mockMutateAsync).toHaveBeenCalledWith({
          inviteCode: 'INV_12345678',
          serverUrl: 'https://api.test.de',
        });
      });

      await waitFor(() => {
        // Verify success toast shown
        expect(toast.success).toHaveBeenCalledWith(
          "Server 'Test Server' hinzugefügt",
          expect.objectContaining({
            description: 'Du wirst zur Anmeldung weitergeleitet',
          }),
        );
      });

      await waitFor(() => {
        // Verify navigation to login screen
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
      });
    });

    it('should handle deep link with expiry date (valid)', async () => {
      // Given: Valid expiry date (future)
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);

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

      // When
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-received', {
        serverUrl: 'https://api.test.de',
        inviteCode: 'INV_12345678',
        expiresAt: futureDate.toISOString(),
      });

      // Then: Should proceed normally
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          inviteCode: 'INV_12345678',
          serverUrl: 'https://api.test.de',
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when invite exchange fails', async () => {
      // Given: API error
      mockMutateAsync.mockRejectedValue(new Error('Invalid invite code'));

      // When
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-received', {
        serverUrl: 'https://api.test.de',
        inviteCode: 'INVALID_CODE',
        expiresAt: null,
      });

      // Then: Wait for error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Fehler beim Verbinden mit Server',
          expect.objectContaining({
            description: 'Invalid invite code',
          }),
        );
      });

      // Verify navigation NOT called
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show error toast when link is expired (client-side)', async () => {
      // Given: Expired date (past)
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);

      // When
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-received', {
        serverUrl: 'https://api.test.de',
        inviteCode: 'INV_12345678',
        expiresAt: pastDate.toISOString(),
      });

      // Then: Show expiry error (don't call API)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Dieser Einladungslink ist abgelaufen.', {
          description: 'Bitte fordere einen neuen Link an.',
          duration: 5000,
        });
      });

      // Verify mutation NOT called
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Deep Link Error Events', () => {
    it('should handle INVALID_PROTOCOL error', async () => {
      // When
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-error', DeepLinkError.INVALID_PROTOCOL, 'Invalid protocol: http://');

      // Then
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Ungültiger Link', {
          description: 'Dieser Link ist kein gültiger Bluelight-Einladungslink.',
          duration: 5000,
        });
      });
    });

    it('should handle MISSING_PARAMETERS error', async () => {
      // When
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-error', DeepLinkError.MISSING_PARAMETERS, 'Missing invite parameter');

      // Then
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Ungültiger Link', {
          description: 'Der Link enthält nicht alle erforderlichen Parameter.',
          duration: 5000,
        });
      });
    });

    it('should handle EXPIRED_LINK error', async () => {
      // When
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-error', DeepLinkError.EXPIRED_LINK, 'Link expired');

      // Then
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Link abgelaufen', {
          description: 'Dieser Einladungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
          duration: 5000,
        });
      });
    });

    it('should handle PARSE_ERROR error', async () => {
      // When
      renderHook(() => useDeepLinkEffect());

      deepLinkService.emitForTesting('deep-link-error', DeepLinkError.PARSE_ERROR, 'Failed to parse URL');

      // Then
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Fehler beim Verarbeiten', {
          description: 'Der Link konnte nicht verarbeitet werden.',
          duration: 5000,
        });
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', async () => {
      // Given
      const offSpy = vi.spyOn(deepLinkService, 'off');

      // When
      const { unmount } = renderHook(() => useDeepLinkEffect());
      unmount();

      // Then
      expect(offSpy).toHaveBeenCalledWith('deep-link-received', expect.any(Function));
      expect(offSpy).toHaveBeenCalledWith('deep-link-error', expect.any(Function));
    });
  });
});
