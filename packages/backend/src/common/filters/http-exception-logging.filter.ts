import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PerformanceLogger } from '../utils/performance-logger.util';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

@Catch()
export class HttpExceptionLoggingFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithStartTime>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.message : 'Internal server error';

    // Performance-Log für Fehler
    const duration = Date.now() - (request.startTime || Date.now());

    PerformanceLogger.logHttpRequest(request.method, request.url, status, duration, 'ExceptionFilter', message);

    // Standard Exception Response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
