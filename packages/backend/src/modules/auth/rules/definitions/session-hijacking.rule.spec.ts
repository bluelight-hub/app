import { SessionHijackingRule } from './session-hijacking.rule';
import { RuleContext } from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';

describe('SessionHijackingRule', () => {
  let rule: SessionHijackingRule;

  beforeEach(() => {
    rule = new SessionHijackingRule({
      config: {
        patterns: ['ip-change', 'user-agent-change', 'geo-jump'],
        matchType: 'any',
        lookbackMinutes: 60,
        checkIpChange: true,
        checkUserAgentChange: true,
        checkGeoJump: true,
        maxSessionIpChanges: 2,
      },
    });
  });

  describe('constructor', () => {
    it('should create rule with default values', () => {
      const defaultRule = new SessionHijackingRule({});
      expect(defaultRule.id).toBe('session-hijacking-default');
      expect(defaultRule.name).toBe('Session Hijacking Detection');
      expect(defaultRule.status).toBe(RuleStatus.ACTIVE);
      expect(defaultRule.severity).toBe(ThreatSeverity.CRITICAL);
      expect(defaultRule.conditionType).toBe(ConditionType.PATTERN);
      expect(defaultRule.config.maxSessionIpChanges).toBe(2);
    });

    it('should create rule with custom values', () => {
      const customRule = new SessionHijackingRule({
        id: 'custom-hijack-rule',
        severity: ThreatSeverity.HIGH,
        config: {
          patterns: ['ip-change', 'user-agent-change', 'geo-jump'],
          matchType: 'any',
          lookbackMinutes: 60,
          checkIpChange: true,
          checkUserAgentChange: true,
          checkGeoJump: false,
          maxSessionIpChanges: 3,
        },
      });
      expect(customRule.id).toBe('custom-hijack-rule');
      expect(customRule.severity).toBe(ThreatSeverity.HIGH);
      expect(customRule.config.maxSessionIpChanges).toBe(3);
      expect(customRule.config.checkGeoJump).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate with correct config', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should fail validation with invalid lookbackMinutes', () => {
      const invalidRule = new SessionHijackingRule({
        config: {
          patterns: ['ip-change', 'user-agent-change', 'geo-jump'],
          matchType: 'any',
          lookbackMinutes: 0,
          checkIpChange: true,
          checkUserAgentChange: true,
          checkGeoJump: true,
          maxSessionIpChanges: 2,
        },
      });
      expect(invalidRule.validate()).toBe(false);
    });

    it('should fail validation with invalid maxSessionIpChanges', () => {
      const invalidRule = new SessionHijackingRule({
        config: {
          patterns: ['ip-change', 'user-agent-change', 'geo-jump'],
          matchType: 'any',
          lookbackMinutes: 60,
          checkIpChange: true,
          checkUserAgentChange: true,
          checkGeoJump: true,
          maxSessionIpChanges: 0,
        },
      });
      expect(invalidRule.validate()).toBe(false);
    });
  });

  describe('getDescription', () => {
    it('should return correct description', () => {
      const description = rule.getDescription();
      expect(description).toContain('session hijacking');
      expect(description).toContain('IP changes');
      expect(description).toContain('User-Agent changes');
    });
  });

  describe('evaluate', () => {
    const baseContext: RuleContext = {
      userId: 'user-123',
      email: 'test@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
      eventType: SecurityEventType.LOGIN_SUCCESS,
      metadata: { sessionId: 'session-abc123' },
      recentEvents: [],
    };

    it('should not match when no sessionId in metadata', async () => {
      const context: RuleContext = {
        ...baseContext,
        metadata: {},
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should not match when no recent events', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: undefined,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should not match with less than 2 session events', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should detect IP changes within session', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.2',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 10000),
            eventType: SecurityEventType.API_CALL,
            ipAddress: '192.168.1.3',
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
      expect(result.score).toBe(95);
      expect(result.reason).toContain('2 IP changes detected');
      expect(result.evidence?.ipChanges).toHaveLength(2);
      expect(result.suggestedActions).toContain('INVALIDATE_SESSIONS');
      expect(result.suggestedActions).toContain('REQUIRE_2FA');
      expect(result.suggestedActions).toContain('BLOCK_IP');
    });

    it('should not match IP changes below threshold', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.2',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 10000),
            eventType: SecurityEventType.API_CALL,
            ipAddress: '192.168.1.2', // Same as previous
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
    });

    it('should detect User-Agent changes', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 Chrome',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 Firefox', // Different UA
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
      expect(result.score).toBe(90);
      expect(result.reason).toContain('User-Agent changed');
      expect(result.evidence?.originalUserAgent).toContain('Chrome');
      expect(result.evidence?.newUserAgent).toContain('Firefox');
      expect(result.suggestedActions).toContain('INVALIDATE_SESSIONS');
      expect(result.suggestedActions).toContain('REQUIRE_2FA');
    });

    it('should detect User-Agent from metadata if not in event', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              sessionId: 'session-abc123',
              userAgent: 'Mozilla/5.0 Chrome',
            },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.1',
            metadata: {
              sessionId: 'session-abc123',
              userAgent: 'Mozilla/5.0 Firefox',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.reason).toContain('User-Agent changed');
    });

    it('should detect geographic jumps', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              sessionId: 'session-abc123',
              country: 'US',
            },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.2',
            metadata: {
              sessionId: 'session-abc123',
              country: 'CN', // Different country
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
      expect(result.score).toBe(85);
      expect(result.reason).toContain('Impossible geographic jump');
      expect(result.evidence?.locations).toHaveLength(2);
      expect(result.evidence?.timeMinutes).toBeDefined();
      expect(result.suggestedActions).toContain('INVALIDATE_SESSIONS');
      expect(result.suggestedActions).toContain('REQUIRE_2FA');
    });

    it('should ignore events outside lookback window', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 70 * 60 * 1000), // 70 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 65 * 60 * 1000), // 65 minutes ago
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.2',
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
    });

    it('should only consider events with matching sessionId', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.2',
            metadata: { sessionId: 'session-xyz789' }, // Different session
          },
          {
            timestamp: new Date(now - 10000),
            eventType: SecurityEventType.API_CALL,
            ipAddress: '192.168.1.3',
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false); // Only 1 IP change for the target session
    });

    it('should respect disabled checks', async () => {
      const customRule = new SessionHijackingRule({
        config: {
          patterns: ['ip-change', 'user-agent-change', 'geo-jump'],
          matchType: 'any',
          lookbackMinutes: 60,
          checkIpChange: false,
          checkUserAgentChange: false,
          checkGeoJump: true,
          maxSessionIpChanges: 2,
        },
      });

      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            userAgent: 'Chrome',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: '192.168.1.2', // IP changed
            userAgent: 'Firefox', // UA changed
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await customRule.evaluate(context);

      expect(result.matched).toBe(false); // IP and UA checks are disabled
    });

    it('should handle events without IP addresses gracefully', async () => {
      const now = Date.now();
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date(now - 30000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 20000),
            eventType: SecurityEventType.PAGE_VIEW,
            ipAddress: undefined, // No IP
            metadata: { sessionId: 'session-abc123' },
          },
          {
            timestamp: new Date(now - 10000),
            eventType: SecurityEventType.API_CALL,
            ipAddress: '192.168.1.2',
            metadata: { sessionId: 'session-abc123' },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false); // Only 1 actual IP change
    });
  });
});
