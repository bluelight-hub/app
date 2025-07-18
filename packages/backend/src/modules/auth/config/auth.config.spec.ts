import { authConfig } from './auth.config';

describe('authConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('JWT configuration', () => {
    it('should use JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'test-secret-key';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.jwt.secret).toBe('test-secret-key');
    });

    it('should use default secret when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.jwt.secret).toBe('your-secret-key');
    });

    it('should use JWT_EXPIRES_IN from environment', () => {
      process.env.JWT_EXPIRES_IN = '7d';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.jwt.expiresIn).toBe('7d');
    });

    it('should use default expiry when JWT_EXPIRES_IN is not set', () => {
      delete process.env.JWT_EXPIRES_IN;
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.jwt.expiresIn).toBe('1d');
    });
  });

  describe('Refresh token configuration', () => {
    it('should use REFRESH_TOKEN_SECRET from environment', () => {
      process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.refreshToken.secret).toBe('test-refresh-secret');
    });

    it('should use default refresh secret when not set', () => {
      delete process.env.REFRESH_TOKEN_SECRET;
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.refreshToken.secret).toBe('your-refresh-secret-key');
    });

    it('should use REFRESH_TOKEN_EXPIRES_IN from environment', () => {
      process.env.REFRESH_TOKEN_EXPIRES_IN = '14d';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.refreshToken.expiresIn).toBe('14d');
    });
  });

  describe('Security alerts configuration', () => {
    it('should enable security alerts when SECURITY_ALERTS_ENABLED is true', () => {
      process.env.SECURITY_ALERTS_ENABLED = 'true';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.securityAlerts.enabled).toBe(true);
    });

    it('should disable security alerts when SECURITY_ALERTS_ENABLED is false', () => {
      process.env.SECURITY_ALERTS_ENABLED = 'false';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.securityAlerts.enabled).toBe(false);
    });

    it('should disable security alerts by default', () => {
      delete process.env.SECURITY_ALERTS_ENABLED;
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.securityAlerts.enabled).toBe(false);
    });

    it('should use SECURITY_ALERT_WEBHOOK_URL from environment', () => {
      process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://webhook.example.com';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.securityAlerts.webhookUrl).toBe('https://webhook.example.com');
    });

    it('should use null webhook URL when not set', () => {
      delete process.env.SECURITY_ALERT_WEBHOOK_URL;
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.securityAlerts.webhookUrl).toBeNull();
    });

    it('should use SECURITY_ALERT_AUTH_TOKEN from environment', () => {
      process.env.SECURITY_ALERT_AUTH_TOKEN = 'test-auth-token';
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.securityAlerts.authToken).toBe('test-auth-token');
    });

    it('should use null auth token when not set', () => {
      delete process.env.SECURITY_ALERT_AUTH_TOKEN;
      jest.resetModules();
      const { authConfig: freshConfig } = require('./auth.config');
      expect(freshConfig.securityAlerts.authToken).toBeNull();
    });

    it('should have all expected configuration properties', () => {
      expect(authConfig.securityAlerts).toHaveProperty('includeStackTrace');
      expect(authConfig.securityAlerts).toHaveProperty('includeRequest');
      expect(authConfig.securityAlerts).toHaveProperty('includeUser');
    });
  });

  describe('Default configuration values', () => {
    it('should have correct bcrypt rounds', () => {
      expect(authConfig.bcryptRounds).toBe(10);
    });

    it('should have correct password policy', () => {
      expect(authConfig.passwordPolicy).toEqual({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      });
    });

    it('should have correct lockout configuration', () => {
      expect(authConfig.lockout).toEqual({
        maxAttempts: 5,
        lockoutDuration: 30 * 60 * 1000, // 30 minutes
        resetAttemptsAfter: 60 * 60 * 1000, // 1 hour
      });
    });

    it('should have correct session configuration', () => {
      expect(authConfig.session).toEqual({
        absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours
        inactivityTimeout: 30 * 60 * 1000, // 30 minutes
        maxConcurrentSessions: 5,
        rotateOnRefresh: true,
      });
    });

    it('should have correct 2FA configuration', () => {
      expect(authConfig.twoFactor).toEqual({
        issuer: 'BlueLight Hub',
        window: 1,
        tokenLength: 6,
      });
    });

    it('should have correct API key configuration', () => {
      expect(authConfig.apiKey).toEqual({
        length: 32,
        prefix: 'blh_',
        allowMultiple: true,
        maxPerUser: 10,
      });
    });

    it('should have correct rate limit configuration', () => {
      expect(authConfig.rateLimit).toEqual({
        login: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 5,
        },
        register: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 3,
        },
        passwordReset: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 3,
        },
      });
    });
  });
});
