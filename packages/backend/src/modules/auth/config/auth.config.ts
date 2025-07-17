/**
 * Konfigurationsinterface für das Auth-Modul
 *
 * Definiert alle konfigurierbaren Parameter für Authentifizierung,
 * Session-Management und Sicherheitsmechanismen.
 */
export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  loginAttempts: {
    maxAttempts: number;
    windowMinutes: number;
    lockoutDurationMinutes: number;
    ipRateLimitAttempts: number;
    ipRateLimitWindowMinutes: number;
  };
  session: {
    inactivityTimeoutMinutes: number;
    maxConcurrentSessions: number;
    heartbeatIntervalSeconds: number;
  };
  securityAlerts: {
    enabled: boolean;
    webhookUrl: string | null;
    authToken: string | null;
    thresholds: {
      suspiciousLoginRiskScore: number;
      multipleFailedAttemptsWarning: number;
    };
  };
}

/**
 * Standard-Konfigurationswerte für das Auth-Modul
 *
 * Diese Werte werden verwendet, wenn keine explizite Konfiguration
 * über Umgebungsvariablen bereitgestellt wird.
 */
export const defaultAuthConfig: AuthConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  loginAttempts: {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutDurationMinutes: 30,
    ipRateLimitAttempts: 20,
    ipRateLimitWindowMinutes: 60,
  },
  session: {
    inactivityTimeoutMinutes: 30,
    maxConcurrentSessions: 5,
    heartbeatIntervalSeconds: 30,
  },
  securityAlerts: {
    enabled: process.env.SECURITY_ALERTS_ENABLED === 'true',
    webhookUrl: process.env.SECURITY_ALERT_WEBHOOK_URL || null,
    authToken: process.env.SECURITY_ALERT_AUTH_TOKEN || null,
    thresholds: {
      suspiciousLoginRiskScore: 70,
      multipleFailedAttemptsWarning: 3,
    },
  },
};
