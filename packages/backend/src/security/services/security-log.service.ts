import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { SecurityLogPayload } from '../interfaces/security-log.interface';
import { AllSecurityEventTypes, SECURITY_LOG_QUEUE_CONFIG } from '../constants/event-types';

/**
 * Service für queue-basiertes Security Logging.
 * Fügt Sicherheitsereignisse zur BullMQ Queue hinzu für asynchrone Verarbeitung.
 */
@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);

  constructor(
    @InjectQueue(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME)
    private readonly securityLogQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Fügt ein Sicherheitsereignis zur Queue hinzu.
   *
   * @param eventType - Typ des Sicherheitsereignisses
   * @param payload - Ereignisdaten ohne eventType
   * @returns Job-Informationen
   */
  async log(
    eventType: AllSecurityEventTypes,
    payload: Omit<SecurityLogPayload, 'eventType'>,
  ): Promise<{ jobId: string; queued: true }> {
    try {
      const job = await this.securityLogQueue.add(
        'log-security-event',
        {
          eventType,
          ...payload,
          timestamp: new Date(),
        },
        {
          removeOnComplete: true,
          removeOnFail: false, // Behalten für Debugging
        },
      );

      this.logger.debug(`Security event queued: ${eventType} (Job ID: ${job.id})`);

      return {
        jobId: String(job.id),
        queued: true,
      };
    } catch (error) {
      this.logger.error(`Failed to queue security event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Fügt ein kritisches Sicherheitsereignis mit hoher Priorität zur Queue hinzu.
   * Verwendet LIFO (Last In, First Out) für sofortige Verarbeitung.
   *
   * @param eventType - Typ des kritischen Sicherheitsereignisses
   * @param payload - Ereignisdaten ohne eventType
   * @returns Job-Informationen
   */
  async logCritical(
    eventType: AllSecurityEventTypes,
    payload: Omit<SecurityLogPayload, 'eventType'>,
  ): Promise<{ jobId: string; queued: true }> {
    try {
      const job = await this.securityLogQueue.add(
        'log-security-event',
        {
          eventType,
          ...payload,
          timestamp: new Date(),
          severity: 'CRITICAL',
        },
        {
          priority: 0, // Höchste Priorität
          lifo: true, // Last In, First Out
          removeOnComplete: true,
          removeOnFail: false, // Behalten für Debugging
        },
      );

      this.logger.warn(`Critical security event queued: ${eventType} (Job ID: ${job.id})`);

      return {
        jobId: String(job.id),
        queued: true,
      };
    } catch (error) {
      this.logger.error(`Failed to queue critical security event: ${error.message}`, error.stack);
      throw error;
    }
  }
}
