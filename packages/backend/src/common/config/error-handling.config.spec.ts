import {
  getErrorConfigForEnvironment,
  DEVELOPMENT_ERROR_CONFIG,
  TEST_ERROR_CONFIG,
  PRODUCTION_ERROR_CONFIG,
  STAGING_ERROR_CONFIG,
  DEFAULT_FEATURE_FLAGS,
} from './error-handling.config';

describe('error-handling.config', () => {
  describe('getErrorConfigForEnvironment', () => {
    it('should return DEVELOPMENT_ERROR_CONFIG for development environment', () => {
      const config = getErrorConfigForEnvironment('development');
      expect(config).toBe(DEVELOPMENT_ERROR_CONFIG);
    });

    it('should return DEVELOPMENT_ERROR_CONFIG for dev environment', () => {
      const config = getErrorConfigForEnvironment('dev');
      expect(config).toBe(DEVELOPMENT_ERROR_CONFIG);
    });

    it('should return TEST_ERROR_CONFIG for test environment', () => {
      const config = getErrorConfigForEnvironment('test');
      expect(config).toBe(TEST_ERROR_CONFIG);
    });

    it('should return TEST_ERROR_CONFIG for testing environment', () => {
      const config = getErrorConfigForEnvironment('testing');
      expect(config).toBe(TEST_ERROR_CONFIG);
    });

    it('should return PRODUCTION_ERROR_CONFIG for production environment', () => {
      const config = getErrorConfigForEnvironment('production');
      expect(config).toBe(PRODUCTION_ERROR_CONFIG);
    });

    it('should return PRODUCTION_ERROR_CONFIG for prod environment', () => {
      const config = getErrorConfigForEnvironment('prod');
      expect(config).toBe(PRODUCTION_ERROR_CONFIG);
    });

    it('should return STAGING_ERROR_CONFIG for staging environment', () => {
      const config = getErrorConfigForEnvironment('staging');
      expect(config).toBe(STAGING_ERROR_CONFIG);
    });

    it('should return STAGING_ERROR_CONFIG for stage environment', () => {
      const config = getErrorConfigForEnvironment('stage');
      expect(config).toBe(STAGING_ERROR_CONFIG);
    });

    it('should return DEVELOPMENT_ERROR_CONFIG for unknown environment', () => {
      const config = getErrorConfigForEnvironment('unknown');
      expect(config).toBe(DEVELOPMENT_ERROR_CONFIG);
    });

    it('should return DEVELOPMENT_ERROR_CONFIG for empty string', () => {
      const config = getErrorConfigForEnvironment('');
      expect(config).toBe(DEVELOPMENT_ERROR_CONFIG);
    });

    it('should return DEVELOPMENT_ERROR_CONFIG for null environment', () => {
      const config = getErrorConfigForEnvironment(null as any);
      expect(config).toBe(DEVELOPMENT_ERROR_CONFIG);
    });

    it('should return DEVELOPMENT_ERROR_CONFIG for undefined environment', () => {
      const config = getErrorConfigForEnvironment(undefined as any);
      expect(config).toBe(DEVELOPMENT_ERROR_CONFIG);
    });

    it('should handle case insensitive environment names', () => {
      expect(getErrorConfigForEnvironment('DEVELOPMENT')).toBe(DEVELOPMENT_ERROR_CONFIG);
      expect(getErrorConfigForEnvironment('TEST')).toBe(TEST_ERROR_CONFIG);
      expect(getErrorConfigForEnvironment('PRODUCTION')).toBe(PRODUCTION_ERROR_CONFIG);
      expect(getErrorConfigForEnvironment('STAGING')).toBe(STAGING_ERROR_CONFIG);
    });
  });

  describe('Environment Configurations', () => {
    it('should have correct DEVELOPMENT_ERROR_CONFIG values', () => {
      expect(DEVELOPMENT_ERROR_CONFIG.retryConfig.maxRetries).toBe(5);
      expect(DEVELOPMENT_ERROR_CONFIG.retryConfig.timeout).toBe(60000);
      expect(DEVELOPMENT_ERROR_CONFIG.verboseErrorReporting).toBe(true);
      expect(DEVELOPMENT_ERROR_CONFIG.strictValidation).toBe(false);
      expect(DEVELOPMENT_ERROR_CONFIG.enableFeatureFlags).toBe(true);
      expect(DEVELOPMENT_ERROR_CONFIG.collectErrorMetrics).toBe(true);
    });

    it('should have correct TEST_ERROR_CONFIG values', () => {
      expect(TEST_ERROR_CONFIG.retryConfig.maxRetries).toBe(2);
      expect(TEST_ERROR_CONFIG.retryConfig.timeout).toBe(5000);
      expect(TEST_ERROR_CONFIG.verboseErrorReporting).toBe(false);
      expect(TEST_ERROR_CONFIG.strictValidation).toBe(true);
      expect(TEST_ERROR_CONFIG.enableFeatureFlags).toBe(false);
      expect(TEST_ERROR_CONFIG.collectErrorMetrics).toBe(false);
    });

    it('should have correct PRODUCTION_ERROR_CONFIG values', () => {
      expect(PRODUCTION_ERROR_CONFIG.retryConfig.maxRetries).toBe(3);
      expect(PRODUCTION_ERROR_CONFIG.retryConfig.timeout).toBe(30000);
      expect(PRODUCTION_ERROR_CONFIG.verboseErrorReporting).toBe(false);
      expect(PRODUCTION_ERROR_CONFIG.strictValidation).toBe(true);
      expect(PRODUCTION_ERROR_CONFIG.enableFeatureFlags).toBe(true);
      expect(PRODUCTION_ERROR_CONFIG.collectErrorMetrics).toBe(true);
      expect(PRODUCTION_ERROR_CONFIG.maxConcurrentOperations).toBe(20);
    });

    it('should have correct STAGING_ERROR_CONFIG values', () => {
      expect(STAGING_ERROR_CONFIG.retryConfig.maxRetries).toBe(3);
      expect(STAGING_ERROR_CONFIG.retryConfig.timeout).toBe(45000);
      expect(STAGING_ERROR_CONFIG.verboseErrorReporting).toBe(true);
      expect(STAGING_ERROR_CONFIG.strictValidation).toBe(true);
      expect(STAGING_ERROR_CONFIG.enableFeatureFlags).toBe(true);
      expect(STAGING_ERROR_CONFIG.collectErrorMetrics).toBe(true);
      expect(STAGING_ERROR_CONFIG.operationTimeout).toBe(45000);
    });
  });

  describe('DEFAULT_FEATURE_FLAGS', () => {
    it('should have correct default feature flags', () => {
      expect(DEFAULT_FEATURE_FLAGS.enableAdvancedRetry).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.enableDuplicateDetection).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.enableMetricsCollection).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.enableCircuitBreaker).toBe(false);
      expect(DEFAULT_FEATURE_FLAGS.enableRateLimiting).toBe(false);
    });
  });

  describe('Duplicate Detection Config', () => {
    it('should have appropriate timeWindow for each environment', () => {
      expect(DEVELOPMENT_ERROR_CONFIG.duplicateDetectionConfig.timeWindow).toBe(120000);
      expect(TEST_ERROR_CONFIG.duplicateDetectionConfig.timeWindow).toBe(10000);
      expect(PRODUCTION_ERROR_CONFIG.duplicateDetectionConfig.timeWindow).toBe(60000);
      expect(STAGING_ERROR_CONFIG.duplicateDetectionConfig.timeWindow).toBe(90000);
    });

    it('should have appropriate maxCacheSize for each environment', () => {
      expect(DEVELOPMENT_ERROR_CONFIG.duplicateDetectionConfig.maxCacheSize).toBe(500);
      expect(TEST_ERROR_CONFIG.duplicateDetectionConfig.maxCacheSize).toBe(100);
      expect(PRODUCTION_ERROR_CONFIG.duplicateDetectionConfig.maxCacheSize).toBe(1000);
      expect(STAGING_ERROR_CONFIG.duplicateDetectionConfig.maxCacheSize).toBe(750);
    });

    it('should have appropriate cleanupInterval for each environment', () => {
      expect(DEVELOPMENT_ERROR_CONFIG.duplicateDetectionConfig.cleanupInterval).toBe(60000);
      expect(TEST_ERROR_CONFIG.duplicateDetectionConfig.cleanupInterval).toBe(5000);
      expect(PRODUCTION_ERROR_CONFIG.duplicateDetectionConfig.cleanupInterval).toBe(300000);
      expect(STAGING_ERROR_CONFIG.duplicateDetectionConfig.cleanupInterval).toBe(180000);
    });
  });

  describe('Retry Config', () => {
    it('should have appropriate backoff settings for each environment', () => {
      expect(DEVELOPMENT_ERROR_CONFIG.retryConfig.baseDelay).toBe(1000);
      expect(DEVELOPMENT_ERROR_CONFIG.retryConfig.maxDelay).toBe(15000);
      expect(DEVELOPMENT_ERROR_CONFIG.retryConfig.backoffMultiplier).toBe(2);
      expect(DEVELOPMENT_ERROR_CONFIG.retryConfig.jitterFactor).toBe(0.2);

      expect(PRODUCTION_ERROR_CONFIG.retryConfig.baseDelay).toBe(500);
      expect(PRODUCTION_ERROR_CONFIG.retryConfig.maxDelay).toBe(10000);
      expect(PRODUCTION_ERROR_CONFIG.retryConfig.jitterFactor).toBe(0.15);
    });
  });
});
