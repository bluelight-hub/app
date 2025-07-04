import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { logger } from '../../../logger/consola.logger';
import { AuditAction, AuditSeverityExtended as AuditSeverity } from '../types/audit.types';
import {
  AuditInterceptorConfig,
  defaultAuditInterceptorConfig,
} from '../config/audit-interceptor.config';
import { AuditActionType, UserRole } from '@prisma/generated/prisma/client';
import {
  AUDIT_ACTION_KEY,
  AUDIT_SEVERITY_KEY,
  AUDIT_RESOURCE_TYPE_KEY,
  AUDIT_CONTEXT_KEY,
  SKIP_AUDIT_KEY,
} from '../decorators/audit.decorator';

// Extend Express Request to include user and sessionID
interface AuditRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  sessionID?: string;
}

interface AuditMetadata {
  skipAudit?: boolean;
  action?: AuditAction;
  severity?: AuditSeverity;
  resourceType?: string;
  additionalContext?: Record<string, any>;
}

/**
 * Interceptor für die Protokollierung von Admin-Aktionen
 * Erfasst Request/Response-Daten und erstellt strukturierte Audit-Logs
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private config: AuditInterceptorConfig;

  constructor(private readonly auditLogService: AuditLogService) {
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
    const action = metadata.action || this.determineAction(request.method, request.path);
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

    // Create audit log
    await this.auditLogService.create({
      actionType,
      severity: severity as any, // Map extended severity
      action: action.toLowerCase().replace(/_/g, '-'),
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
    });
  }

  /**
   * Bestimmt die Aktion basierend auf HTTP-Methode und Pfad
   */
  private determineAction(method: string, path: string): AuditAction {
    // Check custom action mappings first
    const fullPath = `${method} ${path}`;
    for (const [pattern, action] of Object.entries(this.config.actionMapping)) {
      if (this.matchPath(fullPath, pattern)) {
        return action;
      }
    }

    const methodActionMap: Record<string, AuditAction> = {
      GET: AuditAction.VIEW,
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    // Special cases based on path
    if (path.includes('/login')) return AuditAction.LOGIN;
    if (path.includes('/logout')) return AuditAction.LOGOUT;
    if (path.includes('/export')) return AuditAction.EXPORT;
    if (path.includes('/import')) return AuditAction.IMPORT;
    if (path.includes('/approve')) return AuditAction.APPROVE;
    if (path.includes('/reject')) return AuditAction.REJECT;

    return methodActionMap[method] || AuditAction.OTHER;
  }

  /**
   * Bestimmt die Schwere basierend auf Aktion und Erfolg
   */
  private determineSeverity(action: AuditAction, success: boolean): AuditSeverity {
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
      .replace(/\*/g, '[^/]+') // * matches any segment except /
      .replace(/\*\*/g, '.*'); // ** matches any path

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Prüft die Größe von Request/Response Bodies
   */
  private truncateIfNeeded(data: any): any {
    const json = JSON.stringify(data);
    if (json.length > this.config.maxBodySize) {
      return {
        _truncated: true,
        _originalSize: json.length,
        _message: `Body truncated - exceeded ${this.config.maxBodySize} bytes`,
      };
    }
    return data;
  }

  /**
   * Maps custom AuditAction to Prisma's AuditActionType
   */
  private mapActionToActionType(action: string): AuditActionType {
    const mapping: Record<string, AuditActionType> = {
      [AuditAction.VIEW]: AuditActionType.READ,
      [AuditAction.CREATE]: AuditActionType.CREATE,
      [AuditAction.UPDATE]: AuditActionType.UPDATE,
      [AuditAction.DELETE]: AuditActionType.DELETE,
      [AuditAction.LOGIN]: AuditActionType.LOGIN,
      [AuditAction.LOGOUT]: AuditActionType.LOGOUT,
      [AuditAction.EXPORT]: AuditActionType.EXPORT,
      [AuditAction.IMPORT]: AuditActionType.IMPORT,
      [AuditAction.GRANT_PERMISSION]: AuditActionType.PERMISSION_CHANGE,
      // REVOKE_PERMISSION maps to the same value, handled in the mapping logic
      [AuditAction.CHANGE_ROLE]: AuditActionType.ROLE_CHANGE,
      [AuditAction.CONFIG_CHANGE]: AuditActionType.SYSTEM_CONFIG,
      [AuditAction.BULK_OPERATION]: AuditActionType.BULK_OPERATION,
    };

    // Handle REVOKE_PERMISSION separately since it maps to the same value
    if (action === AuditAction.REVOKE_PERMISSION) {
      return AuditActionType.PERMISSION_CHANGE;
    }

    return mapping[action] || AuditActionType.READ;
  }

  /**
   * Prüft, ob die Aktion sensible Daten betrifft
   */
  private containsSensitiveData(resourceType: string, action: string): boolean {
    const sensitiveResources = ['user', 'permission', 'role', 'session', 'authentication'];
    const sensitiveActions = [
      AuditAction.GRANT_PERMISSION,
      AuditAction.REVOKE_PERMISSION,
      AuditAction.CHANGE_ROLE,
    ];

    return sensitiveResources.includes(resourceType) || sensitiveActions.includes(action as any);
  }

  /**
   * Prüft, ob die Aktion eine Überprüfung erfordert
   */
  private requiresReview(action: string, severity: string): boolean {
    return (
      severity === AuditSeverity.CRITICAL ||
      severity === AuditSeverity.HIGH ||
      action === AuditAction.DELETE ||
      action === AuditAction.GRANT_PERMISSION ||
      action === AuditAction.REVOKE_PERMISSION
    );
  }
}

/**
 * Factory function to create a configured AuditInterceptor
 */
export function createAuditInterceptor(
  auditLogService: AuditLogService,
  config?: Partial<AuditInterceptorConfig>,
): AuditInterceptor {
  const interceptor = new AuditInterceptor(auditLogService);
  if (config) {
    interceptor.setConfig(config);
  }
  return interceptor;
}
