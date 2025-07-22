import { DEFAULT_RETRY_CONFIG, POSTGRES_RETRYABLE_ERRORS, RetryUtil } from '../retry.util';

// Mock logger
jest.mock('@/logger/consola.logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RetryUtil', () => {
  let retryUtil: RetryUtil;

  beforeEach(() => {
    retryUtil = new RetryUtil();
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('sollte bei erfolgreichem ersten Versuch das Ergebnis zurückgeben', async () => {
      // Arrange
      const expectedResult = 'success';
      const operation = jest.fn().mockResolvedValue(expectedResult);

      // Act
      const result = await retryUtil.executeWithRetry(operation);

      // Assert
      expect(result).toBe(expectedResult);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('sollte bei wiederholbaren Fehlern Retry durchführen', async () => {
      // Arrange
      const expectedResult = 'success';
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce({ code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED })
        .mockResolvedValue(expectedResult);

      // Act
      const result = await retryUtil.executeWithRetry(operation, { maxRetries: 3, baseDelay: 10 });

      // Assert
      expect(result).toBe(expectedResult);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('sollte bei nicht-wiederholbaren Fehlern sofort fehlschlagen', async () => {
      // Arrange
      const nonRetryableError = new Error('Non-retryable error');
      const operation = jest.fn().mockRejectedValue(nonRetryableError);

      // Act & Assert
      await expect(retryUtil.executeWithRetry(operation)).rejects.toThrow(nonRetryableError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('sollte nach maxRetries fehlschlagen', async () => {
      // Arrange
      const retryableError = new Error('Serialization failure') as any;
      retryableError.code = POSTGRES_RETRYABLE_ERRORS.SERIALIZATION_FAILURE;
      const operation = jest.fn().mockRejectedValue(retryableError);

      // Act & Assert
      await expect(
        retryUtil.executeWithRetry(operation, { maxRetries: 2, baseDelay: 10 }),
      ).rejects.toThrow('All 2 retry attempts failed');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries (maxRetries + 1 total attempts)
    });

    it('sollte PostgreSQL-spezifische Fehlercodes als wiederholbar erkennen', async () => {
      // Arrange
      const postgresErrors = [
        { code: POSTGRES_RETRYABLE_ERRORS.UNIQUE_VIOLATION },
        { code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED },
        { code: POSTGRES_RETRYABLE_ERRORS.SERIALIZATION_FAILURE },
        { code: POSTGRES_RETRYABLE_ERRORS.QUERY_TIMEOUT },
        { code: POSTGRES_RETRYABLE_ERRORS.CONNECTION_FAILURE },
      ];

      for (const error of postgresErrors) {
        const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

        const result = await retryUtil.executeWithRetry(operation, {
          maxRetries: 1,
          baseDelay: 10,
        });
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
        jest.clearAllMocks();
      }
    });

    it('sollte Prisma-spezifische Fehlercodes als wiederholbar erkennen', async () => {
      // Arrange
      const prismaError = { code: 'P2002' }; // Unique constraint violation
      const operation = jest.fn().mockRejectedValueOnce(prismaError).mockResolvedValue('success');

      // Act
      const result = await retryUtil.executeWithRetry(operation, { maxRetries: 1, baseDelay: 10 });

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('sollte Netzwerkfehler als wiederholbar erkennen', async () => {
      // Arrange
      const networkErrors = [
        new Error('ECONNRESET'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
      ];

      for (const error of networkErrors) {
        const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

        const result = await retryUtil.executeWithRetry(operation, {
          maxRetries: 1,
          baseDelay: 10,
        });
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
        jest.clearAllMocks();
      }
    });

    it('sollte exponential backoff mit jitter verwenden', async () => {
      // Arrange
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Sofort ausführen für Tests
      }) as any;

      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED })
        .mockRejectedValueOnce({ code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED })
        .mockResolvedValue('success');

      // Act
      await retryUtil.executeWithRetry(operation, {
        maxRetries: 2,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        timeout: undefined, // Kein Timeout für diesen Test
      });

      // Assert
      expect(delays).toHaveLength(2);
      // Erster Retry: ~100ms ± 10% jitter
      expect(delays[0]).toBeGreaterThanOrEqual(90);
      expect(delays[0]).toBeLessThanOrEqual(110);
      // Zweiter Retry: ~200ms ± 10% jitter
      expect(delays[1]).toBeGreaterThanOrEqual(180);
      expect(delays[1]).toBeLessThanOrEqual(220);

      // Cleanup
      global.setTimeout = originalSetTimeout;
    });

    it('sollte maximale Verzögerung respektieren', async () => {
      // Arrange
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED })
        .mockResolvedValue('success');

      // Act
      await retryUtil.executeWithRetry(operation, {
        maxRetries: 1,
        baseDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 500, // Niedriger als baseDelay * backoffMultiplier
        jitterFactor: 0,
        timeout: undefined, // Kein Timeout für diesen Test
      });

      // Assert
      expect(delays[0]).toBeLessThanOrEqual(500);

      // Cleanup
      global.setTimeout = originalSetTimeout;
    });

    it('sollte Timeout für einzelne Operationen verwenden', async () => {
      // Arrange
      const slowOperation = jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve('slow'), 200)),
      );

      // Act & Assert
      await expect(
        retryUtil.executeWithRetry(slowOperation, {
          timeout: 100,
          maxRetries: 0, // Keine Retries für diesen Test
        }),
      ).rejects.toThrow('Operation timed out after 100ms');
    });

    it('sollte Standard-Konfiguration verwenden wenn keine angegeben', async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED })
        .mockResolvedValue('success');

      // Act
      const result = await retryUtil.executeWithRetry(operation);

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('sollte Kontext für Logging verwenden', async () => {
      // Arrange
      const { logger } = require('@/logger/consola.logger');
      const retryableError = {
        code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED,
        message: 'Test error',
      };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      // Act
      await retryUtil.executeWithRetry(operation, { maxRetries: 1, baseDelay: 10 }, 'test-context');

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[test-context] Retry attempt 1/1'),
      );
    });
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('sollte sinnvolle Standard-Werte haben', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(30000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.1);
      expect(DEFAULT_RETRY_CONFIG.timeout).toBeUndefined();
    });
  });

  describe('POSTGRES_RETRYABLE_ERRORS', () => {
    it('sollte alle wichtigen PostgreSQL-Fehlercodes enthalten', () => {
      expect(POSTGRES_RETRYABLE_ERRORS.UNIQUE_VIOLATION).toBe('23505');
      expect(POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED).toBe('40P01');
      expect(POSTGRES_RETRYABLE_ERRORS.SERIALIZATION_FAILURE).toBe('40001');
      expect(POSTGRES_RETRYABLE_ERRORS.QUERY_TIMEOUT).toBe('57014');
      expect(POSTGRES_RETRYABLE_ERRORS.CONNECTION_FAILURE).toBe('08000');
    });
  });
});
