import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { SecurityLogService } from '../../modules/auth/services/security-log.service';
import { SecurityEventType } from '../../modules/auth/constants/auth.constants';
import {
  SecurityLogJobData,
  SECURITY_LOG_JOB_NAMES,
  SECURITY_LOG_QUEUE_CONFIG,
} from '../constants/event-types';

/**
 * Processor für die asynchrone Verarbeitung von Security Log Events.
 * Verarbeitet Jobs aus der 'security-log' Queue mit automatischen
 * Wiederholungsversuchen und Fehlerbehandlung.
 */
@Injectable()
@Processor(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME)
export class SecurityLogProcessor extends WorkerHost {
  private readonly logger = new Logger(SecurityLogProcessor.name);

  constructor(private readonly securityLogService: SecurityLogService) {
    super();
  }

  /**
   * Hauptverarbeitungsmethode für Security Log Jobs
   */
  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case SECURITY_LOG_JOB_NAMES.LOG_EVENT:
          return await this.processLogEvent(job);
        case SECURITY_LOG_JOB_NAMES.BATCH_LOG:
          return await this.processBatchLog(job);
        case SECURITY_LOG_JOB_NAMES.CLEANUP:
          return await this.processCleanup(job);
        case SECURITY_LOG_JOB_NAMES.VERIFY_INTEGRITY:
          return await this.processIntegrityCheck(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`, error.stack);
      throw error; // Re-throw für BullMQ retry mechanism
    }
  }

  /**
   * Verarbeitet einzelne Security Log Events
   */
  private async processLogEvent(
    job: Job<SecurityLogJobData>,
  ): Promise<{ success: boolean; sequenceNumber?: string }> {
    const startTime = Date.now();
    const { data } = job;

    try {
      // Füge Job-Metadaten hinzu
      const enrichedData = {
        ...data,
        metadata: {
          ...data.metadata,
          jobId: job.id,
          attemptNumber: job.attemptsMade + 1,
          queuedAt: new Date(job.timestamp),
          processedAt: new Date(),
        },
      };

      // Log das Event über den SecurityLogService
      await this.securityLogService.logSecurityEvent({
        ...enrichedData,
        eventType: enrichedData.eventType as SecurityEventType,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Successfully processed security event ${data.eventType} in ${duration}ms`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing security event: ${error.message}`, {
        jobId: job.id,
        eventType: data.eventType,
        userId: data.userId,
        error: error.stack,
      });

      // Bei kritischen Fehlern, versuche Fallback-Logging
      if (job.attemptsMade >= SECURITY_LOG_QUEUE_CONFIG.MAX_RETRIES - 1) {
        await this.handleCriticalLoggingFailure(data, error);
      }

      throw error;
    }
  }

  /**
   * Verarbeitet Batch-Log-Events für bessere Performance
   */
  private async processBatchLog(
    job: Job<{ events: SecurityLogJobData[] }>,
  ): Promise<{ processed: number; failed: number }> {
    const { events } = job.data;
    let processed = 0;
    let failed = 0;

    this.logger.log(`Processing batch of ${events.length} security events`);

    // Verarbeite Events sequenziell für Hash-Chain-Integrität
    for (const event of events) {
      try {
        await this.securityLogService.logSecurityEvent({
          ...event,
          eventType: event.eventType as SecurityEventType,
        });
        processed++;
      } catch (error) {
        this.logger.error(`Failed to process event in batch: ${error.message}`, {
          event,
          error: error.stack,
        });
        failed++;
      }
    }

    this.logger.log(`Batch processing completed: ${processed} successful, ${failed} failed`);

    return { processed, failed };
  }

  /**
   * Führt Cleanup alter Logs durch
   */
  private async processCleanup(
    job: Job<{ daysToKeep?: number }>,
  ): Promise<{ deletedCount: number }> {
    const daysToKeep = job.data.daysToKeep || SECURITY_LOG_QUEUE_CONFIG.RETENTION_DAYS;

    this.logger.log(`Starting cleanup of logs older than ${daysToKeep} days`);

    try {
      const deletedCount = await this.securityLogService.cleanupOldLogs(daysToKeep);

      this.logger.log(`Cleanup completed: ${deletedCount} logs deleted`);

      return { deletedCount };
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifiziert die Integrität der Log-Kette
   */
  private async processIntegrityCheck(
    job: Job<{ startSequence?: bigint; endSequence?: bigint }>,
  ): Promise<{
    isValid: boolean;
    totalChecked: number;
    brokenAtSequence?: string;
    error?: string;
  }> {
    const { startSequence, endSequence } = job.data;

    this.logger.log('Starting log chain integrity verification');

    try {
      const result = await this.securityLogService.verifyLogChainIntegrity(
        startSequence,
        endSequence,
      );

      if (!result.isValid) {
        this.logger.warn(
          `Log chain integrity check failed at sequence ${result.brokenAtSequence}`,
          { error: result.error },
        );
      } else {
        this.logger.log(`Log chain integrity verified: ${result.totalChecked} logs checked`);
      }

      return {
        ...result,
        brokenAtSequence: result.brokenAtSequence?.toString(),
      };
    } catch (error) {
      this.logger.error(`Integrity check failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Behandelt kritische Logging-Fehler als letzten Ausweg
   */
  private async handleCriticalLoggingFailure(
    data: SecurityLogJobData,
    error: Error,
  ): Promise<void> {
    this.logger.error('CRITICAL: Security logging failed after all retries', {
      eventData: data,
      error: error.message,
      stack: error.stack,
    });

    // Hier könnte man:
    // - Eine Benachrichtigung senden
    // - In eine Fallback-Datei schreiben
    // - An ein externes System senden
    // - Metriken aktualisieren
  }
}
