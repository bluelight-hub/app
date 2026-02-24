import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { DEPRECATION_KEY, DeprecationInfo } from '../decorators/deprecated.decorator';

/**
 * Globaler Interceptor fuer Deprecation-Headers (RFC 8594).
 *
 * Prueft ob ein Handler oder Controller mit @Deprecated() markiert ist
 * und setzt die entsprechenden HTTP-Headers:
 * - `Deprecation: true`
 * - `Sunset: <sunsetDate>`
 * - `Link: <successor-url>; rel="successor-version"`
 *
 * WebSocket-Kontexte werden uebersprungen, da dort keine HTTP-Headers
 * gesetzt werden koennen.
 *
 * Story 5.7 AC2: Deprecation Infrastructure.
 *
 * @see {@link Deprecated} Decorator
 */
@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Nur HTTP-Kontexte verarbeiten (WebSocket etc. ueberspringen)
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const deprecation = this.reflector.getAllAndOverride<DeprecationInfo | undefined>(DEPRECATION_KEY, [context.getHandler(), context.getClass()]);

    if (deprecation) {
      const response = context.switchToHttp().getResponse();
      const request = context.switchToHttp().getRequest();

      // Standard Deprecation Headers (RFC 8594)
      response.setHeader('Deprecation', 'true');
      response.setHeader('Sunset', deprecation.sunsetDate);

      // Link zum Nachfolger-Endpoint
      const originalUrl = request.originalUrl || '';
      const successorUrl = originalUrl.replace(/\/v-[^/]+\//, `/v-${deprecation.successorVersion}/`);

      // Nur Link-Header setzen wenn URL-Transformation tatsaechlich gegriffen hat
      // (VERSION_NEUTRAL Endpoints wie /health haben keinen Version-Prefix)
      if (successorUrl !== originalUrl) {
        response.setHeader('Link', `<${successorUrl}>; rel="successor-version"`);
      }
    }

    return next.handle();
  }
}
