import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  NotificationChannel,
  ChannelHealthInfo,
  ChannelHealthStatus,
} from '../interfaces/notification-channel.interface';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { RetryUtil, RetryConfig } from '../../../common/utils/retry.util';
import { CircuitBreaker, CircuitBreakerConfig } from '../../../common/utils/circuit-breaker.util';

@Injectable()
export class WebhookChannel implements NotificationChannel {
  readonly name = 'webhook';
  private readonly logger = new Logger(WebhookChannel.name);
  private readonly enabled: boolean;
  private readonly webhookUrl: string | null;
  private readonly authToken: string | null;
  private readonly retryUtil: RetryUtil;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryConfig: Partial<RetryConfig>;
  private readonly circuitBreakerConfig: Partial<CircuitBreakerConfig>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.enabled = this.configService.get<boolean>('WEBHOOK_ENABLED', false);
    this.webhookUrl = this.configService.get<string>('WEBHOOK_URL', null);
    this.authToken = this.configService.get<string>('WEBHOOK_AUTH_TOKEN', null);

    this.retryConfig = {
      maxRetries: this.configService.get<number>('WEBHOOK_MAX_RETRIES', 3),
      baseDelay: this.configService.get<number>('WEBHOOK_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('WEBHOOK_MAX_DELAY', 30000),
      timeout: this.configService.get<number>('WEBHOOK_TIMEOUT', 5000),
    };

    this.circuitBreakerConfig = {
      failureThreshold: this.configService.get<number>('WEBHOOK_FAILURE_THRESHOLD', 5),
      failureCountWindow: this.configService.get<number>('WEBHOOK_FAILURE_WINDOW', 60000),
      openStateDuration: this.configService.get<number>('WEBHOOK_OPEN_DURATION', 30000),
      successThreshold: this.configService.get<number>('WEBHOOK_SUCCESS_THRESHOLD', 3),
    };

    this.retryUtil = new RetryUtil();
    this.circuitBreaker = new CircuitBreaker('WebhookChannel', this.circuitBreakerConfig);
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.enabled || !this.webhookUrl) {
      this.logger.debug('Webhook channel is disabled or not configured');
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const webhookPayload = {
      channel: this.name,
      timestamp: new Date().toISOString(),
      notification: {
        recipient: payload.recipient,
        subject: payload.subject,
        data: payload.data,
        priority: payload.priority,
        metadata: payload.metadata,
      },
    };

    await this.circuitBreaker.execute(async () => {
      return await this.retryUtil.executeWithRetry(
        async () => {
          const response = await firstValueFrom(
            this.httpService.post(this.webhookUrl!, webhookPayload, {
              headers,
              timeout: this.retryConfig.timeout || 5000,
            }),
          );

          if (response.status < 200 || response.status >= 300) {
            throw new Error(`Webhook returned status ${response.status}`);
          }

          return response;
        },
        this.retryConfig,
        `WebhookSend-${payload.recipient.email || payload.recipient.userId}`,
      );
    });

    this.logger.log(
      `Webhook notification sent for ${payload.recipient.email || payload.recipient.userId}`,
    );
  }

  async validateConfig(): Promise<boolean> {
    if (!this.enabled || !this.webhookUrl) {
      return false;
    }

    try {
      const headers: Record<string, string> = {};
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await firstValueFrom(
        this.httpService.head(this.webhookUrl, {
          headers,
          timeout: 5000,
        }),
      );

      return response.status >= 200 && response.status < 400;
    } catch (error) {
      this.logger.error('Webhook configuration validation failed', error);
      return false;
    }
  }

  async getHealthStatus(): Promise<ChannelHealthInfo> {
    if (!this.enabled || !this.webhookUrl) {
      return {
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        error: 'Webhook not configured',
        details: {
          configured: false,
        },
      };
    }

    const circuitStatus = this.circuitBreaker.getStatus();

    if (circuitStatus.state === 'OPEN') {
      return {
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        error: 'Circuit breaker is open',
        details: {
          configured: true,
          circuitBreaker: circuitStatus,
        },
      };
    }

    try {
      const isValid = await this.validateConfig();
      return {
        status: isValid ? ChannelHealthStatus.HEALTHY : ChannelHealthStatus.DEGRADED,
        lastChecked: new Date(),
        details: {
          configured: true,
          webhookReachable: isValid,
          circuitBreaker: circuitStatus,
        },
      };
    } catch (error) {
      return {
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        error: error.message,
        details: {
          configured: true,
          circuitBreaker: circuitStatus,
        },
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
