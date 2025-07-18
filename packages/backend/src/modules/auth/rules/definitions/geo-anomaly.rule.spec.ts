import { GeoAnomalyRule } from './geo-anomaly.rule';
import { RuleContext, RuleStatus, ThreatSeverity, ConditionType } from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';

describe('GeoAnomalyRule', () => {
  let rule: GeoAnomalyRule;

  beforeEach(() => {
    rule = new GeoAnomalyRule({});
  });

  describe('constructor', () => {
    it('should create rule with default values', () => {
      expect(rule.id).toBe('geo-anomaly-default');
      expect(rule.name).toBe('Geographic Anomaly Detection');
      expect(rule.status).toBe(RuleStatus.ACTIVE);
      expect(rule.severity).toBe(ThreatSeverity.HIGH);
      expect(rule.conditionType).toBe(ConditionType.GEO_BASED);
      expect(rule.config.blockedCountries).toEqual(['KP', 'IR']);
      expect(rule.config.allowedCountries).toBeUndefined();
      expect(rule.config.maxDistanceKm).toBe(5000);
      expect(rule.config.checkVelocity).toBe(true);
      expect(rule.config.checkNewCountry).toBe(true);
      expect(rule.config.userPatternLearning).toBe(true);
      expect(rule.config.learningPeriodDays).toBe(30);
      expect(rule.tags).toEqual(['geo-anomaly', 'location', 'authentication']);
    });

    it('should create rule with custom values', () => {
      const customRule = new GeoAnomalyRule({
        id: 'custom-geo-rule',
        name: 'Custom Geo Rule',
        severity: ThreatSeverity.CRITICAL,
        config: {
          blockedCountries: ['XX'],
          allowedCountries: ['US', 'CA'],
          maxDistanceKm: 1000,
          checkVelocity: false,
          checkNewCountry: false,
          userPatternLearning: false,
          learningPeriodDays: 60,
        },
        tags: ['custom-tag'],
      });

      expect(customRule.id).toBe('custom-geo-rule');
      expect(customRule.name).toBe('Custom Geo Rule');
      expect(customRule.severity).toBe(ThreatSeverity.CRITICAL);
      expect(customRule.config.blockedCountries).toEqual(['XX']);
      expect(customRule.config.allowedCountries).toEqual(['US', 'CA']);
      expect(customRule.config.maxDistanceKm).toBe(1000);
      expect(customRule.config.checkVelocity).toBe(false);
      expect(customRule.config.checkNewCountry).toBe(false);
      expect(customRule.config.userPatternLearning).toBe(false);
      expect(customRule.config.learningPeriodDays).toBe(60);
      expect(customRule.tags).toEqual(['custom-tag']);
    });
  });

  describe('evaluate', () => {
    it('should return false for non-login events', async () => {
      const context: RuleContext = {
        eventType: SecurityEventType.LOGIN_FAILED,
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        metadata: { location: 'Seoul, South Korea', country: 'KR' },
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should return false when location or country is missing', async () => {
      const contextNoLocation: RuleContext = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        metadata: { country: 'US' },
      };

      const contextNoCountry: RuleContext = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        metadata: { location: 'New York, US' },
      };

      const contextNoMetadata: RuleContext = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
      };

      expect((await rule.evaluate(contextNoLocation)).matched).toBe(false);
      expect((await rule.evaluate(contextNoCountry)).matched).toBe(false);
      expect((await rule.evaluate(contextNoMetadata)).matched).toBe(false);
    });

    describe('blocked countries', () => {
      it('should detect login from blocked country', async () => {
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          metadata: { location: 'Pyongyang, North Korea', country: 'KP' },
        };

        const result = await rule.evaluate(context);

        expect(result.matched).toBe(true);
        expect(result.severity).toBe(ThreatSeverity.CRITICAL);
        expect(result.score).toBe(100);
        expect(result.reason).toBe('Login attempt from blocked country: KP');
        expect(result.evidence).toEqual({
          country: 'KP',
          blockedCountries: ['KP', 'IR'],
        });
        expect(result.suggestedActions).toEqual(['BLOCK_IP', 'INVALIDATE_SESSIONS']);
      });

      it('should allow login from non-blocked country', async () => {
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          metadata: { location: 'New York, US', country: 'US' },
        };

        const result = await rule.evaluate(context);
        expect(result.matched).toBe(false);
      });
    });

    describe('allowed countries', () => {
      beforeEach(() => {
        rule = new GeoAnomalyRule({
          config: {
            allowedCountries: ['US', 'CA', 'UK'],
            blockedCountries: [],
          },
        });
      });

      it('should allow login from allowed country', async () => {
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          metadata: { location: 'New York, US', country: 'US' },
        };

        const result = await rule.evaluate(context);
        expect(result.matched).toBe(false);
      });

      it('should detect login from non-allowed country', async () => {
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          metadata: { location: 'Paris, France', country: 'FR' },
        };

        const result = await rule.evaluate(context);

        expect(result.matched).toBe(true);
        expect(result.severity).toBe(ThreatSeverity.HIGH);
        expect(result.score).toBe(85);
        expect(result.reason).toBe('Login attempt from non-allowed country: FR');
        expect(result.evidence).toEqual({
          country: 'FR',
          allowedCountries: ['US', 'CA', 'UK'],
        });
        expect(result.suggestedActions).toEqual(['REQUIRE_2FA', 'INCREASE_MONITORING']);
      });
    });

    describe('new country detection', () => {
      it('should detect first login from new country', async () => {
        const now = new Date();
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: now,
          userId: 'user123',
          metadata: { location: 'Paris, France', country: 'FR' },
          recentEvents: [
            {
              id: '1',
              userId: 'user123',
              ipAddress: '192.168.1.1',
              timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
              eventType: SecurityEventType.LOGIN_SUCCESS,
              metadata: { country: 'US' },
            },
            {
              id: '2',
              userId: 'user123',
              ipAddress: '192.168.1.2',
              timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
              eventType: SecurityEventType.LOGIN_SUCCESS,
              metadata: { country: 'CA' },
            },
          ],
        };

        const result = await rule.evaluate(context);

        expect(result.matched).toBe(true);
        expect(result.severity).toBe(ThreatSeverity.MEDIUM);
        expect(result.score).toBe(65);
        expect(result.reason).toBe('First login from new country: FR');
        expect(result.evidence).toEqual({
          newCountry: 'FR',
          knownCountries: ['US', 'CA'],
          userId: 'user123',
        });
        expect(result.suggestedActions).toEqual(['REQUIRE_2FA']);
      });

      it('should not detect new country if user has logged in from there before', async () => {
        const now = new Date();
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: now,
          userId: 'user123',
          metadata: { location: 'New York, US', country: 'US' },
          recentEvents: [
            {
              id: '1',
              userId: 'user123',
              ipAddress: '192.168.1.1',
              timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
              eventType: SecurityEventType.LOGIN_SUCCESS,
              metadata: { country: 'US' },
            },
          ],
        };

        const result = await rule.evaluate(context);
        expect(result.matched).toBe(false);
      });

      it('should ignore events outside learning period', async () => {
        const now = new Date();
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: now,
          userId: 'user123',
          metadata: { location: 'Paris, France', country: 'FR' },
          recentEvents: [
            {
              id: '1',
              userId: 'user123',
              ipAddress: '192.168.1.1',
              timestamp: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago (outside 30-day period)
              eventType: SecurityEventType.LOGIN_SUCCESS,
              metadata: { country: 'FR' },
            },
          ],
        };

        const result = await rule.evaluate(context);
        expect(result.matched).toBe(true); // Should detect as new country since old event is outside learning period
      });

      it('should not check new country when disabled', async () => {
        rule = new GeoAnomalyRule({
          config: {
            checkNewCountry: false,
          },
        });

        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          userId: 'user123',
          metadata: { location: 'Paris, France', country: 'FR' },
          recentEvents: [],
        };

        const result = await rule.evaluate(context);
        expect(result.matched).toBe(false);
      });

      it('should handle empty recent events', async () => {
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
          userId: 'user123',
          metadata: { location: 'Paris, France', country: 'FR' },
          recentEvents: [],
        };

        const result = await rule.evaluate(context);
        expect(result.matched).toBe(false); // No history means we can't determine if it's new
      });

      it('should handle recent events without country metadata', async () => {
        const now = new Date();
        const context: RuleContext = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          timestamp: now,
          userId: 'user123',
          metadata: { location: 'Paris, France', country: 'FR' },
          recentEvents: [
            {
              id: '1',
              userId: 'user123',
              ipAddress: '192.168.1.1',
              timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
              eventType: SecurityEventType.LOGIN_SUCCESS,
              metadata: {}, // No country
            },
          ],
        };

        const result = await rule.evaluate(context);
        expect(result.matched).toBe(false); // Can't determine if new when no country history
      });
    });
  });

  describe('validate', () => {
    it('should return true for valid configuration', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should return false for invalid learning period', () => {
      rule.config.learningPeriodDays = 0;
      expect(rule.validate()).toBe(false);

      rule.config.learningPeriodDays = -1;
      expect(rule.validate()).toBe(false);
    });
  });

  describe('getDescription', () => {
    it('should return rule description', () => {
      expect(rule.getDescription()).toBe(
        'Detects geographic anomalies including blocked countries, unusual locations, and new countries for users',
      );
    });
  });
});