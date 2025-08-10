import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminRefresh } from '@/hooks/useAdminRefresh';
import { authActions } from '@/stores/auth.store';
import { verifyAdminToken } from '@/utils/adminAuth';

// Mocks
vi.mock('@/stores/auth.store', () => ({
  authActions: {
    setAdminAuth: vi.fn(),
  },
}));

vi.mock('@/utils/adminAuth', () => ({
  verifyAdminToken: vi.fn(),
}));

describe('useAdminRefresh', () => {
  const mockSetAdminAuth = vi.mocked(authActions.setAdminAuth);
  const mockVerifyAdminToken = vi.mocked(verifyAdminToken);

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset document.cookie for each test
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: '',
    });
  });

  it('should set admin auth to false when no admin cookie exists', () => {
    renderHook(() => useAdminRefresh());

    // Der Hook setzt den Status sofort synchron
    expect(mockSetAdminAuth).toHaveBeenCalledWith(false);
    expect(mockVerifyAdminToken).not.toHaveBeenCalled();
  });

  it('should set admin auth to true when verification succeeds', async () => {
    // Set cookie before rendering
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'adminToken=test-admin-token',
    });
    mockVerifyAdminToken.mockResolvedValueOnce(true);

    renderHook(() => useAdminRefresh());

    // Wait for verification to be called
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    // Wait for setAdminAuth to be called with true
    await waitFor(() => {
      expect(mockSetAdminAuth).toHaveBeenCalledWith(true);
    });
  });

  it('should set admin auth to false when verification fails', async () => {
    // Set cookie before rendering
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'adminToken=invalid-admin-token',
    });
    mockVerifyAdminToken.mockResolvedValueOnce(false);

    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetAdminAuth).toHaveBeenCalledWith(false);
    });
  });

  it('should set admin auth to false when verification throws an error', async () => {
    // Set cookie before rendering
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'adminToken=test-admin-token',
    });
    mockVerifyAdminToken.mockRejectedValueOnce(new Error('Verification failed'));

    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetAdminAuth).toHaveBeenCalledWith(false);
    });
  });

  it('should only verify admin once on mount', async () => {
    // Set cookie before rendering
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'adminToken=test-admin-token',
    });
    mockVerifyAdminToken.mockResolvedValueOnce(true);

    const { rerender } = renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    // Re-render the hook
    rerender();

    // Verify admin should not be called again
    expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
  });

  it('should handle async verification correctly', async () => {
    // Set cookie before rendering
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'adminToken=test-admin-token',
    });

    // Create a promise that we control
    let resolveVerify: (value: boolean) => void;
    const verifyPromise = new Promise<boolean>((resolve) => {
      resolveVerify = resolve;
    });

    mockVerifyAdminToken.mockReturnValueOnce(verifyPromise);

    renderHook(() => useAdminRefresh());

    // Verify admin should be called immediately
    expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);

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
