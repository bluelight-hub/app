import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationChannel } from '../interfaces/notification-channel.interface';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { NotificationQueue } from '../queues/notification.queue';
import { EmailChannel } from '../channels/email.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import { NotificationTemplateService } from './notification-template.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationStatus } from '../../../../prisma/generated/prisma/enums';

/**
 * Hauptservice für das Notification System
 *
 * Koordiniert das Senden von Benachrichtigungen über verschiedene Channels
 * wie E-Mail und Webhooks. Unterstützt synchrones und asynchrones Senden,
 * Template-basierte Nachrichten und umfassendes Logging.
 *
 * Features:
 * - Multi-Channel-Support (E-Mail, Webhook, erweiterbar)
 * - Template-Engine für wiederverwendbare Nachrichten
 * - Asynchrone Verarbeitung über Queues
 * - Umfassendes Logging und Event-Emission
 * - Channel-Health-Monitoring
 *
 * @class NotificationService
 * @injectable
 *
 * @example
 * ```typescript
 * // Direkte Benachrichtigung senden
 * await notificationService.send({
 *   channel: 'email',
 *   recipient: { email: 'user@example.com' },
 *   subject: 'Willkommen',
 *   templates: {
 *     html: '<h1>Willkommen!</h1>',
 *     text: 'Willkommen!'
 *   }
 * });
 *
 * // Template-basierte Benachrichtigung
 * await notificationService.sendWithTemplate(
 *   'email',
 *   { email: 'user@example.com' },
 *   'welcome',
 *   { name: 'Max Mustermann' },
 *   'de'
 * );
 *
 * // Asynchrone Benachrichtigung
 * const notificationId = await notificationService.queue({
 *   channel: 'webhook',
 *   recipient: { url: 'https://api.example.com/webhook' },
 *   data: { event: 'user.created', userId: '123' }
 * });
 * ```
 */
@Injectable()
export class NotificationService {
  /**
   * Logger-Instanz für Service-Meldungen
   * @private
   * @property {Logger} logger
   */
  private readonly logger = new Logger(NotificationService.name);

  /**
   * Map der registrierten Notification-Channels
   * @private
   * @property {Map<string, NotificationChannel>} channels
   */
  private readonly channels: Map<string, NotificationChannel> = new Map();

  /**
   * Konstruktor des NotificationService
   *
   * @param {EmailChannel} emailChannel - E-Mail Channel Implementation
   * @param {WebhookChannel} webhookChannel - Webhook Channel Implementation
   * @param {NotificationQueue} notificationQueue - Queue für asynchrone Verarbeitung
   * @param {NotificationTemplateService} templateService - Service für Template-Rendering
   * @param {PrismaService} prismaService - Datenbankzugriff
   * @param {EventEmitter2} eventEmitter - Event-System für Benachrichtigungen
   */
  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly webhookChannel: WebhookChannel,
    private readonly notificationQueue: NotificationQueue,
    private readonly templateService: NotificationTemplateService,
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.registerChannels();
  }

  /**
   * Registriert alle verfügbaren Notification-Channels
   *
   * Wird im Konstruktor aufgerufen um alle Channels zu initialisieren.
   * Neue Channels können hier hinzugefügt werden.
   *
   * @private
   * @returns {void}
   */
  private registerChannels(): void {
    this.channels.set(this.emailChannel.name, this.emailChannel);
    this.channels.set(this.webhookChannel.name, this.webhookChannel);
  }

  /**
   * Sendet eine Benachrichtigung über den angegebenen Channel
   *
   * Führt synchrones Senden durch mit vollständigem Logging und
   * Event-Emission. Bei Fehlern wird der Status entsprechend
   * aktualisiert und ein Fehler-Event emittiert.
   *
   * @param {NotificationPayload} payload - Die zu sendende Benachrichtigung
   * @returns {Promise<void>} Promise ohne Rückgabewert
   * @throws {Error} Wenn der Channel unbekannt ist oder das Senden fehlschlägt
   * @emits notification.sent - Bei erfolgreichem Versand
   * @emits notification.failed - Bei Fehler beim Versand
   *
   * @example
   * ```typescript
   * try {
   *   await notificationService.send({
   *     channel: 'email',
   *     recipient: { email: 'admin@example.com' },
   *     subject: 'Sicherheitswarnung',
   *     templates: {
   *       html: '<p>Verdächtige Aktivität erkannt</p>',
   *       text: 'Verdächtige Aktivität erkannt'
   *     },
   *     priority: 'high'
   *   });
   * } catch (error) {
   *   logger.error('Benachrichtigung fehlgeschlagen:', error);
   * }
   * ```
   */
  async send(payload: NotificationPayload): Promise<void> {
    const channel = this.channels.get(payload.channel);

    if (!channel) {
      throw new Error(`Unknown notification channel: ${payload.channel}`);
    }

    if (!channel.isEnabled()) {
      this.logger.debug(`Channel ${payload.channel} is disabled`);
      return;
    }

    // Log notification attempt
    const log = await this.createNotificationLog(payload);

    try {
      await channel.send(payload);

      // Update log on success
      await this.updateNotificationLog(log.id, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      // Emit success event
      this.eventEmitter.emit('notification.sent', {
        channel: payload.channel,
        recipient: payload.recipient,
        notificationId: log.id,
      });
    } catch (error) {
      this.logger.error(`Failed to send notification via ${payload.channel}`, error);

      // Update log on failure
      await this.updateNotificationLog(log.id, {
        status: NotificationStatus.FAILED,
        error: error.message,
      });

      // Emit failure event
      this.eventEmitter.emit('notification.failed', {
        channel: payload.channel,
        recipient: payload.recipient,
        notificationId: log.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Fügt eine Benachrichtigung zur Queue für asynchrone Verarbeitung hinzu
   *
   * Ideal für nicht-kritische Benachrichtigungen oder wenn eine große
   * Anzahl von Benachrichtigungen versendet werden muss. Die eigentliche
   * Verarbeitung erfolgt durch den NotificationProcessor.
   *
   * @param {NotificationPayload} payload - Die zu sendende Benachrichtigung
   * @returns {Promise<string>} ID der erstellten Benachrichtigung
   *
   * @example
   * ```typescript
   * // Newsletter an viele Empfänger
   * const notificationIds = await Promise.all(
   *   recipients.map(recipient =>
   *     notificationService.queue({
   *       channel: 'email',
   *       recipient: { email: recipient.email },
   *       subject: 'Newsletter',
   *       templates: newsletterTemplates,
   *       priority: 'low'
   *     })
   *   )
   * );
   * ```
   */
  async queue(payload: NotificationPayload): Promise<string> {
    // Create log entry
    const log = await this.createNotificationLog(payload);

    // Add metadata with notification ID
    payload.metadata = {
      ...payload.metadata,
      notificationId: log.id,
    };

    // Queue the notification
    await this.notificationQueue.add(payload);

    return log.id;
  }

  /**
   * Sendet eine Benachrichtigung unter Verwendung eines Templates
   *
   * Vereinfacht das Senden von standardisierten Nachrichten durch
   * Verwendung vordefinierter Templates. Templates können lokalisiert
   * werden und unterstützen dynamische Daten.
   *
   * @param {string} channel - Name des zu verwendenden Channels
   * @param {NotificationPayload['recipient']} recipient - Empfänger-Informationen
   * @param {string} templateType - Typ des zu verwendenden Templates
   * @param {Record<string, any>} data - Daten für das Template-Rendering
   * @param {string} [locale='en'] - Sprache für das Template
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Willkommens-E-Mail mit Template
   * await notificationService.sendWithTemplate(
   *   'email',
   *   { email: 'neu@example.com' },
   *   'user-welcome',
   *   {
   *     userName: 'Max Mustermann',
   *     activationLink: 'https://example.com/activate/123'
   *   },
   *   'de'
   * );
   *
   * // Passwort-Reset mit Template
   * await notificationService.sendWithTemplate(
   *   'email',
   *   { email: 'user@example.com' },
   *   'password-reset',
   *   {
   *     resetLink: 'https://example.com/reset/456',
   *     validUntil: new Date(Date.now() + 3600000)
   *   }
   * );
   * ```
   */
  async sendWithTemplate(
    channel: string,
    recipient: NotificationPayload['recipient'],
    templateType: string,
    data: Record<string, any>,
    locale = 'en',
  ): Promise<void> {
    const rendered = await this.templateService.renderTemplate(templateType, data, locale);

    const payload: NotificationPayload = {
      channel,
      recipient,
      subject: rendered.subject,
      templates: {
        html: rendered.html,
        text: rendered.text,
      },
      data,
    };

    await this.send(payload);
  }

  /**
   * Gibt alle verfügbaren Channels zurück
   *
   * Nützlich für UI-Elemente oder Konfigurationsprüfungen.
   *
   * @returns {string[]} Array der Channel-Namen
   *
   * @example
   * ```typescript
   * const channels = notificationService.getChannels();
   * logger.info('Verfügbare Channels:', channels);
   * // ['email', 'webhook']
   * ```
   */
  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Gibt nur die aktivierten Channels zurück
   *
   * Filtert die verfügbaren Channels und gibt nur die zurück,
   * die aktuell aktiviert sind.
   *
   * @returns {string[]} Array der aktivierten Channel-Namen
   *
   * @example
   * ```typescript
   * const enabledChannels = notificationService.getEnabledChannels();
   * if (enabledChannels.includes('email')) {
   *   logger.info('E-Mail-Benachrichtigungen sind verfügbar');
   * }
   * ```
   */
  getEnabledChannels(): string[] {
    return Array.from(this.channels.entries())
      .filter(([_, channel]) => channel.isEnabled())
      .map(([name]) => name);
  }

  /**
   * Validiert die Konfiguration eines Channels
   *
   * Prüft ob ein Channel korrekt konfiguriert ist und verwendet
   * werden kann.
   *
   * @param {string} channelName - Name des zu validierenden Channels
   * @returns {Promise<boolean>} true wenn Channel valide ist
   *
   * @example
   * ```typescript
   * const isValid = await notificationService.validateChannel('email');
   * if (!isValid) {
   *   logger.error('E-Mail-Channel ist nicht korrekt konfiguriert');
   * }
   * ```
   */
  async validateChannel(channelName: string): Promise<boolean> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      return false;
    }
    return channel.validateConfig();
  }

  /**
   * Gibt den Health-Status eines Channels zurück
   *
   * Prüft die Verfügbarkeit und Funktionsfähigkeit eines Channels.
   * Nützlich für Monitoring und Health-Checks.
   *
   * @param {string} channelName - Name des zu prüfenden Channels
   * @returns {Promise<any>} Health-Status des Channels
   * @throws {Error} Wenn der Channel unbekannt ist
   *
   * @example
   * ```typescript
   * try {
   *   const health = await notificationService.getChannelHealth('email');
   *   logger.info('E-Mail-Service Status:', health);
   * } catch (error) {
   *   logger.error('Channel nicht gefunden');
   * }
   * ```
   */
  async getChannelHealth(channelName: string) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Unknown channel: ${channelName}`);
    }
    return channel.getHealthStatus();
  }

  /**
   * Erstellt einen Notification-Log-Eintrag in der Datenbank
   *
   * Protokolliert jede Benachrichtigung für Audit-Zwecke und
   * Fehleranalyse.
   *
   * @private
   * @param {NotificationPayload} payload - Die zu protokollierende Benachrichtigung
   * @returns {Promise<any>} Der erstellte Log-Eintrag
   */
  private async createNotificationLog(payload: NotificationPayload) {
    return this.prismaService.notificationLog.create({
      data: {
        channel: payload.channel,
        recipient: JSON.stringify(payload.recipient),
        subject: payload.subject,
        payload: JSON.stringify(payload),
        status: NotificationStatus.QUEUED,
        priority: payload.priority,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      },
    });
  }

  /**
   * Aktualisiert einen Notification-Log-Eintrag
   *
   * Wird verwendet um den Status und andere Informationen nach
   * dem Versand zu aktualisieren.
   *
   * @private
   * @param {string} id - ID des zu aktualisierenden Log-Eintrags
   * @param {any} data - Zu aktualisierende Daten
   * @returns {Promise<any>} Der aktualisierte Log-Eintrag
   */
  private async updateNotificationLog(id: string, data: any) {
    return this.prismaService.notificationLog.update({
      where: { id },
      data,
    });
  }
}
