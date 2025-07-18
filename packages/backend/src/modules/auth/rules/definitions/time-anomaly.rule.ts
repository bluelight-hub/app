import {
  RuleContext,
  RuleEvaluationResult,
  TimeBasedRule,
  ThreatSeverity,
  RuleStatus,
  ConditionType,
} from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung zeitbasierter Anomalien
 *
 * Diese Regel erkennt:
 * - Logins zu ungewöhnlichen Zeiten
 * - Logins außerhalb der Geschäftszeiten
 * - Abweichungen vom normalen Benutzermuster
 */
export class TimeAnomalyRule implements TimeBasedRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  severity: ThreatSeverity;
  conditionType: ConditionType;
  config: {
    allowedHours?: { start: number; end: number };
    allowedDays?: number[];
    timezone?: string;
    checkUserPattern: boolean;
    patternLearningDays: number;
    suspiciousHours: { start: number; end: number };
  };
  tags: string[];

  constructor(data: Partial<TimeAnomalyRule>) {
    this.id = data.id || 'time-anomaly-default';
    this.name = data.name || 'Time-based Anomaly Detection';
    this.description =
      data.description || 'Detects logins at unusual times or outside business hours';
    this.version = data.version || '1.0.0';
    this.status = data.status || RuleStatus.ACTIVE;
    this.severity = data.severity || ThreatSeverity.MEDIUM;
    this.conditionType = ConditionType.TIME_BASED;
    this.tags = data.tags || ['time-anomaly', 'business-hours', 'authentication'];

    this.config = {
      allowedHours: undefined, // If set, only these hours are allowed
      allowedDays: undefined, // 0-6, where 0 is Sunday
      timezone: 'Europe/Berlin',
      checkUserPattern: true,
      patternLearningDays: 30,
      suspiciousHours: { start: 0, end: 6 }, // 00:00 - 06:00
      ...data.config,
    };
  }

  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    if (context.eventType !== SecurityEventType.LOGIN_SUCCESS) {
      return { matched: false };
    }

    const loginTime = new Date(context.timestamp);
    const hour = loginTime.getHours();
    const day = loginTime.getDay();

    // Check if outside allowed hours
    if (this.config.allowedHours) {
      const { start, end } = this.config.allowedHours;
      const isOutsideHours =
        end >= start ? hour < start || hour >= end : hour < start && hour >= end;

      if (isOutsideHours) {
        return {
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 80,
          reason: `Login outside allowed hours (${start}:00-${end}:00)`,
          evidence: { hour, allowedHours: this.config.allowedHours },
          suggestedActions: ['REQUIRE_2FA', 'INCREASE_MONITORING'],
        };
      }
    }

    // Check if outside allowed days
    if (this.config.allowedDays && !this.config.allowedDays.includes(day)) {
      return {
        matched: true,
        severity: ThreatSeverity.MEDIUM,
        score: 70,
        reason: `Login on non-business day`,
        evidence: { day, allowedDays: this.config.allowedDays },
        suggestedActions: ['REQUIRE_2FA'],
      };
    }

    // Check suspicious hours
    const { start: suspStart, end: suspEnd } = this.config.suspiciousHours;
    const isSuspiciousHour =
      suspEnd >= suspStart
        ? hour >= suspStart && hour < suspEnd
        : hour >= suspStart || hour < suspEnd;

    if (isSuspiciousHour) {
      // Check if this is normal for the user
      if (this.config.checkUserPattern && context.userId && context.recentEvents) {
        const isNormalForUser = await this.checkUserTimePattern(context, hour);
        if (!isNormalForUser) {
          return {
            matched: true,
            severity: ThreatSeverity.MEDIUM,
            score: 60,
            reason: `Login at unusual hour for this user: ${hour}:00`,
            evidence: {
              hour,
              suspiciousHours: this.config.suspiciousHours,
              userId: context.userId,
            },
            suggestedActions: ['REQUIRE_2FA'],
          };
        }
      } else {
        // No user pattern check, flag as suspicious
        return {
          matched: true,
          severity: ThreatSeverity.LOW,
          score: 50,
          reason: `Login during suspicious hours (${hour}:00)`,
          evidence: { hour, suspiciousHours: this.config.suspiciousHours },
          suggestedActions: ['INCREASE_MONITORING'],
        };
      }
    }

    return { matched: false };
  }

  private async checkUserTimePattern(context: RuleContext, currentHour: number): Promise<boolean> {
    const learningCutoff = new Date(
      Date.now() - this.config.patternLearningDays * 24 * 60 * 60 * 1000,
    );

    const userHours = new Set<number>();
    context.recentEvents?.forEach((event) => {
      if (
        event.timestamp >= learningCutoff &&
        event.eventType === SecurityEventType.LOGIN_SUCCESS
      ) {
        userHours.add(new Date(event.timestamp).getHours());
      }
    });

    // If user has logged in at this hour before, it's normal
    return userHours.has(currentHour);
  }

  validate(): boolean {
    return (
      this.config.patternLearningDays > 0 &&
      this.config.suspiciousHours.start >= 0 &&
      this.config.suspiciousHours.start <= 23 &&
      this.config.suspiciousHours.end >= 0 &&
      this.config.suspiciousHours.end <= 23
    );
  }

  getDescription(): string {
    return `Detects time-based anomalies including logins outside business hours and unusual login times for users`;
  }
}
