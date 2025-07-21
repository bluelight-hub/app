import { Injectable } from '@nestjs/common';
import { RuleContext, RuleEvaluationResult, ThresholdRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung von Brute-Force-Angriffen
 *
 * Diese Regel überwacht fehlgeschlagene Login-Versuche und erkennt
 * potenzielle Brute-Force-Angriffe basierend auf konfigurierbaren
 * Schwellenwerten. Sie analysiert Angriffsmuster, erkennt verteilte
 * und automatisierte Angriffe und empfiehlt angemessene Gegenmaßnahmen.
 *
 * Features:
 * - Zeitfenster-basierte Erkennung
 * - Verteilte Angriffe (mehrere IPs)
 * - Automatisierte Angriffe (schnelle Versuche)
 * - User-Agent Variationen
 * - Dynamische Schweregrad-Berechnung
 *
 * @class BruteForceRule
 * @implements {ThresholdRule}
 * @injectable
 *
 * @example
 * ```typescript
 * const rule = new BruteForceRule();
 * const result = await rule.evaluate({
 *   eventType: SecurityEventType.LOGIN_FAILED,
 *   ipAddress: '192.168.1.100',
 *   email: 'user@example.com',
 *   recentEvents: [...] // Letzte Security Events
 * });
 *
 * if (result.matched) {
 *   logger.warn(`Brute-Force erkannt: ${result.reason}`);
 *   logger.warn(`Schweregrad: ${result.severity}`);
 *   logger.warn(`Empfohlene Aktionen: ${result.suggestedActions}`);
 * }
 * ```
 */
@Injectable()
export class BruteForceRule implements ThresholdRule {
  /**
   * Eindeutige ID der Regel
   * @property {string} id
   */
  id = 'brute-force-detection';

  /**
   * Anzeigename der Regel
   * @property {string} name
   */
  name = 'Brute Force Detection';

  /**
   * Beschreibung der Regel-Funktionalität
   * @property {string} description
   */
  description = 'Detects potential brute force attacks based on failed login attempts';

  /**
   * Versions-String der Regel
   * @property {string} version
   */
  version = '1.0.0';

  /**
   * Aktivierungsstatus der Regel
   * @property {RuleStatus} status
   */
  status = RuleStatus.ACTIVE;

  /**
   * Standard-Schweregrad bei Regel-Auslösung
   * @property {ThreatSeverity} severity
   */
  severity = ThreatSeverity.HIGH;

  /**
   * Typ der Bedingung (Schwellenwert-basiert)
   * @property {ConditionType} conditionType
   */
  conditionType = ConditionType.THRESHOLD;

  /**
   * Tags zur Kategorisierung der Regel
   * @property {string[]} tags
   */
  tags = ['brute-force', 'authentication', 'login'];

  /**
   * Konfiguration der Brute-Force-Erkennung
   *
   * @property {Object} config
   * @property {number} config.threshold - Anzahl fehlgeschlagener Versuche bis zur Auslösung
   * @property {number} config.timeWindowMinutes - Zeitfenster für die Zählung in Minuten
   * @property {string} config.countField - Feld für die Zählung (für Metriken)
   * @property {boolean} config.includeUserAgentVariations - User-Agent-Wechsel als Indikator
   * @property {boolean} config.checkIpReputation - IP-Reputation prüfen (nicht implementiert)
   */
  config = {
    threshold: 5, // Anzahl fehlgeschlagener Versuche
    timeWindowMinutes: 15, // Zeitfenster in Minuten
    countField: 'failedAttempts',
    includeUserAgentVariations: true, // Verschiedene User-Agents als separaten Angriff werten
    checkIpReputation: false, // Optional: IP-Reputation prüfen
  };

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   *
   * Prüft ob die Anzahl fehlgeschlagener Login-Versuche im definierten
   * Zeitfenster den Schwellenwert überschreitet. Analysiert zusätzlich
   * Angriffsmuster wie verteilte IPs oder automatisierte Versuche.
   *
   * @param {RuleContext} context - Der zu evaluierende Sicherheitskontext
   * @returns {Promise<RuleEvaluationResult>} Ergebnis der Regel-Evaluierung
   *
   * @example
   * ```typescript
   * const result = await rule.evaluate({
   *   eventType: SecurityEventType.LOGIN_FAILED,
   *   ipAddress: '192.168.1.100',
   *   email: 'target@example.com',
   *   timestamp: new Date(),
   *   recentEvents: [
   *     { eventType: SecurityEventType.LOGIN_FAILED, timestamp: new Date(Date.now() - 60000) },
   *     { eventType: SecurityEventType.LOGIN_FAILED, timestamp: new Date(Date.now() - 120000) }
   *   ]
   * });
   * ```
   */
  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // Nur bei Login-Events evaluieren
    if (context.eventType !== SecurityEventType.LOGIN_FAILED) {
      return { matched: false };
    }

    const cutoffTime = new Date(
      context.timestamp.getTime() - this.config.timeWindowMinutes * 60 * 1000,
    );

    // Zähle fehlgeschlagene Login-Versuche im Zeitfenster
    const failedAttempts =
      context.recentEvents?.filter((event) => {
        const isFailedLogin = event.eventType === SecurityEventType.LOGIN_FAILED;
        const isInTimeWindow = event.timestamp >= cutoffTime;
        const isSameTarget = this.isSameTarget(event, context);

        return isFailedLogin && isInTimeWindow && isSameTarget;
      }) || [];

    const attemptCount = failedAttempts.length + 1; // +1 für den aktuellen Versuch

    if (attemptCount >= this.config.threshold) {
      // Analysiere Angriffsmuster
      const attackPattern = this.analyzeAttackPattern(failedAttempts, context);

      return {
        matched: true,
        severity: this.calculateSeverity(attemptCount, attackPattern),
        score: this.calculateScore(attemptCount, attackPattern),
        reason: this.generateReason(attemptCount, attackPattern),
        evidence: {
          attemptCount,
          timeWindowMinutes: this.config.timeWindowMinutes,
          firstAttempt: failedAttempts[0]?.timestamp || context.timestamp,
          lastAttempt: context.timestamp,
          ...attackPattern,
        },
        suggestedActions: this.determineSuggestedActions(attemptCount, attackPattern),
      };
    }

    return { matched: false };
  }

  /**
   * Validiert die Regel-Konfiguration
   *
   * Prüft ob alle erforderlichen Konfigurationsparameter vorhanden
   * und gültig sind.
   *
   * @returns {boolean} true wenn die Konfiguration gültig ist
   *
   * @example
   * ```typescript
   * if (!rule.validate()) {
   *   throw new Error('Invalid rule configuration');
   * }
   * ```
   */
  validate(): boolean {
    return (
      this.config.threshold > 0 &&
      this.config.timeWindowMinutes > 0 &&
      typeof this.config.countField === 'string'
    );
  }

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   *
   * Generiert eine Beschreibung basierend auf der aktuellen Konfiguration,
   * die für Logs oder UI-Anzeige verwendet werden kann.
   *
   * @returns {string} Beschreibung der Regel mit aktuellen Parametern
   *
   * @example
   * ```typescript
   * logger.info(rule.getDescription());
   * // "Triggers when more than 5 failed login attempts occur within 15 minutes"
   * ```
   */
  getDescription(): string {
    return `Triggers when more than ${this.config.threshold} failed login attempts occur within ${this.config.timeWindowMinutes} minutes`;
  }

  /**
   * Prüft ob zwei Events das gleiche Ziel betreffen
   *
   * Vergleicht Events anhand verschiedener Identifikatoren (User-ID, E-Mail, IP)
   * um festzustellen, ob sie sich auf dasselbe Angriffsziel beziehen.
   *
   * @private
   * @param {any} event - Historisches Event aus recentEvents
   * @param {RuleContext} context - Aktueller Kontext
   * @returns {boolean} true wenn beide Events dasselbe Ziel haben
   *
   * @example
   * ```typescript
   * // Vergleich nach User-ID
   * const sameUser = this.isSameTarget(
   *   { metadata: { userId: 'user123' } },
   *   { userId: 'user123' }
   * ); // true
   *
   * // Vergleich nach E-Mail
   * const sameEmail = this.isSameTarget(
   *   { metadata: { email: 'test@example.com' } },
   *   { email: 'test@example.com' }
   * ); // true
   * ```
   */
  private isSameTarget(event: any, context: RuleContext): boolean {
    // Prüfe verschiedene Kombinationen je nach Verfügbarkeit
    if (context.userId && event.metadata?.userId) {
      return context.userId === event.metadata.userId;
    }

    if (context.email && event.metadata?.email) {
      return context.email === event.metadata.email;
    }

    // Falls nur IP verfügbar, verwende diese
    if (context.ipAddress && event.ipAddress) {
      return context.ipAddress === event.ipAddress;
    }

    return false;
  }

  /**
   * Analysiert das Angriffsmuster
   *
   * Extrahiert charakteristische Merkmale des Angriffs wie die Anzahl
   * unterschiedlicher IPs, User-Agents, Zeitabstände zwischen Versuchen
   * und erkennt verteilte oder automatisierte Angriffe.
   *
   * @private
   * @param {any[]} failedAttempts - Array vorheriger fehlgeschlagener Versuche
   * @param {RuleContext} context - Aktueller Kontext
   * @returns {Object} Analyse-Ergebnis mit folgenden Eigenschaften:
   * @returns {number} uniqueIpCount - Anzahl unterschiedlicher IP-Adressen
   * @returns {number} uniqueUserAgentCount - Anzahl unterschiedlicher User-Agents
   * @returns {number} timeSpanMs - Zeitspanne aller Versuche in Millisekunden
   * @returns {number} avgTimeBetweenAttemptsMs - Durchschnittliche Zeit zwischen Versuchen
   * @returns {boolean} isDistributed - Indikator für verteilten Angriff (mehrere IPs)
   * @returns {boolean} isAutomated - Indikator für automatisierten Angriff (<1s zwischen Versuchen)
   *
   * @example
   * ```typescript
   * const pattern = this.analyzeAttackPattern(failedAttempts, context);
   * // {
   * //   uniqueIpCount: 3,
   * //   uniqueUserAgentCount: 1,
   * //   timeSpanMs: 300000,
   * //   avgTimeBetweenAttemptsMs: 500,
   * //   isDistributed: true,
   * //   isAutomated: true
   * // }
   * ```
   */
  private analyzeAttackPattern(failedAttempts: any[], context: RuleContext): any {
    const uniqueIps = new Set(
      [context.ipAddress, ...failedAttempts.map((e) => e.ipAddress)].filter(Boolean),
    );

    const uniqueUserAgents = new Set(
      [context.userAgent, ...failedAttempts.map((e) => e.metadata?.userAgent)].filter(Boolean),
    );

    // Sort attempts by timestamp to get correct time span
    const sortedAttempts = [...failedAttempts].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const timeSpan =
      sortedAttempts.length > 0
        ? context.timestamp.getTime() - sortedAttempts[0].timestamp.getTime()
        : 0;

    const avgTimeBetweenAttempts = sortedAttempts.length > 0 ? timeSpan / sortedAttempts.length : 0;

    return {
      uniqueIpCount: uniqueIps.size,
      uniqueUserAgentCount: uniqueUserAgents.size,
      timeSpanMs: timeSpan,
      avgTimeBetweenAttemptsMs: Math.round(avgTimeBetweenAttempts),
      isDistributed: uniqueIps.size > 1,
      isAutomated: avgTimeBetweenAttempts < 1000, // Weniger als 1 Sekunde zwischen Versuchen
    };
  }

  /**
   * Berechnet die Schwere basierend auf dem Angriffsmuster
   *
   * Bestimmt den Schweregrad des erkannten Angriffs anhand verschiedener
   * Faktoren wie Anzahl der Versuche, Verteilung und Automatisierung.
   *
   * @private
   * @param {number} attemptCount - Anzahl der fehlgeschlagenen Versuche
   * @param {any} pattern - Analysiertes Angriffsmuster
   * @returns {ThreatSeverity} Berechneter Schweregrad
   *
   * @example
   * ```typescript
   * // Kritisch bei verteiltem Angriff
   * const severity1 = this.calculateSeverity(10, { isDistributed: true });
   * // ThreatSeverity.CRITICAL
   *
   * // Hoch bei automatisiertem Angriff
   * const severity2 = this.calculateSeverity(8, { isAutomated: true });
   * // ThreatSeverity.HIGH
   * ```
   */
  private calculateSeverity(attemptCount: number, pattern: any): ThreatSeverity {
    // Kritisch bei verteilten oder automatisierten Angriffen
    if (pattern.isDistributed || attemptCount > 20) {
      return ThreatSeverity.CRITICAL;
    }

    // Hoch bei vielen Versuchen oder Automatisierung
    if (attemptCount > 10 || pattern.isAutomated) {
      return ThreatSeverity.HIGH;
    }

    // Mittel bei moderaten Versuchen
    if (attemptCount >= 7) {
      return ThreatSeverity.MEDIUM;
    }

    // Standard: HIGH (da Regel getriggert wurde)
    return ThreatSeverity.HIGH;
  }

  /**
   * Berechnet einen Risiko-Score (0-100)
   *
   * Ermittelt einen numerischen Score basierend auf verschiedenen
   * Risikofaktoren. Höhere Werte bedeuten höheres Risiko.
   *
   * @private
   * @param {number} attemptCount - Anzahl der fehlgeschlagenen Versuche
   * @param {any} pattern - Analysiertes Angriffsmuster
   * @returns {number} Risiko-Score zwischen 0 und 100
   *
   * @example
   * ```typescript
   * // Hoher Score bei vielen Versuchen und verteiltem Angriff
   * const score = this.calculateScore(15, {
   *   isDistributed: true,
   *   isAutomated: true,
   *   uniqueUserAgentCount: 5
   * });
   * // score: 95
   * ```
   */
  private calculateScore(attemptCount: number, pattern: any): number {
    let score = Math.min(attemptCount * 10, 50); // Basis-Score

    // Zusätzliche Faktoren
    if (pattern.isDistributed) score += 20;
    if (pattern.isAutomated) score += 15;
    if (pattern.uniqueUserAgentCount > 3) score += 10;
    if (attemptCount > 15) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Generiert eine Begründung für die Regel-Auslösung
   *
   * Erstellt eine aussagekräftige Beschreibung des erkannten Angriffs
   * für Logs, Alerts und Benutzeroberflächen.
   *
   * @private
   * @param {number} attemptCount - Anzahl der fehlgeschlagenen Versuche
   * @param {any} pattern - Analysiertes Angriffsmuster
   * @returns {string} Menschenlesbare Begründung
   *
   * @example
   * ```typescript
   * const reason = this.generateReason(10, {
   *   isDistributed: true,
   *   uniqueIpCount: 3,
   *   isAutomated: true
   * });
   * // "10 failed login attempts detected within 15 minutes from 3 different IP addresses with automated pattern characteristics"
   * ```
   */
  private generateReason(attemptCount: number, pattern: any): string {
    const parts = [
      `${attemptCount} failed login attempts detected within ${this.config.timeWindowMinutes} minutes`,
    ];

    if (pattern.isDistributed) {
      parts.push(`from ${pattern.uniqueIpCount} different IP addresses`);
    }

    if (pattern.isAutomated) {
      parts.push('with automated pattern characteristics');
    }

    return parts.join(' ');
  }

  /**
   * Bestimmt die vorgeschlagenen Aktionen
   *
   * Empfiehlt Gegenmaßnahmen basierend auf der Schwere und Art des
   * erkannten Angriffs. Die Aktionen können von der Security-Alert
   * Service verarbeitet werden.
   *
   * @private
   * @param {number} attemptCount - Anzahl der fehlgeschlagenen Versuche
   * @param {any} pattern - Analysiertes Angriffsmuster
   * @returns {string[]} Array empfohlener Aktionen
   *
   * @example
   * ```typescript
   * const actions = this.determineSuggestedActions(20, {
   *   isDistributed: true,
   *   isAutomated: true
   * });
   * // ['BLOCK_IP', 'INVALIDATE_SESSIONS', 'REQUIRE_2FA', 'INCREASE_MONITORING']
   * ```
   */
  private determineSuggestedActions(attemptCount: number, pattern: any): string[] {
    const actions: string[] = [];

    // Immer IP blockieren bei Brute-Force
    actions.push('BLOCK_IP');

    // Bei vielen Versuchen oder verteilten Angriffen
    if (attemptCount > 10 || pattern.isDistributed) {
      actions.push('INVALIDATE_SESSIONS');
    }

    // Bei sehr hohen Versuchen zusätzliche 2FA
    if (attemptCount > 15) {
      actions.push('REQUIRE_2FA');
    }

    // Bei automatisierten Angriffen verstärktes Monitoring
    if (pattern.isAutomated) {
      actions.push('INCREASE_MONITORING');
    }

    return actions;
  }
}
