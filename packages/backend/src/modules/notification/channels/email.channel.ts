import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import {
  NotificationChannel,
  ChannelHealthInfo,
  ChannelHealthStatus,
} from '../interfaces/notification-channel.interface';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { RetryUtil, RetryConfig } from '../../../common/utils/retry.util';

/**
 * E-Mail-Benachrichtigungskanal
 *
 * Implementiert den NotificationChannel für den Versand von E-Mail-Benachrichtigungen
 * über SMTP mit Unterstützung für HTML-Templates und Retry-Mechanismen.
 *
 * Features:
 * - SMTP-basierter E-Mail-Versand
 * - HTML und Text-Template-Unterstützung mit Handlebars
 * - Automatische Retry-Mechanismen bei Fehlern
 * - Konfigurierbare Timeouts und Verzögerungen
 * - Health-Check-Funktionalität
 *
 * @class EmailChannel
 * @implements {NotificationChannel}
 * @injectable
 *
 * @example
 * ```typescript
 * const emailChannel = new EmailChannel(configService);
 *
 * // E-Mail senden
 * await emailChannel.send({
 *   recipient: { email: 'user@example.com' },
 *   subject: 'Sicherheitsbenachrichtigung',
 *   data: { alertType: 'login_anomaly', timestamp: new Date() },
 *   templates: {
 *     html: '<h1>Alert: {{alertType}}</h1>',
 *     text: 'Alert: {{alertType}}'
 *   }
 * });
 *
 * // Health-Status prüfen
 * const health = await emailChannel.getHealthStatus();
 * if (health.status === ChannelHealthStatus.UNHEALTHY) {
 *   logger.error('E-Mail-Kanal nicht verfügbar');
 * }
 * ```
 */
@Injectable()
export class EmailChannel implements NotificationChannel {
  /**
   * Name des Benachrichtigungskanals
   * @readonly
   * @property {string} name
   */
  readonly name = 'email';

  /**
   * Logger-Instanz für Kanal-spezifisches Logging
   * @private
   * @readonly
   * @property {Logger} logger
   */
  private readonly logger = new Logger(EmailChannel.name);

  /**
   * Aktivierungsstatus des E-Mail-Kanals
   * @private
   * @readonly
   * @property {boolean} enabled
   */
  private readonly enabled: boolean;

  /**
   * Nodemailer-Transporter für SMTP-Verbindungen
   * @private
   * @property {Transporter | null} transporter
   */
  private transporter: Transporter | null = null;

  /**
   * Utility für Retry-Mechanismen
   * @private
   * @readonly
   * @property {RetryUtil} retryUtil
   */
  private readonly retryUtil: RetryUtil;

  /**
   * Konfiguration für Retry-Verhalten
   * @private
   * @readonly
   * @property {Partial<RetryConfig>} retryConfig
   */
  private readonly retryConfig: Partial<RetryConfig>;

  /**
   * Erstellt eine neue E-Mail-Channel-Instanz
   *
   * Lädt die E-Mail-Konfiguration und initialisiert den SMTP-Transporter,
   * falls der Kanal aktiviert ist. Konfiguriert auch Retry-Mechanismen
   * für fehlerhafte Sendeversuche.
   *
   * @param {ConfigService} configService - Service für Konfigurationszugriff
   *
   * @example
   * ```typescript
   * // Erforderliche Umgebungsvariablen:
   * // EMAIL_ENABLED=true
   * // EMAIL_HOST=smtp.example.com
   * // EMAIL_PORT=587
   * // EMAIL_USER=noreply@example.com
   * // EMAIL_PASS=secret
   * // EMAIL_SECURE=false
   * // EMAIL_MAX_RETRIES=3
   * // EMAIL_BASE_DELAY=1000
   * // EMAIL_MAX_DELAY=30000
   * // EMAIL_TIMEOUT=5000
   * ```
   */
  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('EMAIL_ENABLED', false);
    this.retryUtil = new RetryUtil();

    this.retryConfig = {
      maxRetries: this.configService.get<number>('EMAIL_MAX_RETRIES', 3),
      baseDelay: this.configService.get<number>('EMAIL_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('EMAIL_MAX_DELAY', 30000),
      timeout: this.configService.get<number>('EMAIL_TIMEOUT', 5000),
    };

    if (this.enabled) {
      this.initializeTransporter();
    }
  }

  /**
   * Initialisiert den E-Mail-Transporter mit SMTP-Konfiguration
   *
   * Erstellt einen Nodemailer-Transporter mit den konfigurierten
   * SMTP-Einstellungen. Prüft auf vollständige Konfiguration
   * und deaktiviert den Kanal bei fehlenden Parametern.
   *
   * @private
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Wird automatisch im Konstruktor aufgerufen wenn EMAIL_ENABLED=true
   * // Benötigt mindestens EMAIL_HOST und EMAIL_PORT
   * // Optional: EMAIL_USER, EMAIL_PASS für Authentifizierung
   * ```
   */
  private initializeTransporter(): void {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const secure = this.configService.get<boolean>('EMAIL_SECURE', false);
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');

    if (!host || !port) {
      this.logger.warn('Email configuration incomplete, email channel disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /**
   * Sendet eine E-Mail-Benachrichtigung mit Retry-Mechanismus
   *
   * Diese Methode versendet E-Mails über den konfigurierten SMTP-Transporter.
   * Bei fehlerhaften Sendeversuchen wird automatisch ein Retry-Mechanismus
   * mit exponentieller Backoff-Strategie angewendet.
   *
   * **Template-Verarbeitung:**
   * - Handlebars wird für Template-Rendering verwendet
   * - Unterstützt HTML und Plain-Text Templates
   * - Falls keine Templates angegeben werden, wird ein Standard-Layout verwendet
   *
   * **Retry-Verhalten:**
   * - Konfigurierbare Anzahl von Wiederholungsversuchen
   * - Exponentieller Backoff zwischen Versuchen
   * - Timeout-Behandlung für langsame SMTP-Server
   *
   * @param {NotificationPayload} payload Die zu sendende Benachrichtigung mit Empfänger und Inhalt
   * @returns {Promise<void>} Promise, das bei erfolgreichem Versand erfüllt wird
   * @throws {Error} bei persistenten Versandfehlern nach allen Retry-Versuchen
   *
   * @example
   * ```typescript
   * // Mit Custom-Templates
   * await emailChannel.send({
   *   recipient: { email: 'user@example.com' },
   *   subject: 'Sicherheitswarnung',
   *   data: { alertType: 'login_anomaly', timestamp: new Date() },
   *   templates: {
   *     html: '<h1>Sicherheitswarnung</h1><p>{{alertType}} um {{timestamp}}</p>',
   *     text: 'Sicherheitswarnung: {{alertType}} um {{timestamp}}'
   *   }
   * });
   *
   * // Mit Standard-Template
   * await emailChannel.send({
   *   recipient: { email: 'admin@example.com' },
   *   subject: 'System-Benachrichtigung',
   *   data: { message: 'Server neugestartet', time: new Date() }
   * });
   * ```
   */
  async send(payload: NotificationPayload): Promise<void> {
    if (!this.enabled || !this.transporter) {
      this.logger.debug('Email channel is disabled or not configured');
      return;
    }

    const { recipient, subject, templates, data } = payload;

    let html: string;
    let text: string;

    if (templates?.html || templates?.text) {
      const htmlTemplate = Handlebars.compile(templates.html || '');
      const textTemplate = Handlebars.compile(templates.text || '');
      html = htmlTemplate(data);
      text = textTemplate(data);
    } else {
      // Default templates
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${subject}</h2>
          <div>${JSON.stringify(data, null, 2).replace(/\n/g, '<br>')}</div>
        </div>
      `;
      text = `${subject}\n\n${JSON.stringify(data, null, 2)}`;
    }

    const fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Bluelight Hub');
    const fromAddress = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');

    await this.retryUtil.executeWithRetry(
      async () => {
        await this.transporter!.sendMail({
          from: {
            name: fromName,
            address: fromAddress,
          },
          to: recipient.email,
          subject,
          html,
          text,
        });
      },
      this.retryConfig,
      `EmailSend-${recipient.email}`,
    );

    this.logger.log(`Email sent to ${recipient.email}`);
  }

  /**
   * Validiert die E-Mail-Konfiguration durch SMTP-Verifizierung
   *
   * Führt einen Verbindungstest zum SMTP-Server durch, um
   * sicherzustellen, dass die Konfiguration korrekt ist.
   *
   * @returns {Promise<boolean>} true wenn die Konfiguration gültig ist, false sonst
   *
   * @example
   * ```typescript
   * const isValid = await emailChannel.validateConfig();
   * if (!isValid) {
   *   logger.error('E-Mail-Konfiguration ungültig');
   *   // Fallback auf anderen Benachrichtigungskanal
   * }
   * ```
   */
  async validateConfig(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email configuration validation failed', error);
      return false;
    }
  }

  /**
   * Prüft den Gesundheitsstatus des E-Mail-Kanals
   *
   * Führt eine Verbindungsprüfung zum SMTP-Server durch und
   * liefert detaillierte Statusinformationen zurück.
   *
   * @returns {Promise<ChannelHealthInfo>} Informationen zum Gesundheitsstatus mit Verbindungsdetails
   *
   * @example
   * ```typescript
   * const health = await emailChannel.getHealthStatus();
   *
   * // Mögliche Status:
   * // - HEALTHY: Verbindung erfolgreich
   * // - UNHEALTHY: Verbindung fehlgeschlagen oder nicht konfiguriert
   * // - DEGRADED: Teilweise Probleme (nicht verwendet in dieser Implementierung)
   *
   * if (health.status === ChannelHealthStatus.UNHEALTHY) {
   *   logger.error('E-Mail-Kanal nicht verfügbar:', health.error);
   *   logger.error('Details:', health.details);
   * }
   * ```
   */
  async getHealthStatus(): Promise<ChannelHealthInfo> {
    if (!this.transporter) {
      return {
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        error: 'Email transporter not configured',
        details: {
          transporterConfigured: false,
        },
      };
    }

    try {
      await this.transporter.verify();
      return {
        status: ChannelHealthStatus.HEALTHY,
        lastChecked: new Date(),
        details: {
          transporterConfigured: true,
          verificationPassed: true,
        },
      };
    } catch (error) {
      return {
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        error: error.message,
        details: {
          transporterConfigured: true,
          verificationPassed: false,
        },
      };
    }
  }

  /**
   * Prüft, ob der E-Mail-Kanal aktiviert ist
   *
   * Gibt den Aktivierungsstatus zurück, der über die
   * Umgebungsvariable EMAIL_ENABLED gesteuert wird.
   *
   * @returns {boolean} true wenn aktiviert, false sonst
   *
   * @example
   * ```typescript
   * if (emailChannel.isEnabled()) {
   *   // E-Mail als primären Benachrichtigungskanal verwenden
   *   await emailChannel.send(notification);
   * } else {
   *   // Auf alternativen Kanal ausweichen
   *   await webhookChannel.send(notification);
   * }
   * ```
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
