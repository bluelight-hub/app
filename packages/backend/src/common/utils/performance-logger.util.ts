import { Logger } from '@nestjs/common';

export class PerformanceLogger {
  private static readonly logger = new Logger('Performance');
  private static readonly SLOW_REQUEST_THRESHOLD = 1000; // ms

  /**
   * Logs HTTP request performance with appropriate log level based on status code
   */
  static logHttpRequest(method: string, url: string, statusCode: number, duration: number, context?: string, errorMessage?: string): void {
    const contextStr = context ? `[${context}] ` : '';
    const baseMessage = `${contextStr}${method} ${url} - ${statusCode} - ${duration}ms`;

    // Log mit unterschiedlichen Levels basierend auf Status Code
    if (statusCode >= 200 && statusCode < 300) {
      // Success
      PerformanceLogger.logger.log(baseMessage);

      // Slow request warning
      if (duration > PerformanceLogger.SLOW_REQUEST_THRESHOLD) {
        PerformanceLogger.logger.warn(`Slow request detected: ${method} ${url} took ${duration}ms`);
      }
    } else if (statusCode === 401 || statusCode === 403) {
      // Unauthorized/Forbidden
      PerformanceLogger.logger.warn(`${baseMessage} (Unauthorized/Forbidden)`);
    } else if (statusCode >= 400 && statusCode < 500) {
      // Client errors
      PerformanceLogger.logger.log(`${baseMessage} (Client Error)`);
    } else {
      // Server errors (500+)
      const errorInfo = errorMessage ? `: ${errorMessage}` : '';
      PerformanceLogger.logger.error(`${baseMessage}${errorInfo}`);
    }
  }
}
