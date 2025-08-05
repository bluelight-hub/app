import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminRefresh } from '@/hooks/useAdminRefresh';
import { authActions } from '@/stores/auth.store';
import { verifyAdmin } from '@/utils/adminAuth';

// Mocks
vi.mock('@/stores/auth.store', () => ({
  authActions: {
    setAdminAuth: vi.fn(),
  },
}));

vi.mock('@/utils/adminAuth', () => ({
  verifyAdmin: vi.fn(),
}));

describe('useAdminRefresh', () => {
  const mockSetAdminAuth = vi.mocked(authActions.setAdminAuth);
  const mockVerifyAdmin = vi.mocked(verifyAdmin);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  it('should set admin auth to false when no admin cookie exists', () => {
    renderHook(() => useAdminRefresh());

    // Der Hook setzt den Status sofort synchron
    expect(mockSetAdminAuth).toHaveBeenCalledWith(false);
    expect(mockVerifyAdmin).not.toHaveBeenCalled();
  });

  it('should set admin auth to true when verification succeeds', async () => {
    document.cookie = 'adminToken=test-admin-token';
    mockVerifyAdmin.mockResolvedValueOnce(true);

    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetAdminAuth).toHaveBeenCalledWith(true);
    });
  });

  it('should set admin auth to false when verification fails', async () => {
    document.cookie = 'adminToken=invalid-admin-token';
    mockVerifyAdmin.mockResolvedValueOnce(false);

    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetAdminAuth).toHaveBeenCalledWith(false);
    });
  });

  it('should set admin auth to false when verification throws an error', async () => {
    document.cookie = 'adminToken=test-admin-token';
    mockVerifyAdmin.mockRejectedValueOnce(new Error('Verification failed'));

    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetAdminAuth).toHaveBeenCalledWith(false);
    });
  });

  it('should only verify admin once on mount', async () => {
    document.cookie = 'adminToken=test-admin-token';
    mockVerifyAdmin.mockResolvedValueOnce(true);

    const { rerender } = renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    // Re-render the hook
    rerender();

    // Verify admin should not be called again
    expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
  });

  it('should handle async verification correctly', async () => {
    document.cookie = 'adminToken=test-admin-token';

    // Create a promise that we control
    let resolveVerify: (value: boolean) => void;
    const verifyPromise = new Promise<boolean>((resolve) => {
      resolveVerify = resolve;
    });

    mockVerifyAdmin.mockReturnValueOnce(verifyPromise);

    renderHook(() => useAdminRefresh());

    // Verify admin should be called immediately
    expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);

    // But setAdminAuth should not be called yet (except the initial false for no cookie check)
    expect(mockSetAdminAuth).toHaveBeenCalledTimes(0);

    // Resolve the verification
    resolveVerify!(true);

    // Wait for the effect to complete
    await waitFor(() => {
      expect(mockSetAdminAuth).toHaveBeenCalledWith(true);
    });
  });
});
