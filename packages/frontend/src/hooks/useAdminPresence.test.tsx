import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminPresence } from './useAdminPresence';
import * as adminApi from '@/services/adminApi';

// Mock adminApi
vi.mock('@/services/adminApi', () => ({
  verifyAdmin: vi.fn(),
}));

describe('useAdminPresence', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  it('should return hasAdmin as true when admin exists', async () => {
    vi.mocked(adminApi.verifyAdmin).mockResolvedValueOnce(true);

    const { result } = renderHook(() => useAdminPresence(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.hasAdmin).toBeUndefined();

    // Wait for query to resolve
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasAdmin).toBe(true);
    expect(adminApi.verifyAdmin).toHaveBeenCalledTimes(1);
  });

  it('should return hasAdmin as false when admin does not exist', async () => {
    vi.mocked(adminApi.verifyAdmin).mockResolvedValueOnce(false);

    const { result } = renderHook(() => useAdminPresence(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasAdmin).toBe(false);
  });

  it('should refresh admin status when refresh is called', async () => {
    vi.mocked(adminApi.verifyAdmin).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const { result } = renderHook(() => useAdminPresence(), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasAdmin).toBe(false);
    expect(adminApi.verifyAdmin).toHaveBeenCalledTimes(1);

    // Call refresh
    await result.current.refresh();

    // Wait for refresh to complete
    await waitFor(() => {
      expect(result.current.hasAdmin).toBe(true);
    });

    // After refresh, verifyAdmin should be called again (at least 2 times)
    expect(adminApi.verifyAdmin).toHaveBeenCalledTimes(3);
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(adminApi.verifyAdmin).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAdminPresence(), { wrapper });

    await waitFor(() => {
      // When error occurs, React Query retries, so we need to wait for it to finish
      expect(result.current.hasAdmin).toBeUndefined();
    });

    expect(result.current.loading).toBe(false);

    consoleSpy.mockRestore();
  });
});
