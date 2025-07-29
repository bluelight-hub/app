import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityApi } from './security';
import { fetchWithAuth } from '../utils/authInterceptor';
import { mockSecurityMetrics, mockSecurityAlerts, mockActiveSessions } from './security.mock';

// Mock dependencies
vi.mock('../utils/authInterceptor');
vi.mock('./index', () => ({
  api: {
    sessions: {
      sessionControllerGetSessionsV1: vi.fn(),
      sessionControllerRevokeSessionV1: vi.fn(),
      sessionControllerRevokeUserSessionsV1: vi.fn(),
    },
    threatDetection: {
      threatRuleControllerGetRulesV1: vi.fn(),
    },
    securityLogs: {
      securityLogControllerGetSecurityLogsV1: vi.fn(),
    },
  },
}));

vi.mock('./security.helpers', () => ({
  securityReportsApi: {
    getSecurityReports: vi.fn(),
    generateSecurityReport: vi.fn(),
    downloadReport: vi.fn(),
  },
  ipWhitelistApi: {
    getIpWhitelist: vi.fn(),
    addToWhitelist: vi.fn(),
    removeFromWhitelist: vi.fn(),
    updateWhitelistEntry: vi.fn(),
  },
  accountManagementApi: {
    unlockAccount: vi.fn(),
  },
}));

describe('securityApi - Core Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock import.meta.env
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_API_URL: 'http://localhost:3000',
        },
      },
    });
  });

  describe('API structure', () => {
    it('should have all required methods', () => {
      expect(securityApi.getDashboardMetrics).toBeDefined();
      expect(securityApi.getSecurityAlerts).toBeDefined();
      expect(securityApi.resolveAlert).toBeDefined();
      expect(securityApi.getActiveSessions).toBeDefined();
      expect(securityApi.revokeSession).toBeDefined();
      expect(securityApi.revokeUserSessions).toBeDefined();
      expect(securityApi.getThreatRules).toBeDefined();
      expect(securityApi.getSecurityLogs).toBeDefined();
    });

    it('should have helper API modules', () => {
      expect(securityApi.securityReports).toBeDefined();
      expect(securityApi.ipWhitelist).toBeDefined();
      expect(securityApi.accountManagement).toBeDefined();
    });
  });

  describe('mock data integration', () => {
    it('should use mock data for dashboard metrics', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockSecurityMetrics), { status: 200 }),
      );

      const result = await securityApi.getDashboardMetrics('today');

      expect(result).toMatchObject({
        totalLoginAttempts: expect.any(Number),
        failedLoginAttempts: expect.any(Number),
        activeSessions: expect.any(Number),
        suspiciousActivities: expect.any(Number),
        blockedIPs: expect.any(Number),
        alertsCount: expect.any(Number),
      });
    });

    it('should use mock data for security alerts', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockSecurityAlerts), { status: 200 }),
      );

      const result = await securityApi.getSecurityAlerts();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({
        id: 'alert1',
        type: 'failed_login_attempts',
        severity: 'HIGH',
        message: 'Multiple failed login attempts detected',
      });
      expect(result[0].timestamp).toBeInstanceOf(Date);
    });

    it('should use mock data for active sessions', () => {
      expect(mockActiveSessions).toBeInstanceOf(Array);
      expect(mockActiveSessions.length).toBeGreaterThan(0);
      expect(mockActiveSessions[0]).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        ipAddress: expect.any(String),
        userAgent: expect.any(String),
      });
    });
  });

  describe('error handling', () => {
    it('should return default values on network errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Network error'));

      const result = await securityApi.getDashboardMetrics('today');

      expect(result).toMatchObject({
        totalLoginAttempts: 0,
        failedLoginAttempts: 0,
        activeSessions: 0,
        suspiciousActivities: 0,
        blockedIPs: 0,
        alertsCount: 0,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch dashboard metrics:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('should return default values on invalid responses', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response('Invalid JSON', { status: 200 }));

      const result = await securityApi.getDashboardMetrics('today');

      expect(result).toMatchObject({
        totalLoginAttempts: 0,
        failedLoginAttempts: 0,
        activeSessions: 0,
        suspiciousActivities: 0,
        blockedIPs: 0,
        alertsCount: 0,
      });

      consoleSpy.mockRestore();
    });
  });
});
