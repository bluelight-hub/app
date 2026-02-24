import { type CallHandler, type ExecutionContext, Inject, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Histogram } from 'prom-client';
import { METRICS } from '@/infrastructure/di-tokens';

/**
 * Globaler HTTP Request Duration Interceptor.
 *
 * Misst die Dauer jedes HTTP Requests und speichert sie als
 * Prometheus Histogram (http_request_duration_seconds).
 *
 * Labels:
 * - method: HTTP Methode (GET, POST, etc.)
 * - route: Express Route-Pattern (z.B. /api/v-alpha/einsatz/:id)
 * - status_code: HTTP Status Code (200, 404, 500, etc.)
 *
 * @see Story 5.6 AC1
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @Inject(METRICS.HTTP_REQUEST_DURATION)
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // WebSocket-Kontexte ueberspringen
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const end = this.httpRequestDuration.startTimer({
      method: request.method,
      route: request.route?.path || request.url,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          end({ status_code: String(response.statusCode) });
        },
        error: (error: { status?: number }) => {
          end({ status_code: String(error.status || 500) });
        },
      }),
    );
  }
}
