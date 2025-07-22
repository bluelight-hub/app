import { logger } from '@/logger/consola.logger';

/**
 * PostgreSQL retryable error codes
 */
export const POSTGRES_RETRYABLE_ERRORS = {
  UNIQUE_VIOLATION: '23505',
  DEADLOCK_DETECTED: '40P01',
  SERIALIZATION_FAILURE: '40001',
  QUERY_TIMEOUT: '57014',
  CONNECTION_FAILURE: '08000',
} as const;

/**
 * Retry Configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds between retries */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Jitter factor (0-1) to add randomness */
  jitterFactor: number;
  /** Timeout in milliseconds for each attempt */
  timeout?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: any) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  timeout: undefined,
  isRetryable: (error: any) => {
    // Check PostgreSQL error codes
    if (error.code && Object.values(POSTGRES_RETRYABLE_ERRORS).includes(error.code)) {
      return true;
    }

    // Check Prisma error codes
    if (error.code === 'P2002') {
      return true;
    }

    // Check network errors
    if (
      error.message &&
      (error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT'))
    ) {
      return true;
    }

    // By default, don't retry
    return false;
  },
};

/**
 * Retry Utility for resilient operations
 *
 * Implements exponential backoff with jitter for optimal retry behavior
 */
export class RetryUtil {
  /**
   * Create a retry policy for specific error types
   */
  static createRetryPolicy(policies: {
    [errorType: string]: Partial<RetryConfig>;
  }): (error: any) => Partial<RetryConfig> | null {
    return (error: any) => {
      // Check error type/name
      if (error.name && policies[error.name]) {
        return policies[error.name];
      }

      // Check error code
      if (error.code && policies[error.code]) {
        return policies[error.code];
      }

      // Check HTTP status codes
      if (error.status && policies[`HTTP_${error.status}`]) {
        return policies[`HTTP_${error.status}`];
      }

      // Default policy
      return policies.default || null;
    };
  }

  /**
   * Execute a function with retry logic
   *
   * @param fn - Function to execute
   * @param config - Retry configuration
   * @param context - Optional context for logging
   * @returns Result of the function
   * @throws Last error if all retries fail
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: string,
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: any;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // Execute with timeout if specified
        if (retryConfig.timeout) {
          return await this.executeWithTimeout(fn, retryConfig.timeout);
        }

        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!retryConfig.isRetryable!(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(
          attempt,
          retryConfig.baseDelay,
          retryConfig.maxDelay,
          retryConfig.backoffMultiplier,
          retryConfig.jitterFactor,
        );

        // Log retry attempt
        if (context) {
          logger.info(
            `[${context}] Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms. Error: ${error.message}`,
          );
        }

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // All retries failed
    const errorMessage = context
      ? `[${context}] All ${retryConfig.maxRetries} retry attempts failed`
      : `All ${retryConfig.maxRetries} retry attempts failed`;

    const finalError = new Error(errorMessage);
    (finalError as any).cause = lastError;
    (finalError as any).attempts = retryConfig.maxRetries + 1;

    throw finalError;
  }

  /**
   * Create a retry wrapper for a function
   *
   * @param fn - Function to wrap
   * @param config - Retry configuration
   * @returns Wrapped function with retry logic
   */
  createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    config?: Partial<RetryConfig>,
  ): T {
    return (async (...args: Parameters<T>) => {
      return this.executeWithRetry(() => fn(...args), config);
    }) as T;
  }

  /**
   * Execute multiple operations with retry
   *
   * @param operations - Array of operations to execute
   * @param config - Retry configuration
   * @param options - Execution options
   * @returns Results of all operations
   */
  async executeMultipleWithRetry<T>(
    operations: Array<() => Promise<T>>,
    config?: Partial<RetryConfig>,
    options?: {
      /** Execute operations in parallel */
      parallel?: boolean;
      /** Stop on first error */
      stopOnError?: boolean;
    },
  ): Promise<Array<{ success: boolean; result?: T; error?: any }>> {
    const { parallel = true, stopOnError = false } = options || {};

    if (parallel) {
      // Execute all operations in parallel
      const promises = operations.map((op) =>
        this.executeWithRetry(op, config)
          .then((result) => ({ success: true, result }))
          .catch((error) => ({ success: false, error })),
      );

      return Promise.all(promises);
    } else {
      // Execute operations sequentially
      const results: Array<{ success: boolean; result?: T; error?: any }> = [];

      for (const op of operations) {
        try {
          const result = await this.executeWithRetry(op, config);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error });

          if (stopOnError) {
            break;
          }
        }
      }

      return results;
    }
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout),
      ),
    ]);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    backoffMultiplier: number,
    jitterFactor: number,
  ): number {
    // Exponential backoff
    let delay = baseDelay * Math.pow(backoffMultiplier, attempt);

    // Cap at max delay
    delay = Math.min(delay, maxDelay);

    // Add jitter (random factor to prevent thundering herd)
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
