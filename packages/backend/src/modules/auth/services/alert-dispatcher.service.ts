import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/modules/notification/services/notification.service';
import {
  AlertStatus,
  NotificationStatus,
  SecurityAlert,
  ThreatSeverity,
} from '@prisma/generated/prisma';
import {
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitBreakerState,
} from '@/common/utils/circuit-breaker.util';
import { RetryUtil } from '@/common/utils/retry.util';
import { AlertNotificationConfig } from '../interfaces/alert-context.interface';

/**
 * Service für die zuverlässige Zustellung von Security Alerts
 *
 * Verwaltet die Verteilung von Alerts über verschiedene Notification Channels
 * mit Retry-Logic, Circuit Breaker Pattern und Priority-based Routing.
 *
 * Features:
 * - Multi-Channel Dispatch (Email, Webhook, etc.)
 * - Priority-based Channel Selection
 * - Retry with Exponential Backoff
 * - Circuit Breaker per Channel
 * - Rate Limiting
 * - Delivery Tracking
 */
@Injectable()
export class AlertDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(AlertDispatcherService.name);
  private notificationService: NotificationService;
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly retryUtil = new RetryUtil();
  private notificationConfig: AlertNotificationConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.initializeConfig();
  }

  async onModuleInit() {
    try {
      // Get notification service to avoid circular dependency
      this.notificationService = await this.moduleRef.get(NotificationService, { strict: false });

      if (!this.notificationService) {
        this.logger.error('NotificationService not available - alerts will not be dispatched');
      } else {
        this.logger.log('Alert Dispatcher Service initialized');
        this.initializeCircuitBreakers();
      }
    } catch (error) {
      this.logger.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Dispatched einen Security Alert über die konfigurierten Channels
   *
   * @param alert - Der zu versendende Alert
   * @returns Dispatch-Ergebnis mit Status und Details
   */
  async dispatchAlert(alert: SecurityAlert): Promise<{
    success: boolean;
    dispatchedChannels: string[];
    failedChannels: string[];
    errors: Record<string, string>;
  }> {
    const startTime = Date.now();

    try {
      // Check rate limits
      if (!(await this.checkRateLimits(alert))) {
        this.logger.warn(`Alert ${alert.id} rate limited`);
        return {
          success: false,
          dispatchedChannels: [],
          failedChannels: [],
          errors: { rateLimit: 'Rate limit exceeded' },
        };
      }

      // Get channels for alert severity
      const channels = this.getChannelsForSeverity(alert.severity);

      if (channels.length === 0) {
        this.logger.warn(`No channels configured for severity ${alert.severity}`);
        return {
          success: false,
          dispatchedChannels: [],
          failedChannels: [],
          errors: { config: 'No channels configured' },
        };
      }

      // Update alert status
      await this.updateAlertStatus(alert.id, AlertStatus.PROCESSING);

      // Dispatch to each channel
      const results = await this.dispatchToChannels(alert, channels);

      // Update alert with results
      await this.updateAlertDispatchInfo(alert.id, results);

      // Log metrics
      const processingTime = Date.now() - startTime;
      this.logDispatchMetrics(alert, results, processingTime);

      return results;
    } catch (error) {
      this.logger.error(`Failed to dispatch alert ${alert.id}:`, error);

      await this.updateAlertStatus(alert.id, AlertStatus.FAILED);

      return {
        success: false,
        dispatchedChannels: [],
        failedChannels: [],
        errors: { system: error.message },
      };
    }
  }

  /**
   * Retry failed dispatches
   */
  async retryFailedDispatches(since?: Date): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const cutoffDate = since || new Date(Date.now() - 3600000); // 1 hour default

    const failedAlerts = await this.prisma.securityAlert.findMany({
      where: {
        status: AlertStatus.FAILED,
        lastDispatchAt: { gte: cutoffDate },
        dispatchAttempts: { lt: this.notificationConfig.retryConfig.maxAttempts },
      },
      orderBy: { severity: 'desc' }, // Priority to high severity
      take: 50, // Batch size
    });

    let succeeded = 0;
    let failed = 0;

    for (const alert of failedAlerts) {
      const result = await this.dispatchAlert(alert);

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return {
      processed: failedAlerts.length,
      succeeded,
      failed,
    };
  }

  /**
   * Holt Dispatch-Statistiken
   */
  async getDispatchStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
    avgDispatchTime: number;
    successRate: number;
  }> {
    const [totalAlerts, dispatchedAlerts, notifications] = await Promise.all([
      this.prisma.securityAlert.count(),
      this.prisma.securityAlert.count({
        where: { status: AlertStatus.DISPATCHED },
      }),
      this.prisma.alertNotification.groupBy({
        by: ['channel', 'status'],
        _count: true,
      }),
    ]);

    const byChannel: Record<string, number> = {};
    let totalNotifications = 0;
    let successfulNotifications = 0;

    notifications.forEach((item) => {
      byChannel[item.channel] = (byChannel[item.channel] || 0) + item._count;
      totalNotifications += item._count;

      if (item.status === NotificationStatus.SENT) {
        successfulNotifications += item._count;
      }
    });

    return {
      total: totalAlerts,
      byStatus: {
        dispatched: dispatchedAlerts,
        pending: await this.prisma.securityAlert.count({ where: { status: AlertStatus.PENDING } }),
        failed: await this.prisma.securityAlert.count({ where: { status: AlertStatus.FAILED } }),
      },
      byChannel,
      avgDispatchTime: 0, // TODO: Implement time tracking
      successRate: totalNotifications > 0 ? successfulNotifications / totalNotifications : 0,
    };
  }

  /**
   * Initialisiert die Konfiguration
   */
  private initializeConfig(): void {
    this.notificationConfig = {
      channelsBySeverity: {
        low: this.configService.get<string[]>('ALERT_CHANNELS_LOW', ['email']),
        medium: this.configService.get<string[]>('ALERT_CHANNELS_MEDIUM', ['email']),
        high: this.configService.get<string[]>('ALERT_CHANNELS_HIGH', ['email', 'webhook']),
        critical: this.configService.get<string[]>('ALERT_CHANNELS_CRITICAL', ['email', 'webhook']),
      },
      rateLimiting: {
        maxPerHourPerUser: this.configService.get<number>('ALERT_RATE_LIMIT_USER', 10),
        maxPerHourGlobal: this.configService.get<number>('ALERT_RATE_LIMIT_GLOBAL', 100),
      },
      retryConfig: {
        maxAttempts: this.configService.get<number>('ALERT_RETRY_MAX_ATTEMPTS', 3),
        backoffMultiplier: this.configService.get<number>('ALERT_RETRY_BACKOFF', 2),
        maxBackoffMs: this.configService.get<number>('ALERT_RETRY_MAX_BACKOFF', 30000),
      },
    };
  }

  /**
   * Initialisiert Circuit Breaker für jeden Channel
   */
  private initializeCircuitBreakers(): void {
    const channels = this.notificationService.getChannels();

    channels.forEach((channel) => {
      const config: Partial<CircuitBreakerConfig> = {
        failureThreshold: this.configService.get<number>(
          `ALERT_CB_${channel.toUpperCase()}_THRESHOLD`,
          5,
        ),
        openStateDuration: this.configService.get<number>(
          `ALERT_CB_${channel.toUpperCase()}_DURATION`,
          60000,
        ),
        successThreshold: this.configService.get<number>(
          `ALERT_CB_${channel.toUpperCase()}_SUCCESS`,
          3,
        ),
      };

      this.circuitBreakers.set(channel, new CircuitBreaker(`AlertDispatch-${channel}`, config));
    });
  }

  /**
   * Prüft Rate Limits
   */
  private async checkRateLimits(alert: SecurityAlert): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 3600000);

    // Check user rate limit
    if (alert.userId) {
      const userAlertCount = await this.prisma.alertNotification.count({
        where: {
          alert: {
            userId: alert.userId,
          },
          createdAt: { gte: oneHourAgo },
          status: { in: [NotificationStatus.SENT, NotificationStatus.QUEUED] },
        },
      });

      if (userAlertCount >= this.notificationConfig.rateLimiting.maxPerHourPerUser) {
        return false;
      }
    }

    // Check global rate limit
    const globalAlertCount = await this.prisma.alertNotification.count({
      where: {
        createdAt: { gte: oneHourAgo },
        status: { in: [NotificationStatus.SENT, NotificationStatus.QUEUED] },
      },
    });

    return globalAlertCount < this.notificationConfig.rateLimiting.maxPerHourGlobal;
  }

  /**
   * Holt die Channels basierend auf Severity
   */
  private getChannelsForSeverity(severity: ThreatSeverity): string[] {
    const severityMap = {
      [ThreatSeverity.LOW]: 'low',
      [ThreatSeverity.MEDIUM]: 'medium',
      [ThreatSeverity.HIGH]: 'high',
      [ThreatSeverity.CRITICAL]: 'critical',
    };

    const severityKey = severityMap[
      severity
    ] as keyof typeof this.notificationConfig.channelsBySeverity;
    const configuredChannels = this.notificationConfig.channelsBySeverity[severityKey];

    // Filter nur aktivierte Channels
    const enabledChannels = this.notificationService?.getEnabledChannels() || [];
    return configuredChannels.filter((channel) => enabledChannels.includes(channel));
  }

  /**
   * Dispatched zu mehreren Channels
   */
  private async dispatchToChannels(
    alert: SecurityAlert,
    channels: string[],
  ): Promise<{
    success: boolean;
    dispatchedChannels: string[];
    failedChannels: string[];
    errors: Record<string, string>;
  }> {
    const dispatchedChannels: string[] = [];
    const failedChannels: string[] = [];
    const errors: Record<string, string> = {};

    // Dispatch to each channel with priority
    for (const channel of channels) {
      try {
        const success = await this.dispatchToChannel(alert, channel);

        if (success) {
          dispatchedChannels.push(channel);
        } else {
          failedChannels.push(channel);
          errors[channel] = 'Dispatch failed';
        }
      } catch (error) {
        failedChannels.push(channel);
        errors[channel] = error.message;
        this.logger.error(`Failed to dispatch to ${channel}:`, error);
      }
    }

    return {
      success: dispatchedChannels.length > 0,
      dispatchedChannels,
      failedChannels,
      errors,
    };
  }

  /**
   * Dispatched zu einem einzelnen Channel mit Retry und Circuit Breaker
   */
  private async dispatchToChannel(alert: SecurityAlert, channel: string): Promise<boolean> {
    const circuitBreaker = this.circuitBreakers.get(channel);

    if (!circuitBreaker) {
      this.logger.warn(`No circuit breaker for channel ${channel}`);
      return false;
    }

    // Check circuit breaker status
    const cbStatus = circuitBreaker.getStatus();
    if (cbStatus.state === CircuitBreakerState.OPEN) {
      this.logger.warn(`Circuit breaker OPEN for ${channel}, skipping dispatch`);
      return false;
    }

    try {
      // Create notification record
      const notification = await this.createNotificationRecord(alert, channel);

      // Execute with circuit breaker and retry
      const result = await circuitBreaker.execute(async () => {
        return await this.retryUtil.executeWithRetry(
          async () => {
            await this.sendNotification(alert, channel);
            return true;
          },
          this.notificationConfig.retryConfig,
          `Alert-${alert.id}-${channel}`,
        );
      });

      // Update notification status
      await this.updateNotificationStatus(notification.id, NotificationStatus.SENT);

      return result;
    } catch (error) {
      if (error.name === 'CircuitBreakerOpenError') {
        this.logger.warn(`Circuit breaker prevented dispatch to ${channel}`);
      } else {
        this.logger.error(`Failed to dispatch alert ${alert.id} to ${channel}:`, error);
      }

      return false;
    }
  }

  /**
   * Erstellt einen Notification Record
   */
  private async createNotificationRecord(alert: SecurityAlert, channel: string) {
    return await this.prisma.alertNotification.create({
      data: {
        alertId: alert.id,
        channel,
        recipient: JSON.stringify(this.buildRecipient(alert, channel)),
        status: NotificationStatus.QUEUED,
      },
    });
  }

  /**
   * Sendet die eigentliche Benachrichtigung
   */
  private async sendNotification(alert: SecurityAlert, channel: string): Promise<void> {
    if (!this.notificationService) {
      throw new Error('NotificationService not available');
    }

    const payload = {
      channel,
      recipient: this.buildRecipient(alert, channel),
      subject: this.buildSubject(alert),
      priority: this.mapSeverityToPriority(alert.severity),
      data: this.buildNotificationData(alert),
      templates: {
        html: this.buildHtmlTemplate(alert),
        text: this.buildTextTemplate(alert),
      },
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
      },
    };

    await this.notificationService.send(payload);
  }

  /**
   * Baut den Empfänger basierend auf Alert und Channel
   */
  private buildRecipient(alert: SecurityAlert, channel: string): any {
    switch (channel) {
      case 'email': {
        // Security alerts go to configured security email
        const securityEmail = this.configService.get<string>('SECURITY_ALERT_EMAIL');
        return {
          email: securityEmail || alert.userEmail || 'security@example.com',
          name: 'Security Team',
        };
      }

      case 'webhook':
        return {
          url: this.configService.get<string>('SECURITY_ALERT_WEBHOOK_URL'),
          headers: {
            'X-Alert-ID': alert.id,
            'X-Alert-Type': alert.type,
            'X-Alert-Severity': alert.severity,
          },
        };

      default:
        return {};
    }
  }

  /**
   * Baut den Betreff für die Benachrichtigung
   */
  private buildSubject(alert: SecurityAlert): string {
    const severityEmoji = {
      [ThreatSeverity.LOW]: '🔵',
      [ThreatSeverity.MEDIUM]: '🟡',
      [ThreatSeverity.HIGH]: '🟠',
      [ThreatSeverity.CRITICAL]: '🔴',
    };

    const emoji = severityEmoji[alert.severity] || '⚠️';

    return `${emoji} Security Alert: ${alert.title}`;
  }

  /**
   * Baut die Notification-Daten
   */
  private buildNotificationData(alert: SecurityAlert): any {
    return {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      userId: alert.userId,
      userEmail: alert.userEmail,
      ipAddress: alert.ipAddress,
      location: alert.location,
      timestamp: alert.createdAt.toISOString(),
      score: alert.score,
      evidence: alert.evidence,
      correlationId: alert.correlationId,
      isCorrelated: alert.isCorrelated,
      occurrenceCount: alert.occurrenceCount,
      firstSeen: alert.firstSeen.toISOString(),
      lastSeen: alert.lastSeen.toISOString(),
      tags: alert.tags,
      actionUrl: `${this.configService.get<string>('APP_URL')}/admin/alerts/${alert.id}`,
    };
  }

  /**
   * Baut das HTML Template
   */
  private buildHtmlTemplate(alert: SecurityAlert): string {
    const severityColor = {
      [ThreatSeverity.LOW]: '#3B82F6',
      [ThreatSeverity.MEDIUM]: '#F59E0B',
      [ThreatSeverity.HIGH]: '#F97316',
      [ThreatSeverity.CRITICAL]: '#EF4444',
    };

    const color = severityColor[alert.severity] || '#6B7280';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Security Alert</h1>
          <p style="margin: 5px 0 0 0;">${alert.severity} Severity</p>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">${alert.title}</h2>
          <p style="color: #4b5563;">${alert.description}</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Alert Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Type:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${alert.type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">User:</td>
                <td style="padding: 8px 0; color: #1f2937;">${alert.userEmail || alert.userId || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">IP Address:</td>
                <td style="padding: 8px 0; color: #1f2937;">${alert.ipAddress || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Occurrences:</td>
                <td style="padding: 8px 0; color: #1f2937;">${alert.occurrenceCount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">First Seen:</td>
                <td style="padding: 8px 0; color: #1f2937;">${alert.firstSeen.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          ${
            alert.evidence
              ? `
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Evidence</h3>
              <pre style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(alert.evidence, null, 2)}
              </pre>
            </div>
          `
              : ''
          }
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.buildNotificationData(alert).actionUrl}" 
               style="background-color: ${color}; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              View Alert Details
            </a>
          </div>
        </div>
        
        <div style="padding: 20px; background-color: #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">This is an automated security alert from ${this.configService.get<string>('APP_NAME', 'Security System')}</p>
          <p style="margin: 5px 0 0 0;">Alert ID: ${alert.id}</p>
        </div>
      </div>
    `;
  }

  /**
   * Baut das Text Template
   */
  private buildTextTemplate(alert: SecurityAlert): string {
    return `
SECURITY ALERT - ${alert.severity} SEVERITY

${alert.title}

${alert.description}

ALERT DETAILS:
- Type: ${alert.type}
- User: ${alert.userEmail || alert.userId || 'Unknown'}
- IP Address: ${alert.ipAddress || 'Unknown'}
- Occurrences: ${alert.occurrenceCount}
- First Seen: ${alert.firstSeen.toLocaleString()}
- Last Seen: ${alert.lastSeen.toLocaleString()}

${
  alert.evidence
    ? `EVIDENCE:
${JSON.stringify(alert.evidence, null, 2)}`
    : ''
}

View full details: ${this.buildNotificationData(alert).actionUrl}

---
Alert ID: ${alert.id}
This is an automated security alert.
    `.trim();
  }

  /**
   * Mappt Severity zu Priority
   */
  private mapSeverityToPriority(severity: ThreatSeverity): string {
    const priorityMap = {
      [ThreatSeverity.LOW]: 'low',
      [ThreatSeverity.MEDIUM]: 'medium',
      [ThreatSeverity.HIGH]: 'high',
      [ThreatSeverity.CRITICAL]: 'critical',
    };

    return priorityMap[severity] || 'medium';
  }

  /**
   * Aktualisiert den Alert Status
   */
  private async updateAlertStatus(alertId: string, status: AlertStatus): Promise<void> {
    await this.prisma.securityAlert.update({
      where: { id: alertId },
      data: { status },
    });
  }

  /**
   * Aktualisiert Alert Dispatch Informationen
   */
  private async updateAlertDispatchInfo(
    alertId: string,
    results: {
      success: boolean;
      dispatchedChannels: string[];
      failedChannels: string[];
      errors: Record<string, string>;
    },
  ): Promise<void> {
    const status = results.success ? AlertStatus.DISPATCHED : AlertStatus.FAILED;

    await this.prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        status,
        dispatchedChannels: results.dispatchedChannels,
        dispatchAttempts: { increment: 1 },
        lastDispatchAt: new Date(),
        dispatchErrors: results.errors,
      },
    });
  }

  /**
   * Aktualisiert den Notification Status
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
  ): Promise<void> {
    await this.prisma.alertNotification.update({
      where: { id: notificationId },
      data: {
        status,
        sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
      },
    });
  }

  /**
   * Loggt Dispatch Metriken
   */
  private logDispatchMetrics(alert: SecurityAlert, results: any, processingTime: number): void {
    this.logger.log('Alert dispatch completed', {
      alertId: alert.id,
      severity: alert.severity,
      success: results.success,
      channels: results.dispatchedChannels,
      failedChannels: results.failedChannels,
      processingTime,
    });

    // Emit metrics event
    this.eventEmitter.emit('alert.dispatch.completed', {
      alertId: alert.id,
      results,
      processingTime,
      timestamp: new Date(),
    });
  }
}
