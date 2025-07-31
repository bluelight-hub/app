import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ChannelHealthInfo,
  ChannelHealthStatus,
  NotificationChannel,
} from '../interfaces/notification-channel.interface';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { RetryConfig, RetryUtil } from '../../../common/utils/retry.util';
import {
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitBreakerState,
} from '../../../common/utils/circuit-breaker.util';

/**
 * Webhook-Benachrichtigungskanal
 *
 * Implementiert den NotificationChannel für den Versand von Benachrichtigungen
 * an externe Systeme über HTTP-Webhooks mit Circuit Breaker und Retry-Mechanismen.
 *
 * **Hauptfunktionen:**
 * - Sendet Benachrichtigungen als HTTP POST-Requests an konfigurierte Webhook-URLs
 * - Implementiert robuste Fehlerbehandlung mit automatischen Wiederholungen
 * - Verwendet Circuit Breaker Pattern zur Vermeidung von Kaskadenfehlern
 * - Überwacht Gesundheitsstatus und bietet Konfigurationsvalidierung
 *
 * **Konfiguration:**
 * - WEBHOOK_ENABLED: Aktiviert/deaktiviert den Kanal
 * - WEBHOOK_URL: Ziel-URL für Webhook-Aufrufe
 * - WEBHOOK_AUTH_TOKEN: Bearer Token für Authentifizierung
 *
 * **Retry/Circuit Breaker Parameter:**
 * - WEBHOOK_MAX_RETRIES: Maximale Wiederholungen (Standard: 3)
 * - WEBHOOK_FAILURE_THRESHOLD: Fehlerschwelle für Circuit Breaker (Standard: 5)
 * - WEBHOOK_TIMEOUT: Request-Timeout in ms (Standard: 5000)
 *
 * @class WebhookChannel
 * @implements {NotificationChannel}
 * @example
 * ```typescript
 * const webhookChannel = new WebhookChannel(configService, httpService);
 *
 * await webhookChannel.send({
 *   recipient: { email: 'admin@example.com' },
 *   subject: 'Security Alert',
 *   data: {
 *     alertType: 'SUSPICIOUS_LOGIN',
 *     severity: 'HIGH',
 *     details: 'Login from unusual location'
 *   }
 * });
 * ```
 */
@Injectable()
export class WebhookChannel implements NotificationChannel {
  /**
   * Name des Benachrichtigungskanals
   * @readonly
   * @property {string} name - Eindeutige Identifikation des Kanals
   */
  readonly name = 'webhook';

  /**
   * Logger-Instanz für Webhook-Channel
   * @private
   * @readonly
   * @property {Logger} logger - NestJS Logger für Webhook-spezifische Logs
   */
  private readonly logger = new Logger(WebhookChannel.name);

  /**
   * Aktivierungsstatus des Webhook-Kanals
   * @private
   * @readonly
   * @property {boolean} enabled - Aus WEBHOOK_ENABLED Umgebungsvariable
   */
  private readonly enabled: boolean;

  /**
   * URL des Webhook-Endpunkts
   * @private
   * @readonly
   * @property {string | null} webhookUrl - Ziel-URL für HTTP-Requests
   */
  private readonly webhookUrl: string | null;

  /**
   * Authentifizierungs-Token für Webhook-Aufrufe
   * @private
   * @readonly
   * @property {string | null} authToken - Bearer Token für Authorization Header
   */
  private readonly authToken: string | null;

  /**
   * Utility für Retry-Mechanismus
   * @private
   * @readonly
   * @property {RetryUtil} retryUtil - Implementiert exponential backoff
   */
  private readonly retryUtil: RetryUtil;

  /**
   * Circuit Breaker für Webhook-Aufrufe
   * @private
   * @readonly
   * @property {CircuitBreaker} circuitBreaker - Verhindert Kaskadeneffekte
   */
  private readonly circuitBreaker: CircuitBreaker;

  /**
   * Konfiguration für Retry-Verhalten
   * @private
   * @readonly
   * @property {Partial<RetryConfig>} retryConfig - Wiederholungsparameter
   */
  private readonly retryConfig: Partial<RetryConfig>;

  /**
   * Konfiguration für Circuit Breaker
   * @private
   * @readonly
   * @property {Partial<CircuitBreakerConfig>} circuitBreakerConfig - Circuit Breaker Parameter
   */
  private readonly circuitBreakerConfig: Partial<CircuitBreakerConfig>;

  /**
   * Erstellt eine neue Webhook-Channel-Instanz
   *
   * @param configService Service für Konfigurationszugriff
   * @param httpService Service für HTTP-Requests
   */
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

  /**
   * Sendet eine Benachrichtigung über den Webhook-Kanal
   *
   * @param payload Die zu sendende Benachrichtigung
   * @throws Error wenn der Webhook-Aufruf fehlschlägt
   * @example
   * ```typescript
   * await webhookChannel.send({
   *   recipient: { email: 'user@example.com' },
   *   subject: 'Security Alert',
   *   data: { type: 'login_anomaly' }
   * });
   * ```
   */
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

  /**
   * Validiert die Webhook-Konfiguration
   *
   * @returns true wenn die Konfiguration gültig ist, false sonst
   */
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

  /**
   * Prüft den Gesundheitsstatus des Webhook-Kanals
   *
   * @returns Informationen zum Gesundheitsstatus
   */
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

    if (circuitStatus.state === CircuitBreakerState.OPEN) {
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

  /**
   * Prüft, ob der Webhook-Kanal aktiviert ist
   *
   * @returns true wenn aktiviert, false sonst
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
