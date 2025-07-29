import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityApi } from './security';
import { fetchWithAuth } from '../utils/authInterceptor';
import { mockSecurityMetrics, mockSecurityAlerts } from './security.mock';
import { api } from './index';

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
      expect(securityApi.createThreatRule).toBeDefined();
      expect(securityApi.updateThreatRule).toBeDefined();
      expect(securityApi.deleteThreatRule).toBeDefined();
      expect(securityApi.testThreatRule).toBeDefined();
    });

    it('should have helper API modules', () => {
      expect(securityApi.securityReports).toBeDefined();
      expect(securityApi.ipWhitelist).toBeDefined();
      expect(securityApi.accountManagement).toBeDefined();
    });
  });

  describe('getDashboardMetrics', () => {
    it('should fetch dashboard metrics for today', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockSecurityMetrics), { status: 200 }),
      );

      const result = await securityApi.getDashboardMetrics('today');

      expect(fetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('/v1/api/security/metrics/dashboard'),
      );

      const url = new URL(vi.mocked(fetchWithAuth).mock.calls[0][0]);
      expect(url.searchParams.get('startDate')).toBeTruthy();
      expect(url.searchParams.get('endDate')).toBeTruthy();

      expect(result).toMatchObject({
        totalLoginAttempts: expect.any(Number),
        failedLoginAttempts: expect.any(Number),
        activeSessions: expect.any(Number),
        suspiciousActivities: expect.any(Number),
        blockedIPs: expect.any(Number),
        alertsCount: expect.any(Number),
      });
    });

    it('should fetch dashboard metrics for week', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockSecurityMetrics), { status: 200 }),
      );

      await securityApi.getDashboardMetrics('week');

      const url = new URL(vi.mocked(fetchWithAuth).mock.calls[0][0]);
      const startDate = new Date(url.searchParams.get('startDate')!);
      const endDate = new Date(url.searchParams.get('endDate')!);

      const daysDiff = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeGreaterThanOrEqual(6);
    });

    it('should fetch dashboard metrics for month', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockSecurityMetrics), { status: 200 }),
      );

      await securityApi.getDashboardMetrics('month');

      const url = new URL(vi.mocked(fetchWithAuth).mock.calls[0][0]);
      const startDate = new Date(url.searchParams.get('startDate')!);
      const endDate = new Date(url.searchParams.get('endDate')!);

      const daysDiff = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeGreaterThanOrEqual(29);
    });

    it('should return default metrics on error', async () => {
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
        loginAttemptsChart: [],
        threatDistribution: [],
        sessionsByLocation: [],
        avgSessionDuration: 0,
        securityScore: 0,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch dashboard metrics:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getSecurityAlerts', () => {
    it('should fetch security alerts', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockSecurityAlerts), { status: 200 }),
      );

      const result = await securityApi.getSecurityAlerts();

      expect(fetchWithAuth).toHaveBeenCalledWith('/v1/api/security/alerts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
  });

  describe('resolveAlert', () => {
    it('should resolve an alert successfully', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 200 }));

      await expect(securityApi.resolveAlert('alert123')).resolves.toBeUndefined();

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/security/alerts/alert123/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: undefined,
      });
    });

    it('should resolve an alert with resolution text', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 200 }));

      await expect(securityApi.resolveAlert('alert123', 'False positive')).resolves.toBeUndefined();

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/security/alerts/alert123/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolution: 'False positive' }),
      });
    });

    it('should throw error on failure', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 400 }));

      await expect(securityApi.resolveAlert('alert123')).rejects.toThrow('Failed to resolve alert');
    });
  });

  describe('sessions', () => {
    it('should fetch active sessions', async () => {
      const mockSessions = [
        { id: '1', userId: 'user1', ipAddress: '192.168.1.1' },
        { id: '2', userId: 'user2', ipAddress: '192.168.1.2' },
      ];

      vi.mocked(api.sessions.sessionControllerGetSessionsV1).mockResolvedValue(mockSessions);

      const result = await securityApi.getActiveSessions({ userId: 'user1' });

      expect(api.sessions.sessionControllerGetSessionsV1).toHaveBeenCalledWith({
        userId: 'user1',
      });
      expect(result).toEqual(mockSessions);
    });

    it('should return empty array on sessions error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.sessions.sessionControllerGetSessionsV1).mockRejectedValue(
        new Error('API error'),
      );

      const result = await securityApi.getActiveSessions();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch active sessions:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('should revoke a session', async () => {
      vi.mocked(api.sessions.sessionControllerRevokeSessionV1).mockResolvedValue(undefined);

      await expect(securityApi.revokeSession('session123')).resolves.toBeUndefined();

      expect(api.sessions.sessionControllerRevokeSessionV1).toHaveBeenCalledWith({
        id: 'session123',
      });
    });

    it('should revoke user sessions', async () => {
      vi.mocked(api.sessions.sessionControllerRevokeUserSessionsV1).mockResolvedValue(undefined);

      await expect(securityApi.revokeUserSessions('user123')).resolves.toBeUndefined();

      expect(api.sessions.sessionControllerRevokeUserSessionsV1).toHaveBeenCalledWith({
        userId: 'user123',
      });
    });
  });

  describe('threat rules', () => {
    it('should fetch threat rules', async () => {
      const mockRules = [
        { id: '1', name: 'Rule 1', severity: 'high' },
        { id: '2', name: 'Rule 2', severity: 'low' },
      ];

      vi.mocked(api.threatDetection.threatRuleControllerGetRulesV1).mockResolvedValue(mockRules);

      const result = await securityApi.getThreatRules();

      expect(api.threatDetection.threatRuleControllerGetRulesV1).toHaveBeenCalled();
      expect(result).toEqual(mockRules);
    });

    it('should create a threat rule', async () => {
      const newRule = {
        name: 'New Rule',
        description: 'Test rule',
        severity: 'high' as const,
        isActive: true,
        config: {},
        conditionType: 'threshold' as const,
        triggerCount: 0,
        lastTriggered: null,
        version: 1,
      };

      const createdRule = { ...newRule, id: '123' };

      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(createdRule), { status: 200 }),
      );

      const result = await securityApi.createThreatRule(newRule);

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/threat-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRule),
      });
      expect(result).toEqual(createdRule);
    });

    it('should update a threat rule', async () => {
      const updates = { name: 'Updated Rule' };

      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 200 }));

      await expect(securityApi.updateThreatRule('rule123', updates)).resolves.toBeUndefined();

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/threat-rules/rule123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    });

    it('should delete a threat rule', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 200 }));

      await expect(securityApi.deleteThreatRule('rule123')).resolves.toBeUndefined();

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/threat-rules/rule123', {
        method: 'DELETE',
      });
    });

    it('should test a threat rule', async () => {
      const testResult = { passed: true, details: 'Test passed' };
      const testContext = { ipAddress: '192.168.1.1' };

      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(testResult), { status: 200 }),
      );

      const result = await securityApi.testThreatRule('rule123', testContext);

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/threat-rules/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ruleId: 'rule123', context: testContext }),
      });
      expect(result).toEqual(testResult);
    });
  });

  describe('security logs', () => {
    it('should fetch security logs with parameters', async () => {
      const mockLogs = {
        data: [
          {
            id: '1',
            eventType: 'LOGIN',
            user: { id: 'user1' },
            ipAddress: '192.168.1.1',
            timestamp: '2024-03-20T10:00:00Z',
            details: {},
            severity: 'low',
          },
        ],
      };

      vi.mocked(api.securityLogs.securityLogControllerGetSecurityLogsV1).mockResolvedValue(
        mockLogs,
      );

      const params = {
        eventType: 'LOGIN',
        userId: 'user1',
        ipAddress: '192.168.1.1',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        limit: 50,
      };

      const result = await securityApi.getSecurityLogs(params);

      expect(api.securityLogs.securityLogControllerGetSecurityLogsV1).toHaveBeenCalledWith({
        eventType: 'LOGIN',
        userId: 'user1',
        from: '2024-03-01',
        to: '2024-03-31',
        pageSize: 50,
        page: 1,
      });

      expect(result[0]).toMatchObject({
        id: '1',
        eventType: 'LOGIN',
        userId: 'user1',
        ipAddress: '192.168.1.1',
        severity: 'low',
      });
      expect(result[0].timestamp).toBeInstanceOf(Date);
    });
  });
});
