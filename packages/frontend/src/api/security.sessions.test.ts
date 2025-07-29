import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityApi } from './security';
import { api } from './index';

// Mock dependencies
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

describe('securityApi - Sessions & Other Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveSessions', () => {
    it('should fetch active sessions', async () => {
      const mockSessions = [
        {
          id: 'session1',
          userId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          lastActivity: new Date(),
          createdAt: new Date(),
        },
      ];

      vi.mocked(api.sessions.sessionControllerGetSessionsV1).mockResolvedValue(mockSessions);

      const result = await securityApi.getActiveSessions({ userId: 'user123' });

      expect(result).toEqual(mockSessions);
      expect(vi.mocked(api.sessions.sessionControllerGetSessionsV1)).toHaveBeenCalledWith({
        userId: 'user123',
      });
    });

    it('should fetch all sessions when no filters provided', async () => {
      const mockSessions = [
        {
          id: 'session1',
          userId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          lastActivity: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'session2',
          userId: 'user456',
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/96.0',
          lastActivity: new Date(),
          createdAt: new Date(),
        },
      ];

      vi.mocked(api.sessions.sessionControllerGetSessionsV1).mockResolvedValue(mockSessions);

      const result = await securityApi.getActiveSessions();

      expect(result).toEqual(mockSessions);
      expect(vi.mocked(api.sessions.sessionControllerGetSessionsV1)).toHaveBeenCalledWith({});
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      vi.mocked(api.sessions.sessionControllerRevokeSessionV1).mockResolvedValue(undefined);

      await expect(securityApi.revokeSession('session123')).resolves.toBeUndefined();

      expect(vi.mocked(api.sessions.sessionControllerRevokeSessionV1)).toHaveBeenCalledWith({
        id: 'session123',
      });
    });
  });

  describe('revokeUserSessions', () => {
    it('should revoke all user sessions', async () => {
      vi.mocked(api.sessions.sessionControllerRevokeUserSessionsV1).mockResolvedValue(undefined);

      await expect(securityApi.revokeUserSessions('user123')).resolves.toBeUndefined();

      expect(vi.mocked(api.sessions.sessionControllerRevokeUserSessionsV1)).toHaveBeenCalledWith({
        userId: 'user123',
      });
    });
  });

  describe('getThreatRules', () => {
    it('should fetch threat rules', async () => {
      const mockRules = [
        {
          id: 'rule1',
          name: 'Failed Login Attempts',
          type: 'failed_login',
          enabled: true,
          conditions: { maxAttempts: 5, timeWindow: 300 },
          actions: ['block_ip', 'send_alert'],
        },
      ];

      vi.mocked(api.threatDetection.threatRuleControllerGetRulesV1).mockResolvedValue(mockRules);

      const result = await securityApi.getThreatRules();

      expect(result).toEqual(mockRules);
      expect(vi.mocked(api.threatDetection.threatRuleControllerGetRulesV1)).toHaveBeenCalled();
    });
  });

  describe('getSecurityLogs', () => {
    it('should fetch security logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log1',
          action: 'login_attempt',
          userId: 'user123',
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          result: 'success',
        },
      ];

      vi.mocked(api.securityLogs.securityLogControllerGetSecurityLogsV1).mockResolvedValue({
        data: mockLogs,
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await securityApi.getSecurityLogs({
        eventType: 'login_attempt',
        userId: 'user123',
        limit: 20,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'log1',
        ipAddress: '192.168.1.1',
      });
      expect(
        vi.mocked(api.securityLogs.securityLogControllerGetSecurityLogsV1),
      ).toHaveBeenCalledWith({
        eventType: 'login_attempt',
        userId: 'user123',
        page: 1,
        pageSize: 20,
        from: undefined,
        to: undefined,
      });
    });

    it('should fetch security logs without filters', async () => {
      const mockLogs = [
        {
          id: 'log1',
          action: 'login_attempt',
          userId: 'user123',
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          result: 'success',
        },
        {
          id: 'log2',
          action: 'password_change',
          userId: 'user456',
          ipAddress: '192.168.1.2',
          timestamp: new Date(),
          result: 'success',
        },
      ];

      vi.mocked(api.securityLogs.securityLogControllerGetSecurityLogsV1).mockResolvedValue({
        data: mockLogs,
        total: 2,
        page: 1,
        limit: 20,
      });

      const result = await securityApi.getSecurityLogs();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'log1',
        ipAddress: '192.168.1.1',
      });
      expect(result[1]).toMatchObject({
        id: 'log2',
        ipAddress: '192.168.1.2',
      });
      expect(
        vi.mocked(api.securityLogs.securityLogControllerGetSecurityLogsV1),
      ).toHaveBeenCalledWith({
        eventType: undefined,
        userId: undefined,
        from: undefined,
        to: undefined,
        pageSize: 100,
        page: 1,
      });
    });
  });

  // Re-export helper APIs for backward compatibility
  it('should export helper APIs', () => {
    expect(securityApi.securityReports).toBeDefined();
    expect(securityApi.ipWhitelist).toBeDefined();
    expect(securityApi.accountManagement).toBeDefined();
  });
});
