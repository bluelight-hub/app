import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSecurityLogs,
  mockHashChainStatus,
  mockAlerts,
  mockSessions,
  mockThreatRules,
  mockIpWhitelist,
} from './security.mock';

describe('security.mock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mockSecurityLogs', () => {
    it('should provide valid security log data', () => {
      expect(mockSecurityLogs).toHaveLength(2);

      const firstLog = mockSecurityLogs[0];
      expect(firstLog).toMatchObject({
        id: '1',
        eventType: 'LOGIN_FAILED',
        severity: 'ERROR',
        message: expect.stringContaining('Failed login attempt'),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });
      expect(firstLog.metadata).toHaveProperty('attempts', 3);
      expect(firstLog.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should have different event types', () => {
      const eventTypes = mockSecurityLogs.map((log) => log.eventType);
      expect(eventTypes).toContain('LOGIN_FAILED');
      expect(eventTypes).toContain('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('mockHashChainStatus', () => {
    it('should provide valid hash chain status', () => {
      expect(mockHashChainStatus).toMatchObject({
        isValid: true,
        lastSequenceNumber: 1002,
        totalLogs: 247,
        lastHash: expect.stringContaining('def456'),
      });
      expect(mockHashChainStatus.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('mockAlerts', () => {
    it('should provide valid alert data', () => {
      expect(mockAlerts).toHaveLength(2);

      const firstAlert = mockAlerts[0];
      expect(firstAlert).toMatchObject({
        id: '1',
        type: 'LOGIN_FAILURE',
        severity: 'high',
        message: expect.stringContaining('Multiple failed login attempts'),
        ipAddress: '192.168.1.100',
        resolved: false,
      });
      expect(firstAlert.timestamp).toBeInstanceOf(Date);
      expect(firstAlert.metadata?.attempts).toBe(5);
    });

    it('should have different severity levels', () => {
      const severities = mockAlerts.map((alert) => alert.severity);
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
    });
  });

  describe('mockSessions', () => {
    it('should provide valid session data', () => {
      expect(mockSessions).toHaveLength(2);

      const firstSession = mockSessions[0];
      expect(firstSession).toMatchObject({
        id: '1',
        userId: 'user123',
        userEmail: 'user@example.com',
        ipAddress: '192.168.1.100',
        location: 'Munich, Germany',
        active: true,
      });
      expect(firstSession.startedAt).toBeInstanceOf(Date);
      expect(firstSession.lastActivityAt).toBeInstanceOf(Date);
      expect(firstSession.expiresAt).toBeInstanceOf(Date);
    });

    it('should have device info', () => {
      const firstSession = mockSessions[0];
      expect(firstSession.deviceInfo).toMatchObject({
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
      });
    });
  });

  describe('mockThreatRules', () => {
    it('should provide valid threat rule data', () => {
      expect(mockThreatRules).toHaveLength(2);

      const firstRule = mockThreatRules[0];
      expect(firstRule).toMatchObject({
        id: '1',
        name: 'Brute Force Detection',
        enabled: true,
        severity: 'high',
      });
      expect(firstRule.conditions).toBeDefined();
      expect(firstRule.actions).toBeInstanceOf(Array);
    });

    it('should have different rule types', () => {
      const ruleNames = mockThreatRules.map((rule) => rule.name);
      expect(ruleNames).toContain('Brute Force Detection');
      expect(ruleNames).toContain('Rapid API Access');
    });
  });

  describe('mockIpWhitelist', () => {
    it('should provide valid IP whitelist data', () => {
      expect(mockIpWhitelist).toHaveLength(2);

      const firstEntry = mockIpWhitelist[0];
      expect(firstEntry).toMatchObject({
        id: '1',
        ipAddress: '10.0.0.0/8',
        description: 'Internal network range',
        permanent: true,
      });
      expect(firstEntry.addedAt).toBeInstanceOf(Date);
    });
  });
});
