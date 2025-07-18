import { ThreatSeverity } from '../rules/rule.interface';

/**
 * Konfiguration für das Threat Detection System
 */
export interface ThreatRulesConfig {
  // Engine-Konfiguration
  engine: {
    enabled: boolean;
    parallelExecution: boolean;
    maxExecutionTime: number; // ms
    logDetailedMetrics: boolean;
  };

  // Hot-Reload-Konfiguration
  hotReload: {
    enabled: boolean;
    intervalMs: number;
  };

  // Standard-Regel-Konfigurationen
  defaultRules: {
    bruteForce: {
      enabled: boolean;
      severity: ThreatSeverity;
      config: {
        threshold: number;
        timeWindowMinutes: number;
        checkIpBased: boolean;
        checkUserBased: boolean;
        severityThresholds: {
          low: number;
          medium: number;
          high: number;
          critical: number;
        };
      };
    };

    ipHopping: {
      enabled: boolean;
      severity: ThreatSeverity;
      config: {
        maxIpsThreshold: number;
        suspiciousIpChangeMinutes: number;
        lookbackMinutes: number;
        vpnDetection: boolean;
        geoVelocityCheck: boolean;
        maxVelocityKmPerHour: number;
      };
    };

    geoAnomaly: {
      enabled: boolean;
      severity: ThreatSeverity;
      config: {
        blockedCountries: string[];
        allowedCountries?: string[];
        checkNewCountry: boolean;
        userPatternLearning: boolean;
        learningPeriodDays: number;
      };
    };

    timeAnomaly: {
      enabled: boolean;
      severity: ThreatSeverity;
      config: {
        suspiciousHours: { start: number; end: number };
        allowedHours?: { start: number; end: number };
        allowedDays?: number[];
        checkUserPattern: boolean;
        patternLearningDays: number;
      };
    };

    credentialStuffing: {
      enabled: boolean;
      severity: ThreatSeverity;
      config: {
        minUniqueUsers: number;
        lookbackMinutes: number;
        maxTimeBetweenAttempts: number;
      };
    };

    accountEnumeration: {
      enabled: boolean;
      severity: ThreatSeverity;
      config: {
        minAttempts: number;
        lookbackMinutes: number;
        sequentialThreshold: number;
        similarityThreshold: number;
      };
    };

    sessionHijacking: {
      enabled: boolean;
      severity: ThreatSeverity;
      config: {
        maxSessionIpChanges: number;
        lookbackMinutes: number;
        checkIpChange: boolean;
        checkUserAgentChange: boolean;
        checkGeoJump: boolean;
      };
    };
  };

  // Alert-Konfiguration
  alerts: {
    enabledSeverities: ThreatSeverity[];
    deduplicationWindowMinutes: number;
    maxAlertsPerHour: number;
  };

  // Aktion-Konfiguration
  actions: {
    autoBlock: {
      enabled: boolean;
      severityThreshold: ThreatSeverity;
      blockDurationMinutes: number;
    };
    require2FA: {
      enabled: boolean;
      severityThreshold: ThreatSeverity;
    };
    invalidateSessions: {
      enabled: boolean;
      severityThreshold: ThreatSeverity;
    };
  };
}

/**
 * Standard-Konfiguration für Threat Rules
 */
export const defaultThreatRulesConfig: ThreatRulesConfig = {
  engine: {
    enabled: true,
    parallelExecution: true,
    maxExecutionTime: 5000,
    logDetailedMetrics: false,
  },

  hotReload: {
    enabled: false,
    intervalMs: 60000,
  },

  defaultRules: {
    bruteForce: {
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
    },

    ipHopping: {
      enabled: true,
      severity: ThreatSeverity.HIGH,
      config: {
        maxIpsThreshold: 3,
        suspiciousIpChangeMinutes: 5,
        lookbackMinutes: 30,
        vpnDetection: true,
        geoVelocityCheck: true,
        maxVelocityKmPerHour: 1000,
      },
    },

    geoAnomaly: {
      enabled: true,
      severity: ThreatSeverity.HIGH,
      config: {
        blockedCountries: ['KP', 'IR'],
        checkNewCountry: true,
        userPatternLearning: true,
        learningPeriodDays: 30,
      },
    },

    timeAnomaly: {
      enabled: true,
      severity: ThreatSeverity.MEDIUM,
      config: {
        suspiciousHours: { start: 0, end: 6 },
        checkUserPattern: true,
        patternLearningDays: 30,
      },
    },

    credentialStuffing: {
      enabled: true,
      severity: ThreatSeverity.CRITICAL,
      config: {
        minUniqueUsers: 5,
        lookbackMinutes: 10,
        maxTimeBetweenAttempts: 2000,
      },
    },

    accountEnumeration: {
      enabled: true,
      severity: ThreatSeverity.HIGH,
      config: {
        minAttempts: 5,
        lookbackMinutes: 15,
        sequentialThreshold: 3,
        similarityThreshold: 0.8,
      },
    },

    sessionHijacking: {
      enabled: true,
      severity: ThreatSeverity.CRITICAL,
      config: {
        maxSessionIpChanges: 2,
        lookbackMinutes: 60,
        checkIpChange: true,
        checkUserAgentChange: true,
        checkGeoJump: true,
      },
    },
  },

  alerts: {
    enabledSeverities: [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL],
    deduplicationWindowMinutes: 15,
    maxAlertsPerHour: 100,
  },

  actions: {
    autoBlock: {
      enabled: false,
      severityThreshold: ThreatSeverity.CRITICAL,
      blockDurationMinutes: 60,
    },
    require2FA: {
      enabled: true,
      severityThreshold: ThreatSeverity.HIGH,
    },
    invalidateSessions: {
      enabled: true,
      severityThreshold: ThreatSeverity.CRITICAL,
    },
  },
};

/**
 * Lädt die Threat Rules Konfiguration aus Umgebungsvariablen
 */
export function loadThreatRulesConfig(): ThreatRulesConfig {
  const config = { ...defaultThreatRulesConfig };

  // Override with environment variables if present
  if (process.env.THREAT_RULES_ENABLED !== undefined) {
    config.engine.enabled = process.env.THREAT_RULES_ENABLED === 'true';
  }

  if (process.env.THREAT_RULES_HOT_RELOAD !== undefined) {
    config.hotReload.enabled = process.env.THREAT_RULES_HOT_RELOAD === 'true';
  }

  if (process.env.THREAT_RULES_RELOAD_INTERVAL !== undefined) {
    config.hotReload.intervalMs = parseInt(process.env.THREAT_RULES_RELOAD_INTERVAL);
  }

  // Rule-specific overrides
  if (process.env.THREAT_RULE_BRUTE_FORCE_ENABLED !== undefined) {
    config.defaultRules.bruteForce.enabled = process.env.THREAT_RULE_BRUTE_FORCE_ENABLED === 'true';
  }

  if (process.env.THREAT_RULE_IP_HOPPING_ENABLED !== undefined) {
    config.defaultRules.ipHopping.enabled = process.env.THREAT_RULE_IP_HOPPING_ENABLED === 'true';
  }

  // Add more environment variable overrides as needed...

  return config;
}
