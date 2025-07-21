import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SecurityAlert, ThreatSeverity, AlertStatus } from '@prisma/generated/prisma';
import { AlertCorrelationConfig } from '../interfaces/alert-context.interface';
import * as crypto from 'crypto';

/**
 * Service zur Korrelation von Security Alerts
 *
 * Erkennt Muster und Zusammenhänge zwischen verschiedenen Alerts
 * um koordinierte Angriffe oder systemische Probleme zu identifizieren.
 *
 * Features:
 * - Multi-Faktor Korrelation (User, IP, Session, Zeit)
 * - Pattern Detection
 * - Automatische Eskalation
 * - Correlation Scoring
 * - Graph-basierte Analyse
 */
@Injectable()
export class AlertCorrelationService {
  private readonly logger = new Logger(AlertCorrelationService.name);
  private correlationConfig: AlertCorrelationConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.correlationConfig = {
      timeWindow: this.configService.get<number>('ALERT_CORRELATION_WINDOW', 3600000), // 1 hour
      minAlerts: this.configService.get<number>('ALERT_CORRELATION_MIN_ALERTS', 3),
      correlationFields: ['userId', 'ipAddress', 'sessionId'],
      autoEscalate: this.configService.get<boolean>('ALERT_CORRELATION_AUTO_ESCALATE', true),
      escalationThresholds: {
        criticalCount: this.configService.get<number>('ALERT_ESCALATION_CRITICAL_COUNT', 2),
        highCount: this.configService.get<number>('ALERT_ESCALATION_HIGH_COUNT', 3),
        totalCount: this.configService.get<number>('ALERT_ESCALATION_TOTAL_COUNT', 5),
      },
    };
  }

  /**
   * Korreliert einen neuen Alert mit bestehenden Alerts
   *
   * @param alert - Der zu korrelierende Alert
   * @returns Correlation Result mit verwandten Alerts und Aktionen
   */
  async correlateAlert(alert: SecurityAlert): Promise<{
    correlationId: string;
    relatedAlerts: SecurityAlert[];
    correlationScore: number;
    shouldEscalate: boolean;
    escalationReason?: string;
    patterns: string[];
  }> {
    const startTime = Date.now();

    try {
      // Find potentially related alerts
      const relatedAlerts = await this.findRelatedAlerts(alert);

      if (relatedAlerts.length === 0) {
        return {
          correlationId: crypto.randomUUID(),
          relatedAlerts: [],
          correlationScore: 0,
          shouldEscalate: false,
          patterns: [],
        };
      }

      // Generate or reuse correlation ID
      const correlationId = this.getOrGenerateCorrelationId(alert, relatedAlerts);

      // Calculate correlation score
      const correlationScore = this.calculateCorrelationScore(alert, relatedAlerts);

      // Detect patterns
      const patterns = this.detectPatterns(alert, relatedAlerts);

      // Check escalation criteria
      const escalationCheck = this.checkEscalationCriteria(alert, relatedAlerts);

      // Update correlation data
      await this.updateCorrelationData(alert, relatedAlerts, correlationId);

      // Log correlation metrics
      const processingTime = Date.now() - startTime;
      this.logger.debug(`Alert correlation completed in ${processingTime}ms`, {
        alertId: alert.id,
        correlationId,
        relatedCount: relatedAlerts.length,
        score: correlationScore,
      });

      return {
        correlationId,
        relatedAlerts,
        correlationScore,
        shouldEscalate: escalationCheck.shouldEscalate,
        escalationReason: escalationCheck.reason,
        patterns,
      };
    } catch (error) {
      this.logger.error(`Error correlating alert ${alert.id}:`, error);
      throw error;
    }
  }

  /**
   * Findet verwandte Alerts basierend auf verschiedenen Faktoren
   */
  private async findRelatedAlerts(alert: SecurityAlert): Promise<SecurityAlert[]> {
    const cutoffTime = new Date(Date.now() - this.correlationConfig.timeWindow);

    // Build dynamic OR conditions based on available fields
    const orConditions = [];

    if (alert.userId) {
      orConditions.push({ userId: alert.userId });
    }
    if (alert.ipAddress) {
      orConditions.push({ ipAddress: alert.ipAddress });
    }
    if (alert.sessionId) {
      orConditions.push({ sessionId: alert.sessionId });
    }
    if (alert.userEmail) {
      orConditions.push({ userEmail: alert.userEmail });
    }

    // Add pattern-based correlations
    if (alert.ruleId) {
      orConditions.push({ ruleId: alert.ruleId });
    }

    if (orConditions.length === 0) {
      return [];
    }

    const relatedAlerts = await this.prisma.securityAlert.findMany({
      where: {
        AND: [
          {
            OR: orConditions,
          },
          {
            id: { not: alert.id },
            createdAt: { gte: cutoffTime },
            status: {
              notIn: [AlertStatus.RESOLVED, AlertStatus.SUPPRESSED],
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to prevent performance issues
    });

    return relatedAlerts;
  }

  /**
   * Generiert oder verwendet eine bestehende Correlation ID
   */
  private getOrGenerateCorrelationId(alert: SecurityAlert, relatedAlerts: SecurityAlert[]): string {
    // Check if any related alert already has a correlation ID
    const existingCorrelationId = relatedAlerts.find((a) => a.correlationId)?.correlationId;

    if (existingCorrelationId) {
      return existingCorrelationId;
    }

    // Generate new correlation ID
    return crypto.randomUUID();
  }

  /**
   * Berechnet einen Correlation Score basierend auf Ähnlichkeiten
   */
  private calculateCorrelationScore(alert: SecurityAlert, relatedAlerts: SecurityAlert[]): number {
    let score = 0;
    const weights = {
      sameUser: 30,
      sameIp: 25,
      sameSession: 40,
      sameRule: 20,
      sameSeverity: 15,
      timeProximity: 25,
      sameType: 15,
    };

    for (const relatedAlert of relatedAlerts) {
      let alertScore = 0;

      // Same user
      if (alert.userId && alert.userId === relatedAlert.userId) {
        alertScore += weights.sameUser;
      }

      // Same IP
      if (alert.ipAddress && alert.ipAddress === relatedAlert.ipAddress) {
        alertScore += weights.sameIp;
      }

      // Same session
      if (alert.sessionId && alert.sessionId === relatedAlert.sessionId) {
        alertScore += weights.sameSession;
      }

      // Same rule
      if (alert.ruleId && alert.ruleId === relatedAlert.ruleId) {
        alertScore += weights.sameRule;
      }

      // Same severity
      if (alert.severity === relatedAlert.severity) {
        alertScore += weights.sameSeverity;
      }

      // Same type
      if (alert.type === relatedAlert.type) {
        alertScore += weights.sameType;
      }

      // Time proximity (closer = higher score)
      const timeDiff = Math.abs(alert.createdAt.getTime() - relatedAlert.createdAt.getTime());
      const timeScore = Math.max(
        0,
        weights.timeProximity * (1 - timeDiff / this.correlationConfig.timeWindow),
      );
      alertScore += timeScore;

      // Average the score
      score += alertScore / relatedAlerts.length;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Erkennt Muster in korrelierten Alerts
   */
  private detectPatterns(alert: SecurityAlert, relatedAlerts: SecurityAlert[]): string[] {
    const patterns: string[] = [];
    const allAlerts = [alert, ...relatedAlerts];

    // Brute force pattern
    const failedLoginCount = allAlerts.filter(
      (a) => a.type === 'MULTIPLE_FAILED_ATTEMPTS' || a.type === 'BRUTE_FORCE_ATTEMPT',
    ).length;

    if (failedLoginCount >= 3) {
      patterns.push('brute_force_attack');
    }

    // Distributed attack pattern (multiple IPs, same user)
    if (alert.userId) {
      const uniqueIps = new Set(
        allAlerts.filter((a) => a.userId === alert.userId && a.ipAddress).map((a) => a.ipAddress),
      );

      if (uniqueIps.size >= 3) {
        patterns.push('distributed_attack');
      }
    }

    // Rapid fire pattern (many alerts in short time)
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const recentAlerts = allAlerts.filter(
      (a) => Math.abs(a.createdAt.getTime() - alert.createdAt.getTime()) < timeWindow,
    );

    if (recentAlerts.length >= 5) {
      patterns.push('rapid_fire_attack');
    }

    // Account takeover pattern
    const suspiciousLogins = allAlerts.filter(
      (a) => a.type === 'SUSPICIOUS_LOGIN' || a.type === 'ANOMALY_DETECTED',
    ).length;

    if (suspiciousLogins >= 2 && failedLoginCount >= 2) {
      patterns.push('account_takeover_attempt');
    }

    // Credential stuffing pattern
    if (alert.ipAddress) {
      const uniqueUsers = new Set(
        allAlerts.filter((a) => a.ipAddress === alert.ipAddress && a.userId).map((a) => a.userId),
      );

      if (uniqueUsers.size >= 5) {
        patterns.push('credential_stuffing');
      }
    }

    // Policy violation pattern
    const policyViolations = allAlerts.filter((a) => a.type === 'POLICY_VIOLATION').length;

    if (policyViolations >= 3) {
      patterns.push('repeated_policy_violations');
    }

    return patterns;
  }

  /**
   * Prüft Eskalationskriterien
   */
  private checkEscalationCriteria(
    alert: SecurityAlert,
    relatedAlerts: SecurityAlert[],
  ): { shouldEscalate: boolean; reason?: string } {
    if (!this.correlationConfig.autoEscalate) {
      return { shouldEscalate: false };
    }

    const allAlerts = [alert, ...relatedAlerts];
    const thresholds = this.correlationConfig.escalationThresholds;

    // Count by severity
    const criticalCount = allAlerts.filter((a) => a.severity === ThreatSeverity.CRITICAL).length;
    const highCount = allAlerts.filter((a) => a.severity === ThreatSeverity.HIGH).length;

    // Check critical threshold
    if (criticalCount >= thresholds.criticalCount) {
      return {
        shouldEscalate: true,
        reason: `${criticalCount} critical alerts in correlation group`,
      };
    }

    // Check high threshold
    if (highCount >= thresholds.highCount) {
      return {
        shouldEscalate: true,
        reason: `${highCount} high severity alerts in correlation group`,
      };
    }

    // Check total threshold
    if (allAlerts.length >= thresholds.totalCount) {
      return {
        shouldEscalate: true,
        reason: `${allAlerts.length} total alerts in correlation group`,
      };
    }

    // Check for dangerous patterns
    const patterns = this.detectPatterns(alert, relatedAlerts);
    const dangerousPatterns = [
      'account_takeover_attempt',
      'distributed_attack',
      'credential_stuffing',
    ];

    const hasDangerousPattern = patterns.some((p) => dangerousPatterns.includes(p));
    if (hasDangerousPattern) {
      return {
        shouldEscalate: true,
        reason: `Dangerous pattern detected: ${patterns.join(', ')}`,
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Aktualisiert Correlation-Daten in der Datenbank
   */
  private async updateCorrelationData(
    alert: SecurityAlert,
    relatedAlerts: SecurityAlert[],
    correlationId: string,
  ): Promise<void> {
    const allAlertIds = [alert.id, ...relatedAlerts.map((a) => a.id)];

    // Update all alerts with correlation data
    await this.prisma.securityAlert.updateMany({
      where: {
        id: { in: allAlertIds },
      },
      data: {
        correlationId,
        isCorrelated: true,
      },
    });

    // Update correlation arrays
    for (const alertId of allAlertIds) {
      const otherAlertIds = allAlertIds.filter((id) => id !== alertId);

      await this.prisma.securityAlert.update({
        where: { id: alertId },
        data: {
          correlatedAlerts: {
            set: otherAlertIds,
          },
        },
      });
    }
  }

  /**
   * Holt alle Alerts einer Correlation Group
   */
  async getCorrelationGroup(correlationId: string): Promise<SecurityAlert[]> {
    return await this.prisma.securityAlert.findMany({
      where: {
        correlationId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Analysiert eine Correlation Group
   */
  async analyzeCorrelationGroup(correlationId: string): Promise<{
    summary: {
      totalAlerts: number;
      timeSpan: { start: Date; end: Date };
      severityBreakdown: Record<string, number>;
      typeBreakdown: Record<string, number>;
      affectedUsers: string[];
      affectedIPs: string[];
    };
    patterns: string[];
    riskScore: number;
    recommendations: string[];
  }> {
    const alerts = await this.getCorrelationGroup(correlationId);

    if (alerts.length === 0) {
      throw new Error(`No alerts found for correlation ID: ${correlationId}`);
    }

    // Calculate summary
    const summary = {
      totalAlerts: alerts.length,
      timeSpan: {
        start: new Date(Math.min(...alerts.map((a) => a.createdAt.getTime()))),
        end: new Date(Math.max(...alerts.map((a) => a.createdAt.getTime()))),
      },
      severityBreakdown: this.groupBy(alerts, 'severity'),
      typeBreakdown: this.groupBy(alerts, 'type'),
      affectedUsers: [...new Set(alerts.filter((a) => a.userId).map((a) => a.userId!))],
      affectedIPs: [...new Set(alerts.filter((a) => a.ipAddress).map((a) => a.ipAddress!))],
    };

    // Detect patterns
    const patterns = this.detectPatterns(alerts[0], alerts.slice(1));

    // Calculate risk score
    const riskScore = this.calculateGroupRiskScore(alerts, patterns);

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, patterns, riskScore);

    return {
      summary,
      patterns,
      riskScore,
      recommendations,
    };
  }

  /**
   * Berechnet einen Risk Score für eine Correlation Group
   */
  private calculateGroupRiskScore(alerts: SecurityAlert[], patterns: string[]): number {
    let score = 0;

    // Severity scores
    const severityScores = {
      [ThreatSeverity.CRITICAL]: 25,
      [ThreatSeverity.HIGH]: 15,
      [ThreatSeverity.MEDIUM]: 8,
      [ThreatSeverity.LOW]: 3,
    };

    alerts.forEach((alert) => {
      score += severityScores[alert.severity] || 0;
    });

    // Pattern scores
    const patternScores = {
      account_takeover_attempt: 30,
      distributed_attack: 25,
      credential_stuffing: 25,
      brute_force_attack: 20,
      rapid_fire_attack: 15,
      repeated_policy_violations: 10,
    };

    patterns.forEach((pattern) => {
      score += patternScores[pattern] || 5;
    });

    // Time concentration bonus (alerts in short time = higher risk)
    const timeSpan =
      Math.max(...alerts.map((a) => a.createdAt.getTime())) -
      Math.min(...alerts.map((a) => a.createdAt.getTime()));
    const timeConcentration = Math.max(0, 20 - timeSpan / (60 * 1000)); // Bonus for alerts within minutes
    score += timeConcentration;

    return Math.min(100, Math.round(score));
  }

  /**
   * Generiert Empfehlungen basierend auf der Analyse
   */
  private generateRecommendations(summary: any, patterns: string[], riskScore: number): string[] {
    const recommendations: string[] = [];

    // High risk recommendations
    if (riskScore >= 80) {
      recommendations.push('IMMEDIATE ACTION REQUIRED: Initiate incident response procedure');
      recommendations.push('Block affected IP addresses temporarily');
      recommendations.push('Force password reset for affected users');
    }

    // Pattern-based recommendations
    if (patterns.includes('account_takeover_attempt')) {
      recommendations.push('Enable multi-factor authentication for affected accounts');
      recommendations.push('Review recent account activity for unauthorized access');
    }

    if (patterns.includes('distributed_attack')) {
      recommendations.push('Implement geographic-based access restrictions');
      recommendations.push('Consider implementing CAPTCHA for login attempts');
    }

    if (patterns.includes('credential_stuffing')) {
      recommendations.push('Implement rate limiting per IP address');
      recommendations.push('Check user credentials against known breach databases');
    }

    if (patterns.includes('brute_force_attack')) {
      recommendations.push('Implement progressive delays for failed login attempts');
      recommendations.push('Consider implementing account lockout policies');
    }

    // General recommendations based on severity
    if (summary.severityBreakdown[ThreatSeverity.CRITICAL] >= 2) {
      recommendations.push('Escalate to security team immediately');
      recommendations.push('Preserve all logs for forensic analysis');
    }

    if (summary.affectedUsers.length > 10) {
      recommendations.push('Consider system-wide security announcement');
      recommendations.push('Review and update security policies');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Hilfsfunktion zum Gruppieren von Arrays
   */
  private groupBy(alerts: SecurityAlert[], field: keyof SecurityAlert): Record<string, number> {
    return alerts.reduce(
      (acc, alert) => {
        const key = String(alert[field]);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Manuelles Mergen von Correlation Groups
   */
  async mergeCorrelationGroups(
    correlationIds: string[],
  ): Promise<{ newCorrelationId: string; affectedAlerts: number }> {
    if (correlationIds.length < 2) {
      throw new Error('At least 2 correlation IDs required for merge');
    }

    const newCorrelationId = crypto.randomUUID();

    // Update all alerts to new correlation ID
    const result = await this.prisma.securityAlert.updateMany({
      where: {
        correlationId: { in: correlationIds },
      },
      data: {
        correlationId: newCorrelationId,
      },
    });

    // Emit merge event
    this.eventEmitter.emit('correlation.groups.merged', {
      oldCorrelationIds: correlationIds,
      newCorrelationId,
      affectedAlerts: result.count,
      timestamp: new Date(),
    });

    return {
      newCorrelationId,
      affectedAlerts: result.count,
    };
  }
}
