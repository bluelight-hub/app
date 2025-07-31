import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  AUDIT_ACTION_KEY,
  AUDIT_CONTEXT_KEY,
  AUDIT_RESOURCE_TYPE_KEY,
  AUDIT_SEVERITY_KEY,
  AuditInterceptorConfig,
  AuditLogService,
  defaultAuditInterceptorConfig,
  SKIP_AUDIT_KEY,
} from '@/modules/audit';
import { AuditLogQueue } from '@/modules/audit/queues';
import { logger } from '@/logger/consola.logger';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

/**
 * Erweiterte Request-Schnittstelle mit Benutzer- und Session-Informationen
 *
 * @interface AuditRequest
 * @extends {Request}
 */
interface AuditRequest extends Request {
  /**
   * Der authentifizierte Benutzer
   */
  user?: {
    /** Eindeutige Benutzer-ID */
    id: string;
    /** E-Mail-Adresse des Benutzers */
    email: string;
    /** Rolle des Benutzers im System */
    role: UserRole;
  };
  /** Session-ID für die Nachverfolgung von Benutzersitzungen */
  sessionID?: string;
}

/**
 * Metadaten für die Audit-Protokollierung
 *
 * Enthält alle relevanten Informationen, die aus den Decorators extrahiert werden
 * @interface AuditMetadata
 */
interface AuditMetadata {
  /** Flag zum Überspringen der Audit-Protokollierung */
  skipAudit?: boolean;
  /** Die durchgeführte Aktion */
  action?: AuditActionType;
  /** Schweregrad der Aktion */
  severity?: AuditSeverity;
  /** Typ der betroffenen Ressource */
  resourceType?: string;
  /** Zusätzlicher Kontext für die Protokollierung */
  additionalContext?: Record<string, any>;
}

/**
 * Interceptor für die Protokollierung von Admin-Aktionen
 * Erfasst Request/Response-Daten und erstellt strukturierte Audit-Logs
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private config: AuditInterceptorConfig;

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditLogQueue: AuditLogQueue,
  ) {
    this.config = defaultAuditInterceptorConfig;
  }

  /**
   * Sets a custom configuration for the interceptor
   */
  setConfig(config: Partial<AuditInterceptorConfig>): void {
    this.config = { ...defaultAuditInterceptorConfig, ...config };
  }

  /**
   * Intercept-Methode für die Verarbeitung von Requests
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<AuditRequest>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    // Skip audit for non-admin routes
    if (!this.shouldAudit(request)) {
      return next.handle();
    }

    // Extract metadata from route handler
    const metadata = this.extractMetadata(context);
    if (metadata.skipAudit) {
      return next.handle();
    }

    // Extract request data
    const requestData = this.extractRequestData(request);
    const user = request.user;

    // Get original action from decorator for custom action handling
    const originalAction = Reflect.getMetadata(AUDIT_ACTION_KEY, context.getHandler());

    return next.handle().pipe(
      tap(async (responseBody) => {
        // Log successful operation
        const duration = Date.now() - startTime;
        await this.logAuditEvent({
          user,
          request,
          response,
          requestData,
          responseBody,
          duration,
          metadata,
          success: true,
          originalAction,
        });
      }),
      catchError((error) => {
        // Log failed operation
        const duration = Date.now() - startTime;
        this.logAuditEvent({
          user,
          request,
          response,
          requestData,
          error,
          duration,
          metadata,
          success: false,
          originalAction,
        }).catch((err) => {
          logger.error('Failed to log audit event:', err);
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * Prüft, ob der Request auditiert werden soll
   */
  private shouldAudit(request: AuditRequest): boolean {
    const path = request.path;

    // Check exclude paths first
    if (this.config.excludePaths.some((excludePath) => path.includes(excludePath))) {
      return false;
    }

    // Check include paths
    return this.config.includePaths.some((includePath) => path.startsWith(includePath));
  }

  /**
   * Extrahiert Metadaten vom Route-Handler
   */
  private extractMetadata(context: ExecutionContext): AuditMetadata {
    const handler = context.getHandler();
    const metadata: AuditMetadata = {};

    // Extract custom metadata set by decorators
    metadata.skipAudit = Reflect.getMetadata(SKIP_AUDIT_KEY, handler) || false;
    metadata.action = Reflect.getMetadata(AUDIT_ACTION_KEY, handler);
    metadata.severity = Reflect.getMetadata(AUDIT_SEVERITY_KEY, handler);
    metadata.resourceType = Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, handler);
    metadata.additionalContext = Reflect.getMetadata(AUDIT_CONTEXT_KEY, handler);

    return metadata;
  }

  /**
   * Extrahiert relevante Daten aus dem Request
   */
  private extractRequestData(request: AuditRequest): Record<string, any> {
    const { method, path, query, body, headers, ip } = request;

    // Sanitize and truncate data
    const sanitizedBody = this.truncateIfNeeded(this.sanitizeSensitiveData(body));
    const sanitizedQuery = this.sanitizeSensitiveData(query);

    return {
      method,
      path,
      query: sanitizedQuery,
      body: sanitizedBody,
      ip: ip || headers['x-forwarded-for'] || headers['x-real-ip'],
      userAgent: headers['user-agent'],
      referer: headers['referer'],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Entfernt sensible Daten aus Objekten
   */
  private sanitizeSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (this.config.sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Erstellt einen Audit-Log-Eintrag
   */
  private async logAuditEvent(params: {
    user: AuditRequest['user'];
    request: AuditRequest;
    response: Response;
    requestData: Record<string, any>;
    responseBody?: any;
    error?: any;
    duration: number;
    metadata: AuditMetadata;
    success: boolean;
    originalAction?: string;
  }): Promise<void> {
    const {
      user,
      request,
      response,
      requestData,
      responseBody,
      error,
      duration,
      metadata,
      success,
    } = params;

    // Determine action and severity
    let action = metadata.action || this.determineAction(request.method, request.path);

    // If action is a string that's not a valid AuditActionType, map it
    if (
      typeof action === 'string' &&
      !Object.values(AuditActionType).includes(action as AuditActionType)
    ) {
      // Map custom string actions to valid AuditActionType
      const customActionMap: Record<string, AuditActionType> = {
        REVOKE_PERMISSION: AuditActionType.PERMISSION_CHANGE,
        GRANT_PERMISSION: AuditActionType.PERMISSION_CHANGE,
        // Add more mappings as needed
      };
      action = customActionMap[action] || AuditActionType.READ;
    }

    const severity = metadata.severity || this.determineSeverity(action, success);
    const resourceType = metadata.resourceType || this.extractResourceType(request.path);

    // Extract old and new values for update operations
    const { oldValues, newValues } = this.extractValueChanges(
      request.method,
      requestData.body,
      responseBody,
    );

    // Build audit context
    const auditContext = {
      ...metadata.additionalContext,
      request: {
        method: requestData.method,
        path: requestData.path,
        query: requestData.query,
        body: requestData.body,
        ip: requestData.ip,
        userAgent: requestData.userAgent,
      },
      response: {
        statusCode: response.statusCode,
        duration: `${duration}ms`,
        success,
      },
      ...(error && {
        error: {
          message: error.message,
          statusCode: error instanceof HttpException ? error.getStatus() : 500,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      }),
    };

    // Map our custom action to Prisma's AuditActionType
    const actionType = this.mapActionToActionType(action);

    // For custom actions, preserve the original string representation
    let actionString: string;
    // Check if the original metadata had a custom string action
    if (
      typeof params.originalAction === 'string' &&
      params.originalAction === 'REVOKE_PERMISSION'
    ) {
      actionString = 'revoke-permission';
    } else {
      actionString = this.actionTypeToString(action);
    }

    // Create audit log data
    const auditLogData = {
      actionType,
      severity: severity as any, // Map extended severity
      action: actionString,
      resource: resourceType,
      resourceId: this.extractResourceId(request),

      // User context
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,

      // Request context
      requestId: request.headers['x-request-id'] as string,
      sessionId: request.sessionID || (request.headers['x-session-id'] as string),
      ipAddress: requestData.ip,
      userAgent: requestData.userAgent,
      endpoint: requestData.path,
      httpMethod: requestData.method,

      // Data context
      oldValues,
      newValues,
      metadata: auditContext,

      // Result
      duration,
      success,
      errorMessage: error?.message,
      statusCode: response.statusCode,

      // Compliance
      sensitiveData: this.containsSensitiveData(resourceType, action),
      requiresReview: this.requiresReview(action, severity),
    };

    // Queue the audit log for asynchronous processing
    try {
      await this.auditLogQueue.addAuditLog(auditLogData);
      logger.trace('Audit log queued successfully', {
        action: auditLogData.action,
        resource: auditLogData.resource,
      });
    } catch (queueError) {
      // If queueing fails, fall back to direct logging
      logger.error('Failed to queue audit log, falling back to direct logging', {
        error: queueError.message,
      });
      try {
        await this.auditLogService.create(auditLogData);
      } catch (directError) {
        logger.error('Failed to create audit log directly', {
          error: directError.message,
        });
      }
    }
  }

  /**
   * Bestimmt die Aktion basierend auf HTTP-Methode und Pfad
   */
  private determineAction(method: string, path: string): AuditActionType {
    // Special cases based on path - these take precedence
    if (path.includes('/login')) return AuditActionType.LOGIN;
    if (path.includes('/logout')) return AuditActionType.LOGOUT;
    if (path.includes('/export')) return AuditActionType.EXPORT;
    if (path.includes('/import')) return AuditActionType.IMPORT;
    if (path.includes('/approve')) return AuditActionType.APPROVE;
    if (path.includes('/reject')) return AuditActionType.REJECT;
    if (path.includes('/block')) return AuditActionType.BLOCK;
    if (path.includes('/unblock')) return AuditActionType.UNBLOCK;
    if (path.includes('/restore')) return AuditActionType.RESTORE;

    // Check custom action mappings
    const fullPath = `${method} ${path}`;

    // Check exact matches first
    if (this.config.actionMapping[fullPath]) {
      return this.config.actionMapping[fullPath];
    }

    // Then check patterns with wildcards
    for (const [pattern, action] of Object.entries(this.config.actionMapping)) {
      if (pattern.includes('*') && this.matchPath(fullPath, pattern)) {
        return action;
      }
    }

    const methodActionMap: Record<string, AuditActionType> = {
      GET: AuditActionType.READ,
      POST: AuditActionType.CREATE,
      PUT: AuditActionType.UPDATE,
      PATCH: AuditActionType.UPDATE,
      DELETE: AuditActionType.DELETE,
    };

    return methodActionMap[method] || AuditActionType.READ;
  }

  /**
   * Bestimmt die Schwere basierend auf Aktion und Erfolg
   */
  private determineSeverity(action: AuditActionType, success: boolean): AuditSeverity {
    if (!success) {
      return AuditSeverity.ERROR;
    }

    // Use configured severity mapping
    return this.config.severityMapping[action] || AuditSeverity.LOW;
  }

  /**
   * Extrahiert den Ressourcentyp aus dem Pfad
   */
  private extractResourceType(path: string): string {
    // Check configured resource mappings first
    for (const [pattern, resourceType] of Object.entries(this.config.resourceMapping)) {
      if (path.startsWith(pattern)) {
        return resourceType;
      }
    }

    const segments = path.split('/').filter(Boolean);

    // Remove version prefix if it's the first segment (e.g., /v1/einsatz)
    if (segments.length > 0 && segments[0].match(/^v\d+$/)) {
      segments.shift();
    }

    // Remove common API prefixes
    if (segments[0] === 'api') {
      segments.shift();
      // Remove version prefix after api (e.g., /api/v1/users)
      if (segments.length > 0 && segments[0].match(/^v\d+$/)) {
        segments.shift();
      }
    }

    // Remove 'admin' prefix
    if (segments[0] === 'admin') {
      segments.shift();
    }

    // Return first meaningful segment
    return segments[0] || 'unknown';
  }

  /**
   * Extrahiert die Ressourcen-ID aus dem Request
   */
  private extractResourceId(request: AuditRequest): string {
    // Try to extract ID from path params
    const params = request.params as Record<string, any>;
    if (params.id) {
      return params.id;
    }

    // Try to extract from path
    const pathMatch = request.path.match(/\/(\d+|[a-f0-9-]{36})(\/|$)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Try to extract from query
    const query = request.query as Record<string, any>;
    if (query?.id) {
      return query.id as string;
    }

    return 'unknown';
  }

  /**
   * Extrahiert alte und neue Werte für Update-Operationen
   */
  private extractValueChanges(
    method: string,
    requestBody: any,
    responseBody: any,
  ): { oldValues?: any; newValues?: any } {
    if (!['PUT', 'PATCH'].includes(method)) {
      return {};
    }

    // For updates, request body contains new values
    const newValues = this.sanitizeSensitiveData(requestBody);

    // If response contains both old and new values
    if (responseBody?.oldValues && responseBody?.newValues) {
      return {
        oldValues: this.sanitizeSensitiveData(responseBody.oldValues),
        newValues: this.sanitizeSensitiveData(responseBody.newValues),
      };
    }

    // If response contains the updated entity
    if (responseBody && typeof responseBody === 'object') {
      return {
        newValues,
        // Old values would need to be provided by the service layer
      };
    }

    return { newValues };
  }

  /**
   * Prüft, ob ein Pfad einem Muster entspricht
   */
  private matchPath(path: string, pattern: string): boolean {
    // Convert pattern with wildcards to regex
    const regexPattern = pattern
      .replace(/([.+?^${}()|[\]\\])/g, '\\$1') // Escape special regex chars
      .replace(/\*\*/g, '.*') // ** matches any path
      .replace(/\*/g, '[^/]+'); // * matches any segment except /

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Prüft die Größe von Request/Response Bodies
   */
  private truncateIfNeeded(data: any): any {
    if (data === undefined || data === null) {
      return data;
    }

    const json = JSON.stringify(data);
    if (json && json.length > this.config.maxBodySize) {
      return {
        _truncated: true,
        _originalSize: json.length,
        _message: `Body truncated - exceeded ${this.config.maxBodySize} bytes`,
      };
    }
    return data;
  }

  /**
   * Maps action string to Prisma's AuditActionType
   */
  private mapActionToActionType(action: string | AuditActionType): AuditActionType {
    // If it's already an AuditActionType, return it
    if (Object.values(AuditActionType).includes(action as AuditActionType)) {
      return action as AuditActionType;
    }

    // Handle string mappings only if action is a string
    if (typeof action === 'string') {
      const stringMappings: Record<string, AuditActionType> = {
        view: AuditActionType.READ,
        'grant-permission': AuditActionType.PERMISSION_CHANGE,
        'revoke-permission': AuditActionType.PERMISSION_CHANGE,
        'change-role': AuditActionType.ROLE_CHANGE,
        'config-change': AuditActionType.SYSTEM_CONFIG,
        'bulk-operation': AuditActionType.BULK_OPERATION,
      };

      return stringMappings[action.toLowerCase()] || AuditActionType.READ;
    }

    // Default fallback
    return AuditActionType.READ;
  }

  /**
   * Prüft, ob die Aktion sensible Daten betrifft
   */
  private containsSensitiveData(resourceType: string, action: string | AuditActionType): boolean {
    const sensitiveResources = ['user', 'permission', 'role', 'session', 'authentication'];
    const sensitiveActions: AuditActionType[] = [
      AuditActionType.PERMISSION_CHANGE,
      AuditActionType.ROLE_CHANGE,
    ];

    const actionType = typeof action === 'string' ? this.mapActionToActionType(action) : action;
    return sensitiveResources.includes(resourceType) || sensitiveActions.includes(actionType);
  }

  /**
   * Prüft, ob die Aktion eine Überprüfung erfordert
   */
  private requiresReview(
    action: string | AuditActionType,
    severity: string | AuditSeverity,
  ): boolean {
    const actionType = typeof action === 'string' ? this.mapActionToActionType(action) : action;

    return (
      severity === AuditSeverity.CRITICAL ||
      severity === AuditSeverity.HIGH ||
      actionType === AuditActionType.DELETE ||
      actionType === AuditActionType.PERMISSION_CHANGE ||
      actionType === AuditActionType.ROLE_CHANGE
    );
  }

  /**
   * Converts AuditActionType enum to a string representation
   */
  private actionTypeToString(action: AuditActionType | string): string {
    // Since Prisma generates enums as objects with string values,
    // the action might already be a string like 'APPROVE'
    const actionStr = action as string;

    // Map enum string values to their lowercase hyphenated representations
    const actionMap: Record<string, string> = {
      CREATE: 'create',
      READ: 'read',
      UPDATE: 'update',
      DELETE: 'delete',
      LOGIN: 'login',
      LOGOUT: 'logout',
      APPROVE: 'approve',
      REJECT: 'reject',
      EXPORT: 'export',
      IMPORT: 'import',
      BLOCK: 'block',
      UNBLOCK: 'unblock',
      PERMISSION_CHANGE: 'permission-change',
      ROLE_CHANGE: 'role-change',
      RESTORE: 'restore',
      BACKUP: 'backup',
      BULK_OPERATION: 'bulk-operation',
      SYSTEM_CONFIG: 'system-config',
      FAILED_LOGIN: 'failed-login',
    };

    return actionMap[actionStr] || 'unknown';
  }
}

/**
 * Factory function to create a configured AuditInterceptor
 */
export function createAuditInterceptor(
  auditLogService: AuditLogService,
  auditLogQueue: AuditLogQueue,
  config?: Partial<AuditInterceptorConfig>,
): AuditInterceptor {
  const interceptor = new AuditInterceptor(auditLogService, auditLogQueue);
  if (config) {
    interceptor.setConfig(config);
  }
  return interceptor;
}
