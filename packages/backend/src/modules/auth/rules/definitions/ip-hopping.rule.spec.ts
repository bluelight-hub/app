import { IpHoppingRule } from './ip-hopping.rule';
import { RuleContext, ThreatSeverity } from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';

describe('IpHoppingRule', () => {
  let rule: IpHoppingRule;

  beforeEach(() => {
    rule = new IpHoppingRule({
      config: {
        patterns: ['rapid-ip-change', 'geo-impossible', 'proxy-pattern'],
        matchType: 'any',
        lookbackMinutes: 30,
        maxIpsThreshold: 3,
        suspiciousIpChangeMinutes: 5,
        vpnDetection: true,
        geoVelocityCheck: true,
        maxVelocityKmPerHour: 1000,
      },
    });
  });

  describe('validate', () => {
    it('should validate with correct config', () => {
      expect(rule.validate()).toBe(true);
    });

    it('should fail validation with invalid config', () => {
      const invalidRule = new IpHoppingRule({
        config: {
          patterns: [],
          matchType: 'any',
          lookbackMinutes: 30,
          maxIpsThreshold: 3,
          suspiciousIpChangeMinutes: 5,
          vpnDetection: true,
          geoVelocityCheck: true,
          maxVelocityKmPerHour: 1000,
        },
      });
      expect(invalidRule.validate()).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('should detect IP hopping with multiple IPs', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.4',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.2',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.3',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
      expect(result.reason).toContain('different IPs within');
      expect(result.evidence?.uniqueIps).toBe(3); // Only recent events count
      expect(result.evidence?.ipAddresses).toContain('192.168.1.1');
      expect(result.evidence?.ipAddresses).toContain('192.168.1.3');
    });

    it('should detect rapid IP change', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '10.0.0.4',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '10.0.0.3',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '10.0.0.2',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '10.0.0.1',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.reason).toContain('rapid IP changes');
      expect(result.evidence?.rapidChanges).toBeGreaterThan(0);
    });

    it('should detect VPN usage', async () => {
      // Configure rule to only check proxy pattern
      const vpnRule = new IpHoppingRule({
        config: {
          patterns: ['proxy-pattern'], // Only check proxy pattern
          matchType: 'any',
          lookbackMinutes: 30,
          maxIpsThreshold: 10, // High threshold to avoid IP hopping detection
          suspiciousIpChangeMinutes: 5,
          vpnDetection: true,
          geoVelocityCheck: false,
          maxVelocityKmPerHour: 1000,
        },
      });

      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.5',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {
          country: 'FR',
          asn: 'AS12345',
          isDatacenter: true,
        },
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              userId: 'user-123',
              country: 'US',
              asn: 'AS67890',
              isDatacenter: true,
            },
          },
          {
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.2',
            metadata: {
              userId: 'user-123',
              country: 'DE',
              asn: 'AS11111',
              isDatacenter: true,
            },
          },
          {
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.3',
            metadata: {
              userId: 'user-123',
              country: 'JP',
              asn: 'AS22222',
              isDatacenter: false,
            },
          },
        ],
      };

      const result = await vpnRule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH); // Multiple countries trigger HIGH severity
      expect(result.reason).toContain('Proxy/VPN pattern detected');
      expect(result.evidence?.datacenterRatio).toBeGreaterThan(0.5);
    });

    it('should detect proxy usage', async () => {
      // Configure rule to only check proxy pattern
      const proxyRule = new IpHoppingRule({
        config: {
          patterns: ['proxy-pattern'], // Only check proxy pattern
          matchType: 'any',
          lookbackMinutes: 30,
          maxIpsThreshold: 10, // High threshold to avoid IP hopping detection
          suspiciousIpChangeMinutes: 5,
          vpnDetection: true,
          geoVelocityCheck: false,
          maxVelocityKmPerHour: 1000,
        },
      });

      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {
          country: 'US',
          asn: 'AS99999',
          isDatacenter: true,
        },
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.11',
            metadata: {
              userId: 'user-123',
              country: 'CA',
              asn: 'AS88888',
              isDatacenter: true,
            },
          },
          {
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.12',
            metadata: {
              userId: 'user-123',
              country: 'UK',
              asn: 'AS77777',
              isDatacenter: true,
            },
          },
          {
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.13',
            metadata: {
              userId: 'user-123',
              country: 'AU',
              asn: 'AS66666',
              isDatacenter: true,
            },
          },
          {
            timestamp: new Date(Date.now() - 20 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.14',
            metadata: {
              userId: 'user-123',
              country: 'NZ',
              asn: 'AS55555',
              isDatacenter: true,
            },
          },
        ],
      };

      const result = await proxyRule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL); // > 80% datacenter IPs
      expect(result.reason).toContain('Proxy/VPN pattern detected');
      expect(result.evidence?.datacenterRatio).toBe(1); // 100% datacenter IPs
    });

    it('should detect impossible travel (geo velocity)', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {
          location: {
            country: 'US',
            city: 'Los Angeles',
            lat: 34.0522,
            lon: -118.2437,
          },
        },
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              userId: 'user-123',
              location: {
                country: 'DE',
                city: 'Berlin',
                lat: 52.52,
                lon: 13.405,
              },
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
      expect(result.reason).toContain('Impossible travel detected');
      expect(result.evidence?.velocity).toBeGreaterThan(1000);
    });

    it('should not match for normal behavior', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should ignore events outside lookback window', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.4',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {},
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago (outside 30 min window)
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
          },
          {
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.2',
          },
        ],
      };

      const result = await rule.evaluate(context);

      expect(result.matched).toBe(false);
      expect(result.evidence).toBeUndefined(); // No evidence when not matched
    });

    it('should calculate correct geo distance', async () => {
      // Test with known coordinates
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {
          location: {
            country: 'US',
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.006,
          },
        },
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              location: {
                country: 'US',
                city: 'Philadelphia',
                lat: 39.9526,
                lon: -75.1652,
              },
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      // Distance between NYC and Philadelphia is ~130km
      // 1 hour travel time = ~130 km/h velocity (reasonable)
      expect(result.matched).toBe(false);
      expect(result.evidence).toBeUndefined(); // No evidence when not matched
    });

    it('should handle missing location data gracefully', async () => {
      const context: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.4',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_SUCCESS,
        metadata: {}, // No location data
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.3',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
              location: {
                country: 'US',
                city: 'New York',
                lat: 40.7128,
                lon: -74.006,
              },
            },
          },
          {
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.2',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
          {
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ipAddress: '192.168.1.1',
            metadata: {
              userId: 'user-123',
              email: 'test@example.com',
            },
          },
        ],
      };

      const result = await rule.evaluate(context);

      // Should detect IP hopping (3 unique IPs) but not impossible travel
      expect(result.matched).toBe(true);
      expect(result.reason).toContain('different IPs within');
      expect(result.evidence?.uniqueIps).toBe(3);
    });
  });
});
