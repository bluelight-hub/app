import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminExistsError,
  AuthError,
  InvalidCredentialsError,
  loginAdmin,
  setupAdmin,
  verifyAdmin,
} from './adminApi';

import { logger } from '@/utils/logger';

// Create mock functions
const mockVerifyAdmin = vi.fn();
const mockAdminSetup = vi.fn();
const mockAdminLogin = vi.fn();

// Mock the api module
vi.mock('@/api/api', () => ({
  api: {
    auth: () => ({
      authControllerVerifyAdmin: mockVerifyAdmin,
      authControllerAdminSetup: mockAdminSetup,
      authControllerAdminLogin: mockAdminLogin,
    }),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

describe('adminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyAdmin', () => {
    it('should return true when admin exists', async () => {
      mockVerifyAdmin.mockResolvedValueOnce({ exists: true });

      const result = await verifyAdmin();
      expect(result).toBe(true);
      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return false when admin does not exist', async () => {
      mockVerifyAdmin.mockResolvedValueOnce({ exists: false });

      const result = await verifyAdmin();
      expect(result).toBe(false);
    });

    it('should throw on network or unexpected errors', async () => {
      mockVerifyAdmin.mockRejectedValueOnce(new Error('Network error'));

      await expect(verifyAdmin()).rejects.toThrow('Network error');
    });
  });

  describe('setupAdmin', () => {
    it('should return true on successful setup', async () => {
      mockAdminSetup.mockResolvedValueOnce({});

      const result = await setupAdmin('SecurePassword123!');
      expect(result).toBe(true);
      expect(mockAdminSetup).toHaveBeenCalledWith({
        adminSetupDto: { password: 'SecurePassword123!' },
      });
    });

    it('should return false on setup failure', async () => {
      mockAdminSetup.mockRejectedValueOnce(new Error('Setup failed'));
      const result = await setupAdmin('password');

      expect(result).toBe(false);
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        'Admin setup failed:',
        expect.any(Error),
      );
    });
  });

  describe('loginAdmin', () => {
    it('should return true on successful login', async () => {
      mockAdminLogin.mockResolvedValueOnce({});

      const result = await loginAdmin('CorrectPassword123!');
      expect(result).toBe(true);
      expect(mockAdminLogin).toHaveBeenCalledWith({
        adminPasswordDto: { password: 'CorrectPassword123!' },
      });
    });

    it('should return false on login failure', async () => {
      mockAdminLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      const result = await loginAdmin('wrongpassword');

      expect(result).toBe(false);
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        'Admin login failed:',
        expect.any(Error),
      );
    });
  });

  describe('Error Classes', () => {
    it('should create AuthError with status code and message', () => {
      const error = new AuthError(403, 'Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
      expect(error.name).toBe('AuthError');
    });

    it('should create AdminExistsError with default values', () => {
      const error = new AdminExistsError();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Ein Admin-Account existiert bereits');
      expect(error.name).toBe('AdminExistsError');
    });

    it('should create InvalidCredentialsError with default values', () => {
      const error = new InvalidCredentialsError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Ungültige Anmeldedaten');
      expect(error.name).toBe('InvalidCredentialsError');
    });
  });
});
