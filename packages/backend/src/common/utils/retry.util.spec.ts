import { RetryUtil, RetryConfig, POSTGRES_RETRYABLE_ERRORS } from './retry.util';

// Mock logger
jest.mock('@/logger/consola.logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

describe('RetryUtil', () => {
  let retryUtil: RetryUtil;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    retryUtil = new RetryUtil();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should execute function successfully on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and succeed', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately on non-retryable error', async () => {
      const nonRetryableError = new Error('Not retryable');
      const mockFn = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(retryUtil.executeWithRetry(mockFn)).rejects.toThrow('Not retryable');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries configuration', async () => {
      const retryableError = new Error('ECONNRESET');
      const mockFn = jest.fn().mockRejectedValue(retryableError);

      const config: Partial<RetryConfig> = {
        maxRetries: 2,
        baseDelay: 10,
      };

      await expect(retryUtil.executeWithRetry(mockFn, config, 'test-context')).rejects.toThrow(
        '[test-context] All 2 retry attempts failed',
      );

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle PostgreSQL retryable errors', async () => {
      const pgError = { code: POSTGRES_RETRYABLE_ERRORS.UNIQUE_VIOLATION };
      const mockFn = jest.fn().mockRejectedValueOnce(pgError).mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle Prisma P2002 error as retryable', async () => {
      const prismaError = { code: 'P2002' };
      const mockFn = jest.fn().mockRejectedValueOnce(prismaError).mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff with jitter', async () => {
      jest.useFakeTimers();

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success');

      const config: Partial<RetryConfig> = {
        baseDelay: 100,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        maxDelay: 1000,
      };

      const promise = retryUtil.executeWithRetry(mockFn, config);

      // First retry after ~100ms (with jitter)
      await jest.advanceTimersByTimeAsync(150);

      // Second retry after ~200ms (with jitter)
      await jest.advanceTimersByTimeAsync(250);

      const result = await promise;
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should respect timeout configuration', async () => {
      const slowFn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('success'), 200)),
        );

      const config: Partial<RetryConfig> = {
        timeout: 100,
        maxRetries: 0,
      };

      await expect(retryUtil.executeWithRetry(slowFn, config)).rejects.toThrow(
        'Operation timed out after 100ms',
      );
    });

    it('should use custom isRetryable function', async () => {
      const customError = { type: 'CUSTOM_RETRY' };
      const mockFn = jest.fn().mockRejectedValueOnce(customError).mockResolvedValueOnce('success');

      const config: Partial<RetryConfig> = {
        isRetryable: (error) => error.type === 'CUSTOM_RETRY',
      };

      const result = await retryUtil.executeWithRetry(mockFn, config);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should cap delay at maxDelay', async () => {
      jest.useFakeTimers();

      const mockFn = jest.fn();
      for (let i = 0; i < 10; i++) {
        mockFn.mockRejectedValueOnce(new Error('ECONNRESET'));
      }
      mockFn.mockResolvedValueOnce('success');

      const config: Partial<RetryConfig> = {
        baseDelay: 100,
        backoffMultiplier: 10, // Aggressive backoff
        maxDelay: 500,
        jitterFactor: 0, // No jitter for predictable testing
        maxRetries: 10,
      };

      const promise = retryUtil.executeWithRetry(mockFn, config);

      // Advance through retries
      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(500); // Max delay
      }

      await promise;
      expect(mockFn).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('createRetryWrapper', () => {
    it('should wrap a function with retry logic', async () => {
      const originalFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success');

      const wrappedFn = retryUtil.createRetryWrapper(originalFn, {
        maxRetries: 2,
        baseDelay: 10,
      });

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(originalFn).toHaveBeenCalledTimes(2);
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve function arguments', async () => {
      const originalFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = retryUtil.createRetryWrapper(originalFn);

      await wrappedFn('arg1', { key: 'value' }, 123);

      expect(originalFn).toHaveBeenCalledWith('arg1', { key: 'value' }, 123);
    });
  });

  describe('executeMultipleWithRetry', () => {
    it('should execute operations in parallel by default', async () => {
      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn().mockResolvedValue('result2');
      const op3 = jest.fn().mockResolvedValue('result3');

      const results = await retryUtil.executeMultipleWithRetry([op1, op2, op3]);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ success: true, result: 'result1' });
      expect(results[1]).toEqual({ success: true, result: 'result2' });
      expect(results[2]).toEqual({ success: true, result: 'result3' });

      expect(op1).toHaveBeenCalledTimes(1);
      expect(op2).toHaveBeenCalledTimes(1);
      expect(op3).toHaveBeenCalledTimes(1);
    });

    it('should execute operations sequentially when parallel is false', async () => {
      const executionOrder: number[] = [];

      const op1 = jest.fn().mockImplementation(async () => {
        executionOrder.push(1);
        return 'result1';
      });

      const op2 = jest.fn().mockImplementation(async () => {
        executionOrder.push(2);
        return 'result2';
      });

      const op3 = jest.fn().mockImplementation(async () => {
        executionOrder.push(3);
        return 'result3';
      });

      await retryUtil.executeMultipleWithRetry([op1, op2, op3], {}, { parallel: false });

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should handle mixed success and failure in parallel mode', async () => {
      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn().mockRejectedValue(new Error('Non-retryable'));
      const op3 = jest.fn().mockResolvedValue('result3');

      const results = await retryUtil.executeMultipleWithRetry([op1, op2, op3]);

      expect(results[0]).toEqual({ success: true, result: 'result1' });
      expect(results[1]).toEqual({ success: false, error: expect.any(Error) });
      expect(results[2]).toEqual({ success: true, result: 'result3' });
    });

    it('should stop on error when stopOnError is true', async () => {
      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn().mockRejectedValue(new Error('Non-retryable'));
      const op3 = jest.fn().mockResolvedValue('result3');

      const results = await retryUtil.executeMultipleWithRetry(
        [op1, op2, op3],
        {},
        { parallel: false, stopOnError: true },
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, result: 'result1' });
      expect(results[1]).toEqual({ success: false, error: expect.any(Error) });
      expect(op3).not.toHaveBeenCalled();
    });

    it('should apply retry logic to each operation', async () => {
      const op1 = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('result1');

      const op2 = jest.fn().mockResolvedValue('result2');

      const results = await retryUtil.executeMultipleWithRetry([op1, op2], {
        maxRetries: 2,
        baseDelay: 10,
      });

      expect(results[0]).toEqual({ success: true, result: 'result1' });
      expect(results[1]).toEqual({ success: true, result: 'result2' });
      expect(op1).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('createRetryPolicy', () => {
    it('should return policy based on error name', () => {
      const policies = {
        NetworkError: { maxRetries: 5 },
        ValidationError: { maxRetries: 0 },
        default: { maxRetries: 3 },
      };

      const policyFn = RetryUtil.createRetryPolicy(policies);

      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';
      expect(policyFn(networkError)).toEqual({ maxRetries: 5 });

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      expect(policyFn(validationError)).toEqual({ maxRetries: 0 });
    });

    it('should return policy based on error code', () => {
      const policies = {
        ECONNRESET: { maxRetries: 5, baseDelay: 2000 },
        ENOTFOUND: { maxRetries: 3, baseDelay: 1000 },
        default: { maxRetries: 1 },
      };

      const policyFn = RetryUtil.createRetryPolicy(policies);

      const connectionError = { code: 'ECONNRESET', message: 'Connection reset' };
      expect(policyFn(connectionError)).toEqual({ maxRetries: 5, baseDelay: 2000 });

      const notFoundError = { code: 'ENOTFOUND', message: 'Not found' };
      expect(policyFn(notFoundError)).toEqual({ maxRetries: 3, baseDelay: 1000 });
    });

    it('should return policy based on HTTP status', () => {
      const policies = {
        HTTP_429: { maxRetries: 5, baseDelay: 5000 }, // Rate limiting
        HTTP_503: { maxRetries: 3, baseDelay: 2000 }, // Service unavailable
        default: { maxRetries: 1 },
      };

      const policyFn = RetryUtil.createRetryPolicy(policies);

      const rateLimitError = { status: 429, message: 'Too many requests' };
      expect(policyFn(rateLimitError)).toEqual({ maxRetries: 5, baseDelay: 5000 });

      const serviceUnavailableError = { status: 503, message: 'Service unavailable' };
      expect(policyFn(serviceUnavailableError)).toEqual({ maxRetries: 3, baseDelay: 2000 });
    });

    it('should return default policy when no match', () => {
      const policies = {
        NetworkError: { maxRetries: 5 },
        default: { maxRetries: 2 },
      };

      const policyFn = RetryUtil.createRetryPolicy(policies);

      const unknownError = new Error('Unknown error');
      expect(policyFn(unknownError)).toEqual({ maxRetries: 2 });
    });

    it('should return null when no default policy', () => {
      const policies = {
        NetworkError: { maxRetries: 5 },
      };

      const policyFn = RetryUtil.createRetryPolicy(policies);

      const unknownError = new Error('Unknown error');
      expect(policyFn(unknownError)).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('ECONNRESET'));

      const config: Partial<RetryConfig> = {
        maxRetries: 0,
      };

      await expect(retryUtil.executeWithRetry(mockFn, config)).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle negative jitter', async () => {
      jest.useFakeTimers();

      // Mock Math.random to return 0 (resulting in negative jitter)
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0);

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success');

      const config: Partial<RetryConfig> = {
        baseDelay: 100,
        jitterFactor: 0.5, // 50% jitter
      };

      const promise = retryUtil.executeWithRetry(mockFn, config);

      // Delay should be at least 0 (not negative)
      await jest.advanceTimersByTimeAsync(60); // 100 - 50% = 50, but could be 0

      await promise;
      expect(mockFn).toHaveBeenCalledTimes(2);

      Math.random = originalRandom;
      jest.useRealTimers();
    });

    it('should preserve error cause in final error', async () => {
      const originalError = new Error('Original error');
      const mockFn = jest.fn().mockRejectedValue(originalError);

      const config: Partial<RetryConfig> = {
        maxRetries: 1,
        baseDelay: 10,
        isRetryable: () => true, // Make the error retryable
      };

      try {
        await retryUtil.executeWithRetry(mockFn, config, 'test-context');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('[test-context] All 1 retry attempts failed');
        expect(error.cause).toBe(originalError);
        expect(error.attempts).toBe(2); // Initial + 1 retry
      }
    });

    it('should handle async errors in executeWithTimeout', async () => {
      const asyncError = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(asyncError);

      const config: Partial<RetryConfig> = {
        timeout: 1000,
        maxRetries: 0,
      };

      await expect(retryUtil.executeWithRetry(mockFn, config)).rejects.toThrow('Async error');
    });
  });

  describe('Network error scenarios', () => {
    it('should retry ETIMEDOUT errors', async () => {
      const timeoutError = new Error('ETIMEDOUT: Connection timed out');
      const mockFn = jest.fn().mockRejectedValueOnce(timeoutError).mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry ENOTFOUND errors', async () => {
      const notFoundError = new Error('ENOTFOUND: DNS lookup failed');
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('PostgreSQL error scenarios', () => {
    it('should retry deadlock errors', async () => {
      const deadlockError = { code: POSTGRES_RETRYABLE_ERRORS.DEADLOCK_DETECTED };
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(deadlockError)
        .mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry serialization failures', async () => {
      const serializationError = { code: POSTGRES_RETRYABLE_ERRORS.SERIALIZATION_FAILURE };
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(serializationError)
        .mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry query timeout errors', async () => {
      const timeoutError = { code: POSTGRES_RETRYABLE_ERRORS.QUERY_TIMEOUT };
      const mockFn = jest.fn().mockRejectedValueOnce(timeoutError).mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry connection failures', async () => {
      const connectionError = { code: POSTGRES_RETRYABLE_ERRORS.CONNECTION_FAILURE };
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce('success');

      const result = await retryUtil.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});
