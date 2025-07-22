import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { RuleEngineService } from '../rules/rule-engine.service';
import { SecurityAlertServiceV2 } from './security-alert-v2.service';
import { ConfigService } from '@nestjs/config';
import { AlertStatus, AlertType, ThreatSeverity, SecurityAlert } from '@prisma/generated/prisma';
import { RuleContext, RuleEvaluationResult } from '../rules/rule.interface';
import { SecurityEventType } from '../constants/auth.constants';
import {
  AlertProcessingResult,
  SecurityAlertContext,
  AlertStatistics,
  AlertQueryOptions,
} from '../interfaces/alert-context.interface';
import { AlertDeduplicationService } from './alert-deduplication.service';
import { AlertCorrelationService } from './alert-correlation.service';
import { AlertDispatcherService } from './alert-dispatcher.service';
import { AlertQueueService } from './alert-queue.service';

/**
 * Zentrale Engine für die Verarbeitung von Sicherheitswarnungen
 *
 * Diese Engine koordiniert die gesamte Alert-Pipeline:
 * - Empfang von Security Events
 * - Evaluierung gegen Threat Detection Rules
 * - Generierung von strukturierten Alerts
 * - Deduplizierung und Korrelation
 * - Dispatch über multiple Channels
 * - Persistierung und Lifecycle Management
 *
 * @class SecurityAlertEngineService
 * @implements {OnModuleInit}
 */
@Injectable()
export class SecurityAlertEngineService implements OnModuleInit {
  private readonly logger = new Logger(SecurityAlertEngineService.name);
  private processingMetrics = {
    eventsProcessed: 0,
    alertsGenerated: 0,
    alertsSuppressed: 0,
    alertsDispatched: 0,
    processingErrors: 0,
    averageProcessingTime: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: RuleEngineService,
    private readonly alertService: SecurityAlertServiceV2,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly deduplicationService: AlertDeduplicationService,
    private readonly correlationService: AlertCorrelationService,
    private readonly dispatcherService: AlertDispatcherService,
    private readonly queueService: AlertQueueService,
  ) {}

  async onModuleInit() {
    this.logger.log('Security Alert Engine initialized');
  }

  /**
   * Haupteinstiegspunkt für Security Events
   *
   * Verarbeitet eingehende Security Events durch die komplette Alert-Pipeline
   */
  @OnEvent('security.event.*', { async: true })
  async handleSecurityEvent(event: {
    type: SecurityEventType;
    userId?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.processingMetrics.eventsProcessed++;

      // Build rule context from event
      const context: RuleContext = {
        userId: event.userId,
        email: event.email,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        eventType: event.type,
        metadata: event.metadata || {},
      };

      // Evaluate against threat detection rules
      const ruleResults = await this.ruleEngine.evaluateRules(context);

      if (ruleResults.length === 0) {
        this.logger.debug(`No rules matched for event ${event.type}`);
        return;
      }

      // Process rule matches and generate alerts
      const alerts = await this.processRuleMatches(ruleResults, context);

      // Process each alert through the pipeline
      for (const alert of alerts) {
        await this.processAlert(alert);
      }

      // Update processing metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(processingTime);
    } catch (error) {
      this.processingMetrics.processingErrors++;
      this.logger.error(`Error processing security event: ${error.message}`, error.stack);

      // Emit failure event for monitoring
      this.eventEmitter.emit('alert.processing.failed', {
        event,
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Verarbeitet Rule-Matches und generiert strukturierte Alerts
   */
  private async processRuleMatches(
    results: RuleEvaluationResult[],
    context: RuleContext,
  ): Promise<Partial<SecurityAlert>[]> {
    const alerts: Partial<SecurityAlert>[] = [];

    for (const result of results) {
      if (!result.matched) continue;

      const alert: Partial<SecurityAlert> = {
        type: this.mapToAlertType(context.eventType, result),
        severity: result.severity || ThreatSeverity.MEDIUM,
        title: this.generateAlertTitle(result, context),
        description: result.reason || 'Security threat detected',
        fingerprint: this.deduplicationService.generateFingerprint({
          type: context.eventType,
          userId: context.userId,
          ipAddress: context.ipAddress,
          ruleId: result.ruleId,
        }),
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        eventType: context.eventType,
        userId: context.userId,
        userEmail: context.email,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        score: result.score,
        evidence: result.evidence || {},
        context: {
          metadata: context.metadata,
          suggestedActions: result.suggestedActions,
        },
        tags: this.generateAlertTags(result, context),
      };

      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Verarbeitet einen einzelnen Alert durch die Pipeline
   */
  private async processAlert(alertData: Partial<SecurityAlert>): Promise<AlertProcessingResult> {
    try {
      // Check for deduplication
      const isDuplicate = await this.deduplicationService.checkDuplicate(alertData.fingerprint!);

      if (isDuplicate) {
        // Get existing alert info and update
        const existingInfo = await this.deduplicationService.getAlertInfo(alertData.fingerprint!);
        if (existingInfo) {
          await this.updateDuplicateAlert(existingInfo.alertId, alertData);
          this.processingMetrics.alertsSuppressed++;

          return {
            alertId: existingInfo.alertId,
            status: 'deduplicated',
            isDuplicate: true,
          };
        }
      }

      // Create new alert
      const alert = await this.createAlert(alertData);
      this.processingMetrics.alertsGenerated++;

      // Register with deduplication service
      await this.deduplicationService.registerAlert(alert.fingerprint, {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        userId: alert.userId,
        ipAddress: alert.ipAddress,
      });

      // Correlate alert
      const correlationResult = await this.correlationService.correlateAlert(alert);

      // Check if correlation triggered escalation
      if (correlationResult.shouldEscalate) {
        await this.escalateAlert(alert, correlationResult.escalationReason!);
      }

      // Queue alert for dispatch
      if (await this.shouldDispatch(alert)) {
        await this.queueService.queueAlert(alert);
        this.processingMetrics.alertsDispatched++;
        this.logger.log(`Alert ${alert.id} queued for dispatch`);
      }

      // Emit success event
      this.eventEmitter.emit('alert.created', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        correlationId: correlationResult.correlationId,
        timestamp: new Date(),
      });

      return {
        alertId: alert.id,
        status: 'created',
        isDuplicate: false,
      };
    } catch (error) {
      this.logger.error(`Error processing alert: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Aktualisiert einen duplizierten Alert
   */
  private async updateDuplicateAlert(
    existingAlertId: string,
    newAlertData: Partial<SecurityAlert>,
  ): Promise<void> {
    const existingAlert = await this.prisma.securityAlert.findUnique({
      where: { id: existingAlertId },
    });

    if (!existingAlert) return;

    await this.prisma.securityAlert.update({
      where: { id: existingAlertId },
      data: {
        occurrenceCount: {
          increment: 1,
        },
        lastSeen: new Date(),
        score: Math.max(existingAlert.score || 0, newAlertData.score || 0),
        evidence: {
          ...((existingAlert.evidence as any) || {}),
          ...((newAlertData.evidence as any) || {}),
          occurrences: ((existingAlert.evidence as any)?.occurrences || []).concat([
            {
              timestamp: new Date(),
              context: newAlertData.context,
            },
          ]),
        },
      },
    });

    // Update deduplication service
    await this.deduplicationService.updateOccurrence(existingAlert.fingerprint);
  }

  /**
   * Erstellt einen neuen Alert in der Datenbank
   */
  private async createAlert(alertData: Partial<SecurityAlert>): Promise<SecurityAlert> {
    return await this.prisma.securityAlert.create({
      data: {
        type: alertData.type!,
        severity: alertData.severity!,
        title: alertData.title!,
        description: alertData.description!,
        fingerprint: alertData.fingerprint!,
        status: AlertStatus.PENDING,
        ruleId: alertData.ruleId,
        ruleName: alertData.ruleName,
        eventType: alertData.eventType,
        userId: alertData.userId,
        userEmail: alertData.userEmail,
        sessionId: alertData.sessionId,
        ipAddress: alertData.ipAddress,
        userAgent: alertData.userAgent,
        location: alertData.location,
        score: alertData.score,
        evidence: alertData.evidence || {},
        context: alertData.context || {},
        tags: alertData.tags || [],
        firstSeen: new Date(),
        lastSeen: new Date(),
        occurrenceCount: 1,
      },
    });
  }

  /**
   * Eskaliert einen Alert
   */
  private async escalateAlert(alert: SecurityAlert, reason: string): Promise<void> {
    const newSeverity =
      alert.severity === ThreatSeverity.CRITICAL
        ? ThreatSeverity.CRITICAL
        : this.increaseSeverity(alert.severity);

    await this.prisma.securityAlert.update({
      where: { id: alert.id },
      data: {
        severity: newSeverity,
        description: `${alert.description}\n\nESCALATED: ${reason}`,
        tags: {
          push: 'escalated',
        },
      },
    });

    // Emit escalation event
    this.eventEmitter.emit('alert.escalated', {
      alertId: alert.id,
      oldSeverity: alert.severity,
      newSeverity,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Erhöht die Severity um eine Stufe
   */
  private increaseSeverity(severity: ThreatSeverity): ThreatSeverity {
    const severityOrder = [
      ThreatSeverity.LOW,
      ThreatSeverity.MEDIUM,
      ThreatSeverity.HIGH,
      ThreatSeverity.CRITICAL,
    ];

    const currentIndex = severityOrder.indexOf(severity);
    return severityOrder[Math.min(currentIndex + 1, severityOrder.length - 1)];
  }

  /**
   * Prüft ob ein Alert dispatched werden soll
   */
  private async shouldDispatch(alert: SecurityAlert): Promise<boolean> {
    // Don't dispatch low severity alerts unless configured
    if (alert.severity === ThreatSeverity.LOW) {
      return this.configService.get<boolean>('DISPATCH_LOW_SEVERITY_ALERTS', false);
    }

    // Check if alert is suppressed
    if (alert.suppressedUntil && alert.suppressedUntil > new Date()) {
      return false;
    }

    // Check rate limiting
    const recentDispatches = await this.prisma.securityAlert.count({
      where: {
        userId: alert.userId,
        dispatchAttempts: { gt: 0 },
        lastDispatchAt: {
          gte: new Date(Date.now() - 3600000), // 1 hour
        },
      },
    });

    const maxDispatchesPerHour = this.configService.get<number>(
      'MAX_ALERT_DISPATCHES_PER_HOUR',
      10,
    );
    return recentDispatches < maxDispatchesPerHour;
  }

  /**
   * Mappt Event Type und Rule Result zu Alert Type
   */
  private mapToAlertType(eventType: SecurityEventType, result: RuleEvaluationResult): AlertType {
    // Check for specific rule tags
    if (result.tags?.includes('brute-force')) {
      return AlertType.BRUTE_FORCE_ATTEMPT;
    }
    if (result.tags?.includes('account-lockout')) {
      return AlertType.ACCOUNT_LOCKED;
    }

    // Map based on event type
    switch (eventType) {
      case SecurityEventType.ACCOUNT_LOCKED:
        return AlertType.ACCOUNT_LOCKED;
      case SecurityEventType.LOGIN_FAILED:
        if (result.score && result.score > 80) {
          return AlertType.SUSPICIOUS_LOGIN;
        }
        return AlertType.MULTIPLE_FAILED_ATTEMPTS;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return AlertType.SUSPICIOUS_LOGIN;
      default:
        return AlertType.THREAT_RULE_MATCH;
    }
  }

  /**
   * Generiert einen aussagekräftigen Alert-Titel
   */
  private generateAlertTitle(result: RuleEvaluationResult, context: RuleContext): string {
    const user = context.email || context.userId || 'Unknown user';
    const location = context.ipAddress || 'unknown location';

    if (result.ruleName) {
      return `${result.ruleName} triggered for ${user}`;
    }

    return `Security threat detected for ${user} from ${location}`;
  }

  /**
   * Generiert Tags für den Alert
   */
  private generateAlertTags(result: RuleEvaluationResult, context: RuleContext): string[] {
    const tags: string[] = [];

    // Add rule tags
    if (result.tags) {
      tags.push(...result.tags);
    }

    // Add severity tag
    tags.push(`severity:${result.severity?.toLowerCase() || 'medium'}`);

    // Add context tags
    if (context.metadata?.deviceType) {
      tags.push(`device:${context.metadata.deviceType}`);
    }
    if (context.metadata?.location) {
      tags.push(`location:${context.metadata.location}`);
    }

    return tags;
  }

  /**
   * Mappt Alert Type zu Legacy Alert Type für Kompatibilität
   */
  private mapToLegacyAlertType(type: AlertType): string {
    const mapping: Record<AlertType, string> = {
      [AlertType.ACCOUNT_LOCKED]: 'ACCOUNT_LOCKED',
      [AlertType.SUSPICIOUS_LOGIN]: 'SUSPICIOUS_LOGIN',
      [AlertType.BRUTE_FORCE_ATTEMPT]: 'BRUTE_FORCE_ATTEMPT',
      [AlertType.MULTIPLE_FAILED_ATTEMPTS]: 'MULTIPLE_FAILED_ATTEMPTS',
      [AlertType.THREAT_RULE_MATCH]: 'SUSPICIOUS_LOGIN',
      [AlertType.ANOMALY_DETECTED]: 'SUSPICIOUS_LOGIN',
      [AlertType.POLICY_VIOLATION]: 'SUSPICIOUS_LOGIN',
    };

    return mapping[type] || 'SUSPICIOUS_LOGIN';
  }

  /**
   * Mappt ThreatSeverity zu String
   */
  private mapSeverityToString(severity: ThreatSeverity): 'low' | 'medium' | 'high' | 'critical' {
    const mapping: Record<ThreatSeverity, 'low' | 'medium' | 'high' | 'critical'> = {
      [ThreatSeverity.LOW]: 'low',
      [ThreatSeverity.MEDIUM]: 'medium',
      [ThreatSeverity.HIGH]: 'high',
      [ThreatSeverity.CRITICAL]: 'critical',
    };

    return mapping[severity];
  }

  /**
   * Aktualisiert die Processing Metrics
   */
  private updateProcessingMetrics(processingTime: number): void {
    const currentAvg = this.processingMetrics.averageProcessingTime;
    const totalEvents = this.processingMetrics.eventsProcessed;

    this.processingMetrics.averageProcessingTime =
      (currentAvg * (totalEvents - 1) + processingTime) / totalEvents;
  }

  /**
   * Gibt die aktuellen Processing Metrics zurück
   */
  getMetrics() {
    return {
      ...this.processingMetrics,
      alertRate:
        this.processingMetrics.alertsGenerated /
        Math.max(this.processingMetrics.eventsProcessed, 1),
      suppressionRate:
        this.processingMetrics.alertsSuppressed /
        Math.max(this.processingMetrics.eventsProcessed, 1),
      errorRate:
        this.processingMetrics.processingErrors /
        Math.max(this.processingMetrics.eventsProcessed, 1),
    };
  }

  /**
   * Holt Alert-Statistiken
   */
  async getAlertStatistics(options?: AlertQueryOptions): Promise<AlertStatistics> {
    const where: any = {};

    if (options?.timeRange) {
      where.createdAt = {
        gte: options.timeRange.start,
        lte: options.timeRange.end,
      };
    }

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    const [total, bySeverity, byType, byStatus] = await Promise.all([
      this.prisma.securityAlert.count({ where }),
      this.prisma.securityAlert.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      this.prisma.securityAlert.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.securityAlert.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      bySeverity: Object.fromEntries(bySeverity.map((item) => [item.severity, item._count])),
      byType: Object.fromEntries(byType.map((item) => [item.type, item._count])),
      byStatus: Object.fromEntries(byStatus.map((item) => [item.status, item._count])),
      timeRange: options?.timeRange,
    };
  }

  /**
   * Manual alert creation endpoint
   */
  async createManualAlert(context: SecurityAlertContext): Promise<SecurityAlert> {
    const alertData: Partial<SecurityAlert> = {
      type: context.type || AlertType.THREAT_RULE_MATCH,
      severity: context.severity,
      title: context.title,
      description: context.description,
      fingerprint: this.deduplicationService.generateFingerprint({
        type: context.type || 'manual',
        userId: context.userId,
        ipAddress: context.ipAddress,
        ruleId: 'manual',
      }),
      userId: context.userId,
      userEmail: context.userEmail,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      evidence: context.evidence || {},
      context: context.metadata || {},
      tags: context.tags || ['manual'],
    };

    const alert = await this.createAlert(alertData);
    await this.processAlert(alertData);

    return alert;
  }
}
