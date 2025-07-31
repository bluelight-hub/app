import { Injectable } from '@nestjs/common';
import { PatternRule, RuleContext, RuleEvaluationResult } from '../rule.interface';
import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung schneller IP-Adresswechsel
 *
 * Diese Regel erkennt verdächtige Muster bei IP-Adresswechseln,
 * die auf kompromittierte Accounts oder Session-Hijacking hindeuten könnten.
 *
 * Die Regel überwacht:
 * - Häufige IP-Wechsel innerhalb kurzer Zeit
 * - Ping-Pong-Muster zwischen IP-Adressen
 * - Geografisch unplausible Wechsel
 * - Verdächtige Zugriffsmuster
 *
 * @class RapidIpChangeRule
 * @implements {PatternRule}
 * @injectable
 *
 * @example
 * ```typescript
 * const rule = new RapidIpChangeRule();
 * const result = await rule.evaluate({
 *   eventType: SecurityEventType.LOGIN_SUCCESS,
 *   ipAddress: '192.168.1.100',
 *   userId: 'user123',
 *   timestamp: new Date(),
 *   recentEvents: [...]
 * });
 *
 * if (result.matched) {
 *   logger.warn(`IP-Wechsel erkannt: ${result.reason}`);
 *   // Trigger 2FA oder Session-Invalidierung
 * }
 * ```
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
   *
   * Prüft ob verdächtige IP-Wechsel-Muster vorliegen, die auf
   * einen möglichen Account-Kompromittierung hindeuten.
   *
   * @param {RuleContext} context - Der Evaluierungskontext mit Event-Informationen
   * @returns {Promise<RuleEvaluationResult>} Evaluierungsergebnis mit Match-Status
   *
   * @example
   * ```typescript
   * const result = await rule.evaluate({
   *   eventType: SecurityEventType.LOGIN_SUCCESS,
   *   ipAddress: '203.0.113.5',
   *   userId: 'user123',
   *   timestamp: new Date(),
   *   recentEvents: [
   *     { ipAddress: '192.168.1.1', timestamp: new Date(Date.now() - 60000) },
   *     { ipAddress: '10.0.0.1', timestamp: new Date(Date.now() - 120000) }
   *   ]
   * });
   * ```
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
   *
   * Überprüft ob alle erforderlichen Konfigurationsparameter
   * vorhanden und gültig sind.
   *
   * @returns {boolean} true wenn die Konfiguration gültig ist
   *
   * @example
   * ```typescript
   * if (!rule.validate()) {
   *   throw new Error('Invalid rapid IP change rule configuration');
   * }
   * ```
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
   *
   * Erstellt eine Beschreibung basierend auf der aktuellen Konfiguration.
   *
   * @returns {string} Beschreibung der Regel mit aktuellen Schwellenwerten
   *
   * @example
   * ```typescript
   * logger.info(rule.getDescription());
   * // "Detects when a user accesses from more than 3 different IP addresses within 10 minutes"
   * ```
   */
  getDescription(): string {
    return `Detects when a user accesses from more than ${this.config.thresholds.maxIpChanges} different IP addresses within ${this.config.thresholds.timeWindowMinutes} minutes`;
  }

  /**
   * Prüft ob IP auf Whitelist steht
   *
   * Überprüft ob die IP-Adresse zu bekannten VPN-Providern oder
   * Firmen-IP-Bereichen gehört, die von der Prüfung ausgenommen sind.
   *
   * @private
   * @param {string} ipAddress - Die zu prüfende IP-Adresse
   * @returns {boolean} true wenn die IP auf der Whitelist steht
   *
   * @example
   * ```typescript
   * // VPN-Provider IP
   * const isVpn = this.isWhitelisted('203.0.113.1'); // true
   *
   * // Firmen-IP-Bereich
   * const isCorporate = this.isWhitelisted('10.0.0.5'); // true wenn '10.0.0.' in corporateRanges
   * ```
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
   *
   * Filtert aus den recent Events diejenigen heraus, die zum selben
   * Benutzer gehören und im relevanten Zeitfenster liegen.
   *
   * @private
   * @param {RuleContext} context - Der aktuelle Evaluierungskontext
   * @param {Date} cutoffTime - Zeitpunkt ab dem Events berücksichtigt werden
   * @returns {any[]} Array gefilterter Events des Benutzers
   *
   * @example
   * ```typescript
   * const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 Minuten
   * const userEvents = this.getUserEvents(context, cutoff);
   * // Enthält nur LOGIN_SUCCESS und SESSION_ACTIVITY Events des Users
   * ```
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
   *
   * Untersucht die Sequenz von IP-Adressen auf verdächtige Muster
   * wie zu häufige Wechsel, zu schnelle Wechsel oder Ping-Pong-Verhalten.
   *
   * @private
   * @param {any[]} events - Array historischer Events
   * @param {RuleContext} context - Aktueller Kontext
   * @returns {Object} Analyse-Ergebnis mit folgenden Eigenschaften:
   * @returns {boolean} suspiciousPattern - Ob ein verdächtiges Muster gefunden wurde
   * @returns {string[]} patterns - Liste erkannter Muster ('too_many_ips', 'rapid_changes', 'ping_pong')
   * @returns {number} uniqueIpCount - Anzahl unterschiedlicher IP-Adressen
   * @returns {string[]} uniqueIps - Liste der unterschiedlichen IPs
   * @returns {number} totalChanges - Gesamtzahl der IP-Wechsel
   * @returns {number} recentChanges - Anzahl kürzlicher Wechsel
   * @returns {any[]} rapidChanges - Details zu schnellen Wechseln
   * @returns {number} averageTimeBetweenChanges - Durchschnittliche Zeit zwischen Wechseln
   *
   * @example
   * ```typescript
   * const analysis = this.analyzeIpChanges(events, context);
   * // {
   * //   suspiciousPattern: true,
   * //   patterns: ['rapid_changes', 'ping_pong'],
   * //   uniqueIpCount: 4,
   * //   uniqueIps: ['192.168.1.1', '10.0.0.1', '203.0.113.1', '198.51.100.1'],
   * //   totalChanges: 6,
   * //   recentChanges: 4,
   * //   rapidChanges: [{fromIp: '...', toIp: '...', timeDiffSeconds: 30}],
   * //   averageTimeBetweenChanges: 45
   * // }
   * ```
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
   *
   * Prüft ob ein Benutzer zwischen zwei oder mehr IP-Adressen
   * hin und her wechselt, was auf mehrere gleichzeitige Sessions
   * oder Session-Hijacking hindeuten kann.
   *
   * @private
   * @param {any[]} events - Chronologisch sortierte Events mit IP-Adressen
   * @returns {boolean} true wenn ein Ping-Pong-Muster erkannt wurde
   *
   * @example
   * ```typescript
   * // Ping-Pong zwischen zwei IPs: A -> B -> A -> B
   * const events = [
   *   { ipAddress: '192.168.1.1' },
   *   { ipAddress: '10.0.0.1' },
   *   { ipAddress: '192.168.1.1' },
   *   { ipAddress: '10.0.0.1' }
   * ];
   * const isPingPong = this.detectPingPongPattern(events); // true
   * ```
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
   *
   * Ermittelt die durchschnittliche Zeitspanne zwischen IP-Adresswechseln
   * zur Bewertung der Wechselgeschwindigkeit.
   *
   * @private
   * @param {any[]} changes - Array von IP-Wechsel-Objekten mit timeDiffSeconds
   * @returns {number} Durchschnittliche Zeit in Sekunden zwischen Wechseln
   *
   * @example
   * ```typescript
   * const changes = [
   *   { timeDiffSeconds: 30 },
   *   { timeDiffSeconds: 45 },
   *   { timeDiffSeconds: 60 }
   * ];
   * const avg = this.calculateAverageTimeBetween(changes); // 45
   * ```
   */
  private calculateAverageTimeBetween(changes: any[]): number {
    if (changes.length === 0) return 0;

    const totalTime = changes.reduce((sum, change) => sum + change.timeDiffSeconds, 0);
    return Math.round(totalTime / changes.length);
  }

  /**
   * Berechnet die Schwere basierend auf der Analyse
   *
   * Bestimmt den Schweregrad der Bedrohung anhand der erkannten
   * Muster und deren Kombination. Die Schwere wird eskaliert
   * basierend auf der Anzahl und Art der erkannten Muster.
   *
   * @private
   * @param {any} analysis - Ergebnis der IP-Wechsel-Analyse
   * @returns {ThreatSeverity} Berechneter Schweregrad
   *
   * @example
   * ```typescript
   * // Kritisch bei mehreren Mustern
   * const severity1 = this.calculateSeverity({
   *   patterns: ['rapid_changes', 'ping_pong', 'too_many_ips']
   * }); // ThreatSeverity.CRITICAL
   *
   * // Hoch bei schnellen Wechseln
   * const severity2 = this.calculateSeverity({
   *   patterns: ['rapid_changes'],
   *   uniqueIpCount: 3
   * }); // ThreatSeverity.HIGH
   * ```
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
   *
   * Generiert einen numerischen Score basierend auf verschiedenen
   * Risikofaktoren der IP-Wechsel-Analyse.
   *
   * @private
   * @param {any} analysis - Ergebnis der IP-Wechsel-Analyse
   * @returns {number} Risiko-Score zwischen 0 und 100
   *
   * @example
   * ```typescript
   * const score = this.calculateScore({
   *   uniqueIpCount: 5,
   *   patterns: ['rapid_changes', 'ping_pong'],
   *   rapidChanges: [{}, {}, {}]
   * });
   * // score: 90 (45 + 25 + 20)
   * ```
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
   *
   * Erstellt eine aussagekräftige Beschreibung der erkannten
   * IP-Wechsel-Muster für Logs und Benachrichtigungen.
   *
   * @private
   * @param {any} analysis - Ergebnis der IP-Wechsel-Analyse
   * @returns {string} Menschenlesbare Begründung
   *
   * @example
   * ```typescript
   * const reason = this.generateReason({
   *   uniqueIpCount: 4,
   *   patterns: ['rapid_changes', 'ping_pong'],
   *   rapidChanges: [{}, {}]
   * });
   * // "Detected 4 different IP addresses with 2 rapid changes showing ping-pong pattern within 30 minutes"
   * ```
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
   *
   * Empfiehlt Sicherheitsmaßnahmen basierend auf der Schwere
   * und Art der erkannten IP-Wechsel-Muster.
   *
   * @private
   * @param {any} analysis - Ergebnis der IP-Wechsel-Analyse
   * @returns {string[]} Array empfohlener Sicherheitsaktionen
   *
   * @example
   * ```typescript
   * const actions = this.determineSuggestedActions({
   *   patterns: ['rapid_changes', 'ping_pong'],
   *   uniqueIpCount: 5,
   *   rapidChanges: [{}, {}, {}]
   * });
   * // ['REQUIRE_2FA', 'INVALIDATE_SESSIONS', 'BLOCK_IP', 'INCREASE_MONITORING']
   * ```
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
