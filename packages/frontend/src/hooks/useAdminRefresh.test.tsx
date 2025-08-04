import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useAdminRefresh } from './useAdminRefresh';
import type { MockInstance } from 'vitest';
import { authActions } from '@/stores/auth.store';

// Mock dependencies
const mockVerifyAdmin = vi.fn();
vi.mock('@/utils/adminAuth', () => ({
  verifyAdmin: () => mockVerifyAdmin(),
}));

vi.mock('@/stores/auth.store', () => ({
  authActions: {
    setAdminAuth: vi.fn(),
  },
}));

describe('useAdminRefresh', () => {
  let setAdminAuthSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth store spy
    setAdminAuthSpy = vi.spyOn(authActions, 'setAdminAuth');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set admin auth to true when verification succeeds', async () => {
    // Arrange
    mockVerifyAdmin.mockResolvedValueOnce(true);

    // Act
    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(setAdminAuthSpy).toHaveBeenCalledWith(true);
  });

  it('should set admin auth to false when verification fails', async () => {
    // Arrange
    mockVerifyAdmin.mockResolvedValueOnce(false);

    // Act
    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(setAdminAuthSpy).toHaveBeenCalledWith(false);
  });

  it('should set admin auth to false when verification throws an error', async () => {
    // Arrange
    mockVerifyAdmin.mockRejectedValueOnce(new Error('Network error'));

    // Act
    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(setAdminAuthSpy).toHaveBeenCalledWith(false);
  });

  it('should only verify admin once on mount', async () => {
    // Arrange
    mockVerifyAdmin.mockResolvedValue(true);

    // Act
    const { rerender } = renderHook(() => useAdminRefresh());

    // Wait for initial effect
    await waitFor(() => {
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    // Rerender component
    rerender();

    // Assert - should not call again
    expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
  });

  it('should handle async verification correctly', async () => {
    // Arrange
    let resolveVerification: (value: boolean) => void;

    const verificationPromise = new Promise<boolean>((resolve) => {
      resolveVerification = resolve;
    });

    mockVerifyAdmin.mockReturnValueOnce(verificationPromise);

    // Act - render the hook
    const { rerender } = renderHook(() => useAdminRefresh());

    // Verify that verification was initiated but not completed yet
    expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    expect(setAdminAuthSpy).not.toHaveBeenCalled();

    // Re-render shouldn't trigger another verification
    rerender();
    expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);

    // Resolve the verification
    resolveVerification!(true);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(setAdminAuthSpy).toHaveBeenCalledWith(true);
    });

    // Assert - verification only happened once, auth was set once
    expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    expect(setAdminAuthSpy).toHaveBeenCalledTimes(1);
    expect(setAdminAuthSpy).toHaveBeenCalledWith(true);
  });
});
