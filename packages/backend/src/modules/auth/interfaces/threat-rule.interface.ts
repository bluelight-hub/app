import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';

/**
 * Interface für Threat Detection Rules
 *
 * Diese Interface definiert die Struktur von Threat Detection Rules,
 * die sowohl für das Seeding als auch für die Verwaltung der Regeln
 * verwendet wird.
 */
export interface ThreatDetectionRuleData {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  severity: ThreatSeverity;
  conditionType: ConditionType;
  config: Record<string, any>;
  tags: string[];
}

/**
 * Extended rule data für dry-run Ergebnisse
 */
export interface ThreatDetectionRuleDataWithAction extends ThreatDetectionRuleData {
  wouldBe?: 'imported' | 'updated' | 'skipped';
}

/**
 * Result type für Threat Rule Seeding Operationen
 */
export interface ThreatRuleSeedResult {
  imported?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  wouldImport?: number;
  wouldUpdate?: number;
  wouldSkip?: number;
  rules?: (ThreatDetectionRuleData | ThreatDetectionRuleDataWithAction)[];
}

/**
 * Options für Threat Rule Seeding
 */
export interface ThreatRuleSeedOptions {
  preset: 'minimal' | 'standard' | 'maximum' | 'development';
  reset?: boolean;
  dryRun?: boolean;
  activate?: boolean;
  skipExisting?: boolean;
}
