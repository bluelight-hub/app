import React from 'react';
import { logger } from './logger';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Audit-Aktionstypen
 * TODO: Replace with generated types from @bluelight-hub/shared/client/models once available
 */
export enum AuditActionType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM'
}

/**
 * Audit-Schweregrade
 * TODO: Replace with generated types from @bluelight-hub/shared/client/models once available
 */
export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

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

  private constructor() {
    // Initialize with window unload handler to flush remaining logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushBatch();
      });
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
      actionType: details?.actionType || AuditActionType.READ,
      severity: details?.severity || AuditSeverity.LOW,
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
      actionType: details?.actionType || AuditActionType.ERROR,
      severity: details?.severity || AuditSeverity.HIGH,
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
      actionType: AuditActionType.SECURITY,
      severity: details?.severity || AuditSeverity.HIGH,
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
      key => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
    );

    await this.log({
      action,
      resource,
      resourceId,
      actionType: AuditActionType.UPDATE,
      severity: details?.severity || AuditSeverity.MEDIUM,
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
      context.severity === AuditSeverity.CRITICAL ||
      context.actionType === AuditActionType.SECURITY ||
      context.actionType === AuditActionType.ERROR ||
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

    try {
      // Send logs to backend
      // Note: We need to implement the batch endpoint in the API
      for (const log of logsToSend) {
        await this.sendLog(log);
      }
    } catch (error) {
      logger.error('Failed to flush audit log batch', {
        error: error instanceof Error ? error.message : String(error),
        batchSize: logsToSend.length,
      });
      
      // Re-add failed logs to queue for retry
      this.batchQueue.unshift(...logsToSend);
    }
  }

  /**
   * Sends a single log entry to the backend
   */
  private async sendLog(context: AuditContext): Promise<void> {
    try {
      // TODO: Replace with actual API call once AuditApi is generated
      // await api.audit.create({
      //   actionType: context.actionType,
      //   action: context.action,
      //   resource: context.resource,
      //   resourceId: context.resourceId,
      //   ...context,
      // });
      
      logger.debug('Audit log queued for sending', { action: context.action });
    } catch (error) {
      logger.error('Failed to send audit log', {
        error: error instanceof Error ? error.message : String(error),
        context,
      });
      throw error;
    }
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
        actionType: AuditActionType.READ,
        severity: AuditSeverity.LOW,
        ...defaultContext,
      });
    }, [audit]);

    return React.createElement(Component, { ...props, audit } as T);
  };
}