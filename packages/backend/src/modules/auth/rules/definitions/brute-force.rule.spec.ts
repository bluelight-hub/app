import { BruteForceRule } from './brute-force.rule';
import { RuleContext } from '../rule.interface';
import { SecurityEventType } from '@/modules/auth/constants';
import { ThreatSeverity } from '@prisma/generated/prisma/enums';

describe('BruteForceRule', () => {
  let rule: BruteForceRule;

  beforeEach(() => {
    rule = new BruteForceRule({
      config: {
        threshold: 5,
        timeWindowMinutes: 15,
        countField: 'ipAddress',
        checkIpBased: true,
        checkUserBased: true,
        severityThresholds: {
          low: 3,
          medium: 5,
          high: 10,
          critical: 20,
        },
      },
    });
  });

  describe('validate', () => {
    it('should validate with correct config', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should fail validation with invalid config', () => {
      const invalidRule = new BruteForceRule({
        config: {
          threshold: 0, // Invalid: should be > 0
          timeWindowMinutes: 15,
          countField: 'ipAddress',
          checkIpBased: true,
          checkUserBased: true,
          severityThresholds: {
            low: 3,
            medium: 5,
            high: 10,
            critical: 20,
          },
        },
      });
      expect(invalidRule.validate()).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('should detect brute force attack based on IP', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
          {
            timestamp: new Date(Date.now() - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
          {
            timestamp: new Date(Date.now() - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
          {
            timestamp: new Date(Date.now() - 4000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
          {
            timestamp: new Date(Date.now() - 5000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.MEDIUM);
      expect(result.reason).toContain('failed login attempts');
      expect(result.suggestedActions).toEqual(['INCREASE_MONITORING']); // Bug: string enum comparison
      expect(result.evidence?.failedAttempts).toBe(5); // Only recent events count
    });

    it('should detect brute force attack based on user', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.2',
            success: false,
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.3',
            success: false,
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.4',
            success: false,
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 4000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.5',
            success: false,
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 5000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.6',
            success: false,
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH); // High because multiple IPs (>3)
      expect(result.reason).toContain('failed login attempts');
      expect(result.suggestedActions).toContain('REQUIRE_2FA');
      expect(result.evidence?.failedAttempts).toBe(5); // Only recent events count, not current
    });

    it('should not match if attempts are below threshold', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
          {
            timestamp: new Date(Date.now() - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
      expect(result.reason).toBe(undefined);
    });

    it('should ignore events outside time window', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
        recentEvents: [
          // Events older than 15 minutes
          {
            timestamp: new Date(Date.now() - 20 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
          {
            timestamp: new Date(Date.now() - 25 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
      expect(result.evidence).toBeUndefined(); // No evidence when not matched
    });

    it('should only count failed login attempts', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            success: true,
          },
          {
            timestamp: new Date(Date.now() - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          },
          {
            timestamp: new Date(Date.now() - 3000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
      expect(result.evidence).toBeUndefined(); // No evidence when not matched
    });

    it('should determine severity based on thresholds', async () => {
      // Test critical severity (20+ attempts)
      const criticalContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
        recentEvents: Array(20)
          .fill(null)
          .map((_, i) => ({
            timestamp: new Date(Date.now() - i * 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          })),
      };

      const criticalResult = await rule.evaluate(criticalContext);
      expect(criticalResult.severity).toBe(ThreatSeverity.CRITICAL);
      expect(criticalResult.score).toBeGreaterThanOrEqual(90);
    });

    it('should include VPN and timing patterns in evidence', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {
          vpnDetected: true,
        },
        recentEvents: Array(10)
          .fill(null)
          .map((_, i) => ({
            timestamp: new Date(Date.now() - i * 100), // Very fast attempts
            eventType: SecurityEventType.LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            success: false,
          })),
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.evidence?.failedAttempts).toBe(10);
      expect(result.score).toBeGreaterThanOrEqual(50); // Should have a high score
    });
  });
});
