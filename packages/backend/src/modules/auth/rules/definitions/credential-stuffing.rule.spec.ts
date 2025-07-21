import { CredentialStuffingRule } from './credential-stuffing.rule';
import { RuleContext } from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';
import { RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';

describe('CredentialStuffingRule', () => {
  let rule: CredentialStuffingRule;

  beforeEach(() => {
    rule = new CredentialStuffingRule({
      config: {
        patterns: ['multiple-users-same-ip', 'rapid-sequential', 'bot-pattern'],
        matchType: 'any',
        lookbackMinutes: 10,
        minUniqueUsers: 5,
        maxTimeBetweenAttempts: 2000,
        suspiciousUserAgents: ['python', 'curl', 'wget', 'scrapy'],
      },
    });
  });

  describe('constructor', () => {
    it('should create rule with default values', () => {
      const defaultRule = new CredentialStuffingRule({});
      expect(defaultRule.id).toBe('credential-stuffing-default');
      expect(defaultRule.name).toBe('Credential Stuffing Detection');
      expect(defaultRule.status).toBe(RuleStatus.ACTIVE);
      expect(defaultRule.severity).toBe(ThreatSeverity.CRITICAL);
      expect(defaultRule.config.minUniqueUsers).toBe(5);
    });

    it('should create rule with custom values', () => {
      const customRule = new CredentialStuffingRule({
        id: 'custom-id',
        name: 'Custom Rule',
        severity: ThreatSeverity.HIGH,
        config: {
          minUniqueUsers: 10,
          patterns: [],
          matchType: 'any',
          lookbackMinutes: 0,
          maxTimeBetweenAttempts: 0,
          suspiciousUserAgents: [],
        },
      });
      expect(customRule.id).toBe('custom-id');
      expect(customRule.name).toBe('Custom Rule');
      expect(customRule.severity).toBe(ThreatSeverity.HIGH);
      expect(customRule.config.minUniqueUsers).toBe(10);
    });
  });

  describe('validate', () => {
    it('should validate with correct config', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should fail validation with invalid lookbackMinutes', () => {
      const invalidRule = new CredentialStuffingRule({
        config: {
          patterns: ['multiple-users-same-ip', 'rapid-sequential', 'bot-pattern'],
          matchType: 'any',
          lookbackMinutes: 0,
          minUniqueUsers: 5,
          maxTimeBetweenAttempts: 2000,
          suspiciousUserAgents: ['python', 'curl', 'wget', 'scrapy'],
        },
      });
      expect(invalidRule.validate()).toBe(false);
    });

    it('should fail validation with invalid minUniqueUsers', () => {
      const invalidRule = new CredentialStuffingRule({
        config: {
          patterns: ['multiple-users-same-ip', 'rapid-sequential', 'bot-pattern'],
          matchType: 'any',
          lookbackMinutes: 10,
          minUniqueUsers: 0,
          maxTimeBetweenAttempts: 2000,
          suspiciousUserAgents: ['python', 'curl', 'wget', 'scrapy'],
        },
      });
      expect(invalidRule.validate()).toBe(false);
    });

    it('should fail validation with invalid maxTimeBetweenAttempts', () => {
      const invalidRule = new CredentialStuffingRule({
        config: {
          patterns: ['multiple-users-same-ip', 'rapid-sequential', 'bot-pattern'],
          matchType: 'any',
          lookbackMinutes: 10,
          minUniqueUsers: 5,
          maxTimeBetweenAttempts: 0,
          suspiciousUserAgents: ['python', 'curl', 'wget', 'scrapy'],
        },
      });
      expect(invalidRule.validate()).toBe(false);
    });
  });

  describe('getDescription', () => {
    it('should return correct description', () => {
      const description = rule.getDescription();
      expect(description).toContain('5 or more users');
      expect(description).toContain('10 minutes');
    });
  });

  describe('evaluate', () => {
    const baseContext: RuleContext = {
      userId: 'user-123',
      email: 'test@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
      eventType: SecurityEventType.LOGIN_FAILED,
      metadata: {},
      recentEvents: [],
    };

    it('should not match when no IP address provided', async () => {
      const context: RuleContext = {
        ...baseContext,
        ipAddress: undefined,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should not match when no recent events provided', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: undefined,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should detect credential stuffing with multiple users from same IP', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user1@example.com' },
          },
          {
            timestamp: new Date(now - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user2@example.com' },
          },
          {
            timestamp: new Date(now - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user3@example.com' },
          },
          {
            timestamp: new Date(now - 4000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            success: true,
            metadata: { email: 'user4@example.com' },
          },
          {
            timestamp: new Date(now - 5000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user5@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
      expect(result.reason).toContain('Credential stuffing detected');
      expect(result.reason).toContain('5 different users');
      expect(result.evidence?.uniqueUsers).toBe(5);
      expect(result.evidence?.totalAttempts).toBe(5);
      expect(result.suggestedActions).toContain('BLOCK_IP');
      expect(result.suggestedActions).toContain('INCREASE_MONITORING');
    });

    it('should calculate score based on unique users and rapid attempts', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          // 10 rapid attempts from different users
          ...Array(10)
            .fill(null)
            .map((_, i) => ({
              timestamp: new Date(now - i * 500), // 500ms apart (rapid)
              eventType: SecurityEventType.LOGIN_FAILED,
              ipAddress: '192.168.1.1',
              success: false,
              metadata: { email: `user${i}@example.com` },
            })),
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.score).toBeGreaterThan(50);
      expect(result.evidence?.rapidSequentialAttempts).toBeGreaterThan(0);
    });

    it('should not match when unique users below threshold', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user1@example.com' },
          },
          {
            timestamp: new Date(now - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user2@example.com' },
          },
          {
            timestamp: new Date(now - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user1@example.com' }, // Duplicate user
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
    });

    it('should ignore events outside lookback window', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          // Events older than 10 minutes
          ...Array(5)
            .fill(null)
            .map((_, i) => ({
              timestamp: new Date(now - 15 * 60 * 1000 - i * 1000),
              eventType: SecurityEventType.LOGIN_FAILED,
              ipAddress: '192.168.1.1',
              success: false,
              metadata: { email: `user${i}@example.com` },
            })),
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
    });

    it('should only consider events from same IP', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: 'user1@example.com' },
          },
          {
            timestamp: new Date(now - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.2', // Different IP
            success: false,
            metadata: { email: 'user2@example.com' },
          },
          {
            timestamp: new Date(now - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.3', // Different IP
            success: false,
            metadata: { email: 'user3@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
    });

    it('should limit usersList in evidence to 10 users', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: Array(15)
          .fill(null)
          .map((_, i) => ({
            timestamp: new Date(now - i * 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: { email: `user${i}@example.com` },
          })),
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.evidence?.usersList).toHaveLength(10);
      expect(result.evidence?.uniqueUsers).toBe(15);
    });

    it('should handle missing email in metadata', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
            metadata: {}, // No email
          },
          ...Array(5)
            .fill(null)
            .map((_, i) => ({
              timestamp: new Date(now - (i + 2) * 1000),
              eventType: SecurityEventType.LOGIN_FAILED,
              ipAddress: '192.168.1.1',
              success: false,
              metadata: { email: `user${i}@example.com` },
            })),
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.evidence?.uniqueUsers).toBe(5); // Only counts events with email
    });
  });
});
