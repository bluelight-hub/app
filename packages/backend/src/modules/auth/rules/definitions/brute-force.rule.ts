import {
  RuleContext,
  RuleEvaluationResult,
  ThresholdRule,
  ThreatSeverity,
  RuleStatus,
  ConditionType,
} from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung von Brute-Force-Angriffen
 *
 * Diese Regel erkennt Brute-Force-Angriffe basierend auf:
 * - Anzahl fehlgeschlagener Login-Versuche innerhalb eines Zeitfensters
 * - IP-basierte oder Benutzer-basierte Angriffe
 */
export class BruteForceRule implements ThresholdRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  severity: ThreatSeverity;
  conditionType: ConditionType;
  config: {
    threshold: number;
    timeWindowMinutes: number;
    countField: string;
    checkIpBased: boolean;
    checkUserBased: boolean;
    severityThresholds: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  tags: string[];

  constructor(data: Partial<BruteForceRule>) {
    this.id = data.id || 'brute-force-default';
    this.name = data.name || 'Brute Force Detection';
    this.description =
      data.description || 'Detects brute force attacks based on failed login attempts';
    this.version = data.version || '1.0.0';
    this.status = data.status || RuleStatus.ACTIVE;
    this.severity = data.severity || ThreatSeverity.HIGH;
    this.conditionType = ConditionType.THRESHOLD;
    this.tags = data.tags || ['brute-force', 'authentication', 'login'];

    // Default configuration
    this.config = {
      threshold: 5,
      timeWindowMinutes: 15,
      countField: 'failedAttempts',
      checkIpBased: true,
      checkUserBased: true,
      severityThresholds: {
        low: 3,
        medium: 5,
        high: 10,
        critical: 20,
      },
      ...data.config,
    };
  }

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   */
  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // Only check on failed login events
    if (context.eventType !== SecurityEventType.LOGIN_FAILED) {
      return { matched: false };
    }

    const results: RuleEvaluationResult[] = [];

    // Check IP-based brute force
    if (this.config.checkIpBased && context.ipAddress) {
      const ipResult = await this.checkIpBasedBruteForce(context);
      if (ipResult.matched) {
        results.push(ipResult);
      }
    }

    // Check user-based brute force
    if (this.config.checkUserBased && (context.userId || context.email)) {
      const userResult = await this.checkUserBasedBruteForce(context);
      if (userResult.matched) {
        results.push(userResult);
      }
    }

    // If any check matched, return the most severe result
    if (results.length > 0) {
      const mostSevere = this.getMostSevereResult(results);
      return mostSevere;
    }

    return { matched: false };
  }

  /**
   * Prüft auf IP-basierte Brute-Force-Angriffe
   */
  private async checkIpBasedBruteForce(context: RuleContext): Promise<RuleEvaluationResult> {
    if (!context.recentEvents || !context.ipAddress) {
      return { matched: false };
    }

    const cutoffTime = new Date(Date.now() - this.config.timeWindowMinutes * 60 * 1000);

    // Count failed attempts from this IP
    const failedAttempts = context.recentEvents.filter(
      (event) =>
        event.eventType === SecurityEventType.LOGIN_FAILED &&
        event.ipAddress === context.ipAddress &&
        event.timestamp >= cutoffTime,
    ).length;

    if (failedAttempts >= this.config.threshold) {
      const severity = this.calculateSeverity(failedAttempts);
      const score = Math.min(100, (failedAttempts / this.config.severityThresholds.critical) * 100);

      return {
        matched: true,
        severity,
        score: Math.round(score),
        reason: `IP ${context.ipAddress} has ${failedAttempts} failed login attempts in ${this.config.timeWindowMinutes} minutes`,
        evidence: {
          ipAddress: context.ipAddress,
          failedAttempts,
          timeWindow: this.config.timeWindowMinutes,
          threshold: this.config.threshold,
        },
        suggestedActions: this.getSuggestedActions(severity, 'ip'),
      };
    }

    return { matched: false };
  }

  /**
   * Prüft auf benutzerbasierte Brute-Force-Angriffe
   */
  private async checkUserBasedBruteForce(context: RuleContext): Promise<RuleEvaluationResult> {
    if (!context.recentEvents) {
      return { matched: false };
    }

    const cutoffTime = new Date(Date.now() - this.config.timeWindowMinutes * 60 * 1000);
    const userIdentifier = context.email || context.userId;

    // Count failed attempts for this user from different IPs
    const failedAttempts = context.recentEvents.filter((event) => {
      if (event.eventType !== SecurityEventType.LOGIN_FAILED) return false;
      if (event.timestamp < cutoffTime) return false;

      // Match by email or user ID
      const eventEmail = (event.metadata as any)?.email;
      const eventUserId = (event.metadata as any)?.userId;

      return eventEmail === context.email || eventUserId === context.userId;
    });

    const uniqueIPs = new Set(failedAttempts.map((e) => e.ipAddress).filter(Boolean));
    const attemptCount = failedAttempts.length;

    if (attemptCount >= this.config.threshold) {
      const severity = this.calculateSeverity(attemptCount);
      const score = Math.min(100, (attemptCount / this.config.severityThresholds.critical) * 100);

      // Higher severity if attacks come from multiple IPs
      const adjustedSeverity = uniqueIPs.size > 3 ? this.increaseSeverity(severity) : severity;

      return {
        matched: true,
        severity: adjustedSeverity,
        score: Math.round(score),
        reason: `User ${userIdentifier} has ${attemptCount} failed login attempts from ${uniqueIPs.size} different IPs in ${this.config.timeWindowMinutes} minutes`,
        evidence: {
          user: userIdentifier,
          failedAttempts: attemptCount,
          uniqueIPs: uniqueIPs.size,
          ipAddresses: Array.from(uniqueIPs),
          timeWindow: this.config.timeWindowMinutes,
          threshold: this.config.threshold,
        },
        suggestedActions: this.getSuggestedActions(adjustedSeverity, 'user'),
      };
    }

    return { matched: false };
  }

  /**
   * Berechnet den Schweregrad basierend auf der Anzahl der Versuche
   */
  private calculateSeverity(attemptCount: number): ThreatSeverity {
    const thresholds = this.config.severityThresholds;

    if (attemptCount >= thresholds.critical) return ThreatSeverity.CRITICAL;
    if (attemptCount >= thresholds.high) return ThreatSeverity.HIGH;
    if (attemptCount >= thresholds.medium) return ThreatSeverity.MEDIUM;
    return ThreatSeverity.LOW;
  }

  /**
   * Erhöht den Schweregrad um eine Stufe
   */
  private increaseSeverity(severity: ThreatSeverity): ThreatSeverity {
    switch (severity) {
      case ThreatSeverity.LOW:
        return ThreatSeverity.MEDIUM;
      case ThreatSeverity.MEDIUM:
        return ThreatSeverity.HIGH;
      case ThreatSeverity.HIGH:
      case ThreatSeverity.CRITICAL:
        return ThreatSeverity.CRITICAL;
      default:
        return severity;
    }
  }

  /**
   * Ermittelt das Ergebnis mit dem höchsten Schweregrad
   */
  private getMostSevereResult(results: RuleEvaluationResult[]): RuleEvaluationResult {
    const severityOrder = {
      [ThreatSeverity.LOW]: 1,
      [ThreatSeverity.MEDIUM]: 2,
      [ThreatSeverity.HIGH]: 3,
      [ThreatSeverity.CRITICAL]: 4,
    };

    return results.reduce((mostSevere, current) => {
      const currentSeverity = severityOrder[current.severity || ThreatSeverity.LOW];
      const mostSevereSeverity = severityOrder[mostSevere.severity || ThreatSeverity.LOW];

      return currentSeverity > mostSevereSeverity ? current : mostSevere;
    });
  }

  /**
   * Gibt vorgeschlagene Aktionen basierend auf Schweregrad und Typ zurück
   */
  private getSuggestedActions(severity: ThreatSeverity, type: 'ip' | 'user'): string[] {
    const actions: string[] = [];

    if (type === 'ip') {
      if (severity === ThreatSeverity.CRITICAL) {
        actions.push('BLOCK_IP');
      }
      if (severity >= ThreatSeverity.HIGH) {
        actions.push('INCREASE_MONITORING');
      }
    }

    if (type === 'user') {
      if (severity >= ThreatSeverity.HIGH) {
        actions.push('REQUIRE_2FA');
      }
      if (severity === ThreatSeverity.CRITICAL) {
        actions.push('INVALIDATE_SESSIONS');
      }
    }

    return actions;
  }

  /**
   * Validiert die Regel-Konfiguration
   */
  validate(): boolean {
    return (
      this.config.threshold > 0 &&
      this.config.timeWindowMinutes > 0 &&
      (this.config.checkIpBased || this.config.checkUserBased) &&
      this.config.severityThresholds.low > 0 &&
      this.config.severityThresholds.medium >= this.config.severityThresholds.low &&
      this.config.severityThresholds.high >= this.config.severityThresholds.medium &&
      this.config.severityThresholds.critical >= this.config.severityThresholds.high
    );
  }

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   */
  getDescription(): string {
    const checks = [];
    if (this.config.checkIpBased) checks.push('IP-based');
    if (this.config.checkUserBased) checks.push('user-based');

    return `Detects ${checks.join(' and ')} brute force attacks when more than ${this.config.threshold} failed login attempts occur within ${this.config.timeWindowMinutes} minutes`;
  }
}
