import { RapidIpChangeRule } from '../rapid-ip-change.rule';
import { RuleContext } from '../../rule.interface';
import { SecurityEventType } from '../../../enums/security-event-type.enum';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';

describe('RapidIpChangeRule', () => {
  let rule: RapidIpChangeRule;
  let baseContext: RuleContext;

  beforeEach(() => {
    rule = new RapidIpChangeRule();
    baseContext = {
      userId: 'test-user-123',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date('2024-01-15T12:00:00Z'),
      eventType: SecurityEventType.LOGIN_SUCCESS,
      metadata: {
        userId: 'test-user-123',
      },
      recentEvents: [],
    };
  });

  describe('Regel-Eigenschaften', () => {
    it('sollte korrekte Metadaten haben', () => {
      expect(rule.id).toBe('rapid-ip-change-detection');
      expect(rule.name).toBe('Rapid IP Change Detection');
      expect(rule.status).toBe(RuleStatus.ACTIVE);
      expect(rule.severity).toBe(ThreatSeverity.HIGH);
      expect(rule.conditionType).toBe(ConditionType.PATTERN);
      expect(rule.tags).toContain('ip-change');
    });

    it('sollte eine valide Konfiguration haben', () => {
      expect(rule.validate()).toBe(true);
    });

    it('sollte eine beschreibende Erklärung geben', () => {
      const description = rule.getDescription();
      expect(description).toContain('3 different IP addresses');
      expect(description).toContain('10 minutes');
    });
  });

  describe('evaluate', () => {
    it('sollte false zurückgeben bei unpassendem Event-Typ', async () => {
      const context: RuleContext = {
        ...baseContext,
        eventType: SecurityEventType.LOGIN_FAILED,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte false zurückgeben ohne IP-Adresse', async () => {
      const context: RuleContext = {
        ...baseContext,
        ipAddress: undefined,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte false zurückgeben für gewhitelistete IPs', async () => {
      rule.config.whitelist.vpnProviders = ['192.168.1.100'];

      const result = await rule.evaluate(baseContext);
      expect(result.matched).toBe(false);
    });

    it('sollte false zurückgeben für Corporate IP-Bereiche', async () => {
      rule.config.whitelist.corporateRanges = ['192.168.'];

      const result = await rule.evaluate(baseContext);
      expect(result.matched).toBe(false);
    });

    it('sollte false zurückgeben ohne recent events', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: undefined,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte false zurückgeben ohne userId', async () => {
      const context: RuleContext = {
        ...baseContext,
        userId: undefined,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte verdächtige IP-Wechsel erkennen', async () => {
      const context: RuleContext = {
        ...baseContext,
        ipAddress: '192.168.1.104',
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T11:55:00Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T11:57:00Z'),
            ipAddress: '192.168.1.102',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T11:59:00Z'),
            ipAddress: '192.168.1.103',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.MEDIUM);
      expect(result.reason).toContain('4 different IP addresses');
      expect(result.evidence.uniqueIpCount).toBe(4);
      expect(result.suggestedActions).toContain('REQUIRE_2FA');
    });

    it('sollte schnelle IP-Wechsel als rapid changes erkennen', async () => {
      const context: RuleContext = {
        ...baseContext,
        ipAddress: '192.168.1.102',
        timestamp: new Date('2024-01-15T12:00:30Z'), // 30 Sekunden später
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T12:00:00Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.evidence.patterns).toContain('rapid_changes');
      expect(result.severity).toBe(ThreatSeverity.HIGH);
    });

    it('sollte Ping-Pong-Muster erkennen', async () => {
      const context: RuleContext = {
        ...baseContext,
        ipAddress: '192.168.1.101',
        timestamp: new Date('2024-01-15T12:04:00Z'),
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T12:00:00Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:01:00Z'),
            ipAddress: '192.168.1.102',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:02:00Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:03:00Z'),
            ipAddress: '192.168.1.102',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.evidence.patterns).toContain('ping_pong');
      expect(result.severity).toBe(ThreatSeverity.HIGH);
    });

    it('sollte Events außerhalb des Zeitfensters ignorieren', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T11:00:00Z'), // 1 Stunde alt
            ipAddress: '192.168.1.200',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte Events von anderen Benutzern ignorieren', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T11:55:00Z'),
            ipAddress: '192.168.1.200',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'other-user' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte mehrere verdächtige Muster als CRITICAL bewerten', async () => {
      const context: RuleContext = {
        ...baseContext,
        ipAddress: '192.168.1.106',
        timestamp: new Date('2024-01-15T12:00:30Z'),
        recentEvents: [
          // Viele IPs + schnelle Wechsel + Ping-Pong
          {
            timestamp: new Date('2024-01-15T12:00:00Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:00:10Z'),
            ipAddress: '192.168.1.102',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:00:15Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:00:20Z'),
            ipAddress: '192.168.1.102',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:00:25Z'),
            ipAddress: '192.168.1.105',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.CRITICAL);
      expect(result.evidence.patterns.length).toBeGreaterThan(2);
    });

    it('sollte hohen Score für viele rapid changes vergeben', async () => {
      const recentEvents = [];

      // Erstelle viele schnelle IP-Wechsel
      for (let i = 0; i < 5; i++) {
        recentEvents.push({
          timestamp: new Date(`2024-01-15T11:59:${String(i * 10).padStart(2, '0')}Z`),
          ipAddress: `192.168.1.${101 + i}`,
          eventType: SecurityEventType.SESSION_ACTIVITY,
          metadata: { userId: 'test-user-123' },
        });
      }

      const context: RuleContext = {
        ...baseContext,
        ipAddress: '192.168.1.110',
        recentEvents,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.suggestedActions).toContain('BLOCK_IP');
    });

    it('sollte SESSION_ACTIVITY Events verarbeiten', async () => {
      const context: RuleContext = {
        ...baseContext,
        eventType: SecurityEventType.SESSION_ACTIVITY,
        ipAddress: '192.168.1.102',
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T11:59:00Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false); // Nur 2 IPs, unter Schwellenwert
    });

    it('sollte Events ohne IP-Adresse in recentEvents ignorieren', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T11:59:00Z'),
            ipAddress: undefined,
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte durchschnittliche Zeit zwischen Wechseln berechnen', async () => {
      const context: RuleContext = {
        ...baseContext,
        ipAddress: '192.168.1.104',
        timestamp: new Date('2024-01-15T12:03:00Z'),
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T12:00:00Z'),
            ipAddress: '192.168.1.101',
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:01:00Z'),
            ipAddress: '192.168.1.102',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
          {
            timestamp: new Date('2024-01-15T12:02:00Z'),
            ipAddress: '192.168.1.103',
            eventType: SecurityEventType.SESSION_ACTIVITY,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.evidence.averageTimeBetweenChanges).toBe(60); // 60 Sekunden
    });
  });

  describe('validate', () => {
    it('sollte false zurückgeben bei ungültiger Konfiguration', () => {
      rule.config.lookbackMinutes = 0;
      expect(rule.validate()).toBe(false);

      rule.config.lookbackMinutes = 30;
      rule.config.thresholds.maxIpChanges = 0;
      expect(rule.validate()).toBe(false);

      rule.config.thresholds.maxIpChanges = 3;
      rule.config.thresholds.timeWindowMinutes = 0;
      expect(rule.validate()).toBe(false);
    });

    it('sollte true zurückgeben bei negativem minTimeBetweenChangesSeconds', () => {
      rule.config.thresholds.minTimeBetweenChangesSeconds = -1;
      expect(rule.validate()).toBe(false);
    });

    it('sollte false zurückgeben ohne patterns Array', () => {
      (rule.config as any).patterns = null;
      expect(rule.validate()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit leerem recentEvents Array umgehen', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte mit nur einem Event umgehen', async () => {
      const context: RuleContext = {
        ...baseContext,
        recentEvents: [
          {
            timestamp: new Date('2024-01-15T11:59:00Z'),
            ipAddress: '192.168.1.100', // Gleiche IP
            eventType: SecurityEventType.LOGIN_SUCCESS,
            metadata: { userId: 'test-user-123' },
          },
        ],
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(false);
    });

    it('sollte sehr viele IPs als HIGH severity bewerten', async () => {
      const recentEvents = [];

      // 6 verschiedene IPs
      for (let i = 0; i < 5; i++) {
        recentEvents.push({
          timestamp: new Date(`2024-01-15T11:${55 + i}:00Z`),
          ipAddress: `192.168.1.${101 + i}`,
          eventType: SecurityEventType.SESSION_ACTIVITY,
          metadata: { userId: 'test-user-123' },
        });
      }

      const context: RuleContext = {
        ...baseContext,
        ipAddress: '192.168.1.106',
        recentEvents,
      };

      const result = await rule.evaluate(context);
      expect(result.matched).toBe(true);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
    });
  });
});
