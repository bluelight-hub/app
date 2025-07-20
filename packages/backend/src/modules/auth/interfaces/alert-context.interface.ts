import { ThreatSeverity, AlertPriority, AlertStatus } from '@prisma/generated/prisma/enums';
import { ThreatDetectionRule, RuleEvaluationResult, RuleContext } from '../rules/rule.interface';

/**
 * Context für Security Alert Generation
 */
export interface SecurityAlertContext {
  // Source Information
  sourceRule?: ThreatDetectionRule;
  sourceEventId?: string;
  ruleEvaluationResult: RuleEvaluationResult;
  ruleContext: RuleContext;

  // Alert Metadata
  alertType: string;
  severity: ThreatSeverity;
  priority?: AlertPriority;
  title: string;
  description: string;

  // Additional Context
  evidence: Record<string, any>;
  suggestedActions?: string[];
  correlationKey?: string; // For grouping related alerts
  timeToLive?: number; // Auto-dismiss after X minutes
}

/**
 * Alert Fingerprint Components für Deduplication
 */
export interface AlertFingerprintComponents {
  alertType: string;
  userId?: string;
  ipAddress?: string;
  ruleId?: string;
  timeWindow?: number; // in minutes
  customKeys?: string[]; // Additional keys for fingerprinting
}

/**
 * Alert Correlation Config
 */
export interface AlertCorrelationConfig {
  correlationWindow: number; // in minutes
  correlationKeys: string[]; // Fields to match for correlation
  maxChildAlerts: number;
  aggregationStrategy: 'count' | 'time' | 'severity';
}

/**
 * Alert Processing Result
 */
export interface AlertProcessingResult {
  alertId: string;
  isNew: boolean;
  isDuplicate: boolean;
  isCorrelated: boolean;
  parentAlertId?: string;
  notificationsSent: boolean;
  error?: string;
}

/**
 * Alert Query Options
 */
export interface AlertQueryOptions {
  status?: AlertStatus[];
  severity?: ThreatSeverity[];
  priority?: AlertPriority[];
  alertTypes?: string[];
  userId?: string;
  ipAddress?: string;
  correlationId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeResolved?: boolean;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'severity' | 'priority';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Alert Statistics
 */
export interface AlertStatistics {
  total: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<ThreatSeverity, number>;
  byPriority: Record<AlertPriority, number>;
  byAlertType: Record<string, number>;
  averageResponseTime?: number;
  averageResolutionTime?: number;
}

/**
 * Alert Notification Config
 */
export interface AlertNotificationConfig {
  channels: string[];
  severityThreshold?: ThreatSeverity;
  priorityThreshold?: AlertPriority;
  includeEvidence?: boolean;
  customTemplate?: string;
  escalationRules?: {
    timeThreshold: number; // minutes
    escalateTo: string[];
  }[];
}
