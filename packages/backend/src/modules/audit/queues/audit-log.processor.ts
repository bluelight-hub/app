import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogBatchService } from '../services/audit-log-batch.service';
import { AUDIT_LOG_QUEUE, AuditLogJobData, AuditLogJobType } from './audit-log.queue';
import { CreateAuditLogDto } from '../dto';
import { logger } from '../../../logger/consola.logger';

/**
 * Processor für die Verarbeitung von Audit-Log-Jobs aus der Queue
 * Verarbeitet Jobs asynchron im Hintergrund
 */
@Processor(AUDIT_LOG_QUEUE)
export class AuditLogProcessor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditLogBatchService: AuditLogBatchService,
  ) {}

  /**
   * Verarbeitet einen einzelnen Audit-Log-Eintrag
   */
  @Process(AuditLogJobType.CREATE)
  async handleCreateAuditLog(job: Job<AuditLogJobData>) {
    const startTime = Date.now();

    try {
      const data = job.data.payload as CreateAuditLogDto;
      await this.auditLogService.create(data);

      const duration = Date.now() - startTime;
      logger.trace(`Audit log processed in ${duration}ms`, {
        jobId: job.id,
        actionType: data.actionType,
        resource: data.resource,
      });
    } catch (error) {
      logger.error('Failed to process audit log job', {
        jobId: job.id,
        attempt: job.attemptsMade,
        error: error.message,
      });
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Verarbeitet einen Batch von Audit-Log-Einträgen
   */
  @Process(AuditLogJobType.BATCH_CREATE)
  async handleBatchCreateAuditLogs(job: Job<AuditLogJobData>) {
    const startTime = Date.now();

    try {
      const data = job.data.payload as CreateAuditLogDto[];
      const result = await this.auditLogBatchService.createBatch(data);

      const duration = Date.now() - startTime;
      logger.trace(`Batch audit logs processed in ${duration}ms`, {
        jobId: job.id,
        total: result.totalProcessed,
        success: result.successCount,
        failed: result.failureCount,
      });

      // Log failures if any
      if (result.failureCount > 0) {
        logger.warn('Some audit logs in batch failed', {
          jobId: job.id,
          failures: result.failed,
        });
      }
    } catch (error) {
      logger.error('Failed to process batch audit log job', {
        jobId: job.id,
        attempt: job.attemptsMade,
        error: error.message,
      });
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Handler für fehlgeschlagene Jobs
   */
  async onFailed(job: Job<AuditLogJobData>, error: Error) {
    logger.error('Audit log job failed permanently', {
      jobId: job.id,
      jobType: job.data.type,
      attempts: job.attemptsMade,
      error: error.message,
      stack: error.stack,
    });

    // Hier könnte man Fallback-Logik implementieren,
    // z.B. in eine Datei schreiben oder an einen externen Service senden
  }

  /**
   * Handler für abgeschlossene Jobs
   */
  async onCompleted(job: Job<AuditLogJobData>) {
    // Nur für Debugging-Zwecke im trace level
    logger.trace('Audit log job completed', {
      jobId: job.id,
      jobType: job.data.type,
    });
  }
}
