import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseError } from '@bluelight-hub/shared/client/runtime';
import { verifyAdmin } from './adminAuth';
import { api } from '@/api/api';

// Mock the api module
vi.mock('@/api/api', () => {
  const mockAuthApi = {
    authControllerVerifyAdminToken: vi.fn(),
  };

  return {
    api: {
      auth: () => mockAuthApi,
    },
  };
});

describe('verifyAdmin', () => {
  let mockAuthApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked auth API
    mockAuthApi = api.auth();
  });

  it('should return true when admin verification succeeds', async () => {
    // Mock successful verification (no error thrown)
    mockAuthApi.authControllerVerifyAdminToken.mockResolvedValue({});

    const result = await verifyAdmin();

    expect(result).toBe(true);
    expect(mockAuthApi.authControllerVerifyAdminToken).toHaveBeenCalledTimes(1);
  });

  it('should return false when admin verification returns 401', async () => {
    // Mock 401 unauthorized error
    const error = new ResponseError(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
      }),
    );
    mockAuthApi.authControllerVerifyAdminToken.mockRejectedValue(error);

    const result = await verifyAdmin();

    expect(result).toBe(false);
    expect(mockAuthApi.authControllerVerifyAdminToken).toHaveBeenCalledTimes(1);
  });

  it('should throw error when admin verification throws unexpected error', async () => {
    // Mock network error
    const networkError = new Error('Network error');
    mockAuthApi.authControllerVerifyAdminToken.mockRejectedValue(networkError);

    await expect(verifyAdmin()).rejects.toThrow('Network error');
    expect(mockAuthApi.authControllerVerifyAdminToken).toHaveBeenCalledTimes(1);
  });

  it('should return false when admin verification returns 403', async () => {
    // Mock 403 forbidden error
    const error = new ResponseError(
      new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
      }),
    );
    mockAuthApi.authControllerVerifyAdminToken.mockRejectedValue(error);

    const result = await verifyAdmin();

    expect(result).toBe(false);
    expect(mockAuthApi.authControllerVerifyAdminToken).toHaveBeenCalledTimes(1);
  });
});
