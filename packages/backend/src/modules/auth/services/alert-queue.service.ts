import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AlertStatus, SecurityAlert } from '@prisma/generated/prisma';
import { AlertDispatcherService } from './alert-dispatcher.service';
import { PrismaService } from '@/prisma/prisma.service';

export interface AlertQueueJob {
  alertId: string;
  priority: number;
  retryCount?: number;
  lastError?: string;
}

@Injectable()
export class AlertQueueService implements OnModuleInit {
  private readonly logger = new Logger(AlertQueueService.name);

  constructor(
    @InjectQueue('alerts') private alertQueue: Queue<AlertQueueJob>,
    private readonly alertDispatcher: AlertDispatcherService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Configure queue processors
    await this.setupQueueProcessors();

    // Clean up stale jobs on startup
    await this.cleanupStaleJobs();
  }

  /**
   * Add an alert to the processing queue
   */
  async queueAlert(alert: SecurityAlert): Promise<void> {
    const priority = this.calculatePriority(alert);

    const job: AlertQueueJob = {
      alertId: alert.id,
      priority,
      retryCount: 0,
    };

    const options = {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: true,
      removeOnFail: false,
    };

    await this.alertQueue.add('process-alert', job, options);

    this.logger.log(`Alert ${alert.id} queued with priority ${priority}`);
  }

  /**
   * Process alerts in batch for efficiency
   */
  async queueBatchAlerts(alerts: SecurityAlert[]): Promise<void> {
    const jobs = alerts.map((alert) => ({
      name: 'process-alert',
      data: {
        alertId: alert.id,
        priority: this.calculatePriority(alert),
        retryCount: 0,
      } as AlertQueueJob,
      opts: {
        priority: this.calculatePriority(alert),
        attempts: 3,
        backoff: {
          type: 'exponential' as const,
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }));

    await this.alertQueue.addBulk(jobs);

    this.logger.log(`Batch queued ${alerts.length} alerts`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.alertQueue.getWaitingCount(),
      this.alertQueue.getActiveCount(),
      this.alertQueue.getCompletedCount(),
      this.alertQueue.getFailedCount(),
      this.alertQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause alert processing
   */
  async pauseProcessing(): Promise<void> {
    await this.alertQueue.pause();
    this.logger.warn('Alert queue processing paused');
  }

  /**
   * Resume alert processing
   */
  async resumeProcessing(): Promise<void> {
    await this.alertQueue.resume();
    this.logger.log('Alert queue processing resumed');
  }

  /**
   * Clear failed jobs
   */
  async clearFailedJobs(): Promise<void> {
    const failed = await this.alertQueue.getFailed();
    await Promise.all(failed.map((job) => job.remove()));
    this.logger.log(`Cleared ${failed.length} failed jobs`);
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(): Promise<void> {
    const failed = await this.alertQueue.getFailed();

    for (const job of failed) {
      await job.retry();
    }

    this.logger.log(`Retrying ${failed.length} failed jobs`);
  }

  /**
   * Get job details by alert ID
   */
  async getJobByAlertId(alertId: string): Promise<any> {
    const jobs = await this.alertQueue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ]);
    return jobs.find((job) => job.data.alertId === alertId);
  }

  /**
   * Remove a specific job by alert ID
   */
  async removeJobByAlertId(alertId: string): Promise<boolean> {
    const job = await this.getJobByAlertId(alertId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  private async setupQueueProcessors() {
    // Main alert processor
    this.alertQueue.process('process-alert', 5, async (job) => {
      const { alertId, retryCount } = job.data;

      try {
        // Fetch the alert
        const alert = await this.prisma.securityAlert.findUnique({
          where: { id: alertId },
        });

        if (!alert) {
          throw new Error(`Alert ${alertId} not found`);
        }

        // Skip if already processed
        if (alert.status === AlertStatus.DISPATCHED || alert.status === AlertStatus.RESOLVED) {
          this.logger.debug(`Alert ${alertId} already processed, skipping`);
          return;
        }

        // Update status to processing
        await this.prisma.securityAlert.update({
          where: { id: alertId },
          data: { status: AlertStatus.PROCESSING },
        });

        // Dispatch the alert
        const result = await this.alertDispatcher.dispatchAlert(alert);

        // Update alert based on dispatch result
        if (result.success) {
          await this.prisma.securityAlert.update({
            where: { id: alertId },
            data: {
              status: AlertStatus.DISPATCHED,
              dispatchedChannels: result.dispatchedChannels,
              lastDispatchAt: new Date(),
              dispatchAttempts: { increment: 1 },
            },
          });
        } else {
          // Update with errors but don't fail the job if partial success
          await this.prisma.securityAlert.update({
            where: { id: alertId },
            data: {
              status:
                result.dispatchedChannels.length > 0 ? AlertStatus.DISPATCHED : AlertStatus.FAILED,
              dispatchedChannels: result.dispatchedChannels,
              dispatchErrors: result.errors,
              lastDispatchAt: new Date(),
              dispatchAttempts: { increment: 1 },
            },
          });

          if (result.dispatchedChannels.length === 0) {
            throw new Error(`All dispatch attempts failed: ${JSON.stringify(result.errors)}`);
          }
        }

        this.logger.log(`Alert ${alertId} processed successfully`);
      } catch (error) {
        this.logger.error(`Failed to process alert ${alertId}:`, error);

        // Update alert with error
        await this.prisma.securityAlert.update({
          where: { id: alertId },
          data: {
            dispatchErrors: {
              message: error.message,
              retryCount: retryCount + 1,
              timestamp: new Date().toISOString(),
            },
          },
        });

        throw error; // Re-throw to trigger Bull retry
      }
    });

    // Queue event handlers
    this.alertQueue.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed for alert ${job.data.alertId}`);
    });

    this.alertQueue.on('failed', (job, err) => {
      this.logger.error(`Job ${job.id} failed for alert ${job.data.alertId}:`, err);
    });

    this.alertQueue.on('stalled', (job) => {
      this.logger.warn(`Job ${job.id} stalled for alert ${job.data.alertId}`);
    });
  }

  private calculatePriority(alert: SecurityAlert): number {
    // Higher priority = processed first (Bull uses lower numbers for higher priority)
    switch (alert.severity) {
      case 'CRITICAL':
        return 1;
      case 'HIGH':
        return 2;
      case 'MEDIUM':
        return 3;
      case 'LOW':
        return 4;
      default:
        return 5;
    }
  }

  private async cleanupStaleJobs() {
    try {
      // Clean completed jobs older than 24 hours
      const completed = await this.alertQueue.getCompleted();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      const staleJobs = completed.filter((job) => job.finishedOn && job.finishedOn < oneDayAgo);

      await Promise.all(staleJobs.map((job) => job.remove()));

      if (staleJobs.length > 0) {
        this.logger.log(`Cleaned up ${staleJobs.length} stale completed jobs`);
      }

      // Reset stuck processing alerts
      const stuckAlerts = await this.prisma.securityAlert.updateMany({
        where: {
          status: AlertStatus.PROCESSING,
          updatedAt: {
            lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          },
        },
        data: {
          status: AlertStatus.PENDING,
        },
      });

      if (stuckAlerts.count > 0) {
        this.logger.warn(`Reset ${stuckAlerts.count} stuck processing alerts`);
      }
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}
