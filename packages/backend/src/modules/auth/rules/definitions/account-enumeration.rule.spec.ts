import { AccountEnumerationRule } from './account-enumeration.rule';
import { RuleContext, ThreatSeverity, RuleStatus, ConditionType } from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';

describe('AccountEnumerationRule', () => {
  let rule: AccountEnumerationRule;

  beforeEach(() => {
    rule = new AccountEnumerationRule({});
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(rule.id).toBe('account-enumeration-default');
      expect(rule.name).toBe('Account Enumeration Detection');
      expect(rule.status).toBe(RuleStatus.ACTIVE);
      expect(rule.severity).toBe(ThreatSeverity.HIGH);
      expect(rule.conditionType).toBe(ConditionType.PATTERN);
    });

    it('should accept custom configuration', () => {
      const customRule = new AccountEnumerationRule({
        id: 'custom-id',
        name: 'Custom Rule',
        version: '2.0.0',
        status: RuleStatus.INACTIVE,
        severity: ThreatSeverity.CRITICAL,
        tags: ['custom-tag'],
        config: {
          patterns: ['custom-pattern'],
          matchType: 'all',
          lookbackMinutes: 30,
          minAttempts: 10,
          sequentialThreshold: 5,
          similarityThreshold: 0.9,
        },
      });

      expect(customRule.id).toBe('custom-id');
      expect(customRule.name).toBe('Custom Rule');
      expect(customRule.version).toBe('2.0.0');
      expect(customRule.status).toBe(RuleStatus.INACTIVE);
      expect(customRule.config.minAttempts).toBe(10);
      expect(customRule.config.sequentialThreshold).toBe(5);
    });
  });

  describe('evaluate', () => {
    it('should return false when no IP address is provided', async () => {
      const context: RuleContext = {
        userId: 'user123',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should return false when no recent events are provided', async () => {
      const context: RuleContext = {
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should return false when attempts are below threshold', async () => {
      const context: RuleContext = {
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        recentEvents: [
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'test1@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'test2@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should detect sequential username patterns', async () => {
      const now = new Date();
      const context: RuleContext = {
        ipAddress: '192.168.1.1',
        timestamp: now,
        eventType: SecurityEventType.LOGIN_FAILED,
        recentEvents: [
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user1@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user2@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user3@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 4000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user4@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 5000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user5@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
      expect(result.score).toBe(85);
      expect(result.reason).toContain('Sequential username pattern');
      expect(result.suggestedActions).toContain('BLOCK_IP');
    });

    it('should detect similar username patterns', async () => {
      const now = new Date();
      const context: RuleContext = {
        ipAddress: '192.168.1.1',
        timestamp: now,
        eventType: SecurityEventType.LOGIN_FAILED,
        recentEvents: [
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'johndoe@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'johndoe1@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'johndoe2@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 4000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'johndoe3@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 5000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'johndoe4@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
    });

    it('should filter events by time window', async () => {
      const now = new Date();
      const oldTime = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago

      const context: RuleContext = {
        ipAddress: '192.168.1.1',
        timestamp: now,
        eventType: SecurityEventType.LOGIN_FAILED,
        recentEvents: [
          {
            ipAddress: '192.168.1.1',
            timestamp: oldTime,
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user1@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user2@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should handle events with username instead of email', async () => {
      const now = new Date();
      const context: RuleContext = {
        ipAddress: '192.168.1.1',
        timestamp: now,
        eventType: SecurityEventType.LOGIN_FAILED,
        recentEvents: Array.from({ length: 5 }, (_, i) => ({
          ipAddress: '192.168.1.1',
          timestamp: new Date(now.getTime() - i * 1000),
          eventType: SecurityEventType.LOGIN_FAILED,
          metadata: { username: `testuser${i}` },
        })),
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
    });

    it('should handle mixed metadata formats', async () => {
      const now = new Date();
      const context: RuleContext = {
        ipAddress: '192.168.1.1',
        timestamp: now,
        eventType: SecurityEventType.LOGIN_FAILED,
        recentEvents: [
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 1000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user1@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 2000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { username: 'user2' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 3000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: {},
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 4000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user3@example.com' },
          },
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(now.getTime() - 5000),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: { email: 'user4@example.com' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result).toBeDefined();
    });
  });

  describe('detectSequentialPattern', () => {
    it('should detect sequential patterns with different prefixes', () => {
      const detectMethod = (rule as any).detectSequentialPattern.bind(rule);

      const usernames = ['admin1', 'admin2', 'admin3', 'admin4'];
      const count = detectMethod(usernames);
      expect(count).toBe(3);
    });

    it('should not detect non-sequential patterns', () => {
      const detectMethod = (rule as any).detectSequentialPattern.bind(rule);

      const usernames = ['user1', 'user3', 'user5', 'user7'];
      const count = detectMethod(usernames);
      expect(count).toBe(0);
    });

    it('should handle usernames without numbers', () => {
      const detectMethod = (rule as any).detectSequentialPattern.bind(rule);

      const usernames = ['alice', 'bob', 'charlie', 'david'];
      const count = detectMethod(usernames);
      expect(count).toBe(0);
    });
  });

  describe('calculateSimilarityScore', () => {
    it('should return 0 for single username', () => {
      const calculateMethod = (rule as any).calculateSimilarityScore.bind(rule);

      const score = calculateMethod(['username']);
      expect(score).toBe(0);
    });

    it('should return 1 for identical usernames', () => {
      const calculateMethod = (rule as any).calculateSimilarityScore.bind(rule);

      const score = calculateMethod(['test', 'test', 'test']);
      expect(score).toBe(1);
    });

    it('should calculate similarity for different usernames', () => {
      const calculateMethod = (rule as any).calculateSimilarityScore.bind(rule);

      const score = calculateMethod(['test', 'test1', 'test2']);
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('levenshteinDistance', () => {
    it('should calculate correct distance for identical strings', () => {
      const distanceMethod = (rule as any).levenshteinDistance.bind(rule);

      const distance = distanceMethod('test', 'test');
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for different strings', () => {
      const distanceMethod = (rule as any).levenshteinDistance.bind(rule);

      const distance = distanceMethod('kitten', 'sitting');
      expect(distance).toBe(3);
    });

    it('should handle empty strings', () => {
      const distanceMethod = (rule as any).levenshteinDistance.bind(rule);

      const distance = distanceMethod('test', '');
      expect(distance).toBe(4);
    });
  });

  describe('validate', () => {
    it('should return true for valid configuration', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should return false for invalid lookbackMinutes', () => {
      rule.config.lookbackMinutes = 0;
      expect(rule.validate()).toBe(false);
    });

    it('should return false for invalid minAttempts', () => {
      rule.config.minAttempts = 0;
      expect(rule.validate()).toBe(false);
    });

    it('should return false for invalid similarityThreshold', () => {
      rule.config.similarityThreshold = 1.5;
      expect(rule.validate()).toBe(false);
    });
  });

  describe('getDescription', () => {
    it('should return description string', () => {
      const description = rule.getDescription();
      expect(description).toContain('account enumeration');
    });
  });
});
