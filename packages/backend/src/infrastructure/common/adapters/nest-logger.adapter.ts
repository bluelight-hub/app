/**
 * NestJS Logger Adapter - Infrastructure Implementation für ILogger Port.
 *
 * Dieser Adapter verbindet den framework-agnostischen ILogger Port mit
 * dem konkreten NestJS Logger. Er ermöglicht dem Application Layer,
 * Logging zu verwenden ohne direkte Abhängigkeit von NestJS.
 *
 * **Clean Architecture Pattern:**
 * - Domain/Application Layer definiert ILogger Port (Dependency Inversion)
 * - Infrastructure Layer stellt diesen Adapter bereit
 * - NestJS DI injiziert diesen Adapter via LOGGER Token
 *
 * **Verwendung:**
 * ```typescript
 * // Application Layer
 * constructor(@Inject(LOGGER) private readonly logger: ILogger) {}
 *
 * this.logger.log('Message', { context: 'data' });
 * ```
 *
 * @module infrastructure/common/adapters
 * @see ILogger - Domain Port Interface
 */

import { Injectable, Logger } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';

/**
 * NestJS Logger Adapter.
 *
 * Implementiert ILogger Port mit NestJS Logger als konkrete Implementierung.
 */
@Injectable()
export class NestLoggerAdapter implements ILogger {
  private readonly logger: Logger;

  /**
   * Erstellt einen neuen NestLoggerAdapter.
   *
   * @param context - Optional: Logger Context (z.B. Klassenname)
   */
  constructor(context?: string) {
    this.logger = new Logger(context || 'Application');
  }

  /**
   * {@inheritDoc ILogger.log}
   */
  log(message: string, context?: unknown): void {
    if (context !== undefined) {
      this.logger.log(message, context);
    } else {
      this.logger.log(message);
    }
  }

  /**
   * {@inheritDoc ILogger.error}
   */
  error(message: string, context?: unknown): void {
    if (context !== undefined) {
      this.logger.error(message, context);
    } else {
      this.logger.error(message);
    }
  }

  /**
   * {@inheritDoc ILogger.warn}
   */
  warn(message: string, context?: unknown): void {
    if (context !== undefined) {
      this.logger.warn(message, context);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * {@inheritDoc ILogger.debug}
   */
  debug(message: string, context?: unknown): void {
    if (context !== undefined) {
      this.logger.debug(message, context);
    } else {
      this.logger.debug(message);
    }
  }
}
