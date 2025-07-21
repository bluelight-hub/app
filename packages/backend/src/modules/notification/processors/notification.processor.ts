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

/**
 * Prozessor für die asynchrone Verarbeitung von Benachrichtigungen
 *
 * Verarbeitet Benachrichtigungen aus der Bull-Queue und aktualisiert
 * den Status in der Datenbank während des gesamten Lebenszyklus
 *
 * @class NotificationProcessor
 */
@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  /**
   * Erstellt eine neue NotificationProcessor-Instanz
   *
   * @param notificationService Service für den Benachrichtigungsversand
   * @param prismaService Service für Datenbankzugriffe
   */
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Verarbeitet einen Benachrichtigungs-Job aus der Queue
   *
   * @param job Der zu verarbeitende Job mit Benachrichtigungsdaten
   * @throws Error wenn der Benachrichtigungsversand fehlschlägt
   * @example
   * ```typescript
   * // Job wird automatisch von Bull Queue aufgerufen
   * await processor.process({
   *   data: {
   *     recipient: { email: 'user@example.com' },
   *     subject: 'Neue Nachricht',
   *     data: { message: 'Hallo Welt' }
   *   }
   * });
   * ```
   */
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

  /**
   * Wird aufgerufen, wenn ein Job aktiv verarbeitet wird
   *
   * @param job Der aktive Job
   */
  @OnQueueActive()
  onActive(job: Job<NotificationPayload>): void {
    this.logger.log(
      `Processing notification job ${job.id} to ${job.data.recipient.email || job.data.recipient.userId}`,
    );
  }

  /**
   * Wird aufgerufen, wenn ein Job erfolgreich abgeschlossen wurde
   *
   * @param job Der abgeschlossene Job
   */
  @OnQueueCompleted()
  onCompleted(job: Job<NotificationPayload>): void {
    this.logger.log(`Notification job ${job.id} completed successfully`);
  }

  /**
   * Wird aufgerufen, wenn ein Job fehlgeschlagen ist
   *
   * @param job Der fehlgeschlagene Job
   * @param error Der aufgetretene Fehler
   */
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

  /**
   * Wird aufgerufen, wenn ein Job blockiert ist
   *
   * @param job Der blockierte Job
   */
  @OnQueueStalled()
  onStalled(job: Job<NotificationPayload>): void {
    this.logger.warn(`Notification job ${job.id} stalled`);
  }
}
