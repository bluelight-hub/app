import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RetryUtil, RetryConfig } from '../../../common/utils/retry.util';
import { CircuitBreaker, CircuitBreakerConfig } from '../../../common/utils/circuit-breaker.util';

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
  private readonly retryUtil: RetryUtil;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryConfig: Partial<RetryConfig>;
  private readonly circuitBreakerConfig: Partial<CircuitBreakerConfig>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('SECURITY_ALERT_WEBHOOK_URL', null);
    this.webhookAuthToken = this.configService.get<string>('SECURITY_ALERT_AUTH_TOKEN', null);
    this.alertsEnabled = this.configService.get<boolean>('SECURITY_ALERTS_ENABLED', false);

    // Retry-Konfiguration
    this.retryConfig = {
      maxRetries: this.configService.get<number>('SECURITY_ALERT_MAX_RETRIES', 3),
      baseDelay: this.configService.get<number>('SECURITY_ALERT_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('SECURITY_ALERT_MAX_DELAY', 30000),
      backoffMultiplier: this.configService.get<number>('SECURITY_ALERT_BACKOFF_MULTIPLIER', 2),
      jitterFactor: this.configService.get<number>('SECURITY_ALERT_JITTER_FACTOR', 0.1),
      timeout: this.configService.get<number>('SECURITY_ALERT_TIMEOUT', 5000),
    };

    // Circuit Breaker Konfiguration
    this.circuitBreakerConfig = {
      failureThreshold: this.configService.get<number>('SECURITY_ALERT_FAILURE_THRESHOLD', 5),
      failureCountWindow: this.configService.get<number>('SECURITY_ALERT_FAILURE_WINDOW', 60000),
      openStateDuration: this.configService.get<number>('SECURITY_ALERT_OPEN_DURATION', 30000),
      successThreshold: this.configService.get<number>('SECURITY_ALERT_SUCCESS_THRESHOLD', 3),
      failureRateThreshold: this.configService.get<number>('SECURITY_ALERT_FAILURE_RATE', 50),
      minimumNumberOfCalls: this.configService.get<number>('SECURITY_ALERT_MIN_CALLS', 5),
    };

    this.retryUtil = new RetryUtil();
    this.circuitBreaker = new CircuitBreaker('SecurityAlertWebhook', this.circuitBreakerConfig);

    if (this.alertsEnabled && !this.webhookUrl) {
      this.logger.warn('Security alerts are enabled but no webhook URL is configured');
    }
  }

  /**
   * Sendet einen Security Alert via Webhook mit Retry und Circuit Breaker
   */
  async sendAlert(payload: SecurityAlertPayload): Promise<void> {
    if (!this.alertsEnabled || !this.webhookUrl) {
      this.logger.debug(
        `Security alert not sent (enabled: ${this.alertsEnabled}, webhook: ${!!this.webhookUrl})`,
      );
      return;
    }

    try {
      // Prüfe Circuit Breaker Status
      const circuitStatus = this.circuitBreaker.getStatus();
      if (circuitStatus.state === 'OPEN') {
        this.logger.warn(
          `Circuit breaker is OPEN, skipping alert. Last failure: ${circuitStatus.lastFailureTime}`,
        );
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.webhookAuthToken) {
        headers['Authorization'] = `Bearer ${this.webhookAuthToken}`;
      }

      // Webhook-Aufruf mit Circuit Breaker und Retry
      await this.circuitBreaker.execute(async () => {
        return await this.retryUtil.executeWithRetry(
          async () => {
            const response = await firstValueFrom(
              this.httpService.post(this.webhookUrl, payload, {
                headers,
                timeout: this.retryConfig.timeout || 5000,
              }),
            );

            // Prüfe auf erfolgreiche HTTP-Antwort
            if (response.status < 200 || response.status >= 300) {
              throw new Error(`Webhook returned status ${response.status}`);
            }

            return response;
          },
          this.retryConfig,
          `SecurityAlert-${payload.type}`,
        );
      });

      this.logger.log(
        `Security alert sent: ${payload.type} for ${payload.details.email || 'unknown'}`,
      );
    } catch (error) {
      if (error.name === 'CircuitBreakerOpenError') {
        this.logger.warn(
          `Circuit breaker prevented alert delivery for ${payload.type}. Alert dropped to prevent cascading failures.`,
        );
      } else {
        this.logger.error(
          `Failed to send security alert after retries: ${error.message}`,
          error.stack,
        );
      }
      // Alerts should not break the main flow
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
