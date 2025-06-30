import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './useAuthStore';
import { api } from '../api';
import { authStorage } from '../utils/authStorage';
import { LoginResponseDto, AuthUserDto } from '@bluelight-hub/shared/client';

// Mock localStorage for zustand persist
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock dependencies
vi.mock('../api', () => ({
  api: {
    auth: {
      authControllerLoginV1Raw: vi.fn(),
      authControllerLogoutV1: vi.fn(),
      authControllerRefreshTokenV1Raw: vi.fn(),
      authControllerGetCurrentUserV1Raw: vi.fn(),
    },
  },
}));

vi.mock('../utils/authStorage', () => ({
  authStorage: {
    setTokens: vi.fn().mockResolvedValue(undefined),
    clearTokens: vi.fn().mockResolvedValue(undefined),
    hasValidTokens: vi.fn().mockResolvedValue(false),
    getTokens: vi.fn().mockResolvedValue({ authToken: null, refreshToken: null }),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  const mockUser: AuthUserDto = {
    id: '1',
    email: 'test@example.com',
    roles: ['USER'],
    permissions: ['read:profile'],
    isActive: true,
    organizationId: 'org-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockLoginResponse: LoginResponseDto = {
    user: mockUser,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 900, // 15 minutes
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isRefreshing: false,
      accessToken: null,
      refreshToken: null,
      sessionExpiresAt: null,
      lastRefreshAt: null,
      refreshTimer: null,
    });
  });

  afterEach(() => {
    // Clear any timers
    const { refreshTimer } = useAuthStore.getState();
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
  });

  describe('login', () => {
    it('should handle successful login', async () => {
      vi.mocked(api.auth.authControllerLoginV1Raw).mockResolvedValue({
        raw: new Response(),
        value: async () => mockLoginResponse,
      } as any);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const response = await result.current.login('test@example.com', 'password');
        expect(response.success).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('access-token');
      expect(result.current.refreshToken).toBe('refresh-token');
      expect(authStorage.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    });

    it('should handle login failure', async () => {
      vi.mocked(api.auth.authControllerLoginV1Raw).mockRejectedValue(
        new Error('Invalid credentials'),
      );

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const response = await result.current.login('test@example.com', 'wrong-password');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Invalid credentials');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network errors', async () => {
      vi.mocked(api.auth.authControllerLoginV1Raw).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const response = await result.current.login('test@example.com', 'password');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Network error');
      });
    });
  });

  describe('logout', () => {
    it('should clear auth state and tokens', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(api.auth.authControllerLogoutV1).toHaveBeenCalled();
      expect(authStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.refreshToken).toBeNull();
    });

    it('should handle logout errors gracefully', async () => {
      vi.mocked(api.auth.authControllerLogoutV1).mockRejectedValue(new Error('Logout failed'));

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state even if logout fails
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const newUser = { ...mockUser, email: 'updated@example.com' };
      const refreshResponse: LoginResponseDto = {
        ...mockLoginResponse,
        user: newUser,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(api.auth.authControllerRefreshTokenV1Raw).mockResolvedValue({
        raw: { ok: true } as Response,
        value: async () => refreshResponse,
      } as any);

      useAuthStore.setState({
        refreshToken: 'refresh-token',
        lastRefreshAt: new Date(Date.now() - 60000), // 1 minute ago
      });

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.refreshAccessToken();
      });

      expect(success).toBe(true);
      expect(result.current.accessToken).toBe('new-access-token');
      expect(result.current.refreshToken).toBe('new-refresh-token');
      expect(result.current.user).toEqual(newUser);
    });

    it('should prevent concurrent refresh attempts', async () => {
      vi.mocked(api.auth.authControllerRefreshTokenV1Raw).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  raw: { ok: true } as Response,
                  value: async () => mockLoginResponse,
                } as any),
              100,
            ),
          ),
      );

      useAuthStore.setState({
        refreshToken: 'refresh-token',
        lastRefreshAt: new Date(Date.now() - 60000),
      });

      const { result } = renderHook(() => useAuthStore());

      // Start first refresh
      const firstRefresh = act(async () => {
        return result.current.refreshAccessToken();
      });

      // Attempt second refresh while first is in progress
      const secondRefresh = act(async () => {
        return result.current.refreshAccessToken();
      });

      const [firstResult, secondResult] = await Promise.all([firstRefresh, secondRefresh]);

      // Second attempt should return false immediately
      expect(secondResult).toBe(false);
      // First attempt should succeed
      expect(firstResult).toBe(true);
    });

    it('should logout on 401 refresh failure', async () => {
      vi.mocked(api.auth.authControllerRefreshTokenV1Raw).mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        refreshToken: 'refresh-token',
        lastRefreshAt: new Date(Date.now() - 60000),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshAccessToken();
      });

      // Should trigger logout
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('checkAuthStatus', () => {
    it('should load user data if tokens exist', async () => {
      vi.mocked(authStorage.hasValidTokens).mockResolvedValue(true);
      vi.mocked(authStorage.getTokens).mockResolvedValue({
        authToken: 'stored-token',
        refreshToken: 'stored-refresh',
      });
      vi.mocked(api.auth.authControllerGetCurrentUserV1Raw).mockResolvedValue({
        raw: { ok: true } as Response,
        value: async () => mockUser,
      } as any);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('stored-token');
      expect(result.current.refreshToken).toBe('stored-refresh');
    });

    it('should attempt token refresh if getting user fails', async () => {
      vi.mocked(authStorage.hasValidTokens).mockResolvedValue(true);
      vi.mocked(authStorage.getTokens).mockResolvedValue({
        authToken: 'stored-token',
        refreshToken: 'stored-refresh',
      });
      vi.mocked(api.auth.authControllerGetCurrentUserV1Raw).mockRejectedValue(
        new Error('Unauthorized'),
      );
      vi.mocked(api.auth.authControllerRefreshTokenV1Raw).mockResolvedValue({
        raw: { ok: true } as Response,
        value: async () => mockLoginResponse,
      } as any);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(api.auth.authControllerRefreshTokenV1Raw).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('role and permission checks', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: {
          ...mockUser,
          roles: ['USER', 'ADMIN'],
          permissions: ['read:profile', 'write:posts'],
        },
      });
    });

    it('should check if user has role', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.hasRole('USER')).toBe(true);
      expect(result.current.hasRole('ADMIN')).toBe(true);
      expect(result.current.hasRole('SUPER_ADMIN')).toBe(false);
    });

    it('should check if user has permission', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.hasPermission('read:profile')).toBe(true);
      expect(result.current.hasPermission('write:posts')).toBe(true);
      expect(result.current.hasPermission('delete:users')).toBe(false);
    });

    it('should check if user is admin', () => {
      const { result } = renderHook(() => useAuthStore());
      expect(result.current.isAdmin()).toBe(true);

      // Test with non-admin user
      act(() => {
        useAuthStore.setState({
          user: { ...mockUser, roles: ['USER'] },
        });
      });

      expect(result.current.isAdmin()).toBe(false);
    });
  });

  describe('token refresh scheduling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should schedule token refresh before expiry', async () => {
      const expiresAt = new Date(Date.now() + 300000); // 5 minutes from now
      const mockRefreshAccessToken = vi.fn().mockResolvedValue(true);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          sessionExpiresAt: expiresAt,
          refreshToken: 'refresh-token',
          refreshAccessToken: mockRefreshAccessToken,
        });
        result.current.scheduleTokenRefresh();
      });

      expect(result.current.refreshTimer).toBeTruthy();

      // Fast forward to just before expiry
      await act(async () => {
        vi.advanceTimersByTime(240000); // 4 minutes
        await vi.runOnlyPendingTimersAsync();
      });

      // Should trigger refresh
      expect(mockRefreshAccessToken).toHaveBeenCalled();
    });

    it('should clear existing timer when scheduling new one', () => {
      const { result } = renderHook(() => useAuthStore());

      const firstTimer = setTimeout(() => {}, 1000);
      useAuthStore.setState({ refreshTimer: firstTimer });

      act(() => {
        useAuthStore.setState({
          sessionExpiresAt: new Date(Date.now() + 300000),
          refreshToken: 'refresh-token',
        });
        result.current.scheduleTokenRefresh();
      });

      expect(result.current.refreshTimer).not.toBe(firstTimer);
    });
  });
});
