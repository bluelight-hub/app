import { DuplicateDetectionConfig } from '../utils/duplicate-detection.util';
import { RetryConfig } from '../utils/retry.util';

/**
 * Umgebungsspezifische Konfiguration für Error Handling
 */
export interface EnvironmentErrorConfig {
    /** Retry-Konfiguration für diese Umgebung */
    retryConfig: RetryConfig;
    /** Duplicate Detection Konfiguration */
    duplicateDetectionConfig: DuplicateDetectionConfig;
    /** Ob detaillierte Fehlerberichte aktiviert sind */
    verboseErrorReporting: boolean;
    /** Ob strikte Validierung aktiviert ist */
    strictValidation: boolean;
    /** Ob Feature Flags aktiviert sind */
    enableFeatureFlags: boolean;
    /** Maximale Anzahl gleichzeitiger Operationen */
    maxConcurrentOperations: number;
    /** Timeout für Operationen in Millisekunden */
    operationTimeout: number;
    /** Ob Fehler-Metriken gesammelt werden sollen */
    collectErrorMetrics: boolean;
}

/**
 * Development Environment Konfiguration
 */
export const DEVELOPMENT_ERROR_CONFIG: EnvironmentErrorConfig = {
    retryConfig: {
        maxRetries: 5, // Mehr Versuche für Entwicklung
        baseDelay: 1000,
        maxDelay: 15000,
        backoffMultiplier: 2,
        jitterFactor: 0.2,
        timeout: 60000, // Längere Timeouts für Debugging
    },
    duplicateDetectionConfig: {
        timeWindow: 120000, // 2 Minuten für Entwicklung
        maxCacheSize: 500,
        cleanupInterval: 60000, // 1 Minute
    },
    verboseErrorReporting: true,
    strictValidation: false, // Weniger strikt für Entwicklung
    enableFeatureFlags: true,
    maxConcurrentOperations: 10,
    operationTimeout: 60000,
    collectErrorMetrics: true,
};

/**
 * Test Environment Konfiguration
 */
export const TEST_ERROR_CONFIG: EnvironmentErrorConfig = {
    retryConfig: {
        maxRetries: 2, // Weniger Versuche für schnelle Tests
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        timeout: 5000, // Kurze Timeouts für Tests
    },
    duplicateDetectionConfig: {
        timeWindow: 10000, // 10 Sekunden für Tests
        maxCacheSize: 100,
        cleanupInterval: 5000, // 5 Sekunden
    },
    verboseErrorReporting: false,
    strictValidation: true, // Strikt für Tests
    enableFeatureFlags: false,
    maxConcurrentOperations: 5,
    operationTimeout: 5000,
    collectErrorMetrics: false,
};

/**
 * Production Environment Konfiguration
 */
export const PRODUCTION_ERROR_CONFIG: EnvironmentErrorConfig = {
    retryConfig: {
        maxRetries: 3, // Moderate Anzahl für Production
        baseDelay: 500,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0.15,
        timeout: 30000, // Standard Timeouts
    },
    duplicateDetectionConfig: {
        timeWindow: 60000, // 1 Minute für Production
        maxCacheSize: 1000,
        cleanupInterval: 300000, // 5 Minuten
    },
    verboseErrorReporting: false, // Keine detaillierten Fehler in Production
    strictValidation: true,
    enableFeatureFlags: true,
    maxConcurrentOperations: 20,
    operationTimeout: 30000,
    collectErrorMetrics: true,
};

/**
 * Staging Environment Konfiguration
 */
export const STAGING_ERROR_CONFIG: EnvironmentErrorConfig = {
    retryConfig: {
        maxRetries: 3,
        baseDelay: 750,
        maxDelay: 12000,
        backoffMultiplier: 2,
        jitterFactor: 0.15,
        timeout: 45000,
    },
    duplicateDetectionConfig: {
        timeWindow: 90000, // 1.5 Minuten für Staging
        maxCacheSize: 750,
        cleanupInterval: 180000, // 3 Minuten
    },
    verboseErrorReporting: true, // Detaillierte Fehler für Staging
    strictValidation: true,
    enableFeatureFlags: true,
    maxConcurrentOperations: 15,
    operationTimeout: 45000,
    collectErrorMetrics: true,
};

/**
 * Gibt die Konfiguration für die aktuelle Umgebung zurück
 * 
 * @param environment Die Umgebung (NODE_ENV)
 * @returns Die entsprechende Error Handling Konfiguration
 */
export function getErrorConfigForEnvironment(environment: string): EnvironmentErrorConfig {
    switch (environment?.toLowerCase()) {
        case 'development':
        case 'dev':
            return DEVELOPMENT_ERROR_CONFIG;
        case 'test':
        case 'testing':
            return TEST_ERROR_CONFIG;
        case 'production':
        case 'prod':
            return PRODUCTION_ERROR_CONFIG;
        case 'staging':
        case 'stage':
            return STAGING_ERROR_CONFIG;
        default:
            // Fallback auf Development für unbekannte Umgebungen
            return DEVELOPMENT_ERROR_CONFIG;
    }
}

/**
 * Feature Flags für Error Handling
 */
export interface ErrorHandlingFeatureFlags {
    /** Ob erweiterte Retry-Logik aktiviert ist */
    enableAdvancedRetry: boolean;
    /** Ob Duplicate Detection aktiviert ist */
    enableDuplicateDetection: boolean;
    /** Ob Metriken-Sammlung aktiviert ist */
    enableMetricsCollection: boolean;
    /** Ob Circuit Breaker aktiviert ist */
    enableCircuitBreaker: boolean;
    /** Ob Rate Limiting aktiviert ist */
    enableRateLimiting: boolean;
}

/**
 * Standard Feature Flags
 */
export const DEFAULT_FEATURE_FLAGS: ErrorHandlingFeatureFlags = {
    enableAdvancedRetry: true,
    enableDuplicateDetection: true,
    enableMetricsCollection: true,
    enableCircuitBreaker: false, // Noch nicht implementiert
    enableRateLimiting: false, // Noch nicht implementiert
}; 