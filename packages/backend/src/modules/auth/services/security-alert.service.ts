import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class SecurityAlertService {
  private readonly logger = new Logger(SecurityAlertService.name);
  private readonly webhookUrl: string | null;
  private readonly webhookAuthToken: string | null;
  private readonly alertsEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('SECURITY_ALERT_WEBHOOK_URL', null);
    this.webhookAuthToken = this.configService.get<string>('SECURITY_ALERT_AUTH_TOKEN', null);
    this.alertsEnabled = this.configService.get<boolean>('SECURITY_ALERTS_ENABLED', false);

    if (this.alertsEnabled && !this.webhookUrl) {
      this.logger.warn('Security alerts are enabled but no webhook URL is configured');
    }
  }

  /**
   * Sendet einen Security Alert via Webhook
   */
  async sendAlert(payload: SecurityAlertPayload): Promise<void> {
    if (!this.alertsEnabled || !this.webhookUrl) {
      this.logger.debug(
        `Security alert not sent (enabled: ${this.alertsEnabled}, webhook: ${!!this.webhookUrl})`,
      );
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.webhookAuthToken) {
        headers['Authorization'] = `Bearer ${this.webhookAuthToken}`;
      }

      await firstValueFrom(
        this.httpService.post(this.webhookUrl, payload, {
          headers,
          timeout: 5000, // 5 second timeout
        }),
      );

      this.logger.log(
        `Security alert sent: ${payload.type} for ${payload.details.email || 'unknown'}`,
      );
    } catch (error) {
      // Log error but don't throw - alerts should not break the main flow
      this.logger.error(`Failed to send security alert: ${error.message}`, error.stack);
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
}
