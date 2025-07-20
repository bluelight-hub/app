import { Injectable } from '@nestjs/common';
import { RuleContext, RuleEvaluationResult, PatternRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung schneller IP-Adresswechsel
 *
 * Diese Regel erkennt verdächtige Muster bei IP-Adresswechseln,
 * die auf kompromittierte Accounts oder Session-Hijacking hindeuten könnten.
 */
@Injectable()
export class RapidIpChangeRule implements PatternRule {
  id = 'rapid-ip-change-detection';
  name = 'Rapid IP Change Detection';
  description = 'Detects suspicious patterns of rapid IP address changes';
  version = '1.0.0';
  status = RuleStatus.ACTIVE;
  severity = ThreatSeverity.HIGH;
  conditionType = ConditionType.PATTERN;
  tags = ['ip-change', 'session-security', 'authentication'];

  config = {
    patterns: ['rapid-ip-change', 'distributed-access'],
    matchType: 'any' as const,
    lookbackMinutes: 30,
    thresholds: {
      maxIpChanges: 3, // Maximale Anzahl verschiedener IPs
      timeWindowMinutes: 10, // Zeitfenster für IP-Wechsel
      minTimeBetweenChangesSeconds: 60, // Minimale Zeit zwischen IP-Wechseln
    },
    whitelist: {
      vpnProviders: [], // Bekannte VPN-Provider IPs
      corporateRanges: [], // Firmen IP-Bereiche
    },
  };

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   */
  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // Nur bei erfolgreichen Logins oder aktiven Sessions evaluieren
    if (
      context.eventType !== SecurityEventType.LOGIN_SUCCESS &&
      context.eventType !== SecurityEventType.SESSION_ACTIVITY
    ) {
      return { matched: false };
    }

    // Benötigt IP-Adresse
    if (!context.ipAddress) {
      return { matched: false };
    }

    // Prüfe gegen Whitelist
    if (this.isWhitelisted(context.ipAddress)) {
      return { matched: false };
    }

    const cutoffTime = new Date(
      context.timestamp.getTime() - this.config.lookbackMinutes * 60 * 1000,
    );

    // Sammle alle Events des Benutzers im Zeitfenster
    const userEvents = this.getUserEvents(context, cutoffTime);

    // Analysiere IP-Wechsel
    const ipAnalysis = this.analyzeIpChanges(userEvents, context);

    if (ipAnalysis.suspiciousPattern) {
      return {
        matched: true,
        severity: this.calculateSeverity(ipAnalysis),
        score: this.calculateScore(ipAnalysis),
        reason: this.generateReason(ipAnalysis),
        evidence: {
          ...ipAnalysis,
          currentIp: context.ipAddress,
          timestamp: context.timestamp,
        },
        suggestedActions: this.determineSuggestedActions(ipAnalysis),
      };
    }

    return { matched: false };
  }

  /**
   * Validiert die Regel-Konfiguration
   */
  validate(): boolean {
    return (
      this.config.lookbackMinutes > 0 &&
      this.config.thresholds.maxIpChanges > 0 &&
      this.config.thresholds.timeWindowMinutes > 0 &&
      this.config.thresholds.minTimeBetweenChangesSeconds >= 0 &&
      Array.isArray(this.config.patterns)
    );
  }

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   */
  getDescription(): string {
    return `Detects when a user accesses from more than ${this.config.thresholds.maxIpChanges} different IP addresses within ${this.config.thresholds.timeWindowMinutes} minutes`;
  }

  /**
   * Prüft ob IP auf Whitelist steht
   */
  private isWhitelisted(ipAddress: string): boolean {
    // Vereinfachte Implementierung - in Produktion würde man IP-Bereiche prüfen
    return (
      this.config.whitelist.vpnProviders.includes(ipAddress) ||
      this.config.whitelist.corporateRanges.some((range) => ipAddress.startsWith(range))
    );
  }

  /**
   * Sammelt relevante Benutzer-Events
   */
  private getUserEvents(context: RuleContext, cutoffTime: Date): any[] {
    if (!context.recentEvents || !context.userId) {
      return [];
    }

    return context.recentEvents.filter((event) => {
      return (
        event.timestamp >= cutoffTime &&
        event.metadata?.userId === context.userId &&
        event.ipAddress &&
        (event.eventType === SecurityEventType.LOGIN_SUCCESS ||
          event.eventType === SecurityEventType.SESSION_ACTIVITY)
      );
    });
  }

  /**
   * Analysiert IP-Wechsel-Muster
   */
  private analyzeIpChanges(events: any[], context: RuleContext): any {
    // Füge aktuelles Event hinzu
    const allEvents = [
      ...events,
      {
        timestamp: context.timestamp,
        ipAddress: context.ipAddress,
      },
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (allEvents.length < 2) {
      return { suspiciousPattern: false };
    }

    // Extrahiere IP-Wechsel
    const ipChanges: any[] = [];
    let lastIp = allEvents[0].ipAddress;
    let lastTime = allEvents[0].timestamp;

    for (let i = 1; i < allEvents.length; i++) {
      const event = allEvents[i];
      if (event.ipAddress !== lastIp) {
        const timeDiff = (event.timestamp.getTime() - lastTime.getTime()) / 1000; // Sekunden
        ipChanges.push({
          fromIp: lastIp,
          toIp: event.ipAddress,
          timestamp: event.timestamp,
          timeDiffSeconds: timeDiff,
        });
        lastIp = event.ipAddress;
        lastTime = event.timestamp;
      }
    }

    // Analysiere Muster
    const uniqueIps = new Set(allEvents.map((e) => e.ipAddress));
    const recentWindowStart = new Date(
      context.timestamp.getTime() - this.config.thresholds.timeWindowMinutes * 60 * 1000,
    );
    const recentChanges = ipChanges.filter((change) => change.timestamp >= recentWindowStart);

    // Prüfe auf verdächtige Muster
    const suspiciousPatterns = [];

    // Zu viele verschiedene IPs
    if (uniqueIps.size > this.config.thresholds.maxIpChanges) {
      suspiciousPatterns.push('too_many_ips');
    }

    // Zu schnelle Wechsel
    const rapidChanges = ipChanges.filter(
      (change) => change.timeDiffSeconds < this.config.thresholds.minTimeBetweenChangesSeconds,
    );
    if (rapidChanges.length > 0) {
      suspiciousPatterns.push('rapid_changes');
    }

    // Ping-Pong Muster (wechselt zwischen IPs hin und her)
    const pingPongPattern = this.detectPingPongPattern(allEvents);
    if (pingPongPattern) {
      suspiciousPatterns.push('ping_pong');
    }

    return {
      suspiciousPattern: suspiciousPatterns.length > 0,
      patterns: suspiciousPatterns,
      uniqueIpCount: uniqueIps.size,
      uniqueIps: Array.from(uniqueIps),
      totalChanges: ipChanges.length,
      recentChanges: recentChanges.length,
      rapidChanges: rapidChanges,
      averageTimeBetweenChanges: this.calculateAverageTimeBetween(ipChanges),
    };
  }

  /**
   * Erkennt Ping-Pong-Muster (Wechsel zwischen IPs)
   */
  private detectPingPongPattern(events: any[]): boolean {
    if (events.length < 4) return false;

    const ips = events.map((e) => e.ipAddress);

    // Prüfe ob IPs abwechselnd auftreten
    for (let i = 0; i < ips.length - 3; i++) {
      if (ips[i] === ips[i + 2] && ips[i + 1] === ips[i + 3] && ips[i] !== ips[i + 1]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Berechnet durchschnittliche Zeit zwischen IP-Wechseln
   */
  private calculateAverageTimeBetween(changes: any[]): number {
    if (changes.length === 0) return 0;

    const totalTime = changes.reduce((sum, change) => sum + change.timeDiffSeconds, 0);
    return Math.round(totalTime / changes.length);
  }

  /**
   * Berechnet die Schwere basierend auf der Analyse
   */
  private calculateSeverity(analysis: any): ThreatSeverity {
    // Mehrere verdächtige Muster = kritisch
    if (analysis.patterns.length > 2) {
      return ThreatSeverity.CRITICAL;
    }

    // Sehr schnelle Wechsel oder Ping-Pong = hoch
    if (analysis.patterns.includes('rapid_changes') || analysis.patterns.includes('ping_pong')) {
      return ThreatSeverity.HIGH;
    }

    // Viele IPs = mittel bis hoch
    if (analysis.uniqueIpCount > 5) {
      return ThreatSeverity.HIGH;
    }

    return ThreatSeverity.MEDIUM;
  }

  /**
   * Berechnet einen Risiko-Score (0-100)
   */
  private calculateScore(analysis: any): number {
    let score = 0;

    // Basis-Score für IP-Anzahl
    score += Math.min(analysis.uniqueIpCount * 15, 45);

    // Zusätzliche Punkte für Muster
    if (analysis.patterns.includes('rapid_changes')) {
      score += 25;
    }
    if (analysis.patterns.includes('ping_pong')) {
      score += 20;
    }
    if (analysis.patterns.includes('too_many_ips')) {
      score += 10;
    }

    // Bonus für sehr schnelle Wechsel
    if (analysis.rapidChanges.length > 2) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Generiert eine Begründung für die Regel-Auslösung
   */
  private generateReason(analysis: any): string {
    const parts = [`Detected ${analysis.uniqueIpCount} different IP addresses`];

    if (analysis.patterns.includes('rapid_changes')) {
      parts.push(`with ${analysis.rapidChanges.length} rapid changes`);
    }

    if (analysis.patterns.includes('ping_pong')) {
      parts.push('showing ping-pong pattern');
    }

    parts.push(`within ${this.config.lookbackMinutes} minutes`);

    return parts.join(' ');
  }

  /**
   * Bestimmt die vorgeschlagenen Aktionen
   */
  private determineSuggestedActions(analysis: any): string[] {
    const actions: string[] = [];

    // Immer 2FA bei IP-Wechseln anfordern
    actions.push('REQUIRE_2FA');

    // Bei sehr verdächtigen Mustern
    if (analysis.patterns.length > 1 || analysis.uniqueIpCount > 4) {
      actions.push('INVALIDATE_SESSIONS');
    }

    // Bei extremen Fällen
    if (analysis.patterns.includes('rapid_changes') && analysis.rapidChanges.length > 2) {
      actions.push('BLOCK_IP');
    }

    // Immer Monitoring erhöhen
    actions.push('INCREASE_MONITORING');

    return [...new Set(actions)]; // Duplikate entfernen
  }
}
