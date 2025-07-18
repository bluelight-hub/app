import {
  RuleContext,
  RuleEvaluationResult,
  PatternRule,
  ThreatSeverity,
  RuleStatus,
  ConditionType,
} from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung von Credential Stuffing Angriffen
 *
 * Erkennt Muster, die auf automatisierte Login-Versuche mit gestohlenen Credentials hinweisen:
 * - Viele verschiedene Benutzernamen von derselben IP
 * - Schnelle sequenzielle Login-Versuche
 * - Typische Bot-Muster
 */
export class CredentialStuffingRule implements PatternRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  severity: ThreatSeverity;
  conditionType: ConditionType;
  config: {
    patterns: string[];
    matchType: 'any' | 'all';
    lookbackMinutes: number;
    minUniqueUsers: number;
    maxTimeBetweenAttempts: number;
    suspiciousUserAgents: string[];
  };
  tags: string[];

  constructor(data: Partial<CredentialStuffingRule>) {
    this.id = data.id || 'credential-stuffing-default';
    this.name = data.name || 'Credential Stuffing Detection';
    this.description =
      data.description || 'Detects automated login attempts with stolen credentials';
    this.version = data.version || '1.0.0';
    this.status = data.status || RuleStatus.ACTIVE;
    this.severity = data.severity || ThreatSeverity.CRITICAL;
    this.conditionType = ConditionType.PATTERN;
    this.tags = data.tags || ['credential-stuffing', 'bot', 'authentication'];

    this.config = {
      patterns: ['multiple-users-same-ip', 'rapid-sequential', 'bot-pattern'],
      matchType: 'any',
      lookbackMinutes: 10,
      minUniqueUsers: 5,
      maxTimeBetweenAttempts: 2000, // milliseconds
      suspiciousUserAgents: ['python', 'curl', 'wget', 'scrapy'],
      ...data.config,
    };
  }

  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    if (!context.ipAddress || !context.recentEvents) {
      return { matched: false };
    }

    const cutoffTime = new Date(Date.now() - this.config.lookbackMinutes * 60 * 1000);

    // Get all login attempts from this IP
    const ipAttempts = context.recentEvents
      .filter(
        (event) =>
          event.ipAddress === context.ipAddress &&
          event.timestamp >= cutoffTime &&
          (event.eventType === SecurityEventType.LOGIN_FAILED ||
            event.eventType === SecurityEventType.LOGIN_SUCCESS),
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Check for multiple users from same IP
    const uniqueUsers = new Set<string>();
    ipAttempts.forEach((event) => {
      const email = (event.metadata as any)?.email;
      if (email) uniqueUsers.add(email);
    });

    if (uniqueUsers.size >= this.config.minUniqueUsers) {
      // Check timing patterns
      let rapidSequential = 0;
      for (let i = 1; i < ipAttempts.length; i++) {
        const timeDiff = ipAttempts[i].timestamp.getTime() - ipAttempts[i - 1].timestamp.getTime();
        if (timeDiff < this.config.maxTimeBetweenAttempts) {
          rapidSequential++;
        }
      }

      const score = Math.min(
        100,
        (uniqueUsers.size / 10) * 50 + (rapidSequential / ipAttempts.length) * 50,
      );

      return {
        matched: true,
        severity: ThreatSeverity.CRITICAL,
        score: Math.round(score),
        reason: `Credential stuffing detected: ${uniqueUsers.size} different users attempted from IP ${context.ipAddress}`,
        evidence: {
          ipAddress: context.ipAddress,
          uniqueUsers: uniqueUsers.size,
          totalAttempts: ipAttempts.length,
          rapidSequentialAttempts: rapidSequential,
          usersList: Array.from(uniqueUsers).slice(0, 10), // First 10 users
        },
        suggestedActions: ['BLOCK_IP', 'INCREASE_MONITORING'],
      };
    }

    return { matched: false };
  }

  validate(): boolean {
    return (
      this.config.lookbackMinutes > 0 &&
      this.config.minUniqueUsers > 0 &&
      this.config.maxTimeBetweenAttempts > 0
    );
  }

  getDescription(): string {
    return `Detects credential stuffing attacks when ${this.config.minUniqueUsers} or more users are attempted from the same IP within ${this.config.lookbackMinutes} minutes`;
  }
}
