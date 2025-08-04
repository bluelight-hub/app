import { Response } from 'express';
import { setAdminTokenCookie, clearAdminTokenCookie } from './test-cookie.utils';
import { ADMIN_JWT_COOKIE, getAdminCookieOptions } from '../../src/auth/constants/auth.constants';

describe('Cookie Utilities', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe('setAdminTokenCookie', () => {
    it('should set admin token cookie with correct options', () => {
      const token = 'test-admin-token';

      setAdminTokenCookie(mockResponse as Response, token);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ADMIN_JWT_COOKIE,
        token,
        getAdminCookieOptions(),
      );
    });

    it('should use secure cookie in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const token = 'test-admin-token';
      setAdminTokenCookie(mockResponse as Response, token);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ADMIN_JWT_COOKIE,
        token,
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not use secure cookie in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const token = 'test-admin-token';
      setAdminTokenCookie(mockResponse as Response, token);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ADMIN_JWT_COOKIE,
        token,
        expect.objectContaining({
          secure: false,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('clearAdminTokenCookie', () => {
    it('should clear admin token cookie', () => {
      clearAdminTokenCookie(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(ADMIN_JWT_COOKIE);
    });
  });
});
