import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStorageQuota } from './storage-quota';

describe('getStorageQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return quota information in MB', async () => {
    // Mock Storage API
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 100 * 1024 * 1024, // 100 MB in bytes
      quota: 1000 * 1024 * 1024, // 1000 MB in bytes
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result).toEqual({
      used: 100,
      available: 900,
      percentage: 10,
    });
  });

  it('should handle zero quota gracefully', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 0,
      quota: 0,
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result.percentage).toBe(0);
  });

  it('should handle missing usage/quota values', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({});

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result).toEqual({
      used: 0,
      available: 0,
      percentage: 0,
    });
  });

  it('should throw error if Storage API is not supported', async () => {
    // Remove Storage API
    Object.defineProperty(navigator, 'storage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await expect(getStorageQuota()).rejects.toThrow('Storage API not supported in this browser');
  });

  it('should calculate correct percentage', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 450 * 1024 * 1024, // 450 MB
      quota: 500 * 1024 * 1024, // 500 MB
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result.percentage).toBe(90); // 450/500 = 90%
  });

  it('should round values to nearest MB', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 100.4 * 1024 * 1024, // 100.4 MB
      quota: 1000.6 * 1024 * 1024, // 1000.6 MB
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result.used).toBe(100); // Rounded
    expect(result.available).toBe(900); // Rounded
  });

  it('should throw error if estimate() fails', async () => {
    const mockEstimate = vi.fn().mockRejectedValue(new Error('API error'));

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    await expect(getStorageQuota()).rejects.toThrow('Failed to get storage quota: API error');
  });
});
