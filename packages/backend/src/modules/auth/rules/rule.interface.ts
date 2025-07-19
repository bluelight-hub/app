import { SecurityEventType } from '../enums/security-event-type.enum';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';

/**
 * Kontext für die Regel-Evaluierung
 */
export interface RuleContext {
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  eventType: SecurityEventType;
  metadata?: Record<string, any>;
  // Historische Daten für Musteranalyse
  recentEvents?: Array<{
    eventType: SecurityEventType;
    timestamp: Date;
    ipAddress?: string;
    success?: boolean;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Ergebnis einer Regel-Evaluierung
 */
export interface RuleEvaluationResult {
  matched: boolean;
  severity?: ThreatSeverity;
  score?: number; // 0-100
  reason?: string;
  evidence?: Record<string, any>;
  suggestedActions?: string[];
}

/**
 * Basisinterface für alle Threat Detection Rules
 */
export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  severity: ThreatSeverity;
  conditionType: ConditionType;

  /**
   * Konfiguration der Regel (z.B. Schwellenwerte, Zeitfenster)
   */
  config: Record<string, any>;

  /**
   * Tags zur Kategorisierung
   */
  tags: string[];

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   */
  evaluate(context: RuleContext): Promise<RuleEvaluationResult>;

  /**
   * Validiert die Regel-Konfiguration
   */
  validate(): boolean;

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   */
  getDescription(): string;
}

/**
 * Interface für Regeln, die auf Schwellenwerten basieren
 */
export interface ThresholdRule extends ThreatDetectionRule {
  config: {
    threshold: number;
    timeWindowMinutes: number;
    countField: string;
  };
}

/**
 * Interface für Regeln, die Muster erkennen
 */
export interface PatternRule extends ThreatDetectionRule {
  config: {
    patterns: string[];
    matchType: 'any' | 'all';
    lookbackMinutes: number;
  };
}

/**
 * Interface für zeitbasierte Regeln
 */
export interface TimeBasedRule extends ThreatDetectionRule {
  config: {
    allowedHours?: { start: number; end: number };
    allowedDays?: number[]; // 0-6, 0 = Sonntag
    timezone?: string;
  };
}

/**
 * Interface für geografische Regeln
 */
export interface GeoBasedRule extends ThreatDetectionRule {
  config: {
    allowedCountries?: string[];
    blockedCountries?: string[];
    maxDistanceKm?: number;
    checkVelocity?: boolean;
  };
}

/**
 * Factory-Interface für Regel-Erstellung
 */
export interface RuleFactory {
  createRule(type: string, config: Record<string, any>): ThreatDetectionRule;
}

/**
 * Interface für den Rule Manager
 */
export interface RuleManager {
  loadRules(): Promise<ThreatDetectionRule[]>;
  getRule(id: string): Promise<ThreatDetectionRule | null>;
  addRule(rule: ThreatDetectionRule): Promise<void>;
  updateRule(id: string, rule: Partial<ThreatDetectionRule>): Promise<void>;
  deleteRule(id: string): Promise<void>;
  evaluateRules(context: RuleContext): Promise<RuleEvaluationResult[]>;
}
