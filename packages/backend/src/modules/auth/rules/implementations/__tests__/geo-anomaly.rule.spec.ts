import { Test, TestingModule } from '@nestjs/testing';
import { GeoAnomalyRule } from '../geo-anomaly.rule';
import { RuleContext } from '../../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../../enums/security-event-type.enum';

describe('GeoAnomalyRule', () => {
  let rule: GeoAnomalyRule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeoAnomalyRule],
    }).compile();

    rule = module.get<GeoAnomalyRule>(GeoAnomalyRule);
  });

  describe('Rule Properties', () => {
    it('should have correct metadata', () => {
      expect(rule.id).toBe('geo-anomaly-detection');
      expect(rule.name).toBe('Geographic Anomaly Detection');
      expect(rule.description).toBe(
        'Detects impossible travel speeds and suspicious geographic patterns',
      );
      expect(rule.version).toBe('1.0.0');
      expect(rule.status).toBe(RuleStatus.ACTIVE);
      expect(rule.severity).toBe(ThreatSeverity.CRITICAL);
      expect(rule.conditionType).toBe(ConditionType.GEO_BASED);
      expect(rule.tags).toEqual(['geo-location', 'travel-speed', 'authentication']);
    });

    it('should have correct default configuration', () => {
      expect(rule.config).toEqual({
        maxDistanceKm: 1000,
        checkVelocity: true,
        maxVelocityKmh: 1000,
        timeWindowMinutes: 60,
        allowedCountries: [],
        blockedCountries: [],
        suspiciousCountries: ['KP', 'IR', 'SY'],
      });
    });
  });

  describe('validate', () => {
    it('should return true for valid configuration', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should return false for invalid maxDistanceKm', () => {
      rule.config.maxDistanceKm = 0;
      expect(rule.validate()).toBe(false);
    });

    it('should return false for invalid maxVelocityKmh', () => {
      rule.config.maxDistanceKm = 1000;
      rule.config.maxVelocityKmh = 0;
      expect(rule.validate()).toBe(false);
    });

    it('should return false for invalid timeWindowMinutes', () => {
      rule.config.maxVelocityKmh = 1000;
      rule.config.timeWindowMinutes = 0;
      expect(rule.validate()).toBe(false);
    });
  });

  describe('getDescription', () => {
    it('should return human-readable description', () => {
      expect(rule.getDescription()).toBe(
        'Detects geographic anomalies including impossible travel speeds (>1000 km/h) and access from blocked/suspicious countries',
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
      eventType: SecurityEventType.LOGIN_SUCCESS,
      metadata: {
        location: 'Berlin, Germany',
      },
      recentEvents: [],
    };

    it('should not match for non-login-success events', async () => {
      const context = {
        ...baseContext,
        eventType: SecurityEventType.LOGIN_FAILED,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should not match when no location data is available', async () => {
      const context = {
        ...baseContext,
        metadata: {},
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should detect access from blocked countries', async () => {
      rule.config.blockedCountries = ['North Korea'];
      const context = {
        ...baseContext,
        metadata: {
          location: 'Pyongyang, North Korea',
        },
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
      expect(result.score).toBe(100);
      expect(result.reason).toContain('blocked country');
      expect(result.suggestedActions).toContain('BLOCK_IP');
    });

    it('should detect access from non-allowed countries', async () => {
      rule.config.allowedCountries = ['Germany', 'France'];
      const context = {
        ...baseContext,
        metadata: {
          location: 'London, United Kingdom',
        },
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
      expect(result.reason).toContain('non-allowed country');
    });

    it('should detect access from suspicious countries', async () => {
      const context = {
        ...baseContext,
        metadata: {
          location: 'Tehran, Iran',
        },
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.MEDIUM);
      expect(result.score).toBe(60);
      expect(result.reason).toContain('suspicious country');
      expect(result.suggestedActions).toContain('REQUIRE_2FA');
    });

    it('should detect impossible travel speeds', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Tokyo, Japan',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
            ipAddress: '192.168.1.2',
            metadata: {
              location: 'Berlin, Germany',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.reason).toContain('Impossible travel speed detected');
      expect(result.evidence.velocityKmh).toBeGreaterThan(1000);
      // Tokyo to Berlin in 30 minutes = 17800 km/h, definitely impossible
      expect(result.suggestedActions).toContain('INVALIDATE_SESSIONS');
      expect(result.suggestedActions).toContain('BLOCK_IP');
    });

    it('should not trigger for normal travel speeds', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Munich, Germany',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            ipAddress: '192.168.1.2',
            metadata: {
              location: 'Berlin, Germany',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should detect extremely high velocities as critical', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Sydney, Australia',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
            ipAddress: '192.168.1.2',
            metadata: {
              location: 'New York, United States',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
      expect(result.evidence.velocityKmh).toBeGreaterThan(2000);
      expect(result.suggestedActions).toContain('INVALIDATE_SESSIONS');
      expect(result.suggestedActions).toContain('BLOCK_IP');
    });

    it('should not trigger velocity check when disabled', async () => {
      rule.config.checkVelocity = false;
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Tokyo, Japan',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 30 * 60 * 1000),
            ipAddress: '192.168.1.2',
            metadata: {
              location: 'Berlin, Germany',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should handle different location formats', async () => {
      const context = {
        ...baseContext,
        metadata: {
          location: 'Berlin, Brandenburg, Germany',
        },
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should filter events outside time window', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Tokyo, Japan',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 90 * 60 * 1000), // 90 minutes ago (outside window)
            ipAddress: '192.168.1.2',
            metadata: {
              location: 'Berlin, Germany',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should handle locations in same city', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Berlin, Germany',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 30 * 60 * 1000),
            ipAddress: '192.168.1.2',
            metadata: {
              location: 'Berlin, Germany',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('should handle empty recentEvents', async () => {
      const context = {
        ...baseContext,
        recentEvents: undefined,
      };

      const result = await rule.evaluate(context);
      // Should check suspicious countries
      expect(result.matched).toBe(false);
    });

    it('should skip events without location data', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Tokyo, Japan',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 30 * 60 * 1000),
            ipAddress: '192.168.1.2',
            metadata: {}, // No location
          },
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 25 * 60 * 1000),
            ipAddress: '192.168.1.3',
            metadata: {
              location: 'Berlin, Germany',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.evidence.previousLocation.city).toBe('Berlin');
    });

    it('should calculate appropriate score based on velocity excess', async () => {
      const now = new Date();
      const context = {
        ...baseContext,
        metadata: {
          location: 'Paris, France',
        },
        recentEvents: [
          {
            eventType: SecurityEventType.LOGIN_SUCCESS,
            timestamp: new Date(now.getTime() - 45 * 60 * 1000),
            ipAddress: '192.168.1.2',
            metadata: {
              location: 'Berlin, Germany',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle malformed location strings', async () => {
      const context = {
        ...baseContext,
        metadata: {
          location: 'InvalidLocation',
        },
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });
  });
});
