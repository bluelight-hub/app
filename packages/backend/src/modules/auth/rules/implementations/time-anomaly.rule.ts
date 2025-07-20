import { Injectable } from '@nestjs/common';
import { RuleContext, RuleEvaluationResult, TimeBasedRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung zeitbasierter Anomalien
 *
 * Diese Regel erkennt Login-Versuche außerhalb normaler Geschäftszeiten
 * oder zu ungewöhnlichen Zeiten für den jeweiligen Benutzer.
 */
@Injectable()
export class TimeAnomalyRule implements TimeBasedRule {
  id = 'time-anomaly-detection';
  name = 'Time-Based Anomaly Detection';
  description = 'Detects login attempts during unusual hours or outside business hours';
  version = '1.0.0';
  status = RuleStatus.ACTIVE;
  severity = ThreatSeverity.MEDIUM;
  conditionType = ConditionType.TIME_BASED;
  tags = ['time-based', 'business-hours', 'authentication'];

  config = {
    allowedHours: { start: 6, end: 22 }, // 6:00 - 22:00
    allowedDays: [1, 2, 3, 4, 5], // Montag bis Freitag (0 = Sonntag)
    timezone: 'Europe/Berlin',
    checkUserPattern: true, // Prüfe gegen normales Benutzerverhalten
    patternLookbackDays: 30, // Tage für Musteranalyse
    deviationThreshold: 2, // Stunden Abweichung vom normalen Muster
  };

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   */
  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // Nur bei erfolgreichen Logins evaluieren
    if (context.eventType !== SecurityEventType.LOGIN_SUCCESS) {
      return { matched: false };
    }

    const loginTime = this.getLocalTime(context.timestamp);
    const violations: string[] = [];
    let score = 0;

    // Prüfe Geschäftszeiten
    const businessHoursCheck = this.checkBusinessHours(loginTime);
    if (businessHoursCheck.violated) {
      violations.push(businessHoursCheck.reason);
      score += businessHoursCheck.score;
    }

    // Prüfe gegen Benutzermuster
    if (this.config.checkUserPattern && context.userId && context.recentEvents) {
      const patternCheck = this.checkUserPattern(loginTime, context);
      if (patternCheck.violated) {
        violations.push(patternCheck.reason);
        score += patternCheck.score;
      }
    }

    if (violations.length > 0) {
      return {
        matched: true,
        severity: this.calculateSeverity(score, violations),
        score: Math.min(score, 100),
        reason: violations.join('; '),
        evidence: {
          loginTime: loginTime.toISOString(),
          hour: loginTime.getHours(),
          dayOfWeek: loginTime.getDay(),
          isWeekend: [0, 6].includes(loginTime.getDay()),
          isAfterHours: !this.isWithinBusinessHours(loginTime),
          violations: violations,
        },
        suggestedActions: this.determineSuggestedActions(score, violations),
      };
    }

    return { matched: false };
  }

  /**
   * Validiert die Regel-Konfiguration
   */
  validate(): boolean {
    return (
      this.config.allowedHours.start >= 0 &&
      this.config.allowedHours.start <= 23 &&
      this.config.allowedHours.end >= 0 &&
      this.config.allowedHours.end <= 23 &&
      this.config.allowedHours.start < this.config.allowedHours.end &&
      Array.isArray(this.config.allowedDays) &&
      this.config.allowedDays.every((d) => d >= 0 && d <= 6)
    );
  }

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   */
  getDescription(): string {
    const days = this.config.allowedDays.map((d) => this.getDayName(d)).join(', ');
    return `Detects logins outside business hours (${this.config.allowedHours.start}:00-${this.config.allowedHours.end}:00) or on non-business days (allowed: ${days})`;
  }

  /**
   * Konvertiert Zeitstempel in lokale Zeit
   */
  private getLocalTime(timestamp: Date): Date {
    // In Produktion würde man eine richtige Timezone-Library verwenden
    // Hier vereinfachte Implementierung
    return new Date(timestamp);
  }

  /**
   * Prüft gegen Geschäftszeiten
   */
  private checkBusinessHours(loginTime: Date): any {
    const hour = loginTime.getHours();
    const dayOfWeek = loginTime.getDay();

    const violations: string[] = [];
    let score = 0;

    // Prüfe Tageszeit
    if (hour < this.config.allowedHours.start || hour >= this.config.allowedHours.end) {
      const severity = this.getTimeViolationSeverity(hour);
      violations.push(`Login outside allowed hours (${hour}:00)`);
      score += severity.score;
    }

    // Prüfe Wochentag
    if (!this.config.allowedDays.includes(dayOfWeek)) {
      violations.push(`Login on non-business day (${this.getDayName(dayOfWeek)})`);
      score += 30;
    }

    return {
      violated: violations.length > 0,
      reason: violations.join(', '),
      score: score,
    };
  }

  /**
   * Prüft gegen normales Benutzermuster
   */
  private checkUserPattern(loginTime: Date, context: RuleContext): any {
    const cutoffDate = new Date(
      context.timestamp.getTime() - this.config.patternLookbackDays * 24 * 60 * 60 * 1000,
    );

    // Sammle erfolgreiche Logins des Benutzers
    const userLogins =
      context.recentEvents?.filter((event) => {
        return (
          event.eventType === SecurityEventType.LOGIN_SUCCESS &&
          event.timestamp >= cutoffDate &&
          event.metadata?.userId === context.userId
        );
      }) || [];

    if (userLogins.length < 5) {
      // Zu wenige Daten für Musteranalyse
      return { violated: false };
    }

    // Analysiere typische Login-Zeiten
    const loginHours = userLogins.map((login) => new Date(login.timestamp).getHours());
    const avgHour = loginHours.reduce((a, b) => a + b, 0) / loginHours.length;
    const currentHour = loginTime.getHours();

    // Berechne Abweichung
    const deviation = Math.abs(currentHour - avgHour);

    if (deviation > this.config.deviationThreshold) {
      return {
        violated: true,
        reason: `Login time deviates significantly from user pattern (${Math.round(deviation)}h deviation from average)`,
        score: Math.min(deviation * 10, 50),
      };
    }

    return { violated: false };
  }

  /**
   * Berechnet Schweregrad für Zeitverletzungen
   */
  private getTimeViolationSeverity(hour: number): any {
    // Nachts (0-5 Uhr) ist verdächtiger
    if (hour >= 0 && hour < 5) {
      return { severity: 'high', score: 40 };
    }

    // Früh morgens oder spät abends
    if (hour < this.config.allowedHours.start || hour >= this.config.allowedHours.end) {
      return { severity: 'medium', score: 25 };
    }

    return { severity: 'low', score: 10 };
  }

  /**
   * Prüft ob Zeit innerhalb der Geschäftszeiten liegt
   */
  private isWithinBusinessHours(time: Date): boolean {
    const hour = time.getHours();
    const dayOfWeek = time.getDay();

    return (
      hour >= this.config.allowedHours.start &&
      hour < this.config.allowedHours.end &&
      this.config.allowedDays.includes(dayOfWeek)
    );
  }

  /**
   * Konvertiert Wochentag-Nummer zu Name
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }

  /**
   * Berechnet die Schwere basierend auf Verletzungen
   */
  private calculateSeverity(score: number, violations: string[]): ThreatSeverity {
    // Nacht-Logins sind kritischer
    if (
      violations.some(
        (v) => v.includes('0:00') || v.includes('1:00') || v.includes('2:00') || v.includes('3:00'),
      )
    ) {
      return ThreatSeverity.HIGH;
    }

    if (score > 60) {
      return ThreatSeverity.HIGH;
    }

    if (score > 40) {
      return ThreatSeverity.MEDIUM;
    }

    return ThreatSeverity.LOW;
  }

  /**
   * Bestimmt die vorgeschlagenen Aktionen
   */
  private determineSuggestedActions(score: number, violations: string[]): string[] {
    const actions: string[] = [];

    // Bei Nacht-Logins immer 2FA
    if (violations.some((v) => v.includes('outside allowed hours'))) {
      actions.push('REQUIRE_2FA');
    }

    // Bei hohem Score verstärktes Monitoring
    if (score > 50) {
      actions.push('INCREASE_MONITORING');
    }

    // Bei extremen Abweichungen Session überprüfen
    if (score > 70) {
      actions.push('INVALIDATE_SESSIONS');
    }

    return actions;
  }
}
