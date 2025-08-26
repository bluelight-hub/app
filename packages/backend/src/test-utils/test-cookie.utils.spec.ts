import { milliseconds } from 'date-fns';
import type { Response } from 'express';
import { clearAdminTokenCookie, setAdminTokenCookie } from './test-cookie.utils';

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

      expect(mockResponse.cookie).toHaveBeenCalledWith('adminToken', token, {
        httpOnly: true,
        maxAge: milliseconds({ minutes: 15 }),
        sameSite: 'lax',
        secure: false, // default in non-production
      });
    });

    it('should use secure cookie when isProduction is true', () => {
      const token = 'test-admin-token';
      setAdminTokenCookie(mockResponse as Response, token, true);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'adminToken',
        token,
        expect.objectContaining({
          secure: true,
        }),
      );
    });

    it('should not use secure cookie when isProduction is false', () => {
      const token = 'test-admin-token';
      setAdminTokenCookie(mockResponse as Response, token, false);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'adminToken',
        token,
        expect.objectContaining({
          secure: false,
        }),
      );
    });
  });

  describe('clearAdminTokenCookie', () => {
    it('should clear admin token cookie', () => {
      clearAdminTokenCookie(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('adminToken');
    });
  });
});
