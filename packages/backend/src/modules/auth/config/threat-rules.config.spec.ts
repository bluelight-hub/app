import { defaultThreatRulesConfig, loadThreatRulesConfig } from './threat-rules.config';
import { ThreatSeverity } from '@prisma/generated/prisma';

describe('threat-rules.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('defaultThreatRulesConfig', () => {
    it('should have correct engine configuration', () => {
      expect(defaultThreatRulesConfig.engine).toEqual({
        enabled: true,
        parallelExecution: true,
        maxExecutionTime: 5000,
        logDetailedMetrics: false,
      });
    });

    it('should have correct hot reload configuration', () => {
      expect(defaultThreatRulesConfig.hotReload).toEqual({
        enabled: false,
        intervalMs: 60000,
      });
    });

    it('should have correct brute force rule configuration', () => {
      expect(defaultThreatRulesConfig.defaultRules.bruteForce).toEqual({
        enabled: true,
        severity: ThreatSeverity.HIGH,
        config: {
          threshold: 5,
          timeWindowMinutes: 15,
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

    it('should have correct alerts configuration', () => {
      expect(defaultThreatRulesConfig.alerts).toEqual({
        enabledSeverities: [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL],
        deduplicationWindowMinutes: 15,
        maxAlertsPerHour: 100,
      });
    });

    it('should have correct actions configuration', () => {
      expect(defaultThreatRulesConfig.actions.autoBlock).toEqual({
        enabled: false,
        severityThreshold: ThreatSeverity.CRITICAL,
        blockDurationMinutes: 60,
      });
    });
  });

  describe('loadThreatRulesConfig', () => {
    it('should return default config when no environment variables are set', () => {
      const config = loadThreatRulesConfig();
      expect(config).toEqual(defaultThreatRulesConfig);
    });

    it('should override engine.enabled with THREAT_RULES_ENABLED', () => {
      process.env.THREAT_RULES_ENABLED = 'false';
      const config = loadThreatRulesConfig();
      expect(config.engine.enabled).toBe(false);
    });

    it('should handle THREAT_RULES_ENABLED=true', () => {
      process.env.THREAT_RULES_ENABLED = 'true';
      const config = loadThreatRulesConfig();
      expect(config.engine.enabled).toBe(true);
    });

    it('should override hotReload.enabled with THREAT_RULES_HOT_RELOAD', () => {
      process.env.THREAT_RULES_HOT_RELOAD = 'true';
      const config = loadThreatRulesConfig();
      expect(config.hotReload.enabled).toBe(true);
    });

    it('should handle THREAT_RULES_HOT_RELOAD=false', () => {
      process.env.THREAT_RULES_HOT_RELOAD = 'false';
      const config = loadThreatRulesConfig();
      expect(config.hotReload.enabled).toBe(false);
    });

    it('should override hotReload.intervalMs with THREAT_RULES_RELOAD_INTERVAL', () => {
      process.env.THREAT_RULES_RELOAD_INTERVAL = '30000';
      const config = loadThreatRulesConfig();
      expect(config.hotReload.intervalMs).toBe(30000);
    });

    it('should override bruteForce.enabled with THREAT_RULE_BRUTE_FORCE_ENABLED', () => {
      process.env.THREAT_RULE_BRUTE_FORCE_ENABLED = 'false';
      const config = loadThreatRulesConfig();
      expect(config.defaultRules.bruteForce.enabled).toBe(false);
    });

    it('should handle THREAT_RULE_BRUTE_FORCE_ENABLED=true', () => {
      process.env.THREAT_RULE_BRUTE_FORCE_ENABLED = 'true';
      const config = loadThreatRulesConfig();
      expect(config.defaultRules.bruteForce.enabled).toBe(true);
    });

    it('should override ipHopping.enabled with THREAT_RULE_IP_HOPPING_ENABLED', () => {
      process.env.THREAT_RULE_IP_HOPPING_ENABLED = 'false';
      const config = loadThreatRulesConfig();
      expect(config.defaultRules.ipHopping.enabled).toBe(false);
    });

    it('should handle THREAT_RULE_IP_HOPPING_ENABLED=true', () => {
      process.env.THREAT_RULE_IP_HOPPING_ENABLED = 'true';
      const config = loadThreatRulesConfig();
      expect(config.defaultRules.ipHopping.enabled).toBe(true);
    });

    it('should maintain other config values when overriding specific ones', () => {
      process.env.THREAT_RULES_ENABLED = 'false';
      process.env.THREAT_RULES_HOT_RELOAD = 'true';

      const config = loadThreatRulesConfig();

      expect(config.engine.enabled).toBe(false);
      expect(config.hotReload.enabled).toBe(true);
      expect(config.engine.parallelExecution).toBe(true); // unchanged
      expect(config.engine.maxExecutionTime).toBe(5000); // unchanged
    });

    it('should handle invalid number in THREAT_RULES_RELOAD_INTERVAL', () => {
      process.env.THREAT_RULES_RELOAD_INTERVAL = 'invalid';
      const config = loadThreatRulesConfig();
      expect(config.hotReload.intervalMs).toBeNaN();
    });

    it('should preserve all rule configurations by default', () => {
      const config = loadThreatRulesConfig();

      expect(config.defaultRules.ipHopping).toBeDefined();
      expect(config.defaultRules.geoAnomaly).toBeDefined();
      expect(config.defaultRules.credentialStuffing).toBeDefined();
      expect(config.defaultRules.accountEnumeration).toBeDefined();
      expect(config.defaultRules.sessionHijacking).toBeDefined();
    });

    it('should have correct geoAnomaly configuration', () => {
      const config = loadThreatRulesConfig();
      expect(config.defaultRules.geoAnomaly.config.blockedCountries).toEqual(['KP', 'IR']);
      expect(config.defaultRules.geoAnomaly.config.checkNewCountry).toBe(true);
      expect(config.defaultRules.geoAnomaly.config.userPatternLearning).toBe(true);
      expect(config.defaultRules.geoAnomaly.config.learningPeriodDays).toBe(30);
    });

    it('should have correct credentialStuffing configuration', () => {
      const config = loadThreatRulesConfig();
      expect(config.defaultRules.credentialStuffing.severity).toBe(ThreatSeverity.CRITICAL);
      expect(config.defaultRules.credentialStuffing.config.minUniqueUsers).toBe(5);
      expect(config.defaultRules.credentialStuffing.config.lookbackMinutes).toBe(10);
      expect(config.defaultRules.credentialStuffing.config.maxTimeBetweenAttempts).toBe(2000);
    });

    it('should have correct sessionHijacking configuration', () => {
      const config = loadThreatRulesConfig();
      expect(config.defaultRules.sessionHijacking.severity).toBe(ThreatSeverity.CRITICAL);
      expect(config.defaultRules.sessionHijacking.config.maxSessionIpChanges).toBe(2);
      expect(config.defaultRules.sessionHijacking.config.checkIpChange).toBe(true);
      expect(config.defaultRules.sessionHijacking.config.checkUserAgentChange).toBe(true);
      expect(config.defaultRules.sessionHijacking.config.checkGeoJump).toBe(true);
    });
  });
});
