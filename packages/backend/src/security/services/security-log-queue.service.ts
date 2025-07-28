import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  SecurityLogJobData,
  SECURITY_LOG_JOB_NAMES,
  SECURITY_LOG_QUEUE_CONFIG,
  SecurityEventTypeExtended,
} from '../constants/event-types';
import { SecurityEventType } from '../../modules/auth/constants/auth.constants';

/**
 * Service für das Hinzufügen von Security Log Jobs zur Queue.
 * Bietet typsichere Methoden für verschiedene Event-Typen
 * und Queue-Operationen.
 */
@Injectable()
export class SecurityLogQueueService {
  private readonly logger = new Logger(SecurityLogQueueService.name);

  constructor(
    @InjectQueue(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME)
    private readonly securityLogQueue: Queue,
  ) {}

  /**
   * Fügt ein Security Event zur Queue hinzu
   */
  async addSecurityEvent(
    eventData: SecurityLogJobData,
    options?: {
      priority?: number;
      delay?: number;
      removeOnComplete?: boolean | number;
    },
  ): Promise<string> {
    try {
      const job = await this.securityLogQueue.add(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        {
          ...eventData,
          timestamp: eventData.timestamp || new Date(),
        },
        {
          priority: options?.priority,
          delay: options?.delay,
          removeOnComplete: options?.removeOnComplete ?? true,
        },
      );

      this.logger.debug(`Security event queued: ${eventData.eventType} (Job ID: ${job.id})`);

      return job.id;
    } catch (error) {
      this.logger.error(`Failed to queue security event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Fügt mehrere Security Events als Batch zur Queue hinzu
   */
  async addBatchSecurityEvents(
    events: SecurityLogJobData[],
    options?: {
      priority?: number;
      delay?: number;
    },
  ): Promise<string> {
    try {
      const job = await this.securityLogQueue.add(
        SECURITY_LOG_JOB_NAMES.BATCH_LOG,
        { events },
        {
          priority: options?.priority,
          delay: options?.delay,
        },
      );

      this.logger.debug(`Batch of ${events.length} security events queued (Job ID: ${job.id})`);

      return job.id;
    } catch (error) {
      this.logger.error(`Failed to queue batch security events: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Plant einen Cleanup-Job für alte Logs
   */
  async scheduleLogCleanup(daysToKeep?: number): Promise<string> {
    try {
      const job = await this.securityLogQueue.add(
        SECURITY_LOG_JOB_NAMES.CLEANUP,
        { daysToKeep },
        {
          repeat: {
            pattern: '0 2 * * *', // Täglich um 2 Uhr nachts
          },
        },
      );

      this.logger.log(
        `Log cleanup scheduled (Job ID: ${job.id}, Days to keep: ${
          daysToKeep || SECURITY_LOG_QUEUE_CONFIG.RETENTION_DAYS
        })`,
      );

      return job.id;
    } catch (error) {
      this.logger.error(`Failed to schedule log cleanup: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Plant eine Integritätsprüfung der Log-Kette
   */
  async scheduleIntegrityCheck(startSequence?: bigint, endSequence?: bigint): Promise<string> {
    try {
      const job = await this.securityLogQueue.add(
        SECURITY_LOG_JOB_NAMES.VERIFY_INTEGRITY,
        { startSequence, endSequence },
        {
          priority: 10, // Höhere Priorität für Integritätsprüfungen
        },
      );

      this.logger.log(`Log integrity check scheduled (Job ID: ${job.id})`);

      return job.id;
    } catch (error) {
      this.logger.error(`Failed to schedule integrity check: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Spezielle Methode für Login-Events
   */
  async logLoginAttempt(
    success: boolean,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const eventType = success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED;

    return this.addSecurityEvent({
      eventType,
      userId,
      ipAddress,
      userAgent,
      metadata,
      severity: success ? 'INFO' : 'WARN',
      message: success ? 'User logged in successfully' : 'Failed login attempt',
    });
  }

  /**
   * Spezielle Methode für Berechtigungs-Events
   */
  async logPermissionDenied(
    userId: string,
    resource: string,
    action: string,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    return this.addSecurityEvent({
      eventType: SecurityEventTypeExtended.PERMISSION_DENIED,
      userId,
      ipAddress,
      metadata: {
        ...metadata,
        resource,
        action,
      },
      severity: 'WARN',
      message: `Permission denied: ${action} on ${resource}`,
    });
  }

  /**
   * Spezielle Methode für Rollen-Änderungen
   */
  async logRoleChange(
    userId: string,
    oldRole: string,
    newRole: string,
    changedBy: string,
    ipAddress?: string,
  ): Promise<string> {
    return this.addSecurityEvent({
      eventType: SecurityEventTypeExtended.ROLE_CHANGED,
      userId,
      ipAddress,
      metadata: {
        oldRole,
        newRole,
        changedBy,
      },
      severity: 'HIGH',
      message: `User role changed from ${oldRole} to ${newRole}`,
    });
  }

  /**
   * Spezielle Methode für API Rate Limit Events
   */
  async logRateLimitExceeded(
    ipAddress: string,
    endpoint: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    return this.addSecurityEvent({
      eventType: SecurityEventTypeExtended.API_RATE_LIMIT,
      userId,
      ipAddress,
      metadata: {
        ...metadata,
        endpoint,
      },
      severity: 'WARN',
      message: `API rate limit exceeded for endpoint: ${endpoint}`,
    });
  }

  /**
   * Gibt Queue-Statistiken zurück
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.securityLogQueue.getWaitingCount(),
      this.securityLogQueue.getActiveCount(),
      this.securityLogQueue.getCompletedCount(),
      this.securityLogQueue.getFailedCount(),
      this.securityLogQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Leert die Queue (nur für Tests/Entwicklung)
   */
  async clearQueue(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Queue clearing is not allowed in production');
    }

    await this.securityLogQueue.obliterate({ force: true });
    this.logger.warn('Security log queue has been cleared');
  }
}
