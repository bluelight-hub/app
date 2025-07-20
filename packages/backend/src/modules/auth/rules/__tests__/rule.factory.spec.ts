import { Test, TestingModule } from '@nestjs/testing';
import { ThreatRuleFactory } from '../rule.factory';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import {
  BruteForceRule,
  GeoAnomalyRule,
  TimeAnomalyRule,
  RapidIpChangeRule,
  SuspiciousUserAgentRule,
} from '../implementations';

describe('ThreatRuleFactory', () => {
  let factory: ThreatRuleFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThreatRuleFactory],
    }).compile();

    factory = module.get<ThreatRuleFactory>(ThreatRuleFactory);
  });

  describe('getAvailableRuleTypes', () => {
    it('should return all available rule types', () => {
      const types = factory.getAvailableRuleTypes();
      expect(types).toContain('brute-force-detection');
      expect(types).toContain('geo-anomaly-detection');
      expect(types).toContain('time-anomaly-detection');
      expect(types).toContain('rapid-ip-change-detection');
      expect(types).toContain('suspicious-user-agent-detection');
      expect(types.length).toBe(5);
    });
  });

  describe('isRuleTypeSupported', () => {
    it('should return true for supported rule types', () => {
      expect(factory.isRuleTypeSupported('brute-force-detection')).toBe(true);
      expect(factory.isRuleTypeSupported('geo-anomaly-detection')).toBe(true);
    });

    it('should return false for unsupported rule types', () => {
      expect(factory.isRuleTypeSupported('unknown-rule')).toBe(false);
      expect(factory.isRuleTypeSupported('')).toBe(false);
    });
  });

  describe('createDefaultRule', () => {
    it('should create a default BruteForceRule', () => {
      const rule = factory.createDefaultRule('brute-force-detection');
      expect(rule).toBeInstanceOf(BruteForceRule);
      expect(rule.id).toBe('brute-force-detection');
      expect(rule.config.threshold).toBe(5);
    });

    it('should create a default GeoAnomalyRule', () => {
      const rule = factory.createDefaultRule('geo-anomaly-detection');
      expect(rule).toBeInstanceOf(GeoAnomalyRule);
      expect(rule.id).toBe('geo-anomaly-detection');
      expect(rule.config.maxVelocityKmh).toBe(1000);
    });

    it('should throw error for unknown rule type', () => {
      expect(() => factory.createDefaultRule('unknown-rule')).toThrow(
        'Unknown rule type: unknown-rule',
      );
    });
  });

  describe('createRule', () => {
    it('should create a rule with custom configuration', () => {
      const config = {
        name: 'Custom Brute Force',
        description: 'Custom description',
        severity: ThreatSeverity.CRITICAL,
        config: {
          threshold: 10,
          timeWindowMinutes: 30,
        },
      };

      const rule = factory.createRule('brute-force-detection', config);
      expect(rule).toBeInstanceOf(BruteForceRule);
      expect(rule.name).toBe('Custom Brute Force');
      expect(rule.description).toBe('Custom description');
      expect(rule.severity).toBe(ThreatSeverity.CRITICAL);
      expect(rule.config.threshold).toBe(10);
      expect(rule.config.timeWindowMinutes).toBe(30);
      // Default values should be preserved
      expect(rule.config.countField).toBe('failedAttempts');
    });

    it('should override all configurable properties', () => {
      const config = {
        id: 'custom-id',
        name: 'Custom Name',
        description: 'Custom Desc',
        version: '2.0.0',
        status: RuleStatus.INACTIVE,
        severity: ThreatSeverity.LOW,
        conditionType: ConditionType.PATTERN,
        tags: ['custom', 'test'],
        config: {
          threshold: 20,
        },
      };

      const rule = factory.createRule('brute-force-detection', config);
      expect(rule.id).toBe('custom-id');
      expect(rule.name).toBe('Custom Name');
      expect(rule.description).toBe('Custom Desc');
      expect(rule.version).toBe('2.0.0');
      expect(rule.status).toBe(RuleStatus.INACTIVE);
      expect(rule.severity).toBe(ThreatSeverity.LOW);
      expect(rule.conditionType).toBe(ConditionType.PATTERN);
      expect(rule.tags).toEqual(['custom', 'test']);
    });

    it('should throw error for invalid configuration', () => {
      const config = {
        config: {
          threshold: 0, // Invalid
        },
      };

      expect(() => factory.createRule('brute-force-detection', config)).toThrow(
        'Invalid rule configuration',
      );
    });

    it('should throw error for unknown rule type', () => {
      expect(() => factory.createRule('unknown-rule', {})).toThrow(
        'Unknown rule type: unknown-rule',
      );
    });
  });

  describe('createFromDatabase', () => {
    it('should create rule from database entry', () => {
      const dbRule = {
        id: 'brute-force-detection',
        name: 'DB Brute Force',
        description: 'From database',
        version: '1.5.0',
        status: RuleStatus.TESTING,
        severity: ThreatSeverity.HIGH,
        conditionType: ConditionType.THRESHOLD,
        tags: ['db', 'test'],
        config: {
          threshold: 7,
          timeWindowMinutes: 20,
        },
      };

      const rule = factory.createFromDatabase(dbRule);
      expect(rule).toBeInstanceOf(BruteForceRule);
      expect(rule.name).toBe('DB Brute Force');
      expect(rule.description).toBe('From database');
      expect(rule.version).toBe('1.5.0');
      expect(rule.status).toBe(RuleStatus.TESTING);
      expect(rule.config.threshold).toBe(7);
    });

    it('should handle missing optional fields', () => {
      const dbRule = {
        id: 'geo-anomaly-detection',
        name: 'Geo Rule',
        description: 'Test',
        version: '1.0.0',
        status: RuleStatus.ACTIVE,
        severity: ThreatSeverity.MEDIUM,
        conditionType: ConditionType.GEO_BASED,
      };

      const rule = factory.createFromDatabase(dbRule);
      expect(rule).toBeInstanceOf(GeoAnomalyRule);
      expect(rule.tags).toEqual([]); // Default empty array
      expect(rule.config).toBeDefined(); // Default config preserved
    });

    it('should throw error for unknown rule id', () => {
      const dbRule = {
        id: 'unknown-rule-id',
        name: 'Unknown',
        description: 'Test',
      };

      expect(() => factory.createFromDatabase(dbRule)).toThrow(
        'Unknown rule type: unknown-rule-id',
      );
    });
  });

  describe('toDatabaseFormat', () => {
    it('should convert rule to database format', () => {
      const rule = new BruteForceRule();
      rule.name = 'Test Rule';
      rule.config.threshold = 15;

      const dbFormat = factory.toDatabaseFormat(rule);
      expect(dbFormat).toEqual({
        id: 'brute-force-detection',
        name: 'Test Rule',
        description: rule.description,
        version: '1.0.0',
        status: RuleStatus.ACTIVE,
        severity: ThreatSeverity.HIGH,
        conditionType: ConditionType.THRESHOLD,
        tags: ['brute-force', 'authentication', 'login'],
        config: {
          threshold: 15,
          timeWindowMinutes: 15,
          countField: 'failedAttempts',
          includeUserAgentVariations: true,
          checkIpReputation: false,
        },
      });
    });

    it('should handle all rule types', () => {
      const ruleTypes = factory.getAvailableRuleTypes();

      ruleTypes.forEach((type) => {
        const rule = factory.createDefaultRule(type);
        const dbFormat = factory.toDatabaseFormat(rule);

        expect(dbFormat.id).toBe(type);
        expect(dbFormat.name).toBeDefined();
        expect(dbFormat.description).toBeDefined();
        expect(dbFormat.version).toBeDefined();
        expect(dbFormat.status).toBeDefined();
        expect(dbFormat.severity).toBeDefined();
        expect(dbFormat.conditionType).toBeDefined();
        expect(dbFormat.tags).toBeInstanceOf(Array);
        expect(dbFormat.config).toBeDefined();
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config = {
        name: 'Valid Rule',
        config: {
          threshold: 5,
          timeWindowMinutes: 15,
        },
      };

      const result = factory.validateConfig('brute-force-detection', config);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate invalid configuration', () => {
      const config = {
        name: 'Invalid Rule',
        config: {
          threshold: 0, // Invalid
        },
      };

      const result = factory.validateConfig('brute-force-detection', config);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('Invalid rule configuration');
    });

    it('should handle unknown rule type', () => {
      const result = factory.validateConfig('unknown-rule', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('Unknown rule type');
    });
  });

  describe('Rule instantiation verification', () => {
    it('should create correct instances for all rule types', () => {
      const expectations = [
        { type: 'brute-force-detection', class: BruteForceRule },
        { type: 'geo-anomaly-detection', class: GeoAnomalyRule },
        { type: 'time-anomaly-detection', class: TimeAnomalyRule },
        { type: 'rapid-ip-change-detection', class: RapidIpChangeRule },
        { type: 'suspicious-user-agent-detection', class: SuspiciousUserAgentRule },
      ];

      expectations.forEach(({ type, class: ExpectedClass }) => {
        const rule = factory.createDefaultRule(type);
        expect(rule).toBeInstanceOf(ExpectedClass);
        expect(rule.validate()).toBe(true);
      });
    });
  });
});
