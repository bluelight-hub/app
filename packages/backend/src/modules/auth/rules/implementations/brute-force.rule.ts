import { Injectable } from '@nestjs/common';
import { RuleContext, RuleEvaluationResult, ThresholdRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung von Brute-Force-Angriffen
 *
 * Diese Regel überwacht fehlgeschlagene Login-Versuche und erkennt
 * potenzielle Brute-Force-Angriffe basierend auf konfigurierbaren
 * Schwellenwerten.
 */
@Injectable()
export class BruteForceRule implements ThresholdRule {
  id = 'brute-force-detection';
  name = 'Brute Force Detection';
  description = 'Detects potential brute force attacks based on failed login attempts';
  version = '1.0.0';
  status = RuleStatus.ACTIVE;
  severity = ThreatSeverity.HIGH;
  conditionType = ConditionType.THRESHOLD;
  tags = ['brute-force', 'authentication', 'login'];

  config = {
    threshold: 5, // Anzahl fehlgeschlagener Versuche
    timeWindowMinutes: 15, // Zeitfenster in Minuten
    countField: 'failedAttempts',
    includeUserAgentVariations: true, // Verschiedene User-Agents als separaten Angriff werten
    checkIpReputation: false, // Optional: IP-Reputation prüfen
  };

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
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
   */
  getDescription(): string {
    return `Triggers when more than ${this.config.threshold} failed login attempts occur within ${this.config.timeWindowMinutes} minutes`;
  }

  /**
   * Prüft ob zwei Events das gleiche Ziel betreffen
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
   */
  private analyzeAttackPattern(failedAttempts: any[], context: RuleContext): any {
    const uniqueIps = new Set(
      [context.ipAddress, ...failedAttempts.map((e) => e.ipAddress)].filter(Boolean),
    );

    const uniqueUserAgents = new Set(
      [context.userAgent, ...failedAttempts.map((e) => e.metadata?.userAgent)].filter(Boolean),
    );

    const timeSpan =
      failedAttempts.length > 0
        ? context.timestamp.getTime() - failedAttempts[0].timestamp.getTime()
        : 0;

    const avgTimeBetweenAttempts = timeSpan / (failedAttempts.length + 1);

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
    if (attemptCount > 7) {
      return ThreatSeverity.MEDIUM;
    }

    // Standard: HIGH (da Regel getriggert wurde)
    return ThreatSeverity.HIGH;
  }

  /**
   * Berechnet einen Risiko-Score (0-100)
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
