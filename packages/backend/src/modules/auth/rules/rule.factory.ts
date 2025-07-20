import { Injectable, Logger } from '@nestjs/common';
import { ThreatDetectionRule, RuleFactory } from './rule.interface';
import {
  BruteForceRule,
  GeoAnomalyRule,
  TimeAnomalyRule,
  RapidIpChangeRule,
  SuspiciousUserAgentRule,
} from './implementations';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';

/**
 * Factory für die Erstellung von Threat Detection Rules
 *
 * Diese Factory erstellt Regel-Instanzen basierend auf Typ und Konfiguration,
 * wie sie in der Datenbank gespeichert sind.
 */
@Injectable()
export class ThreatRuleFactory implements RuleFactory {
  private readonly logger = new Logger(ThreatRuleFactory.name);

  /**
   * Map von Regel-IDs zu Regel-Klassen
   */
  private readonly ruleClassMap = new Map<string, new () => ThreatDetectionRule>([
    ['brute-force-detection', BruteForceRule],
    ['geo-anomaly-detection', GeoAnomalyRule],
    ['time-anomaly-detection', TimeAnomalyRule],
    ['rapid-ip-change-detection', RapidIpChangeRule],
    ['suspicious-user-agent-detection', SuspiciousUserAgentRule],
  ]);

  /**
   * Erstellt eine Regel-Instanz basierend auf Typ und Konfiguration
   */
  createRule(type: string, config: Record<string, any>): ThreatDetectionRule {
    const RuleClass = this.ruleClassMap.get(type);

    if (!RuleClass) {
      throw new Error(`Unknown rule type: ${type}`);
    }

    const rule = new RuleClass();

    // Überschreibe Default-Konfiguration mit Datenbank-Konfiguration
    if (config.id) rule.id = config.id;
    if (config.name) rule.name = config.name;
    if (config.description) rule.description = config.description;
    if (config.version) rule.version = config.version;
    if (config.status) rule.status = config.status as RuleStatus;
    if (config.severity) rule.severity = config.severity as ThreatSeverity;
    if (config.conditionType) rule.conditionType = config.conditionType as ConditionType;
    if (config.tags) rule.tags = config.tags;
    if (config.config) {
      // Merge config to preserve defaults
      rule.config = { ...rule.config, ...config.config };
    }

    // Validiere die Regel
    if (!rule.validate()) {
      throw new Error(`Invalid rule configuration for ${type}: ${JSON.stringify(config)}`);
    }

    this.logger.debug(`Created rule instance: ${rule.name} (${rule.id})`);
    return rule;
  }

  /**
   * Erstellt eine Regel-Instanz aus einem Datenbank-Eintrag
   */
  createFromDatabase(dbRule: any): ThreatDetectionRule {
    const config = {
      id: dbRule.id,
      name: dbRule.name,
      description: dbRule.description,
      version: dbRule.version,
      status: dbRule.status,
      severity: dbRule.severity,
      conditionType: dbRule.conditionType,
      tags: dbRule.tags || [],
      config: dbRule.config || {},
    };

    // Verwende die ID als Typ für die Factory
    return this.createRule(dbRule.id, config);
  }

  /**
   * Gibt alle verfügbaren Regel-Typen zurück
   */
  getAvailableRuleTypes(): string[] {
    return Array.from(this.ruleClassMap.keys());
  }

  /**
   * Prüft ob ein Regel-Typ unterstützt wird
   */
  isRuleTypeSupported(type: string): boolean {
    return this.ruleClassMap.has(type);
  }

  /**
   * Erstellt eine Default-Instanz einer Regel
   */
  createDefaultRule(type: string): ThreatDetectionRule {
    const RuleClass = this.ruleClassMap.get(type);

    if (!RuleClass) {
      throw new Error(`Unknown rule type: ${type}`);
    }

    return new RuleClass();
  }

  /**
   * Konvertiert eine Regel-Instanz in ein Datenbank-kompatibles Format
   */
  toDatabaseFormat(rule: ThreatDetectionRule): any {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      version: rule.version,
      status: rule.status,
      severity: rule.severity,
      conditionType: rule.conditionType,
      tags: rule.tags,
      config: rule.config,
    };
  }

  /**
   * Validiert eine Regel-Konfiguration ohne Instanz zu erstellen
   */
  validateConfig(type: string, config: Record<string, any>): { valid: boolean; errors?: string[] } {
    try {
      const rule = this.createRule(type, config);
      return { valid: rule.validate() };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }
}
