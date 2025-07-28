// Mock data and functions for security API (temporary until backend is ready)

export const mockSecurityLogs = [
  {
    id: '1',
    eventType: 'LOGIN_FAILED',
    severity: 'ERROR',
    message: 'Failed login attempt from IP 192.168.1.100',
    userId: null,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    metadata: { attempts: 3 },
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    sequenceNumber: 1001,
    hashValue: 'abc123...',
  },
  {
    id: '2',
    eventType: 'SUSPICIOUS_ACTIVITY',
    severity: 'WARNING',
    message: 'Unusual access pattern detected',
    userId: 'user123',
    ipAddress: '10.0.0.50',
    userAgent: 'Chrome/96.0',
    metadata: { pattern: 'rapid_requests' },
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    sequenceNumber: 1002,
    hashValue: 'def456...',
  },
];

export const mockHashChainStatus = {
  isValid: true,
  lastSequenceNumber: 1002,
  totalLogs: 247,
  lastHash: 'def456...',
  lastVerified: new Date().toISOString(),
};

export const mockAlerts = [
  {
    id: '1',
    type: 'LOGIN_FAILURE',
    severity: 'high',
    message: 'Multiple failed login attempts detected from IP 192.168.1.100',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    ipAddress: '192.168.1.100',
    userId: null,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    metadata: {
      attempts: 5,
      lastAttempt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  },
  {
    id: '2',
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'medium',
    message: 'Unusual access pattern detected from user123',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    ipAddress: '10.0.0.50',
    userId: 'user123',
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    metadata: {
      pattern: 'rapid_api_calls',
      requestCount: 150,
    },
  },
];

export const mockSessions = [
  {
    id: '1',
    userId: 'user123',
    userEmail: 'user@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    location: 'Munich, Germany',
    startedAt: new Date(Date.now() - 1000 * 60 * 45),
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 2),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    active: true,
    deviceInfo: {
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop',
    },
  },
  {
    id: '2',
    userId: 'user456',
    userEmail: 'admin@example.com',
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Berlin, Germany',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 10),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 22),
    active: true,
    deviceInfo: {
      browser: 'Safari',
      os: 'macOS',
      device: 'Desktop',
    },
  },
];

export const mockThreatRules = [
  {
    id: '1',
    name: 'Brute Force Detection',
    description: 'Detects multiple failed login attempts from same IP',
    type: 'login_failure',
    enabled: true,
    severity: 'high',
    conditions: {
      failedAttempts: 5,
      timeWindow: 300,
    },
    actions: ['block_ip', 'alert_admin'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '2',
    name: 'Rapid API Access',
    description: 'Detects unusually high API request rate',
    type: 'api_abuse',
    enabled: true,
    severity: 'medium',
    conditions: {
      requestCount: 100,
      timeWindow: 60,
    },
    actions: ['rate_limit', 'log_activity'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
];

export const mockIpWhitelist = [
  {
    id: '1',
    ipAddress: '10.0.0.0/8',
    description: 'Internal network range',
    addedBy: 'admin@example.com',
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    expiresAt: null,
    permanent: true,
  },
  {
    id: '2',
    ipAddress: '192.168.1.100',
    description: 'Office VPN server',
    addedBy: 'admin@example.com',
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    permanent: false,
  },
];
