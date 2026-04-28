import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import type { Request, Response } from 'express';
import { createId } from '@paralleldrive/cuid2';
import * as util from 'node:util';
import { PerformanceLogger } from '@/shared/utils/performance-logger.util';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const messages = value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter((entry) => entry.length > 0);

    return messages.length > 0 ? messages.join(' ') : null;
  }

  return null;
}

function getDefaultClientErrorMessage(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'Ungültige Anfrage';
    case HttpStatus.UNAUTHORIZED:
      return 'Unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'Forbidden';
    case HttpStatus.NOT_FOUND:
      return 'Nicht gefunden';
    case HttpStatus.CONFLICT:
      return 'Konflikt';
    default:
      return 'Ein unerwarteter Fehler ist aufgetreten';
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithStartTime>();

    // Generate or retrieve request ID for correlation
    const requestId = (request.headers['x-request-id'] as string) || createId();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Determine error details based on status code
    let message: string;
    let errorDetails: unknown = null;
    let errorCode: unknown = null;
    let errorContext: unknown = null;
    let allowClientCode = false;

    if (status >= 500) {
      // Log the actual error internally for debugging
      const actualError = exception instanceof HttpException ? exception.getResponse() : exception;
      this.logger.error(`[${requestId}] Internal Server Error: ${util.inspect(actualError)}`, exception instanceof Error ? exception.stack : undefined);

      // Check for known 5xx errors that should expose error code to frontend
      // SERVER_NOT_SETUP: Frontend needs this to redirect to /setup page
      if (exception instanceof HttpException) {
        const errorResponse = exception.getResponse();
        if (typeof errorResponse === 'object' && errorResponse !== null) {
          const responseObj = errorResponse as Record<string, unknown>;
          if (responseObj.error === 'SERVER_NOT_SETUP') {
            message = normalizeMessage(responseObj.message) || 'Server setup required';
            errorDetails = 'SERVER_NOT_SETUP';
            errorCode = responseObj.code || null;
            allowClientCode = true;
          } else if (normalizeMessage(responseObj.message) === 'SETUP_EXECUTION_FAILED') {
            message = 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
            errorCode = responseObj.code || 'SETUP_EXECUTION_FAILED';
            allowClientCode = true;
          } else {
            // Default: don't expose sensitive information
            message = 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
          }
        } else {
          message = 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
        }
      } else {
        message = 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      }
    } else {
      // For client errors (4xx), provide the actual error message
      if (exception instanceof HttpException) {
        const errorResponse = exception.getResponse();
        if (typeof errorResponse === 'string') {
          message = normalizeMessage(errorResponse) || getDefaultClientErrorMessage(status);
        } else if (typeof errorResponse === 'object' && errorResponse !== null) {
          const responseObj = errorResponse as Record<string, unknown>;
          message = normalizeMessage(responseObj.message) || normalizeMessage(exception.message) || normalizeMessage(responseObj.error) || getDefaultClientErrorMessage(status);
          errorDetails = responseObj.error || null;
          errorCode = responseObj.code || null;
          // Domain-spezifischer Strukturkontext (z. B. ConflictException-Body
          // mit `{ context: { rule, einheitId, profil, currentVersion } }`)
          // muss durchgereicht werden, damit Clients den Konflikt-Pfad
          // korrekt darstellen können (Story 3.2 AC5/AC6).
          if (responseObj.context !== undefined && responseObj.context !== null && typeof responseObj.context === 'object') {
            errorContext = responseObj.context;
          }
        } else {
          message = normalizeMessage(exception.message) || getDefaultClientErrorMessage(status);
        }
      } else {
        message = 'Ein unerwarteter Fehler ist aufgetreten';
      }
    }

    const start = request.startTime ?? response.locals?.startTime ?? Date.now();
    const duration = Date.now() - start;

    // Log request with correlation ID
    PerformanceLogger.logHttpRequest(request.method, request.url, status, duration, 'ExceptionFilter', `[${requestId}] ${message}`);

    // Build response body
    const responseBody: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      requestId, // Always include request ID for correlation
    };

    // Include error details for non-5xx errors, or for whitelisted 5xx errors (SERVER_NOT_SETUP)
    if (errorDetails && (status < 500 || errorDetails === 'SERVER_NOT_SETUP')) {
      responseBody.error = errorDetails;
    }
    if (errorCode && (status < 500 || allowClientCode)) {
      responseBody.code = errorCode;
    }
    if (errorContext && status < 500) {
      responseBody.context = errorContext;
    }

    // Set request ID header for client correlation
    response.setHeader('X-Request-Id', requestId);

    response.status(status).json(responseBody);
  }
}
