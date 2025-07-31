import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationService } from './services/notification.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationHealthService } from './services/notification-health.service';
import { EmailChannel } from './channels/email.channel';
import { WebhookChannel } from './channels/webhook.channel';
import { NotificationController } from './controllers/notification.controller';
import { NotificationQueue } from './queues/notification.queue';
import { NotificationProcessor } from './processors/notification.processor';
import { NOTIFICATION_QUEUE } from './constants/notification.constants';

/**
 * Notification module that provides a pluggable notification system
 * with support for multiple channels (email, webhook).
 * Includes templating, retry logic, and health monitoring.
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    PrismaModule,
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationTemplateService,
    NotificationHealthService,
    EmailChannel,
    WebhookChannel,
    NotificationQueue,
    NotificationProcessor,
  ],
  exports: [NotificationService, NotificationTemplateService],
})
export class NotificationModule {}
