import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authInterceptorMiddleware, fetchWithAuth } from './authInterceptor';
import { useAuthStore } from '../stores/useAuthStore';

// Mock dependencies
vi.mock('../stores/useAuthStore');
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

// Type for mocked auth store state
type MockAuthState = Partial<ReturnType<typeof useAuthStore.getState>>;

describe('authInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore.getState).mockReturnValue({
      accessToken: null,
      refreshToken: null,
      refreshAccessToken: vi.fn(),
      logout: vi.fn(),
    } as MockAuthState);
  });

  describe('authInterceptorMiddleware.pre', () => {
    it('should add authorization header when access token exists', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        accessToken: 'test-token',
      } as MockAuthState);

      const context = {
        url: '/api/users',
        init: { headers: {} },
      };

      const result = await authInterceptorMiddleware.pre(context);

      expect(result.init.headers).toEqual({
        Authorization: 'Bearer test-token',
      });
    });

    it('should not add authorization header when no access token', async () => {
      const context = {
        url: '/api/users',
        init: { headers: {} },
      };

      const result = await authInterceptorMiddleware.pre(context);

      expect(result.init.headers).toEqual({});
    });

    it('should preserve existing headers', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        accessToken: 'test-token',
      } as MockAuthState);

      const context = {
        url: '/api/users',
        init: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };

      const result = await authInterceptorMiddleware.pre(context);

      expect(result.init.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      });
    });
  });

  describe('authInterceptorMiddleware.post', () => {
    it('should skip auth endpoints', async () => {
      const mockLogout = vi.fn();
      vi.mocked(useAuthStore.getState).mockReturnValue({
        logout: mockLogout,
      } as MockAuthState);

      const context = {
        url: '/auth/login',
        init: {},
        response: new Response(null, { status: 401 }),
      };

      const result = await authInterceptorMiddleware.post(context);

      expect(result).toBe(context);
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('should handle 401 and refresh token', async () => {
      const mockRefreshAccessToken = vi.fn().mockResolvedValue(true);
      const mockLogout = vi.fn();

      vi.mocked(useAuthStore.getState)
        .mockReturnValueOnce({
          refreshAccessToken: mockRefreshAccessToken,
          logout: mockLogout,
        } as MockAuthState)
        .mockReturnValueOnce({
          accessToken: 'new-token',
        } as MockAuthState);

      const retryResponse = new Response(null, { status: 200 });
      vi.mocked(fetch).mockResolvedValue(retryResponse);

      const context = {
        url: '/api/users',
        init: { headers: {} },
        response: new Response(null, { status: 401 }),
      };

      const result = await authInterceptorMiddleware.post(context);

      expect(mockRefreshAccessToken).toHaveBeenCalled();
      expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/users', {
        headers: {
          Authorization: 'Bearer new-token',
        },
      });
      expect(result.response).toBe(retryResponse);
    });

    it('should logout after max retry attempts', async () => {
      const mockLogout = vi.fn();
      vi.mocked(useAuthStore.getState).mockReturnValue({
        logout: mockLogout,
      } as MockAuthState);

      const context = {
        url: '/api/users',
        init: {},
        response: new Response(null, { status: 401 }),
        retryCount: 1,
      };

      await authInterceptorMiddleware.post(context);

      expect(mockLogout).toHaveBeenCalled();
    });

    it('should logout if token refresh fails', async () => {
      const mockRefreshAccessToken = vi.fn().mockResolvedValue(false);
      const mockLogout = vi.fn();

      vi.mocked(useAuthStore.getState).mockReturnValue({
        refreshAccessToken: mockRefreshAccessToken,
        logout: mockLogout,
      } as MockAuthState);

      const context = {
        url: '/api/users',
        init: {},
        response: new Response(null, { status: 401 }),
      };

      await authInterceptorMiddleware.post(context);

      expect(mockRefreshAccessToken).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
    });

    it('should pass through non-401 responses', async () => {
      const response = new Response(null, { status: 200 });
      const context = {
        url: '/api/users',
        init: {},
        response,
      };

      const result = await authInterceptorMiddleware.post(context);

      expect(result).toBe(context);
    });
  });

  describe('fetchWithAuth', () => {
    it('should apply auth interceptor middleware', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        accessToken: 'test-token',
      } as MockAuthState);

      const mockResponse = new Response('OK', { status: 200 });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const response = await fetchWithAuth('/api/users', {
        method: 'GET',
      });

      expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/users', {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(response).toBe(mockResponse);
    });

    it('should handle URL objects', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const url = new URL('https://api.example.com/users');
      await fetchWithAuth(url);

      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });
  });
});
