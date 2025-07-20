import { Injectable } from '@nestjs/common';
import { RuleContext, RuleEvaluationResult, PatternRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung verdächtiger User-Agents
 *
 * Diese Regel identifiziert potenzielle Bots, Scraper und andere
 * verdächtige Clients basierend auf User-Agent-Patterns.
 */
@Injectable()
export class SuspiciousUserAgentRule implements PatternRule {
  id = 'suspicious-user-agent-detection';
  name = 'Suspicious User-Agent Detection';
  description = 'Detects bots, scrapers, and other suspicious user agents';
  version = '1.0.0';
  status = RuleStatus.ACTIVE;
  severity = ThreatSeverity.MEDIUM;
  conditionType = ConditionType.PATTERN;
  tags = ['user-agent', 'bot-detection', 'authentication'];

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
   */
  getDescription(): string {
    return `Detects suspicious user agents including bots, scrapers, security scanners, and anomalous patterns`;
  }

  /**
   * Analysiert den User-Agent
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
   */
  private isWhitelisted(userAgent: string): boolean {
    return this.config.whitelist.some((allowed) => userAgent.includes(allowed.toLowerCase()));
  }

  /**
   * Prüft ob Pattern ein Security Scanner ist
   */
  private isSecurityScanner(pattern: string): boolean {
    const scanners = ['nikto', 'nmap', 'masscan', 'nessus', 'burp', 'zap', 'sqlmap', 'acunetix'];
    return scanners.includes(pattern.toLowerCase());
  }

  /**
   * Prüft ob Pattern ein Bot ist
   */
  private isBot(pattern: string): boolean {
    const bots = ['bot', 'crawler', 'spider', 'scraper'];
    return bots.includes(pattern.toLowerCase());
  }

  /**
   * Prüft ob User-Agent ein valides Browser-Format hat
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
   */
  private calculateSeverity(userAgentAnalysis: any, behaviorAnalysis: any): ThreatSeverity {
    const totalScore = userAgentAnalysis.score + behaviorAnalysis.behaviorScore;

    // Security Scanner = immer kritisch
    if (userAgentAnalysis.matchedPatterns.some((p: string) => this.isSecurityScanner(p))) {
      return ThreatSeverity.CRITICAL;
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
   */
  private calculateScore(userAgentAnalysis: any, behaviorAnalysis: any): number {
    const baseScore = userAgentAnalysis.score;
    const behaviorBonus = Math.min(behaviorAnalysis.behaviorScore * 0.5, 30);

    return Math.min(baseScore + behaviorBonus, 100);
  }

  /**
   * Generiert eine Begründung für die Regel-Auslösung
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
