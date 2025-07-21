import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';
import type { ThreatDetectionRuleData } from '../interfaces/threat-rule.interface';

/**
 * Standard Threat Detection Rules für das initiale Seeding
 *
 * Diese Regeln bieten eine Basis-Sicherheit für die Anwendung
 * und können über die API oder UI angepasst werden.
 */
export const DefaultThreatRules: ThreatDetectionRuleData[] = [
  {
    id: 'brute-force-detection',
    name: 'Brute Force Detection',
    description: 'Detects potential brute force attacks based on failed login attempts',
    version: '1.0.0',
    status: RuleStatus.ACTIVE,
    severity: ThreatSeverity.HIGH,
    conditionType: ConditionType.THRESHOLD,
    config: {
      threshold: 5,
      timeWindowMinutes: 15,
      countField: 'failedAttempts',
      includeUserAgentVariations: true,
      checkIpReputation: false,
    },
    tags: ['brute-force', 'authentication', 'login', 'security'],
  },
  {
    id: 'geo-anomaly-detection',
    name: 'Geographic Anomaly Detection',
    description: 'Detects impossible travel speeds and suspicious geographic patterns',
    version: '1.0.0',
    status: RuleStatus.ACTIVE,
    severity: ThreatSeverity.CRITICAL,
    conditionType: ConditionType.GEO_BASED,
    config: {
      maxDistanceKm: 1000,
      checkVelocity: true,
      maxVelocityKmh: 1000,
      timeWindowMinutes: 60,
      allowedCountries: [], // Empty = all allowed
      blockedCountries: ['KP'], // North Korea
      suspiciousCountries: ['KP', 'IR', 'SY'],
    },
    tags: ['geo-location', 'travel-speed', 'authentication', 'security'],
  },
  {
    id: 'rapid-ip-change-detection',
    name: 'Rapid IP Change Detection',
    description: 'Detects suspicious patterns of rapid IP address changes',
    version: '1.0.0',
    status: RuleStatus.ACTIVE,
    severity: ThreatSeverity.HIGH,
    conditionType: ConditionType.PATTERN,
    config: {
      patterns: ['rapid-ip-change', 'distributed-access'],
      matchType: 'any',
      lookbackMinutes: 30,
      thresholds: {
        maxIpChanges: 3,
        timeWindowMinutes: 10,
        minTimeBetweenChangesSeconds: 60,
      },
      whitelist: {
        vpnProviders: [],
        corporateRanges: [],
      },
    },
    tags: ['ip-change', 'session-security', 'authentication', 'security'],
  },
  {
    id: 'suspicious-user-agent-detection',
    name: 'Suspicious User-Agent Detection',
    description: 'Detects bots, scrapers, and other suspicious user agents',
    version: '1.0.0',
    status: RuleStatus.ACTIVE,
    severity: ThreatSeverity.MEDIUM,
    conditionType: ConditionType.PATTERN,
    config: {
      patterns: [
        'bot',
        'crawler',
        'spider',
        'scraper',
        'wget',
        'curl',
        'python',
        'java/',
        'perl/',
        'ruby/',
        'go-http-client',
        'okhttp',
        'axios',
        'postman',
        'insomnia',
        'thunder client',
        'nikto',
        'nmap',
        'masscan',
        'nessus',
        'openvas',
        'qualys',
        'burp',
        'zap',
        'sqlmap',
        'havij',
        'acunetix',
        'headless',
        'phantomjs',
        'slimerjs',
        'puppeteer',
        'playwright',
        'libwww-perl',
        'lwp-trivial',
        'php/',
        'winhttp',
        'httpunit',
      ],
      matchType: 'any',
      lookbackMinutes: 60,
      caseSensitive: false,
      whitelist: [
        'googlebot',
        'bingbot',
        'slackbot',
        'twitterbot',
        'facebookexternalhit',
        'linkedinbot',
        'whatsapp',
        'telegram',
      ],
      suspiciousCharacteristics: {
        missingUserAgent: true,
        tooShort: 10,
        tooLong: 500,
        noSpaces: true,
        invalidFormat: true,
      },
    },
    tags: ['user-agent', 'bot-detection', 'authentication', 'security'],
  },
];

/**
 * Regel-Presets für verschiedene Sicherheitsstufen
 */
export const RulePresets = {
  /**
   * Minimale Sicherheit - nur kritische Regeln
   */
  minimal: ['brute-force-detection', 'geo-anomaly-detection'],

  /**
   * Standard Sicherheit - empfohlene Konfiguration
   */
  standard: [
    'brute-force-detection',
    'geo-anomaly-detection',
    'rapid-ip-change-detection',
    'suspicious-user-agent-detection',
  ],

  /**
   * Maximale Sicherheit - alle Regeln aktiv
   */
  maximum: [
    'brute-force-detection',
    'geo-anomaly-detection',
    'rapid-ip-change-detection',
    'suspicious-user-agent-detection',
  ],

  /**
   * Entwicklungs-Modus - nur nicht-störende Regeln
   */
  development: ['brute-force-detection', 'suspicious-user-agent-detection'],
};

/**
 * Gibt die Standard-Regeln für ein bestimmtes Preset zurück
 */
export function getRulesForPreset(preset: keyof typeof RulePresets): ThreatDetectionRuleData[] {
  const ruleIds = RulePresets[preset] || RulePresets.standard;
  return DefaultThreatRules.filter((rule) => ruleIds.includes(rule.id));
}

/**
 * Gibt alle verfügbaren Regel-IDs zurück
 */
export function getAllRuleIds(): string[] {
  return DefaultThreatRules.map((rule) => rule.id);
}

/**
 * Gibt eine spezifische Regel zurück
 */
export function getDefaultRule(ruleId: string): ThreatDetectionRuleData | undefined {
  return DefaultThreatRules.find((rule) => rule.id === ruleId);
}
