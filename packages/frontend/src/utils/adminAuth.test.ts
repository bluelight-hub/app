import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyAdmin } from './adminAuth';
import { BackendApi } from '@/api/api';

// Mock the BackendApi
vi.mock('@/api/api', () => ({
  BackendApi: vi.fn(),
}));

describe('verifyAdmin', () => {
  let mockAuthApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock API
    mockAuthApi = {
      authControllerAdminVerify: vi.fn(),
    };

    const mockApi = {
      auth: () => mockAuthApi,
    };

    vi.mocked(BackendApi).mockImplementation(() => mockApi as any);
  });

  it('should return true when admin verification succeeds', async () => {
    // Mock successful verification (no error thrown)
    mockAuthApi.authControllerAdminVerify.mockResolvedValue({});

    const result = await verifyAdmin();

    expect(result).toBe(true);
    expect(mockAuthApi.authControllerAdminVerify).toHaveBeenCalledTimes(1);
  });

  it('should return false when admin verification returns 401', async () => {
    // Mock 401 unauthorized error
    mockAuthApi.authControllerAdminVerify.mockRejectedValue({
      status: 401,
      message: 'Unauthorized',
    });

    const result = await verifyAdmin();

    expect(result).toBe(false);
    expect(mockAuthApi.authControllerAdminVerify).toHaveBeenCalledTimes(1);
  });

  it('should return false when admin verification throws any error', async () => {
    // Mock network error
    mockAuthApi.authControllerAdminVerify.mockRejectedValue(new Error('Network error'));

    const result = await verifyAdmin();

    expect(result).toBe(false);
    expect(mockAuthApi.authControllerAdminVerify).toHaveBeenCalledTimes(1);
  });

  it('should return false when admin verification returns 403', async () => {
    // Mock 403 forbidden error
    mockAuthApi.authControllerAdminVerify.mockRejectedValue({
      status: 403,
      message: 'Forbidden',
    });

    const result = await verifyAdmin();

    expect(result).toBe(false);
    expect(mockAuthApi.authControllerAdminVerify).toHaveBeenCalledTimes(1);
  });
});
