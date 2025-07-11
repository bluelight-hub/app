import { Logger } from '@nestjs/common';

/**
 * Konfiguration für Retry-Verhalten
 */
export interface RetryConfig {
  /** Maximale Anzahl der Wiederholungsversuche */
  maxRetries: number;
  /** Basis-Verzögerung in Millisekunden */
  baseDelay: number;
  /** Maximale Verzögerung in Millisekunden */
  maxDelay: number;
  /** Multiplikator für exponentielles Backoff */
  backoffMultiplier: number;
  /** Jitter-Faktor (0-1) für zufällige Verzögerung */
  jitterFactor: number;
  /** Timeout für einzelne Versuche in Millisekunden */
  timeout?: number;
}

/**
 * Standard-Konfiguration für Retry-Verhalten
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  timeout: 30000,
};

/**
 * PostgreSQL-spezifische Fehlercodes, die einen Retry rechtfertigen
 */
export const POSTGRES_RETRYABLE_ERRORS = {
  UNIQUE_VIOLATION: '23505',
  DEADLOCK_DETECTED: '40P01',
  SERIALIZATION_FAILURE: '40001',
  QUERY_TIMEOUT: '57014',
  CONNECTION_FAILURE: '08000',
  CONNECTION_EXCEPTION: '08001',
  CONNECTION_DOES_NOT_EXIST: '08003',
  CONNECTION_FAILURE_SQLCLIENT: '08006',
  TRANSACTION_ROLLBACK: '40000',
  TRANSACTION_ROLLBACK_SERIALIZATION: '40001',
  TRANSACTION_ROLLBACK_DEADLOCK: '40P01',
} as const;

/**
 * Utility-Klasse für robuste Retry-Mechanismen mit exponential backoff
 *
 * Diese Klasse bietet Retry-Funktionalität für fehleranfällige Operationen
 * mit konfigurierbarem exponentiellen Backoff und Jitter.
 *
 * Features:
 * - Exponentielles Backoff mit konfigurierbarem Multiplikator
 * - Jitter zur Vermeidung von Thundering Herd
 * - Unterstützung für PostgreSQL- und Netzwerk-Fehler
 * - Konfigurierbare Timeouts pro Versuch
 *
 * @class RetryUtil
 */
export class RetryUtil {
  private readonly logger = new Logger(RetryUtil.name);

  /**
   * Führt eine Operation mit Retry-Logik aus
   *
   * @param operation Die auszuführende Operation
   * @param config Retry-Konfiguration
   * @param context Kontext für Logging
   * @returns Das Ergebnis der Operation
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context = 'operation',
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: any = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        this.logger.debug(`${context}: Versuch ${attempt + 1}/${finalConfig.maxRetries + 1}`);

        // Operation ausführen, optional mit Timeout
        const operationPromise = operation();
        const result = finalConfig.timeout
          ? await this.withTimeout(operationPromise, finalConfig.timeout)
          : await operationPromise;

        return result;
      } catch (error) {
        lastError = error;

        // Prüfen, ob der Fehler einen Retry rechtfertigt
        if (!this.isRetryableError(error)) {
          this.logger.warn(`${context}: Nicht-wiederholbarer Fehler erkannt`, error.message);
          throw error;
        }

        // Wenn es der letzte Versuch war, Fehler werfen
        if (attempt >= finalConfig.maxRetries) {
          this.logger.error(
            `${context}: Alle ${finalConfig.maxRetries + 1} Versuche fehlgeschlagen`,
          );
          throw lastError;
        }

        // Verzögerung berechnen und warten
        const delay = this.calculateDelay(attempt + 1, finalConfig);
        this.logger.warn(
          `${context}: Versuch ${attempt + 1} fehlgeschlagen (${error.code || error.message}), ` +
            `warte ${delay}ms vor nächstem Versuch`,
        );

        await this.delay(delay);
      }
    }

    // Sollte nie erreicht werden, aber als Fallback
    throw lastError;
  }

  /**
   * Prüft, ob ein Fehler einen Retry rechtfertigt
   *
   * @param error Der zu prüfende Fehler
   * @returns true, wenn der Fehler wiederholbar ist
   */
  private isRetryableError(error: any): boolean {
    // PostgreSQL-spezifische Fehlercodes
    if (error.code && Object.values(POSTGRES_RETRYABLE_ERRORS).includes(error.code)) {
      return true;
    }

    // Prisma-spezifische Fehler
    if (error.code === 'P2002') {
      // Unique constraint violation
      return true;
    }

    // Netzwerk- und Verbindungsfehler
    if (
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ENOTFOUND') ||
      error.message?.includes('ETIMEDOUT')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Berechnet die Verzögerung für den nächsten Versuch mit exponential backoff und jitter
   *
   * @param attempt Aktuelle Versuchsnummer (1-basiert)
   * @param config Retry-Konfiguration
   * @returns Verzögerung in Millisekunden
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);

    // Jitter hinzufügen (zufällige Variation)
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;

    // Maximale Verzögerung respektieren
    return Math.min(delayWithJitter, config.maxDelay);
  }

  /**
   * Hilfsfunktion für Verzögerungen
   *
   * @param ms Verzögerung in Millisekunden
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      timer.unref(); // Timer soll den Prozess nicht am Beenden hindern
    });
  }

  /**
   * Führt eine Operation mit Timeout aus
   *
   * @param promise Das auszuführende Promise
   * @param timeoutMs Timeout in Millisekunden
   * @returns Das Ergebnis der Operation
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
      timer.unref(); // Timer soll den Prozess nicht am Beenden hindern
    });

    return Promise.race([promise, timeoutPromise]);
  }
}
