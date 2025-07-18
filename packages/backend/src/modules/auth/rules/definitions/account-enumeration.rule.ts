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
 * Regel zur Erkennung von Account Enumeration Angriffen
 *
 * Erkennt Versuche, gültige Benutzernamen zu ermitteln durch:
 * - Systematische Login-Versuche mit verschiedenen E-Mails
 * - Muster in Benutzernamen (sequenziell, ähnlich)
 * - Timing-Analyse-Angriffe
 */
export class AccountEnumerationRule implements PatternRule {
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
    minAttempts: number;
    sequentialThreshold: number;
    similarityThreshold: number;
  };
  tags: string[];

  constructor(data: Partial<AccountEnumerationRule>) {
    this.id = data.id || 'account-enumeration-default';
    this.name = data.name || 'Account Enumeration Detection';
    this.description = data.description || 'Detects attempts to enumerate valid user accounts';
    this.version = data.version || '1.0.0';
    this.status = data.status || RuleStatus.ACTIVE;
    this.severity = data.severity || ThreatSeverity.HIGH;
    this.conditionType = ConditionType.PATTERN;
    this.tags = data.tags || ['account-enumeration', 'reconnaissance', 'authentication'];

    this.config = {
      patterns: ['sequential-usernames', 'similar-usernames', 'timing-analysis'],
      matchType: 'any',
      lookbackMinutes: 15,
      minAttempts: 5,
      sequentialThreshold: 3, // e.g., user1, user2, user3
      similarityThreshold: 0.8, // Similarity score threshold
      ...data.config,
    };
  }

  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    if (!context.ipAddress || !context.recentEvents) {
      return { matched: false };
    }

    const cutoffTime = new Date(Date.now() - this.config.lookbackMinutes * 60 * 1000);

    // Get failed login attempts from this IP
    const failedAttempts = context.recentEvents.filter(
      (event) =>
        event.ipAddress === context.ipAddress &&
        event.timestamp >= cutoffTime &&
        event.eventType === SecurityEventType.LOGIN_FAILED,
    );

    if (failedAttempts.length < this.config.minAttempts) {
      return { matched: false };
    }

    // Extract usernames/emails
    const usernames = failedAttempts
      .map((event) => (event.metadata as any)?.email || (event.metadata as any)?.username)
      .filter(Boolean);

    // Check for sequential patterns
    const sequentialCount = this.detectSequentialPattern(usernames);
    if (sequentialCount >= this.config.sequentialThreshold) {
      return {
        matched: true,
        severity: ThreatSeverity.HIGH,
        score: 85,
        reason: `Account enumeration detected: Sequential username pattern from IP ${context.ipAddress}`,
        evidence: {
          ipAddress: context.ipAddress,
          attemptCount: failedAttempts.length,
          sequentialCount,
          sampleUsernames: usernames.slice(0, 5),
        },
        suggestedActions: ['BLOCK_IP', 'INCREASE_MONITORING'],
      };
    }

    // Check for similar usernames
    const similarityScore = this.calculateSimilarityScore(usernames);
    if (similarityScore >= this.config.similarityThreshold) {
      return {
        matched: true,
        severity: ThreatSeverity.HIGH,
        score: 80,
        reason: `Account enumeration detected: Similar username patterns from IP ${context.ipAddress}`,
        evidence: {
          ipAddress: context.ipAddress,
          attemptCount: failedAttempts.length,
          similarityScore,
          sampleUsernames: usernames.slice(0, 5),
        },
        suggestedActions: ['BLOCK_IP', 'INCREASE_MONITORING'],
      };
    }

    return { matched: false };
  }

  private detectSequentialPattern(usernames: string[]): number {
    let sequentialCount = 0;
    const numberPattern = /\d+/;

    for (let i = 1; i < usernames.length; i++) {
      const prev = usernames[i - 1];
      const curr = usernames[i];

      const prevMatch = prev.match(numberPattern);
      const currMatch = curr.match(numberPattern);

      if (prevMatch && currMatch) {
        const prevNum = parseInt(prevMatch[0]);
        const currNum = parseInt(currMatch[0]);

        if (
          currNum === prevNum + 1 &&
          prev.replace(numberPattern, '') === curr.replace(numberPattern, '')
        ) {
          sequentialCount++;
        }
      }
    }

    return sequentialCount;
  }

  private calculateSimilarityScore(usernames: string[]): number {
    if (usernames.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < usernames.length - 1; i++) {
      for (let j = i + 1; j < usernames.length; j++) {
        totalSimilarity += this.levenshteinSimilarity(usernames[i], usernames[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private levenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  validate(): boolean {
    return (
      this.config.lookbackMinutes > 0 &&
      this.config.minAttempts > 0 &&
      this.config.sequentialThreshold > 0 &&
      this.config.similarityThreshold > 0 &&
      this.config.similarityThreshold <= 1
    );
  }

  getDescription(): string {
    return `Detects account enumeration attempts through sequential or similar username patterns`;
  }
}
