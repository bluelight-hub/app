import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLoggerUtil } from '../utils';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import { logger } from '../../../logger/consola.logger';

/**
 * Interceptor für automatisches Audit-Logging von HTTP-Anfragen
 * Erfasst Request/Response-Daten und erstellt strukturierte Audit-Logs
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogger: AuditLoggerUtil) {}

  /**
   * Bestimmt den AuditActionType basierend auf HTTP-Methode
   */
  private getActionType(method: string): AuditActionType {
    const methodMap: Record<string, AuditActionType> = {
      GET: AuditActionType.READ,
      POST: AuditActionType.CREATE,
      PUT: AuditActionType.UPDATE,
      PATCH: AuditActionType.UPDATE,
      DELETE: AuditActionType.DELETE,
    };
    // Fallback auf READ für unbekannte Methoden (z.B. HEAD, OPTIONS)
    return methodMap[method] || AuditActionType.READ;
  }

  /**
   * Bestimmt die AuditSeverity basierend auf verschiedenen Faktoren
   */
  private getSeverity(
    method: string,
    path: string,
    statusCode: number,
    isError: boolean,
  ): AuditSeverity {
    // Fehler haben höhere Severity
    if (isError) {
      if (statusCode >= 500) return AuditSeverity.CRITICAL;
      if (statusCode >= 400) return AuditSeverity.HIGH;
    }

    // Admin-Endpoints haben höhere Severity
    if (path.includes('/admin')) {
      if (method === 'DELETE') return AuditSeverity.CRITICAL;
      if (['POST', 'PUT', 'PATCH'].includes(method)) return AuditSeverity.HIGH;
      return AuditSeverity.MEDIUM;
    }

    // Auth-Endpoints
    if (path.includes('/auth')) {
      if (path.includes('login') || path.includes('logout')) return AuditSeverity.MEDIUM;
      return AuditSeverity.HIGH;
    }

    // Standard-Operationen
    if (method === 'DELETE') return AuditSeverity.HIGH;
    if (['POST', 'PUT', 'PATCH'].includes(method)) return AuditSeverity.MEDIUM;
    return AuditSeverity.LOW;
  }

  /**
   * Extrahiert die Ressource aus dem Pfad
   */
  private extractResource(path: string): string {
    const pathSegments = path.split('/').filter(Boolean);

    // API-Version entfernen (z.B. v1, v2)
    const filteredSegments = pathSegments.filter((segment) => !segment.match(/^v\d+$/));

    if (filteredSegments.length === 0) return 'root';
    if (filteredSegments.length === 1) return filteredSegments[0];

    // Für verschachtelte Ressourcen
    return filteredSegments.slice(0, 2).join('/');
  }

  /**
   * Extrahiert die Ressourcen-ID aus dem Pfad oder den Params
   */
  private extractResourceId(path: string, params: any): string | undefined {
    // Zuerst versuchen wir es mit den Params
    if (params && params.id) {
      return params.id;
    }

    // Sucht nach UUID-Pattern im Pfad
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = path.match(uuidPattern);
    if (match) return match[0];

    // Sucht nach Nano-ID Pattern (21 Zeichen)
    const nanoIdPattern = /[A-Za-z0-9_-]{21}/;
    const pathSegments = path.split('/').filter(Boolean);
    for (const segment of pathSegments) {
      if (segment.match(nanoIdPattern) && !segment.match(/^v\d+$/)) {
        return segment;
      }
    }

    // Sucht nach numerischen IDs im Pfad
    const numericPattern = /^[0-9]+$/;
    for (const segment of pathSegments) {
      if (segment.match(numericPattern)) {
        return segment;
      }
    }

    return undefined;
  }

  /**
   * Sanitisiert den Request-Body für das Audit-Log
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'refreshToken',
      'accessToken',
      'creditCard',
      'ssn',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Erstellt die Aktionsbeschreibung
   */
  private createActionDescription(
    method: string,
    resource: string,
    statusCode: number,
    isError: boolean,
  ): string {
    const baseAction = `${method} ${resource}`;

    if (isError) {
      return `${baseAction} (failed with ${statusCode})`;
    }

    return baseAction;
  }

  /**
   * Bestimmt ob bestimmte Pfade vom Audit-Logging ausgeschlossen werden sollen
   */
  private shouldSkipAuditLog(path: string): boolean {
    const skipPaths = ['/health', '/metrics', '/favicon.ico', '/robots.txt', '/_next', '/static'];

    return skipPaths.some((skipPath) => path.startsWith(skipPath));
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    // Überspringe Audit-Logging für bestimmte Pfade
    if (this.shouldSkipAuditLog(request.path)) {
      return next.handle();
    }

    const { method, path, body, query, params } = request;
    const resource = this.extractResource(path);
    const resourceId = this.extractResourceId(path, params);

    // Request-ID für Tracing
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Intercepting request for audit logging', {
      method,
      path,
      resource,
      resourceId,
      requestId,
    });

    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        try {
          await this.auditLogger.logAction(request, {
            actionType: this.getActionType(method),
            severity: this.getSeverity(method, path, statusCode, false),
            action: this.createActionDescription(method, resource, statusCode, false),
            resource,
            resourceId,
            duration,
            success: true,
            statusCode,
            metadata: {
              method,
              path,
              query: Object.keys(query).length > 0 ? query : undefined,
              params: Object.keys(params).length > 0 ? params : undefined,
              body: method !== 'GET' ? this.sanitizeBody(body) : undefined,
              responseSize: JSON.stringify(data).length,
              requestId,
            },
            affectedFields: method !== 'GET' && body ? Object.keys(body) : undefined,
          });
        } catch (error) {
          logger.error('Failed to create audit log in interceptor', {
            error: error.message,
            method,
            path,
            requestId,
          });
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode =
          error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        // Erstelle Audit-Log für Fehler
        this.auditLogger
          .logAction(request, {
            actionType: this.getActionType(method),
            severity: this.getSeverity(method, path, statusCode, true),
            action: this.createActionDescription(method, resource, statusCode, true),
            resource,
            resourceId,
            duration,
            success: false,
            statusCode,
            errorMessage: error.message || 'Unknown error',
            metadata: {
              method,
              path,
              query: Object.keys(query).length > 0 ? query : undefined,
              params: Object.keys(params).length > 0 ? params : undefined,
              body: method !== 'GET' ? this.sanitizeBody(body) : undefined,
              errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
              requestId,
            },
            affectedFields: method !== 'GET' && body ? Object.keys(body) : undefined,
            requiresReview: statusCode >= 500,
          })
          .catch((auditError) => {
            logger.error('Failed to create error audit log in interceptor', {
              error: auditError.message,
              originalError: error.message,
              method,
              path,
              requestId,
            });
          });

        // Re-throw den ursprünglichen Fehler
        return throwError(() => error);
      }),
    );
  }
}
