import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationTemplateService } from '@/modules/notification/services/notification-template.service';
import { NotificationPayload } from '@/modules/notification/interfaces/notification-payload.interface';

export enum SecurityAlertType {
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
}

export interface SecurityAlertPayload {
  type: SecurityAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  details: {
    email?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    riskScore?: number;
    failedAttempts?: number;
    lockedUntil?: Date;
    message: string;
    additionalInfo?: Record<string, any>;
  };
}

/**
 * Enhanced Security Alert Service using the new Notification System
 * This service provides a backward-compatible interface while leveraging
 * the new pluggable notification channels.
 */
@Injectable()
export class SecurityAlertServiceV2 implements OnModuleInit {
  private readonly logger = new Logger(SecurityAlertServiceV2.name);
  private notificationService: NotificationService;
  private templateService: NotificationTemplateService;
  private alertsEnabled: boolean;
  private preferredChannels: string[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.alertsEnabled = this.configService.get<boolean>('SECURITY_ALERTS_ENABLED', false);

    // Determine preferred channels based on configuration
    if (this.configService.get<boolean>('EMAIL_ENABLED', false)) {
      this.preferredChannels.push('email');
    }

    if (this.configService.get<boolean>('WEBHOOK_ENABLED', false)) {
      this.preferredChannels.push('webhook');
    }
  }

  async onModuleInit() {
    try {
      // Get notification service from module ref to avoid circular dependency
      this.notificationService = await this.moduleRef.get(NotificationService, { strict: false });
      this.templateService = await this.moduleRef.get(NotificationTemplateService, {
        strict: false,
      });

      if (!this.notificationService) {
        this.logger.error('NotificationService not available');
        this.alertsEnabled = false;
      }
    } catch (error) {
      this.logger.error('Failed to initialize notification services', error);
      this.alertsEnabled = false;
    }
  }

  /**
   * Sendet einen Security Alert über das neue Notification System
   */
  async sendAlert(payload: SecurityAlertPayload): Promise<void> {
    if (!this.alertsEnabled || !this.notificationService) {
      this.logger.debug('Security alerts are disabled or notification service not available');
      return;
    }

    try {
      const notificationPayload = await this.buildNotificationPayload(payload);

      // Send to all preferred channels
      for (const channel of this.preferredChannels) {
        await this.notificationService.send({
          ...notificationPayload,
          channel,
          priority: this.mapSeverityToPriority(payload.severity),
        });
      }

      this.logger.log(`Security alert sent: ${payload.type}`);
    } catch (error) {
      this.logger.error(`Failed to send security alert: ${error.message}`, error.stack);
      // Don't throw - alerts should not break the main flow
    }
  }

  /**
   * Sendet einen Alert für einen gesperrten Account
   */
  async sendAccountLockedAlert(
    email: string,
    userId: string | null,
    lockedUntil: Date,
    failedAttempts: number,
    ipAddress?: string,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.ACCOUNT_LOCKED,
      severity: 'high',
      timestamp: new Date(),
      details: {
        email,
        userId,
        ipAddress,
        lockedUntil,
        failedAttempts,
        message: `Account ${email} has been locked until ${lockedUntil.toISOString()} after ${failedAttempts} failed login attempts`,
      },
    };

    await this.sendAlert(payload);
  }

  /**
   * Sendet einen Alert für einen verdächtigen Login-Versuch
   */
  async sendSuspiciousLoginAlert(
    email: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    riskScore: number,
    reason: string,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.SUSPICIOUS_LOGIN,
      severity: riskScore >= 80 ? 'critical' : 'high',
      timestamp: new Date(),
      details: {
        email,
        userId,
        ipAddress,
        userAgent,
        riskScore,
        message: `Suspicious login attempt detected for ${email} with risk score ${riskScore}. Reason: ${reason}`,
      },
    };

    await this.sendAlert(payload);
  }

  /**
   * Sendet einen Alert für Brute-Force-Versuche
   */
  async sendBruteForceAlert(
    ipAddress: string,
    attemptCount: number,
    timeWindowMinutes: number,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.BRUTE_FORCE_ATTEMPT,
      severity: 'critical',
      timestamp: new Date(),
      details: {
        ipAddress,
        message: `Potential brute force attack detected from IP ${ipAddress}. ${attemptCount} attempts in ${timeWindowMinutes} minutes`,
        additionalInfo: {
          attemptCount,
          timeWindowMinutes,
        },
      },
    };

    await this.sendAlert(payload);
  }

  /**
   * Sendet einen Alert für mehrere fehlgeschlagene Login-Versuche
   */
  async sendMultipleFailedAttemptsAlert(
    email: string,
    userId: string | null,
    failedAttempts: number,
    remainingAttempts: number,
    ipAddress?: string,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
      severity: remainingAttempts <= 1 ? 'high' : 'medium',
      timestamp: new Date(),
      details: {
        email,
        userId,
        ipAddress,
        failedAttempts,
        message: `Multiple failed login attempts for ${email}. ${failedAttempts} failed attempts, ${remainingAttempts} attempts remaining before lockout`,
        additionalInfo: {
          remainingAttempts,
        },
      },
    };

    await this.sendAlert(payload);
  }

  /**
   * Konvertiert das alte SecurityAlertPayload in das neue NotificationPayload Format
   */
  private async buildNotificationPayload(
    alert: SecurityAlertPayload,
  ): Promise<NotificationPayload> {
    const templateName = this.getTemplateName(alert.type);
    const templateData = this.buildTemplateData(alert);

    // Try to use template if available
    let templateId: string | undefined;
    if (this.templateService && templateName) {
      try {
        const template = await this.templateService.getTemplate(undefined, templateName, 'de');

        if (template) {
          templateId = template.id;
        }
      } catch (_error) {
        this.logger.warn(`Template ${templateName} not found, using default message`);
      }
    }

    return {
      channel: '', // Will be set when sending
      subject: this.getAlertSubject(alert),
      recipient: {
        email: alert.details.email,
        webhookUrl: this.configService.get<string>('SECURITY_ALERT_WEBHOOK_URL'),
        userId: alert.details.userId,
      },
      data: {
        ...templateData,
        message: alert.details.message,
        alertType: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
        ...alert.details.additionalInfo,
      },
      priority: this.mapSeverityToPriority(alert.severity),
      metadata: {
        alertType: alert.type,
        severity: alert.severity,
        templateId,
      },
    };
  }

  /**
   * Maps alert type to template name
   */
  private getTemplateName(type: SecurityAlertType): string | null {
    const templateMap = {
      [SecurityAlertType.ACCOUNT_LOCKED]: 'account_locked',
      [SecurityAlertType.SUSPICIOUS_LOGIN]: 'suspicious_login',
      [SecurityAlertType.BRUTE_FORCE_ATTEMPT]: 'brute_force_detected',
      [SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS]: 'multiple_failed_attempts',
    };

    return templateMap[type] || null;
  }

  /**
   * Builds template data from alert payload
   */
  private buildTemplateData(alert: SecurityAlertPayload): Record<string, any> {
    const data: Record<string, any> = {
      timestamp: alert.timestamp.toISOString(),
      ...alert.details,
    };

    // Format dates for templates
    if (alert.details.lockedUntil) {
      data.lockedUntil = alert.details.lockedUntil.toLocaleString('de-DE');
    }

    return data;
  }

  /**
   * Gets a suitable subject for the alert
   */
  private getAlertSubject(alert: SecurityAlertPayload): string {
    const subjectMap = {
      [SecurityAlertType.ACCOUNT_LOCKED]: 'Konto gesperrt - Sicherheitswarnung',
      [SecurityAlertType.SUSPICIOUS_LOGIN]: 'Verdächtiger Anmeldeversuch erkannt',
      [SecurityAlertType.BRUTE_FORCE_ATTEMPT]: 'KRITISCH: Brute-Force-Angriff erkannt',
      [SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS]: 'Mehrere fehlgeschlagene Anmeldeversuche',
    };

    return subjectMap[alert.type] || 'Sicherheitswarnung';
  }

  /**
   * Maps severity to notification priority
   */
  private mapSeverityToPriority(severity: string): string {
    const priorityMap = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };

    return priorityMap[severity] || 'medium';
  }
}
