import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SecurityLogService } from '@/security/services/security-log.service';
import { SecurityEventTypeExtended } from '@/security/constants/event-types';
import { LOG_ACCESS_KEY, LogAccessMetadata } from '../decorators/log-access.decorator';

/**
 * Interceptor für die Protokollierung von sensiblen Datenzugriffen.
 *
 * Dieser Interceptor arbeitet mit dem @LogAccess Decorator zusammen,
 * um Zugriffe auf sensible Daten zu protokollieren.
 *
 * @class LogAccessInterceptor
 * @implements {NestInterceptor}
 *
 * @example
 * ```typescript
 * // In einem Modul registrieren
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: LogAccessInterceptor,
 *     },
 *   ],
 * })
 * export class AppModule {}
 *
 * // Oder in einem Controller verwenden
 * @Controller('sensitive')
 * @UseInterceptors(LogAccessInterceptor)
 * export class SensitiveDataController {
 *   // ...
 * }
 * ```
 */
@Injectable()
export class LogAccessInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LogAccessInterceptor.name);

  constructor(
    private reflector: Reflector,
    private securityLogService: SecurityLogService,
  ) {}

  /**
   * Interceptor-Methode, die vor und nach der Route-Ausführung aufgerufen wird.
   *
   * @param context - Der Ausführungskontext
   * @param next - Der nächste Handler in der Kette
   * @returns Observable mit dem Ergebnis der Route
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logAccessMetadata = this.reflector.get<LogAccessMetadata>(
      LOG_ACCESS_KEY,
      context.getHandler(),
    );

    if (!logAccessMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const startTime = Date.now();

    // Log vor der Ausführung
    this.logDataAccess(request, user, logAccessMetadata, 'started').catch((error) => {
      this.logger.error('Failed to log data access start', error);
    });

    return next.handle().pipe(
      tap({
        next: () => {
          // Log nach erfolgreicher Ausführung
          const duration = Date.now() - startTime;
          this.logDataAccess(request, user, logAccessMetadata, 'completed', { duration }).catch(
            (error) => {
              this.logger.error('Failed to log data access completion', error);
            },
          );
        },
        error: (error) => {
          // Log bei Fehler
          const duration = Date.now() - startTime;
          this.logDataAccess(request, user, logAccessMetadata, 'failed', {
            duration,
            error: error.message,
          }).catch((logError) => {
            this.logger.error('Failed to log data access error', logError);
          });
        },
      }),
    );
  }

  /**
   * Protokolliert einen Datenzugriff.
   *
   * @param request - Der HTTP-Request
   * @param user - Der authentifizierte Benutzer
   * @param metadata - Die LogAccess-Metadaten
   * @param status - Der Status des Zugriffs
   * @param additionalData - Zusätzliche Daten
   */
  private async logDataAccess(
    request: any,
    user: any,
    metadata: LogAccessMetadata,
    status: 'started' | 'completed' | 'failed',
    additionalData?: Record<string, any>,
  ): Promise<void> {
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.securityLogService.log(SecurityEventTypeExtended.DATA_ACCESS, {
      action: SecurityEventTypeExtended.DATA_ACCESS,
      userId: user?.id || '',
      ip: ipAddress || '',
      userAgent,
      metadata: {
        resource: metadata.resource,
        dataAction: metadata.action,
        details: metadata.details,
        status,
        path: request.path,
        method: request.method,
        params: request.params,
        query: request.query,
        ...additionalData,
        severity: status === 'failed' ? 'WARNING' : 'INFO',
      },
    });
  }
}
