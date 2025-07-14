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
}

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
};
