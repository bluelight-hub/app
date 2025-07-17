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
 * Koordiniert das Senden von Benachrichtigungen über verschiedene Channels
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly channels: Map<string, NotificationChannel> = new Map();

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

  private registerChannels(): void {
    this.channels.set(this.emailChannel.name, this.emailChannel);
    this.channels.set(this.webhookChannel.name, this.webhookChannel);
  }

  /**
   * Send a notification through the specified channel
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
   * Queue a notification for async processing
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
   * Send a notification using a template
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
   * Get available channels
   */
  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Get enabled channels
   */
  getEnabledChannels(): string[] {
    return Array.from(this.channels.entries())
      .filter(([_, channel]) => channel.isEnabled())
      .map(([name]) => name);
  }

  /**
   * Validate channel configuration
   */
  async validateChannel(channelName: string): Promise<boolean> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      return false;
    }
    return channel.validateConfig();
  }

  /**
   * Get channel health status
   */
  async getChannelHealth(channelName: string) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Unknown channel: ${channelName}`);
    }
    return channel.getHealthStatus();
  }

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

  private async updateNotificationLog(id: string, data: any) {
    return this.prismaService.notificationLog.update({
      where: { id },
      data,
    });
  }
}
