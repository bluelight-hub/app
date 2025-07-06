import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { CreateAuditLogDto } from '../dto';
import { logger } from '../../../logger/consola.logger';

export const AUDIT_LOG_QUEUE = 'audit-log';

export enum AuditLogJobType {
  CREATE = 'create-audit-log',
  BATCH_CREATE = 'batch-create-audit-logs',
  CLEANUP = 'cleanup-audit-logs',
}

export interface AuditLogJobData {
  type: AuditLogJobType;
  payload: CreateAuditLogDto | CreateAuditLogDto[];
}

/**
 * Service für die Verwaltung der Audit-Log-Queue
 * Ermöglicht asynchrone Verarbeitung von Audit-Logs
 */
@Injectable()
export class AuditLogQueue {
  constructor(
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<AuditLogJobData>,
  ) {}

  /**
   * Fügt einen einzelnen Audit-Log zur Queue hinzu
   * @param data Audit-Log-Daten
   * @returns Job-ID
   */
  async addAuditLog(data: CreateAuditLogDto): Promise<string> {
    try {
      const job = await this.auditLogQueue.add(
        AuditLogJobType.CREATE,
        {
          type: AuditLogJobType.CREATE,
          payload: data,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      logger.trace('Audit log queued', { jobId: job.id });
      return job.id as string;
    } catch (error) {
      logger.error('Failed to queue audit log', {
        error: error.message,
        data,
      });
      throw error;
    }
  }

  /**
   * Fügt mehrere Audit-Logs als Batch zur Queue hinzu
   * @param data Array von Audit-Log-Daten
   * @returns Job-ID
   */
  async addBatchAuditLogs(data: CreateAuditLogDto[]): Promise<string> {
    try {
      const job = await this.auditLogQueue.add(
        AuditLogJobType.BATCH_CREATE,
        {
          type: AuditLogJobType.BATCH_CREATE,
          payload: data,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      logger.trace('Batch audit logs queued', {
        jobId: job.id,
        count: data.length,
      });
      return job.id as string;
    } catch (error) {
      logger.error('Failed to queue batch audit logs', {
        error: error.message,
        count: data.length,
      });
      throw error;
    }
  }

  /**
   * Ruft die aktuelle Queue-Statistik ab
   * @returns Queue-Statistiken
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.auditLogQueue.getWaitingCount(),
      this.auditLogQueue.getActiveCount(),
      this.auditLogQueue.getCompletedCount(),
      this.auditLogQueue.getFailedCount(),
      this.auditLogQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Leert die Queue (nur für Notfälle)
   */
  async clearQueue(): Promise<void> {
    await this.auditLogQueue.empty();
    logger.warn('Audit log queue cleared');
  }
}
