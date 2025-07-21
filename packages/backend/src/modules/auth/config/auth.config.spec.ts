import { defaultAuthConfig } from './auth.config';

describe('AuthConfig', () => {
  describe('defaultAuthConfig', () => {
    it('sollte Standard-JWT-Konfiguration bereitstellen', () => {
      expect(defaultAuthConfig.jwt).toEqual({
        secret: 'your-secret-key',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
      });
    });

    it('sollte JWT-Secret aus Umgebungsvariable verwenden wenn vorhanden', () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret';

      // Re-import to get new config
      jest.resetModules();
      const { defaultAuthConfig: newConfig } = require('./auth.config');

      expect(newConfig.jwt.secret).toBe('test-secret');

      // Cleanup
      if (originalEnv) {
        process.env.JWT_SECRET = originalEnv;
      } else {
        delete process.env.JWT_SECRET;
      }
    });

    it('sollte Standard-LoginAttempts-Konfiguration bereitstellen', () => {
      expect(defaultAuthConfig.loginAttempts).toEqual({
        maxAttempts: 5,
        windowMinutes: 15,
        lockoutDurationMinutes: 30,
        ipRateLimitAttempts: 20,
        ipRateLimitWindowMinutes: 60,
      });
    });

    it('sollte Standard-Session-Konfiguration bereitstellen', () => {
      expect(defaultAuthConfig.session).toEqual({
        inactivityTimeoutMinutes: 30,
        maxConcurrentSessions: 5,
        heartbeatIntervalSeconds: 30,
      });
    });

    it('sollte Standard-SecurityAlerts-Konfiguration bereitstellen', () => {
      expect(defaultAuthConfig.securityAlerts).toEqual({
        enabled: false,
        webhookUrl: null,
        authToken: null,
        thresholds: {
          suspiciousLoginRiskScore: 70,
          multipleFailedAttemptsWarning: 3,
        },
      });
    });

    it('sollte SecurityAlerts aus Umgebungsvariablen konfigurieren', () => {
      const originalEnv = {
        SECURITY_ALERTS_ENABLED: process.env.SECURITY_ALERTS_ENABLED,
        SECURITY_ALERT_WEBHOOK_URL: process.env.SECURITY_ALERT_WEBHOOK_URL,
        SECURITY_ALERT_AUTH_TOKEN: process.env.SECURITY_ALERT_AUTH_TOKEN,
      };

      process.env.SECURITY_ALERTS_ENABLED = 'true';
      process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://example.com/webhook';
      process.env.SECURITY_ALERT_AUTH_TOKEN = 'test-token';

      // Re-import to get new config
      jest.resetModules();
      const { defaultAuthConfig: newConfig } = require('./auth.config');

      expect(newConfig.securityAlerts.enabled).toBe(true);
      expect(newConfig.securityAlerts.webhookUrl).toBe('https://example.com/webhook');
      expect(newConfig.securityAlerts.authToken).toBe('test-token');

      // Cleanup
      Object.entries(originalEnv).forEach(([key, value]) => {
        if (value) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      });
    });
  });
});
