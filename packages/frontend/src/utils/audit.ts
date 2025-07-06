import React from 'react';
import { logger } from './logger';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../api';
import {
  CreateAuditLogDtoActionTypeEnum as AuditActionType,
  CreateAuditLogDtoSeverityEnum as AuditSeverity,
} from '@bluelight-hub/shared/client';

/**
 * Kontext-Informationen für Audit-Logs
 */
export interface AuditContext {
  action: string;
  resource: string;
  resourceId?: string;
  actionType: AuditActionType;
  severity?: AuditSeverity;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  httpMethod?: string;
  httpPath?: string;
  errorMessage?: string;
  affectedFields?: string[];
  sensitiveData?: boolean;
  compliance?: string[];
}

/**
 * Audit-Logger für Frontend-Aktionen
 * Erfasst Benutzeraktionen und sendet sie an das Backend-Audit-System
 */
class AuditLogger {
  private static instance: AuditLogger;
  private batchQueue: AuditContext[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 5000; // 5 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second
  private retryAttempts = new Map<string, number>();
  private failedLogs: AuditContext[] = [];

  private constructor() {
    // Initialize with window unload handler to flush remaining logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushBatch();
        this.persistFailedLogs();
      });

      // Restore failed logs from local storage on init
      this.restoreFailedLogs();
    }
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Protokolliert eine Benutzeraktion
   */
  public async log(context: AuditContext): Promise<void> {
    try {
      const authState = useAuthStore.getState();
      const enrichedContext = this.enrichContext(context, authState);

      // Add to batch queue
      this.batchQueue.push(enrichedContext);

      // Check if we should send immediately or batch
      if (this.shouldSendImmediately(context)) {
        await this.flushBatch();
      } else if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.flushBatch();
      } else {
        this.scheduleBatch();
      }
    } catch (error) {
      logger.error('Failed to log audit event', {
        error: error instanceof Error ? error.message : String(error),
        context,
      });
    }
  }

  /**
   * Protokolliert eine erfolgreiche Aktion
   */
  public async logSuccess(
    action: string,
    resource: string,
    details?: Partial<AuditContext>,
  ): Promise<void> {
    await this.log({
      action,
      resource,
      actionType: details?.actionType || AuditActionType.Read,
      severity: details?.severity || AuditSeverity.Low,
      ...details,
    });
  }

  /**
   * Protokolliert einen Fehler
   */
  public async logError(
    action: string,
    resource: string,
    error: Error | string,
    details?: Partial<AuditContext>,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;

    await this.log({
      action,
      resource,
      actionType: details?.actionType || AuditActionType.Create,
      severity: details?.severity || AuditSeverity.High,
      errorMessage,
      ...details,
    });
  }

  /**
   * Protokolliert eine Sicherheitsaktion
   */
  public async logSecurity(
    action: string,
    resource: string,
    details?: Partial<AuditContext>,
  ): Promise<void> {
    await this.log({
      action,
      resource,
      actionType: AuditActionType.PermissionChange,
      severity: details?.severity || AuditSeverity.High,
      sensitiveData: true,
      ...details,
    });
  }

  /**
   * Protokolliert eine Datenänderung
   */
  public async logDataChange(
    action: string,
    resource: string,
    resourceId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    details?: Partial<AuditContext>,
  ): Promise<void> {
    const changedFields = Object.keys(newValues).filter(
      (key) => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]),
    );

    await this.log({
      action,
      resource,
      resourceId,
      actionType: AuditActionType.Update,
      severity: details?.severity || AuditSeverity.Medium,
      oldValues,
      newValues,
      affectedFields: changedFields,
      ...details,
    });
  }

  /**
   * Enriches the audit context with user and system information
   */
  private enrichContext(context: AuditContext, authState: any): AuditContext {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

    return {
      ...context,
      metadata: {
        ...context.metadata,
        userAgent,
        timestamp: new Date().toISOString(),
        clientVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
        userId: authState.user?.id,
        userEmail: authState.user?.email,
        userRole: authState.user?.roles?.[0],
        sessionId: authState.sessionId,
      },
    };
  }

  /**
   * Determines if an audit log should be sent immediately
   */
  private shouldSendImmediately(context: AuditContext): boolean {
    return (
      context.severity === AuditSeverity.Critical ||
      context.actionType === AuditActionType.PermissionChange ||
      context.actionType === AuditActionType.Create ||
      context.sensitiveData === true
    );
  }

  /**
   * Schedules batch processing
   */
  private scheduleBatch(): void {
    if (this.batchTimer) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Flushes the batch queue
   * Note: Currently disabled as audit logging should be handled server-side
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const logsToSend = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Temporarily disable client-side audit logging
    // Audit logs should be created server-side through interceptors
    logger.debug('Client-side audit logging disabled, logs discarded', {
      batchSize: logsToSend.length,
      reason: 'Audit logs should be created server-side',
    });

    // TODO: In future, we could send these as "client events" to a different endpoint
    // that doesn't require AUDIT_LOG_WRITE permission
  }

  /**
   * Sends a single log entry to the backend
   */
  private async sendLog(context: AuditContext): Promise<void> {
    try {
      await api.auditLogs.auditLogControllerCreateV1({
        createAuditLogDto: {
          actionType: context.actionType,
          action: context.action,
          resource: context.resource,
          resourceId: context.resourceId,
          oldValues: context.oldValues ? JSON.stringify(context.oldValues) : undefined,
          newValues: context.newValues ? JSON.stringify(context.newValues) : undefined,
          metadata: context.metadata ? JSON.stringify(context.metadata) : undefined,
          ipAddress: '0.0.0.0', // Will be populated by backend
          userAgent: context.metadata?.userAgent || 'Unknown',
        },
      });

      logger.debug('Audit log sent successfully', { action: context.action });
    } catch (error) {
      logger.error('Failed to send audit log', {
        error: error instanceof Error ? error.message : String(error),
        context,
      });
      throw error;
    }
  }

  /**
   * Sends batch with exponential backoff retry
   * Note: Currently disabled as audit logging should be handled server-side
   */
  private async sendBatchWithRetry(logs: any[], _attempt = 1): Promise<void> {
    // Disabled - audit logs should be created server-side
    throw new Error('Client-side audit logging is disabled');
  }

  /**
   * Persists failed logs to local storage
   * Note: Currently disabled as audit logging should be handled server-side
   */
  private persistFailedLogs(): void {
    // Disabled - not persisting logs anymore
    logger.debug('Skipping persist of failed logs', {
      reason: 'Client-side audit logging disabled',
    });
  }

  /**
   * Restores failed logs from local storage
   */
  private restoreFailedLogs(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = 'bluelight_audit_failed_logs';
        const stored = localStorage.getItem(key);

        if (stored) {
          const logs = JSON.parse(stored) as AuditContext[];

          // Clear stored logs immediately since we're not processing them
          localStorage.removeItem(key);

          logger.info('Cleared legacy failed audit logs from local storage', {
            count: logs.length,
            reason: 'Client-side audit logging disabled',
          });
        }
      }
    } catch (error) {
      logger.error('Failed to clear audit logs from local storage', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Retries sending failed logs
   * Note: Currently disabled as audit logging should be handled server-side
   */
  private async retryFailedLogs(): Promise<void> {
    if (this.failedLogs.length === 0) {
      return;
    }

    // Clear failed logs since we're not sending them anymore
    this.failedLogs = [];

    // Clear from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('bluelight_audit_failed_logs');
    }

    logger.debug('Cleared failed audit logs', {
      reason: 'Client-side audit logging disabled',
    });
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

/**
 * React Hook für Audit-Logging
 */
export function useAuditLogger() {
  return {
    log: auditLogger.log.bind(auditLogger),
    logSuccess: auditLogger.logSuccess.bind(auditLogger),
    logError: auditLogger.logError.bind(auditLogger),
    logSecurity: auditLogger.logSecurity.bind(auditLogger),
    logDataChange: auditLogger.logDataChange.bind(auditLogger),
  };
}

/**
 * Higher-Order Component für automatisches Audit-Logging
 */
export function withAuditLogging<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  defaultContext: Partial<AuditContext>,
): React.ComponentType<T> {
  return (props: T) => {
    const audit = useAuditLogger();

    // Log component mount
    React.useEffect(() => {
      audit.log({
        action: `view-${defaultContext.resource || 'component'}`,
        resource: defaultContext.resource || 'component',
        actionType: AuditActionType.Read,
        severity: AuditSeverity.Low,
        ...defaultContext,
      });
    }, [audit]);

    return React.createElement(Component, { ...props, audit } as T);
  };
}
