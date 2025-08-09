import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useAuthRefresh } from '@/hooks/useAuthRefresh';
import { authActions } from '@/stores/auth.store';

// Mocks
const mockCheckAuth = vi.fn();
vi.mock('@/api/api', () => ({
  api: {
    auth: () => ({
      authControllerCheckAuth: mockCheckAuth,
    }),
  },
}));

vi.mock('@/stores/auth.store', () => ({
  authActions: {
    loginSuccess: vi.fn(),
    setLoading: vi.fn(),
    setAdminAuth: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAuthRefresh', () => {
  let queryClient: QueryClient;
  const mockLoginSuccess = vi.mocked(authActions.loginSuccess);
  const mockSetLoading = vi.mocked(authActions.setLoading);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('should handle case when no user is authenticated', async () => {
    mockCheckAuth.mockResolvedValueOnce({ user: null });

    renderHook(() => useAuthRefresh(), { wrapper });

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    expect(mockLoginSuccess).not.toHaveBeenCalled();
  });

  it('should call API and set user when authenticated', async () => {
    const mockUser = { id: '1', username: 'testuser', createdAt: new Date().toISOString() };
    mockCheckAuth.mockResolvedValueOnce({ user: mockUser });

    renderHook(() => useAuthRefresh(), { wrapper });

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockLoginSuccess).toHaveBeenCalledWith(mockUser);
    });

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should handle successful auth check with user data', async () => {
    const mockUser = { id: '2', username: 'anotheruser', createdAt: new Date().toISOString() };
    mockCheckAuth.mockResolvedValueOnce({ user: mockUser });

    renderHook(() => useAuthRefresh(), { wrapper });

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockLoginSuccess).toHaveBeenCalledWith(mockUser);
    });

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should handle API error gracefully', async () => {
    const error = new Error('Unauthorized');
    (error as any).response = { status: 401 };
    mockCheckAuth.mockRejectedValueOnce(error);

    renderHook(() => useAuthRefresh(), { wrapper });

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    expect(mockLoginSuccess).not.toHaveBeenCalled();
  });

  it('should handle network error gracefully', async () => {
    const error = new Error('Network error');
    (error as any).response = { status: 500 };
    mockCheckAuth.mockRejectedValueOnce(error);

    renderHook(() => useAuthRefresh(), { wrapper });

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    expect(mockLoginSuccess).not.toHaveBeenCalled();
  });
});
