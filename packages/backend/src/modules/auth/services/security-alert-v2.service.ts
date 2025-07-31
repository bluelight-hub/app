import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationTemplateService } from '@/modules/notification/services/notification-template.service';
import { NotificationPayload } from '@/modules/notification/interfaces/notification-payload.interface';

/**
 * Represents the different types of security alerts that can be triggered
 * in the system. These alerts signify potential security risks or unusual
 * activities that may require attention.
 *
 * Enum Members:
 * - ACCOUNT_LOCKED: Triggered when an account is locked due to security reasons.
 * - SUSPICIOUS_LOGIN: Indicates a login attempt that is flagged as suspicious.
 * - BRUTE_FORCE_ATTEMPT: Represents detection of a brute force attack on the system.
 * - MULTIPLE_FAILED_ATTEMPTS: Indicates several consecutive failed login attempts.
 *
 * Used as a standardized type to identify and handle various security alerts.
 */
export enum SecurityAlertType {
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
}

/**
 * Payload-Struktur für Sicherheitswarnungen
 *
 * Enthält alle relevanten Informationen für die Verarbeitung und Versendung von Sicherheitswarnungen
 * @interface SecurityAlertPayload
 */
export interface SecurityAlertPayload {
  /** Typ der Sicherheitswarnung */
  type: SecurityAlertType;
  /** Schweregrad der Warnung */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Zeitstempel der Warnung */
  timestamp: Date;
  /** Detaillierte Informationen zur Warnung */
  details: {
    /** E-Mail-Adresse des betroffenen Benutzers */
    email?: string;
    /** ID des betroffenen Benutzers */
    userId?: string;
    /** IP-Adresse von der die Aktion ausging */
    ipAddress?: string;
    /** User-Agent String des Clients */
    userAgent?: string;
    /** Risikobewertung (0-100) */
    riskScore?: number;
    /** Anzahl der fehlgeschlagenen Versuche */
    failedAttempts?: number;
    /** Zeitpunkt bis zu dem das Konto gesperrt ist */
    lockedUntil?: Date;
    /** Beschreibung der Warnung */
    message: string;
    /** Zusätzliche kontextspezifische Informationen */
    additionalInfo?: Record<string, any>;
  };
}

/**
 * Enhanced Security Alert Service using the new Notification System
 *
 * This service provides a backward-compatible interface while leveraging
 * the new pluggable notification channels. It manages security-related
 * notifications across the application, ensuring critical security events
 * are properly communicated to administrators and affected users.
 *
 * Features:
 * - Verschiedene Alert-Typen (Account-Sperrung, Brute-Force, etc.)
 * - Multi-Channel-Unterstützung (E-Mail, Webhook)
 * - Template-basierte Benachrichtigungen
 * - Prioritäts-basiertes Routing
 * - Fehlertoleranz (Alerts blockieren nicht den Hauptfluss)
 *
 * @class SecurityAlertServiceV2
 * @implements {OnModuleInit}
 * @injectable
 *
 * @example
 * ```typescript
 * // Account-Sperrung Alert
 * await securityAlertService.sendAccountLockedAlert(
 *   'user@example.com',
 *   'user123',
 *   new Date(Date.now() + 3600000),
 *   5,
 *   '192.168.1.100'
 * );
 *
 * // Brute-Force Alert
 * await securityAlertService.sendBruteForceAlert(
 *   '192.168.1.100',
 *   10,
 *   5
 * );
 * ```
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
   *
   * Verarbeitet das Alert-Payload und sendet es an alle konfigurierten
   * Benachrichtigungskanäle. Fehler werden geloggt aber nicht geworfen,
   * um den Hauptfluss nicht zu unterbrechen.
   *
   * @param {SecurityAlertPayload} payload - Die zu sendende Sicherheitswarnung
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await service.sendAlert({
   *   type: SecurityAlertType.SUSPICIOUS_LOGIN,
   *   severity: 'high',
   *   timestamp: new Date(),
   *   details: {
   *     email: 'user@example.com',
   *     ipAddress: '192.168.1.100',
   *     riskScore: 85,
   *     message: 'Suspicious login detected'
   *   }
   * });
   * ```
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
   *
   * Benachrichtigt über eine Account-Sperrung aufgrund zu vieler
   * fehlgeschlagener Login-Versuche. Enthält Details zur Sperrzeit
   * und Anzahl der Versuche.
   *
   * @param {string} email - E-Mail-Adresse des gesperrten Accounts
   * @param {string | null} userId - Benutzer-ID (falls verfügbar)
   * @param {Date} lockedUntil - Zeitpunkt bis zu dem der Account gesperrt ist
   * @param {number} failedAttempts - Anzahl der fehlgeschlagenen Versuche
   * @param {string} [ipAddress] - IP-Adresse des letzten Versuchs
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await service.sendAccountLockedAlert(
   *   'user@example.com',
   *   'user123',
   *   new Date(Date.now() + 30 * 60 * 1000), // 30 Minuten
   *   5,
   *   '192.168.1.100'
   * );
   * ```
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
   *
   * Benachrichtigt über Login-Versuche, die von der Threat Detection
   * Engine als verdächtig eingestuft wurden. Der Schweregrad wird
   * basierend auf dem Risk Score automatisch bestimmt.
   *
   * @param {string} email - E-Mail-Adresse des Benutzers
   * @param {string | null} userId - Benutzer-ID (falls verfügbar)
   * @param {string} ipAddress - IP-Adresse des verdächtigen Logins
   * @param {string} userAgent - User-Agent des Clients
   * @param {number} riskScore - Risikobewertung (0-100)
   * @param {string} reason - Grund für die Einstufung als verdächtig
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await service.sendSuspiciousLoginAlert(
   *   'user@example.com',
   *   'user123',
   *   '192.168.1.100',
   *   'Mozilla/5.0...',
   *   85,
   *   'Rapid IP changes detected'
   * );
   * ```
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
   *
   * Benachrichtigt über erkannte Brute-Force-Angriffe basierend
   * auf der Anzahl der Versuche innerhalb eines Zeitfensters.
   * Wird immer mit Severity 'critical' gesendet.
   *
   * @param {string} ipAddress - IP-Adresse des Angreifers
   * @param {number} attemptCount - Anzahl der Versuche
   * @param {number} timeWindowMinutes - Zeitfenster in Minuten
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await service.sendBruteForceAlert(
   *   '192.168.1.100',
   *   50,
   *   5
   * );
   * // "Potential brute force attack detected from IP 192.168.1.100. 50 attempts in 5 minutes"
   * ```
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
   *
   * Warnt Benutzer vor mehreren fehlgeschlagenen Login-Versuchen
   * bevor eine Account-Sperrung erfolgt. Der Schweregrad erhöht
   * sich, wenn nur noch wenige Versuche verbleiben.
   *
   * @param {string} email - E-Mail-Adresse des Benutzers
   * @param {string | null} userId - Benutzer-ID (falls verfügbar)
   * @param {number} failedAttempts - Anzahl bisheriger Fehlversuche
   * @param {number} remainingAttempts - Verbleibende Versuche bis zur Sperrung
   * @param {string} [ipAddress] - IP-Adresse der Versuche
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await service.sendMultipleFailedAttemptsAlert(
   *   'user@example.com',
   *   'user123',
   *   3,
   *   2,
   *   '192.168.1.100'
   * );
   * // "Multiple failed login attempts for user@example.com. 3 failed attempts, 2 attempts remaining before lockout"
   * ```
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
   *
   * Mappt die Alert-Daten auf das generische Notification-System
   * und versucht passende Templates zu laden. Bei fehlenden Templates
   * wird auf Standard-Nachrichten zurückgegriffen.
   *
   * @private
   * @param {SecurityAlertPayload} alert - Das zu konvertierende Alert-Payload
   * @returns {Promise<NotificationPayload>} Das konvertierte Notification-Payload
   *
   * @example
   * ```typescript
   * const notificationPayload = await this.buildNotificationPayload({
   *   type: SecurityAlertType.ACCOUNT_LOCKED,
   *   severity: 'high',
   *   timestamp: new Date(),
   *   details: { ... }
   * });
   * ```
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
