import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_FEATURE_FLAGS,
  EnvironmentErrorConfig,
  ErrorHandlingFeatureFlags,
  getErrorConfigForEnvironment,
} from '../config/error-handling.config';
import { DuplicateDetectionUtil } from '../utils/duplicate-detection.util';
import { RetryConfig, RetryUtil } from '../utils/retry.util';

/**
 * Interface für die Sammlung von Error-Metriken im Error Handling Service
 */
export interface ErrorMetrics {
  /** Gesamtanzahl aller aufgetretenen Fehler */
  totalErrors: number;
  /** Anzahl der Fehler, die wiederholt werden können */
  retryableErrors: number;
  /** Anzahl der Fehler, die nicht wiederholt werden können */
  nonRetryableErrors: number;
  /** Anzahl erfolgreicher Wiederholungsversuche */
  successfulRetries: number;
  /** Anzahl fehlgeschlagener Wiederholungsversuche */
  failedRetries: number;
  /** Anzahl der erkannten doppelten Operationen */
  duplicateOperations: number;
  /** Durchschnittliche Anzahl von Wiederholungsversuchen pro Operation */
  averageRetryAttempts: number;
  /** Zeitstempel des letzten aufgetretenen Fehlers */
  lastErrorTimestamp?: Date;
}

/**
 * Service für umgebungsspezifisches Error Handling
 *
 * Dieser Service bietet umfassende Fehlerbehandlung mit:
 * - Umgebungsspezifischen Konfigurationen
 * - Retry-Mechanismen mit exponentieller Backoff-Strategie
 * - Duplikatserkennung für idempotente Operationen
 * - Feature-Flags für granulare Kontrolle
 * - Detaillierte Error-Metriken und Monitoring
 *
 * @class ErrorHandlingService
 */
@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger(ErrorHandlingService.name);
  private readonly environment: string;
  private readonly config: EnvironmentErrorConfig;
  private readonly featureFlags: ErrorHandlingFeatureFlags;
  private readonly retryUtil: RetryUtil;
  private readonly duplicateDetectionUtil: DuplicateDetectionUtil;
  private readonly metrics: ErrorMetrics;

  constructor(private readonly configService: ConfigService) {
    this.environment = this.configService.get('NODE_ENV', 'development');
    this.config = getErrorConfigForEnvironment(this.environment);
    this.featureFlags = this.loadFeatureFlags();

    // Initialize utilities with environment-specific config
    this.retryUtil = new RetryUtil();
    this.duplicateDetectionUtil = new DuplicateDetectionUtil(this.config.duplicateDetectionConfig);

    // Initialize metrics
    this.metrics = {
      totalErrors: 0,
      retryableErrors: 0,
      nonRetryableErrors: 0,
      successfulRetries: 0,
      failedRetries: 0,
      duplicateOperations: 0,
      averageRetryAttempts: 0,
    };

    this.logger.log(`Error handling initialized for environment: ${this.environment}`);
    this.logConfiguration();
  }

  /**
   * Führt eine Operation mit umgebungsspezifischem Error Handling aus
   *
   * @param operation Die auszuführende Operation
   * @param operationId Eindeutige ID für die Operation
   * @param data Daten für Duplicate Detection
   * @param customConfig Optionale benutzerdefinierte Konfiguration
   * @returns Das Ergebnis der Operation
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationId: string,
    data?: any,
    customConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Verwende Duplicate Detection wenn aktiviert
      if (this.featureFlags.enableDuplicateDetection && data) {
        return await this.duplicateDetectionUtil.executeIdempotent(
          operationId,
          () => this.executeWithRetry(operation, customConfig),
          data,
        );
      } else {
        return await this.executeWithRetry(operation, customConfig);
      }
    } catch (error) {
      this.handleError(error, operationId, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Gibt die aktuellen Error Metrics zurück
   *
   * @returns Die aktuellen Metriken
   */
  getMetrics(): ErrorMetrics {
    return {
      ...this.metrics,
      averageRetryAttempts:
        this.metrics.totalErrors > 0
          ? this.metrics.successfulRetries / this.metrics.totalErrors
          : 0,
    };
  }

  /**
   * Gibt die aktuelle Umgebungskonfiguration zurück
   *
   * @returns Die aktuelle Konfiguration
   */
  getConfig(): EnvironmentErrorConfig {
    return { ...this.config };
  }

  /**
   * Gibt die aktuellen Feature Flags zurück
   *
   * @returns Die aktuellen Feature Flags
   */
  getFeatureFlags(): ErrorHandlingFeatureFlags {
    return { ...this.featureFlags };
  }

  /**
   * Gibt Duplicate Detection Statistiken zurück
   *
   * @returns Cache-Statistiken
   */
  getDuplicateDetectionStats() {
    return this.duplicateDetectionUtil.getCacheStats();
  }

  /**
   * Bereinigt Ressourcen (für Tests oder Shutdown)
   */
  cleanup(): void {
    this.duplicateDetectionUtil.destroy();
  }

  /**
   * Validiert eine Operation basierend auf der Umgebungskonfiguration
   *
   * @param operationData Die zu validierenden Daten
   * @param operationType Der Typ der Operation
   * @returns true, wenn die Validierung erfolgreich ist
   */
  validateOperation(operationData: any, operationType: string): boolean {
    if (!this.config.strictValidation) {
      return true;
    }

    // Umgebungsspezifische Validierungslogik
    switch (operationType) {
      case 'create-einsatz':
        return this.validateEinsatzCreation(operationData);
      default:
        return true;
    }
  }

  /**
   * Führt eine Operation mit Retry-Logik aus
   *
   * @param operation Die auszuführende Operation
   * @param customConfig Optionale benutzerdefinierte Konfiguration
   * @returns Das Ergebnis der Operation
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    if (!this.featureFlags.enableAdvancedRetry) {
      return await operation();
    }

    const finalConfig = { ...this.config.retryConfig, ...customConfig };
    return await this.retryUtil.executeWithRetry(operation, finalConfig);
  }

  /**
   * Behandelt Fehler basierend auf der Umgebungskonfiguration
   *
   * @param error Der aufgetretene Fehler
   * @param operationId ID der Operation
   * @param duration Dauer der Operation in Millisekunden
   */
  private handleError(error: any, operationId: string, duration: number): void {
    // Metriken aktualisieren
    if (this.config.collectErrorMetrics) {
      this.updateErrorMetrics(error);
    }

    // Umgebungsspezifisches Logging
    if (this.config.verboseErrorReporting) {
      this.logger.error(
        `Operation ${operationId} failed after ${duration}ms in ${this.environment} environment`,
        {
          error: error.message,
          stack: error.stack,
          code: error.code,
          operationId,
          duration,
          environment: this.environment,
        },
      );
    } else {
      this.logger.error(
        `Operation ${operationId} failed: ${error.message}`,
        error.code ? `Code: ${error.code}` : undefined,
      );
    }
  }

  /**
   * Aktualisiert Error Metrics
   *
   * @param error Der aufgetretene Fehler
   */
  private updateErrorMetrics(error: any): void {
    this.metrics.totalErrors++;
    this.metrics.lastErrorTimestamp = new Date();

    // Klassifiziere Fehler
    if (this.isRetryableError(error)) {
      this.metrics.retryableErrors++;
    } else {
      this.metrics.nonRetryableErrors++;
    }
  }

  /**
   * Prüft, ob ein Fehler wiederholbar ist
   *
   * @param error Der zu prüfende Fehler
   * @returns true, wenn der Fehler wiederholbar ist
   */
  private isRetryableError(error: any): boolean {
    // Verwende die gleiche Logik wie RetryUtil
    const postgresRetryableCodes = ['23505', '40P01', '40001', '57014', '08000'];

    if (error.code && postgresRetryableCodes.includes(error.code)) {
      return true;
    }

    if (error.code === 'P2002') {
      return true;
    }

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
   * Lädt Feature Flags aus der Konfiguration
   *
   * @returns Die geladenen Feature Flags
   */
  private loadFeatureFlags(): ErrorHandlingFeatureFlags {
    return {
      enableAdvancedRetry: this.configService.get(
        'ERROR_HANDLING_ENABLE_ADVANCED_RETRY',
        DEFAULT_FEATURE_FLAGS.enableAdvancedRetry,
      ),
      enableDuplicateDetection: this.configService.get(
        'ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION',
        DEFAULT_FEATURE_FLAGS.enableDuplicateDetection,
      ),
      enableMetricsCollection: this.configService.get(
        'ERROR_HANDLING_ENABLE_METRICS',
        DEFAULT_FEATURE_FLAGS.enableMetricsCollection,
      ),
      enableCircuitBreaker: this.configService.get(
        'ERROR_HANDLING_ENABLE_CIRCUIT_BREAKER',
        DEFAULT_FEATURE_FLAGS.enableCircuitBreaker,
      ),
      enableRateLimiting: this.configService.get(
        'ERROR_HANDLING_ENABLE_RATE_LIMITING',
        DEFAULT_FEATURE_FLAGS.enableRateLimiting,
      ),
    };
  }

  /**
   * Loggt die aktuelle Konfiguration
   */
  private logConfiguration(): void {
    this.logger.log(`Error handling configuration for ${this.environment}:`, {
      retryConfig: {
        maxRetries: this.config.retryConfig.maxRetries,
        baseDelay: this.config.retryConfig.baseDelay,
        timeout: this.config.retryConfig.timeout,
      },
      verboseErrorReporting: this.config.verboseErrorReporting,
      strictValidation: this.config.strictValidation,
      featureFlags: this.featureFlags,
    });
  }

  /**
   * Validiert Einsatz-Erstellung
   *
   * @param data Die Einsatz-Daten
   * @returns true, wenn die Validierung erfolgreich ist
   */
  private validateEinsatzCreation(data: any): boolean {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Einsatz name is required and must be a string');
    }

    if (data.name.length < 3) {
      throw new Error('Einsatz name must be at least 3 characters long');
    }

    if (data.name.length > 100) {
      throw new Error('Einsatz name must not exceed 100 characters');
    }

    // Production-spezifische Validierung
    if (this.environment === 'production') {
      if (data.name.toLowerCase().includes('test') || data.name.toLowerCase().includes('dev')) {
        throw new Error('Test or dev names are not allowed in production');
      }
    }

    return true;
  }
}
