import { Test, TestingModule } from '@nestjs/testing';
import { BruteForceRule } from '../brute-force.rule';
import { RuleContext } from '../../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../../enums/security-event-type.enum';

describe('BruteForceRule', () => {
  let rule: BruteForceRule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BruteForceRule],
    }).compile();

    rule = module.get<BruteForceRule>(BruteForceRule);
  });

  describe('Rule Properties', () => {
    it('should have correct metadata', () => {
      expect(rule.id).toBe('brute-force-detection');
      expect(rule.name).toBe('Brute Force Detection');
      expect(rule.description).toBe(
        'Detects potential brute force attacks based on failed login attempts',
      );
      expect(rule.version).toBe('1.0.0');
      expect(rule.status).toBe(RuleStatus.ACTIVE);
      expect(rule.severity).toBe(ThreatSeverity.HIGH);
      expect(rule.conditionType).toBe(ConditionType.THRESHOLD);
      expect(rule.tags).toEqual(['brute-force', 'authentication', 'login']);
    });

    it('should have correct default configuration', () => {
      expect(rule.config).toEqual({
        threshold: 5,
        timeWindowMinutes: 15,
        countField: 'failedAttempts',
        includeUserAgentVariations: true,
        checkIpReputation: false,
      });
    });
  });

  describe('validate', () => {
    it('should return true for valid configuration', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should return false for invalid threshold', () => {
      rule.config.threshold = 0;
      expect(rule.validate()).toBe(false);
    });

    it('should return false for invalid time window', () => {
      rule.config.threshold = 5;
      rule.config.timeWindowMinutes = 0;
      expect(rule.validate()).toBe(false);
    });

    it('should return false for invalid countField', () => {
      rule.config.timeWindowMinutes = 15;
      rule.config.countField = null as any;
      expect(rule.validate()).toBe(false);
    });
  });

  describe('getDescription', () => {
    it('should return human-readable description', () => {
      expect(rule.getDescription()).toBe(
        'Triggers when more than 5 failed login attempts occur within 15 minutes',
      );
    });
  });

  describe('evaluate', () => {
    const baseContext: RuleContext = {
      userId: 'user123',
      email: 'test@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
      eventType: SecurityEventType.LOGIN_FAILED,
      recentEvents: [],
    };

    it('should not match for non-login-failed events', async () => {
      const context = {
        ...baseContext,
        eventType: SecurityEventType.LOGIN_SUCCESS,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should not match when below threshold', async () => {
      const context = {
        ...baseContext,
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should match when threshold is reached', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 1 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 2 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 3 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 4 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain('5 failed login attempts detected');
      expect(result.suggestedActions).toContain('BLOCK_IP');
    });

    it('should not count events outside time window', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 20 * 60 * 1000), // Outside 15 min window
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 25 * 60 * 1000), // Outside 15 min window
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should detect distributed attacks from multiple IPs', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        ipAddress: '192.168.1.5',
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 1 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 2 * 60 * 1000),
            ipAddress: '192.168.1.2',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 3 * 60 * 1000),
            ipAddress: '192.168.1.3',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 4 * 60 * 1000),
            ipAddress: '192.168.1.4',
            metadata: { userId: 'user123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.evidence.isDistributed).toBe(true);
      expect(result.evidence.uniqueIpCount).toBe(5);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
    });

    it('should detect automated attacks with rapid attempts', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 100), // 100ms ago
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 200), // 200ms ago
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 300), // 300ms ago
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 400), // 400ms ago
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.evidence.isAutomated).toBe(true);
      expect(result.suggestedActions).toContain('INCREASE_MONITORING');
    });

    it('should match same target by email when userId is not available', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        userId: undefined,
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 1 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { email: 'test@example.com' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 2 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { email: 'test@example.com' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 3 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { email: 'test@example.com' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 4 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { email: 'test@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
    });

    it('should match same target by IP when neither userId nor email is available', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        userId: undefined,
        email: undefined,
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 1 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: {},
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 2 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: {},
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 3 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: {},
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 4 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: {},
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
    });

    it('should calculate appropriate severity levels', async () => {
      const now = new Date();

      // Test CRITICAL severity for > 20 attempts
      const criticalContext = {
        ...baseContext,
        recentEvents: Array.from({ length: 20 }, (_, i) => ({
          eventType: SecurityEventType.LOGIN_FAILED,
          timestamp: new Date(now.getTime() - i * 30 * 1000),
          ipAddress: '192.168.1.1',
          metadata: { userId: 'user123' },
        })),
      };

      const criticalResult = await rule.evaluate(criticalContext);
      expect(criticalResult.severity).toBe(ThreatSeverity.CRITICAL);

      // Test MEDIUM severity for 7+ attempts (6 in recentEvents + 1 current = 7 total)
      const mediumContext = {
        ...baseContext,
        recentEvents: Array.from({ length: 6 }, (_, i) => ({
          eventType: SecurityEventType.LOGIN_FAILED,
          timestamp: new Date(now.getTime() - i * 60 * 1000),
          ipAddress: '192.168.1.1',
          metadata: { userId: 'user123' },
        })),
      };

      const mediumResult = await rule.evaluate(mediumContext);
      expect(mediumResult.severity).toBe(ThreatSeverity.MEDIUM);
    });

    it('should suggest appropriate actions based on severity', async () => {
      const now = new Date();

      // Test high attempt count actions
      const highAttemptContext = {
        ...baseContext,
        recentEvents: Array.from({ length: 15 }, (_, i) => ({
          eventType: SecurityEventType.LOGIN_FAILED,
          timestamp: new Date(now.getTime() - i * 30 * 1000),
          ipAddress: '192.168.1.1',
          metadata: { userId: 'user123' },
        })),
      };

      const highAttemptResult = await rule.evaluate(highAttemptContext);
      expect(highAttemptResult.suggestedActions).toContain('BLOCK_IP');
      expect(highAttemptResult.suggestedActions).toContain('INVALIDATE_SESSIONS');
      expect(highAttemptResult.suggestedActions).toContain('REQUIRE_2FA');
    });

    it('should handle empty recentEvents gracefully', async () => {
      const context = {
        ...baseContext,
        recentEvents: undefined,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should include multiple user agents in pattern analysis', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        userAgent: 'Chrome/91.0',
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 1 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123', userAgent: 'Firefox/89.0' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 2 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123', userAgent: 'Safari/14.0' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 3 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123', userAgent: 'Edge/91.0' },
          },
          {
            eventType: SecurityEventType.LOGIN_FAILED,
            timestamp: new Date(now.getTime() - 4 * 60 * 1000),
            ipAddress: '192.168.1.1',
            metadata: { userId: 'user123', userAgent: 'Opera/77.0' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.evidence.uniqueUserAgentCount).toBe(5);
      expect(result.score).toBeGreaterThanOrEqual(60); // Base 50 + 10 for user agents
    });
  });
});
