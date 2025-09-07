import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceLogger } from '../utils/performance-logger.util';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const type = context.getType();

    // Nur HTTP Requests tracken
    if (type !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    // Remove query parameters to avoid logging PII/tokens
    const path = typeof url === 'string' ? url.split('?')[0] : url;
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const now = Date.now();
    request.startTime = now;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - now;
          const statusCode = response.statusCode;

          PerformanceLogger.logHttpRequest(method, path, statusCode, duration, `${className}/${handlerName}`);
        },
        error: (error) => {
          const duration = Date.now() - now;
          const statusCode = error.status || error.statusCode || 500;

          PerformanceLogger.logHttpRequest(method, path, statusCode, duration, `${className}/${handlerName}`, error.message);
        },
      }),
    );
  }
}
