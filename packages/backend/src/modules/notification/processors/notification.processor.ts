import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueStalled,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { NOTIFICATION_QUEUE } from '../constants/notification.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationStatus } from '../../../../prisma/generated/prisma/enums';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prismaService: PrismaService,
  ) {}

  @Process()
  async process(job: Job<NotificationPayload>): Promise<void> {
    const { data } = job;
    const notificationId = data.metadata?.notificationId;

    try {
      // Update status to processing
      if (notificationId) {
        await this.prismaService.notificationLog.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.PROCESSING,
            attempts: job.attemptsMade + 1,
          },
        });
      }

      // Send the notification
      await this.notificationService.send(data);

      // Update status to sent
      if (notificationId) {
        await this.prismaService.notificationLog.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            attempts: job.attemptsMade + 1,
          },
        });
      }
    } catch (error) {
      // Update status to failed
      if (notificationId) {
        await this.prismaService.notificationLog.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.FAILED,
            attempts: job.attemptsMade + 1,
            error: error.message,
          },
        });
      }
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<NotificationPayload>): void {
    this.logger.log(
      `Processing notification job ${job.id} to ${job.data.recipient.email || job.data.recipient.userId}`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<NotificationPayload>): void {
    this.logger.log(`Notification job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  async onFailed(job: Job<NotificationPayload>, error: Error): Promise<void> {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`);

    // Mark as permanently failed if this was the last attempt
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      const notificationId = job.data.metadata?.notificationId;
      if (notificationId) {
        try {
          await this.prismaService.notificationLog.update({
            where: { id: notificationId },
            data: {
              status: NotificationStatus.FAILED,
              error: `Final failure after ${job.attemptsMade} attempts`,
            },
          });
        } catch (dbError) {
          this.logger.error('Failed to update notification log', dbError);
        }
      }
    }
  }

  @OnQueueStalled()
  onStalled(job: Job<NotificationPayload>): void {
    this.logger.warn(`Notification job ${job.id} stalled`);
  }
}
