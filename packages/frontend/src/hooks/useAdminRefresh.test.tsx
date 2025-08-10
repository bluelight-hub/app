import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useAdminRefresh } from './useAdminRefresh';
import type { MockInstance } from 'vitest';
import { authActions } from '@/stores/auth.store';

// Mock dependencies
const mockVerifyAdminToken = vi.fn();
vi.mock('@/utils/adminAuth', () => ({
  verifyAdminToken: () => mockVerifyAdminToken(),
}));

vi.mock('@/stores/auth.store', () => ({
  authActions: {
    setAdminAuth: vi.fn(),
  },
}));

describe('useAdminRefresh', () => {
  let setAdminAuthSpy: MockInstance;
  let originalCookie: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth store spy
    setAdminAuthSpy = vi.spyOn(authActions, 'setAdminAuth');

    // Save original cookie descriptor
    originalCookie = Object.getOwnPropertyDescriptor(document, 'cookie');

    // Mock document.cookie to include adminToken by default
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'adminToken=test-token; Path=/; HttpOnly',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original cookie behavior
    if (originalCookie) {
      Object.defineProperty(document, 'cookie', originalCookie);
    } else {
      // If no original descriptor, delete the property
      delete (document as any).cookie;
    }
  });

  it('should set admin auth to false when no cookie is present', async () => {
    // Arrange
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: '', // No cookie
    });

    // Act
    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(setAdminAuthSpy).toHaveBeenCalledWith(false);
    });

    // Assert - verifyAdminToken should not be called when no cookie
    expect(mockVerifyAdminToken).not.toHaveBeenCalled();
  });

  it('should set admin auth to true when verification succeeds', async () => {
    // Arrange
    mockVerifyAdminToken.mockResolvedValueOnce(true);

    // Act
    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(setAdminAuthSpy).toHaveBeenCalledWith(true);
  });

  it('should set admin auth to false when verification fails', async () => {
    // Arrange
    mockVerifyAdminToken.mockResolvedValueOnce(false);

    // Act
    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(setAdminAuthSpy).toHaveBeenCalledWith(false);
  });

  it('should set admin auth to false when verification throws an error', async () => {
    // Arrange
    mockVerifyAdminToken.mockRejectedValueOnce(new Error('Network error'));

    // Act
    renderHook(() => useAdminRefresh());

    // Wait for effect to complete
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(setAdminAuthSpy).toHaveBeenCalledWith(false);
  });

  it('should only verify admin once on mount', async () => {
    // Arrange
    mockVerifyAdminToken.mockResolvedValue(true);

    // Act
    const { rerender } = renderHook(() => useAdminRefresh());

    // Wait for initial effect
    await waitFor(() => {
      expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    });

    // Rerender component
    rerender();

    // Assert - should not call again
    expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
  });

  it('should handle async verification correctly', async () => {
    // Arrange
    let resolveVerification: (value: boolean) => void;

    const verificationPromise = new Promise<boolean>((resolve) => {
      resolveVerification = resolve;
    });

    mockVerifyAdminToken.mockReturnValueOnce(verificationPromise);

    // Act - render the hook
    const { rerender } = renderHook(() => useAdminRefresh());

    // Verify that verification was initiated but not completed yet
    expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    expect(setAdminAuthSpy).not.toHaveBeenCalled();

    // Re-render shouldn't trigger another verification
    rerender();
    expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);

    // Resolve the verification
    resolveVerification!(true);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(setAdminAuthSpy).toHaveBeenCalledWith(true);
    });

    // Assert - verification only happened once, auth was set once
    expect(mockVerifyAdminToken).toHaveBeenCalledTimes(1);
    expect(setAdminAuthSpy).toHaveBeenCalledTimes(1);
    expect(setAdminAuthSpy).toHaveBeenCalledWith(true);
  });
});
