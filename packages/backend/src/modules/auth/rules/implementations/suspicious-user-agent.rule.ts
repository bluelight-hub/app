import { Injectable } from '@nestjs/common';
import { PatternRule, RuleContext, RuleEvaluationResult } from '../rule.interface';
import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung verdächtiger User-Agents
 *
 * Diese Regel identifiziert potenzielle Bots, Scraper und andere
 * verdächtige Clients basierend auf User-Agent-Patterns.
 *
 * Features:
 * - Erkennung bekannter Bot- und Scraper-Patterns
 * - Identifikation von Security-Scannern (Nikto, Burp, etc.)
 * - Analyse verdächtiger User-Agent-Charakteristiken
 * - Verhaltensanalyse basierend auf Aktivitätsmuster
 * - Whitelist für erlaubte Bots (Google, Bing, etc.)
 * - Flexible Pattern-Konfiguration und Schwellenwerte
 *
 * @class SuspiciousUserAgentRule
 * @implements {PatternRule}
 * @injectable
 *
 * @example
 * ```typescript
 * const rule = new SuspiciousUserAgentRule();
 * const result = await rule.evaluate({
 *   eventType: SecurityEventType.LOGIN_SUCCESS,
 *   userAgent: 'curl/7.68.0',
 *   userId: 'user123',
 *   timestamp: new Date(),
 *   recentEvents: [...]
 * });
 *
 * if (result.matched) {
 *   logger.warn(`Verdächtiger User-Agent: ${result.reason}`);
 *   // Trigger zusätzliche Sicherheitsmaßnahmen
 * }
 * ```
 */
@Injectable()
export class SuspiciousUserAgentRule implements PatternRule {
  /**
   * Eindeutige Regel-ID
   * @property {string} id - Eindeutige Identifikation für User-Agent-Erkennung
   */
  id = 'suspicious-user-agent-detection';

  /**
   * Name der Regel
   * @property {string} name - Benutzerfreundlicher Name der Regel
   */
  name = 'Suspicious User-Agent Detection';

  /**
   * Beschreibung der Regel
   * @property {string} description - Kurze Beschreibung der Funktionalität
   */
  description = 'Detects bots, scrapers, and other suspicious user agents';

  /**
   * Version der Regel
   * @property {string} version - Semantic Versioning für Regel-Updates
   */
  version = '1.0.0';

  /**
   * Status der Regel
   * @property {RuleStatus} status - ACTIVE, INACTIVE oder DEPRECATED
   */
  status = RuleStatus.ACTIVE;

  /**
   * Standard-Schweregrad der Regel
   * @property {ThreatSeverity} severity - Basis-Schweregrad für Treffer
   */
  severity = ThreatSeverity.MEDIUM;

  /**
   * Typ der Regel-Bedingung
   * @property {ConditionType} conditionType - Klassifizierung als Pattern-basierte Regel
   */
  conditionType = ConditionType.PATTERN;

  /**
   * Tags zur Kategorisierung der Regel
   * @property {string[]} tags - Schlagwörter für Filterung und Gruppierung
   */
  tags = ['user-agent', 'bot-detection', 'authentication'];

  /**
   * Konfiguration der User-Agent-Erkennung
   * @property {object} config - Anpassbare Parameter für Pattern-Matching und Analyse
   */
  config = {
    patterns: [
      // Bekannte Bot-Patterns
      'bot',
      'crawler',
      'spider',
      'scraper',
      'wget',
      'curl',
      'python',
      'java/',
      'perl/',
      'ruby/',
      'go-http-client',
      'okhttp',
      'axios',
      'postman',
      'insomnia',
      'thunder client',
      // Security Scanner
      'nikto',
      'nmap',
      'masscan',
      'nessus',
      'openvas',
      'qualys',
      'burp',
      'zap',
      'sqlmap',
      'havij',
      'acunetix',
      // Headless Browser
      'headless',
      'phantomjs',
      'slimerjs',
      'puppeteer',
      'playwright',
      // Suspicious patterns
      'libwww-perl',
      'lwp-trivial',
      'php/',
      'winhttp',
      'httpunit',
    ],
    matchType: 'any' as const,
    lookbackMinutes: 60,
    caseSensitive: false,
    whitelist: [
      // Erlaubte Bots
      'googlebot',
      'bingbot',
      'slackbot',
      'twitterbot',
      'facebookexternalhit',
      'linkedinbot',
      'whatsapp',
      'telegram',
    ],
    suspiciousCharacteristics: {
      missingUserAgent: true, // Fehlender User-Agent
      tooShort: 10, // User-Agent kürzer als X Zeichen
      tooLong: 500, // User-Agent länger als X Zeichen
      noSpaces: true, // Keine Leerzeichen (unnatürlich)
      invalidFormat: true, // Format entspricht nicht Standard
    },
  };

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   *
   * Analysiert den User-Agent String auf verdächtige Patterns und
   * Charakteristiken. Kombiniert Pattern-Matching mit Verhaltensanalyse
   * zur Identifikation von Bots, Scrapern und Security-Tools.
   *
   * @param {RuleContext} context - Der Evaluierungskontext mit User-Agent-Daten
   * @returns {Promise<RuleEvaluationResult>} Evaluierungsergebnis
   *
   * @example
   * ```typescript
   * // Security Scanner
   * const result = await rule.evaluate({
   *   eventType: SecurityEventType.LOGIN_SUCCESS,
   *   userAgent: 'nikto/2.1.6'
   * });
   * // result.matched: true, severity: CRITICAL
   *
   * // Bot Pattern
   * const result = await rule.evaluate({
   *   userAgent: 'python-requests/2.25.1'
   * });
   * // result.matched: true, severity: MEDIUM
   *
   * // Fehlender User-Agent
   * const result = await rule.evaluate({
   *   userAgent: undefined
   * });
   * // result.matched: true, reason: "Missing user agent"
   * ```
   */
  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // Bei allen Login-bezogenen Events evaluieren
    const relevantEvents = [
      SecurityEventType.LOGIN_SUCCESS,
      SecurityEventType.LOGIN_FAILED,
      SecurityEventType.SESSION_ACTIVITY,
    ];

    if (!relevantEvents.includes(context.eventType)) {
      return { matched: false };
    }

    // Analysiere User-Agent
    const analysis = this.analyzeUserAgent(context.userAgent);

    if (analysis.suspicious) {
      // Prüfe historisches Verhalten
      const behaviorAnalysis = this.analyzeBehavior(context, analysis);

      return {
        matched: true,
        severity: this.calculateSeverity(analysis, behaviorAnalysis),
        score: this.calculateScore(analysis, behaviorAnalysis),
        reason: this.generateReason(analysis),
        evidence: {
          userAgent: context.userAgent || 'Missing',
          suspiciousPatterns: analysis.matchedPatterns,
          characteristics: analysis.characteristics,
          ...behaviorAnalysis,
        },
        suggestedActions: this.determineSuggestedActions(analysis, behaviorAnalysis),
      };
    }

    return { matched: false };
  }

  /**
   * Validiert die Regel-Konfiguration
   *
   * Stellt sicher, dass alle erforderlichen Konfigurationsparameter
   * vorhanden und gültig sind.
   *
   * @returns {boolean} true wenn die Konfiguration gültig ist
   *
   * @example
   * ```typescript
   * if (!rule.validate()) {
   *   throw new Error('Invalid suspicious user agent rule configuration');
   * }
   * ```
   */
  validate(): boolean {
    return (
      Array.isArray(this.config.patterns) &&
      this.config.patterns.length > 0 &&
      ['any', 'all'].includes(this.config.matchType) &&
      this.config.lookbackMinutes > 0
    );
  }

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   *
   * Erstellt eine Beschreibung basierend auf der aktuellen Konfiguration.
   *
   * @returns {string} Beschreibung der Regel
   *
   * @example
   * ```typescript
   * logger.log(rule.getDescription());
   * // "Detects suspicious user agents including bots, scrapers, security scanners, and anomalous patterns"
   * ```
   */
  getDescription(): string {
    return `Detects suspicious user agents including bots, scrapers, security scanners, and anomalous patterns`;
  }

  /**
   * Analysiert den User-Agent auf verdächtige Patterns und Charakteristiken
   *
   * Führt eine umfassende Analyse des User-Agent Strings durch,
   * einschließlich Pattern-Matching, Längenprüfung und Format-Validierung.
   *
   * @private
   * @param {string | undefined} userAgent - Der zu analysierende User-Agent String
   * @returns {Object} Analyse-Ergebnis mit folgenden Eigenschaften:
   * @returns {boolean} suspicious - Ob verdächtige Patterns gefunden wurden
   * @returns {string[]} matchedPatterns - Liste der gefundenen verdächtigen Patterns
   * @returns {string[]} characteristics - Liste verdächtiger Charakteristiken
   * @returns {number} score - Risiko-Score (0-100) basierend auf den Funden
   *
   * @example
   * ```typescript
   * const analysis = this.analyzeUserAgent('curl/7.68.0');
   * // {
   * //   suspicious: true,
   * //   matchedPatterns: ['curl'],
   * //   characteristics: ['no_spaces'],
   * //   score: 40
   * // }
   *
   * const analysis = this.analyzeUserAgent(undefined);
   * // {
   * //   suspicious: true,
   * //   matchedPatterns: [],
   * //   characteristics: ['missing_user_agent'],
   * //   score: 40
   * // }
   * ```
   */
  private analyzeUserAgent(userAgent?: string): any {
    const analysis = {
      suspicious: false,
      matchedPatterns: [] as string[],
      characteristics: [] as string[],
      score: 0,
    };

    // Prüfe auf fehlenden User-Agent
    if (!userAgent && this.config.suspiciousCharacteristics.missingUserAgent) {
      analysis.suspicious = true;
      analysis.characteristics.push('missing_user_agent');
      analysis.score += 40;
      return analysis;
    }

    if (!userAgent) {
      return analysis;
    }

    const lowerUserAgent = this.config.caseSensitive ? userAgent : userAgent.toLowerCase();

    // Prüfe gegen Whitelist
    if (this.isWhitelisted(lowerUserAgent)) {
      return analysis;
    }

    // Prüfe gegen verdächtige Patterns
    for (const pattern of this.config.patterns) {
      const searchPattern = this.config.caseSensitive ? pattern : pattern.toLowerCase();
      if (lowerUserAgent.includes(searchPattern)) {
        analysis.matchedPatterns.push(pattern);
        analysis.suspicious = true;

        // Verschiedene Pattern-Kategorien haben unterschiedliche Scores
        if (this.isSecurityScanner(pattern)) {
          analysis.score += 50;
        } else if (this.isBot(pattern)) {
          analysis.score += 30;
        } else {
          analysis.score += 20;
        }
      }
    }

    // Prüfe Charakteristiken
    if (
      this.config.suspiciousCharacteristics.tooShort &&
      userAgent.length < this.config.suspiciousCharacteristics.tooShort
    ) {
      analysis.characteristics.push('too_short');
      analysis.suspicious = true;
      analysis.score += 15;
    }

    if (
      this.config.suspiciousCharacteristics.tooLong &&
      userAgent.length > this.config.suspiciousCharacteristics.tooLong
    ) {
      analysis.characteristics.push('too_long');
      analysis.suspicious = true;
      analysis.score += 10;
    }

    if (this.config.suspiciousCharacteristics.noSpaces && !userAgent.includes(' ')) {
      analysis.characteristics.push('no_spaces');
      analysis.suspicious = true;
      analysis.score += 20;
    }

    // Prüfe auf valides Browser-Format
    if (
      this.config.suspiciousCharacteristics.invalidFormat &&
      !this.hasValidBrowserFormat(userAgent)
    ) {
      analysis.characteristics.push('invalid_format');
      analysis.suspicious = true;
      analysis.score += 25;
    }

    // Cap score at 100
    analysis.score = Math.min(analysis.score, 100);

    return analysis;
  }

  /**
   * Prüft ob User-Agent auf Whitelist steht
   *
   * Überprüft ob der User-Agent zu einer erlaubten Kategorie gehört
   * (z.B. Google Bot, Bing Bot, soziale Medien Bots).
   *
   * @private
   * @param {string} userAgent - Der zu prüfende User-Agent (bereits lowercase)
   * @returns {boolean} true wenn der User-Agent erlaubt ist
   *
   * @example
   * ```typescript
   * const allowed = this.isWhitelisted('mozilla/5.0 (compatible; googlebot/2.1)');
   * // true - Google Bot ist erlaubt
   *
   * const blocked = this.isWhitelisted('curl/7.68.0');
   * // false - curl ist nicht erlaubt
   * ```
   */
  private isWhitelisted(userAgent: string): boolean {
    return this.config.whitelist.some((allowed) => userAgent.includes(allowed.toLowerCase()));
  }

  /**
   * Prüft ob Pattern ein Security Scanner ist
   *
   * Klassifiziert Patterns als Security-Scanner, die eine höhere
   * Bedrohungsstufe rechtfertigen.
   *
   * @private
   * @param {string} pattern - Das zu prüfende Pattern
   * @returns {boolean} true wenn das Pattern einen Security-Scanner identifiziert
   *
   * @example
   * ```typescript
   * const isScanner = this.isSecurityScanner('nikto'); // true
   * const isBot = this.isSecurityScanner('googlebot'); // false
   * ```
   */
  private isSecurityScanner(pattern: string): boolean {
    const scanners = ['nikto', 'nmap', 'masscan', 'nessus', 'burp', 'zap', 'sqlmap', 'acunetix'];
    return scanners.includes(pattern.toLowerCase());
  }

  /**
   * Prüft ob Pattern ein Bot ist
   *
   * Klassifiziert Patterns als Standard-Bot oder Crawler.
   *
   * @private
   * @param {string} pattern - Das zu prüfende Pattern
   * @returns {boolean} true wenn das Pattern einen Bot identifiziert
   *
   * @example
   * ```typescript
   * const isBot = this.isBot('spider'); // true
   * const isScanner = this.isBot('nikto'); // false
   * ```
   */
  private isBot(pattern: string): boolean {
    const bots = ['bot', 'crawler', 'spider', 'scraper'];
    return bots.includes(pattern.toLowerCase());
  }

  /**
   * Prüft ob User-Agent ein valides Browser-Format hat
   *
   * Überprüft ob der User-Agent den typischen Konventionen echter
   * Browser entspricht (Mozilla, Chrome, Safari, etc.).
   *
   * @private
   * @param {string} userAgent - Der zu prüfende User-Agent String
   * @returns {boolean} true wenn das Format einem echten Browser entspricht
   *
   * @example
   * ```typescript
   * const valid = this.hasValidBrowserFormat(
   *   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
   * ); // true
   *
   * const invalid = this.hasValidBrowserFormat('curl/7.68.0'); // false
   * ```
   */
  private hasValidBrowserFormat(userAgent: string): boolean {
    // Vereinfachte Prüfung - echter Browser hat normalerweise Mozilla, Chrome, Safari, etc.
    const browserPatterns = [
      /Mozilla\/\d+\.\d+/,
      /Chrome\/\d+/,
      /Safari\/\d+/,
      /Firefox\/\d+/,
      /Edge\/\d+/,
      /Opera\/\d+/,
    ];

    return browserPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Analysiert das Verhalten des verdächtigen User-Agents
   *
   * Untersucht historische Aktivitäten mit dem gleichen User-Agent
   * zur Identifikation automatisierter oder böswilliger Aktivitäten.
   *
   * @private
   * @param {RuleContext} context - Der aktuelle Evaluierungskontext
   * @param {any} _userAgentAnalysis - Ergebnis der User-Agent-Analyse (aktuell nicht verwendet)
   * @returns {Object} Verhaltensanalyse mit folgenden Eigenschaften:
   * @returns {number} behaviorScore - Zusätzlicher Score basierend auf Verhalten (0-100)
   * @returns {number} recentActivityCount - Anzahl kürzlicher Events mit gleichem User-Agent
   * @returns {number} failedLoginCount - Anzahl fehlgeschlagener Login-Versuche
   * @returns {number} successfulLoginCount - Anzahl erfolgreicher Logins
   * @returns {number} activityRate - Events pro Minute
   *
   * @example
   * ```typescript
   * const behavior = this.analyzeBehavior(context, analysis);
   * // {
   * //   behaviorScore: 55,
   * //   recentActivityCount: 15,
   * //   failedLoginCount: 12,
   * //   successfulLoginCount: 0,
   * //   activityRate: 3.0
   * // }
   * ```
   */
  private analyzeBehavior(context: RuleContext, _userAgentAnalysis: any): any {
    if (!context.recentEvents) {
      return { behaviorScore: 0 };
    }

    const cutoffTime = new Date(
      context.timestamp.getTime() - this.config.lookbackMinutes * 60 * 1000,
    );

    // Finde alle Events mit gleichem User-Agent
    const sameUaEvents = context.recentEvents.filter((event) => {
      return event.timestamp >= cutoffTime && event.metadata?.userAgent === context.userAgent;
    });

    // Analysiere Verhaltensmuster
    const failedLogins = sameUaEvents.filter(
      (e) => e.eventType === SecurityEventType.LOGIN_FAILED,
    ).length;
    const successfulLogins = sameUaEvents.filter(
      (e) => e.eventType === SecurityEventType.LOGIN_SUCCESS,
    ).length;
    const totalEvents = sameUaEvents.length + 1; // +1 für aktuelles Event

    // Berechne Verhaltens-Score
    let behaviorScore = 0;

    // Viele fehlgeschlagene Logins = verdächtig
    if (failedLogins > 5) {
      behaviorScore += 30;
    }

    // Sehr schnelle Anfragen = automatisiert
    if (totalEvents > 10 && this.config.lookbackMinutes <= 5) {
      behaviorScore += 25;
    }

    // Keine erfolgreichen Logins trotz vieler Versuche
    if (failedLogins > 3 && successfulLogins === 0) {
      behaviorScore += 20;
    }

    return {
      behaviorScore,
      recentActivityCount: totalEvents,
      failedLoginCount: failedLogins,
      successfulLoginCount: successfulLogins,
      activityRate: totalEvents / this.config.lookbackMinutes, // Events pro Minute
    };
  }

  /**
   * Berechnet die Schwere basierend auf der Analyse
   *
   * Bestimmt den Schweregrad der Bedrohung anhand von User-Agent-Patterns
   * und Verhaltensanalyse. Security-Scanner werden als kritisch eingestuft,
   * während normale Bots je nach Verhalten als mittel bis hoch bewertet werden.
   *
   * @private
   * @param {any} userAgentAnalysis - Ergebnis der User-Agent-Analyse
   * @param {any} behaviorAnalysis - Ergebnis der Verhaltensanalyse
   * @returns {ThreatSeverity} Berechneter Schweregrad
   *
   * @example
   * ```typescript
   * // Security Scanner = CRITICAL
   * const severity1 = this.calculateSeverity(
   *   { matchedPatterns: ['nikto'], score: 50 },
   *   { behaviorScore: 20 }
   * ); // ThreatSeverity.CRITICAL
   *
   * // Bot mit hohem Score = HIGH
   * const severity2 = this.calculateSeverity(
   *   { matchedPatterns: ['bot'], score: 30 },
   *   { behaviorScore: 30 }
   * ); // ThreatSeverity.HIGH
   * ```
   */
  private calculateSeverity(userAgentAnalysis: any, behaviorAnalysis: any): ThreatSeverity {
    const totalScore = userAgentAnalysis.score + behaviorAnalysis.behaviorScore;

    // Security Scanner = immer kritisch
    if (userAgentAnalysis.matchedPatterns.some((p: string) => this.isSecurityScanner(p))) {
      return ThreatSeverity.CRITICAL;
    }

    // Bot patterns = mindestens MEDIUM
    if (userAgentAnalysis.matchedPatterns.some((p: string) => this.isBot(p))) {
      if (totalScore > 50) {
        return ThreatSeverity.HIGH;
      }
      return ThreatSeverity.MEDIUM;
    }

    if (totalScore > 80) {
      return ThreatSeverity.HIGH;
    }

    if (totalScore > 50) {
      return ThreatSeverity.MEDIUM;
    }

    return ThreatSeverity.LOW;
  }

  /**
   * Berechnet einen Risiko-Score (0-100)
   *
   * Kombiniert den User-Agent-Analyse-Score mit einem anteiligen
   * Verhaltens-Score zu einem Gesamt-Risiko-Score. Der Verhaltens-Bonus
   * ist auf maximal 30 Punkte begrenzt.
   *
   * @private
   * @param {any} userAgentAnalysis - Ergebnis der User-Agent-Analyse mit Basis-Score
   * @param {any} behaviorAnalysis - Ergebnis der Verhaltensanalyse mit Verhaltens-Score
   * @returns {number} Kombinierter Risiko-Score zwischen 0 und 100
   *
   * @example
   * ```typescript
   * const score = this.calculateScore(
   *   { score: 60 },           // Basis-Score von User-Agent
   *   { behaviorScore: 40 }    // Verhaltens-Score
   * );
   * // score: 80 (60 + min(40 * 0.5, 30))
   * ```
   */
  private calculateScore(userAgentAnalysis: any, behaviorAnalysis: any): number {
    const baseScore = userAgentAnalysis.score;
    const behaviorBonus = Math.min(behaviorAnalysis.behaviorScore * 0.5, 30);

    return Math.min(baseScore + behaviorBonus, 100);
  }

  /**
   * Generiert eine Begründung für die Regel-Auslösung
   *
   * Erstellt eine aussagekräftige Beschreibung der erkannten
   * User-Agent-Probleme für Logs und Benachrichtigungen.
   * Kombiniert gefundene Patterns und Charakteristiken zu einer
   * lesbaren Nachricht.
   *
   * @private
   * @param {any} analysis - Ergebnis der User-Agent-Analyse
   * @returns {string} Menschenlesbare Begründung
   *
   * @example
   * ```typescript
   * const reason = this.generateReason({
   *   matchedPatterns: ['curl', 'python'],
   *   characteristics: ['no_spaces', 'invalid_format']
   * });
   * // "Suspicious user agent patterns detected: curl, python; Characteristics: no_spaces, invalid_format"
   *
   * const reason2 = this.generateReason({
   *   matchedPatterns: [],
   *   characteristics: ['missing_user_agent']
   * });
   * // "Missing user agent"
   * ```
   */
  private generateReason(analysis: any): string {
    const parts = [];

    if (analysis.characteristics.includes('missing_user_agent')) {
      parts.push('Missing user agent');
    } else if (analysis.matchedPatterns.length > 0) {
      parts.push(`Suspicious user agent patterns detected: ${analysis.matchedPatterns.join(', ')}`);
    }

    if (
      analysis.characteristics.length > 0 &&
      !analysis.characteristics.includes('missing_user_agent')
    ) {
      const chars = analysis.characteristics.filter((c) => c !== 'missing_user_agent');
      if (chars.length > 0) {
        parts.push(`Characteristics: ${chars.join(', ')}`);
      }
    }

    return parts.join('; ');
  }

  /**
   * Bestimmt die vorgeschlagenen Aktionen
   *
   * Empfiehlt Sicherheitsmaßnahmen basierend auf der Art der erkannten
   * Bedrohung. Security-Scanner führen zu sofortiger Blockierung,
   * während normale Bots je nach Verhalten unterschiedlich behandelt werden.
   *
   * @private
   * @param {any} userAgentAnalysis - Ergebnis der User-Agent-Analyse
   * @param {any} behaviorAnalysis - Ergebnis der Verhaltensanalyse
   * @returns {string[]} Array empfohlener Sicherheitsaktionen
   *
   * @example
   * ```typescript
   * // Security Scanner = sofortige Blockierung
   * const actions1 = this.determineSuggestedActions(
   *   { matchedPatterns: ['nikto'] },
   *   { failedLoginCount: 1 }
   * );
   * // ['BLOCK_IP', 'INVALIDATE_SESSIONS']
   *
   * // Bot mit vielen Fehlversuchen
   * const actions2 = this.determineSuggestedActions(
   *   { matchedPatterns: ['bot'] },
   *   { failedLoginCount: 6, activityRate: 3 }
   * );
   * // ['BLOCK_IP', 'REQUIRE_2FA']
   * ```
   */
  private determineSuggestedActions(userAgentAnalysis: any, behaviorAnalysis: any): string[] {
    const actions: string[] = [];

    // Security Scanner = sofort blockieren
    if (userAgentAnalysis.matchedPatterns.some((p: string) => this.isSecurityScanner(p))) {
      actions.push('BLOCK_IP', 'INVALIDATE_SESSIONS');
    }
    // Bot mit vielen fehlgeschlagenen Logins
    else if (behaviorAnalysis.failedLoginCount > 5) {
      actions.push('BLOCK_IP');
    }
    // Verdächtiger User-Agent
    else {
      actions.push('INCREASE_MONITORING');

      // Bei hoher Aktivität zusätzliche Maßnahmen
      if (behaviorAnalysis.activityRate > 2) {
        actions.push('REQUIRE_2FA');
      }
    }

    return [...new Set(actions)]; // Duplikate entfernen
  }
}
