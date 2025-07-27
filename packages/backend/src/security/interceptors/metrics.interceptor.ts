import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SecurityMetricsService } from '../metrics/security-metrics.service';

/**
 * Interceptor zur Erfassung von API-Metriken für Security-Endpoints.
 * Misst Request-Dauer und zählt Requests nach Status.
 */
@Injectable()
export class SecurityMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: SecurityMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extrahiere Route-Informationen
    const method = request.method;
    const route = request.route?.path || request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          // Erfolgreiche Response
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.metricsService.recordApiRequest(method, route, statusCode, duration);
        },
        error: (error) => {
          // Fehlerhafte Response
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.metricsService.recordApiRequest(method, route, statusCode, duration);
        },
      }),
    );
  }
}
