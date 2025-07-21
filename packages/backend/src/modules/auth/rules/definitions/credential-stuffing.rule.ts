import { RuleContext, RuleEvaluationResult, PatternRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung von Credential Stuffing Angriffen
 *
 * Erkennt Muster, die auf automatisierte Login-Versuche mit gestohlenen Credentials hinweisen:
 * - Viele verschiedene Benutzernamen von derselben IP
 * - Schnelle sequenzielle Login-Versuche
 * - Typische Bot-Muster
 *
 * @class CredentialStuffingRule
 * @implements {PatternRule}
 */
export class CredentialStuffingRule implements PatternRule {
  /**
   * Eindeutige Regel-ID
   * @property {string} id - Eindeutige Identifikation der Regel im System
   */
  id: string;

  /**
   * Name der Regel
   * @property {string} name - Benutzerfreundlicher Name für die Regel
   */
  name: string;

  /**
   * Beschreibung der Regel
   * @property {string} description - Detaillierte Beschreibung der Regel-Funktionalität
   */
  description: string;

  /**
   * Version der Regel
   * @property {string} version - Semantic Versioning für Regel-Updates
   */
  version: string;

  /**
   * Status der Regel
   * @property {RuleStatus} status - ACTIVE, INACTIVE oder DEPRECATED
   */
  status: RuleStatus;

  /**
   * Standard-Schweregrad
   * @property {ThreatSeverity} severity - Basis-Schweregrad für Treffer dieser Regel
   */
  severity: ThreatSeverity;

  /**
   * Typ der Regel-Bedingung
   * @property {ConditionType} conditionType - Klassifizierung des Regel-Typs (PATTERN)
   */
  conditionType: ConditionType;

  /**
   * Konfiguration für Credential Stuffing Erkennung
   * @property {object} config - Anpassbare Parameter der Regel
   */
  config: {
    /**
     * Erkennungsmuster für Credential Stuffing
     * @property {string[]} patterns - Liste der zu erkennenden Angriffsmuster
     */
    patterns: string[];

    /**
     * Art der Muster-Übereinstimmung
     * @property {'any' | 'all'} matchType - 'any' = eines der Muster, 'all' = alle Muster
     */
    matchType: 'any' | 'all';

    /**
     * Zeitfenster für die Analyse in Minuten
     * @property {number} lookbackMinutes - Wie weit zurück in der Geschichte gesucht wird
     */
    lookbackMinutes: number;

    /**
     * Mindestanzahl verschiedener Benutzer für einen Alarm
     * @property {number} minUniqueUsers - Schwellenwert für verdächtige Aktivität
     */
    minUniqueUsers: number;

    /**
     * Maximale Zeit zwischen Versuchen in Millisekunden
     * @property {number} maxTimeBetweenAttempts - Definiert "schnelle" aufeinanderfolgende Versuche
     */
    maxTimeBetweenAttempts: number;

    /**
     * Liste verdächtiger User-Agent Strings
     * @property {string[]} suspiciousUserAgents - User-Agents die auf Bots hinweisen
     */
    suspiciousUserAgents: string[];
  };

  /**
   * Tags zur Kategorisierung der Regel
   * @property {string[]} tags - Schlagwörter für Filterung und Gruppierung
   */
  tags: string[];

  /**
   * Erstellt eine neue Credential Stuffing Regel
   *
   * @param data Konfigurationsdaten für die Regel
   * @example
   * ```typescript
   * const rule = new CredentialStuffingRule({
   *   config: {
   *     minUniqueUsers: 10,
   *     maxTimeBetweenAttempts: 1000
   *   }
   * });
   * ```
   */
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

  /**
   * Evaluiert den Kontext auf Credential Stuffing Angriffe
   *
   * @param context Der Evaluierungskontext mit Ereignisdaten
   * @returns Das Evaluierungsergebnis mit Übereinstimmungsstatus und Details
   * @example
   * ```typescript
   * const result = await rule.evaluate({
   *   ipAddress: '192.168.1.1',
   *   recentEvents: loginEvents
   * });
   * if (result.matched) {
   *   logger.warn('Credential stuffing detected:', result.reason);
   * }
   * ```
   */
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

  /**
   * Validiert die Regelkonfiguration
   *
   * @returns true wenn die Konfiguration gültig ist, false sonst
   */
  validate(): boolean {
    return (
      this.config.lookbackMinutes > 0 &&
      this.config.minUniqueUsers > 0 &&
      this.config.maxTimeBetweenAttempts > 0
    );
  }

  /**
   * Gibt eine Beschreibung der Regel zurück
   *
   * @returns Beschreibung der Regel
   */
  getDescription(): string {
    return `Detects credential stuffing attacks when ${this.config.minUniqueUsers} or more users are attempted from the same IP within ${this.config.lookbackMinutes} minutes`;
  }
}
