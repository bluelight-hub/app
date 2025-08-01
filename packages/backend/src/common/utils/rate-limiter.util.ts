/**
 * Rate Limiter Configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional key prefix for namespacing */
  keyPrefix?: string;
  /** Whether to skip successful requests */
  skipSuccessfulRequests?: boolean;
  /** Whether to skip failed requests */
  skipFailedRequests?: boolean;
  /** Optional custom key generator */
  keyGenerator?: (context: any) => string;
}

/**
 * Token Bucket Configuration for more advanced rate limiting
 */
export interface TokenBucketConfig {
  /** Maximum number of tokens in the bucket */
  capacity: number;
  /** Rate at which tokens are refilled (tokens per second) */
  refillRate: number;
  /** Initial tokens in the bucket */
  initialTokens?: number;
}

/**
 * Rate Limiter Error
 */
export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Simple in-memory storage for rate limit data
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Token Bucket Entry
 */
interface TokenBucketEntry {
  tokens: number;
  lastRefill: number;
}

/**
 * Rate Limiter Implementation
 *
 * Provides both fixed window and token bucket algorithms for rate limiting
 */
export class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private tokenBuckets = new Map<string, TokenBucketEntry>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private readonly config: RateLimiterConfig) {
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request is allowed under rate limit
   *
   * @param key Unique identifier for the rate limit (e.g., user ID, IP address)
   * @returns Whether the request is allowed
   */
  async isAllowed(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const now = Date.now();
    const entry = this.storage.get(fullKey);

    if (!entry || now >= entry.resetTime) {
      // New window
      this.storage.set(fullKey, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    // Within current window
    if (entry.count < this.config.maxRequests) {
      entry.count++;
      return true;
    }

    return false;
  }

  /**
   * Consume a request slot, throwing error if limit exceeded
   *
   * @param key Unique identifier for the rate limit
   * @throws RateLimitExceededError if limit is exceeded
   */
  async consume(key: string): Promise<void> {
    const allowed = await this.isAllowed(key);
    if (!allowed) {
      const fullKey = this.getFullKey(key);
      const entry = this.storage.get(fullKey);
      const retryAfter = entry ? Math.ceil((entry.resetTime - Date.now()) / 1000) : 0;

      throw new RateLimitExceededError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds`,
        retryAfter,
      );
    }
  }

  /**
   * Get remaining requests for a key
   *
   * @param key Unique identifier for the rate limit
   * @returns Remaining requests and reset time
   */
  async getStatus(key: string): Promise<{
    remaining: number;
    reset: number;
    total: number;
  }> {
    const fullKey = this.getFullKey(key);
    const now = Date.now();
    const entry = this.storage.get(fullKey);

    if (!entry || now >= entry.resetTime) {
      return {
        remaining: this.config.maxRequests,
        reset: now + this.config.windowMs,
        total: this.config.maxRequests,
      };
    }

    return {
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      reset: entry.resetTime,
      total: this.config.maxRequests,
    };
  }

  /**
   * Reset rate limit for a specific key
   *
   * @param key Unique identifier for the rate limit
   */
  async reset(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    this.storage.delete(fullKey);
  }

  /**
   * Clear all rate limit data
   */
  async clear(): Promise<void> {
    this.storage.clear();
    this.tokenBuckets.clear();
  }

  /**
   * Token bucket rate limiting for more flexible rate control
   *
   * @param key Unique identifier
   * @param tokens Number of tokens to consume
   * @param config Token bucket configuration
   * @returns Whether tokens were successfully consumed
   */
  async consumeTokens(key: string, tokens: number, config: TokenBucketConfig): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const now = Date.now();
    let bucket = this.tokenBuckets.get(fullKey);

    if (!bucket) {
      // Initialize new bucket
      bucket = {
        tokens: config.initialTokens ?? config.capacity,
        lastRefill: now,
      };
      this.tokenBuckets.set(fullKey, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * config.refillRate;
    bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have enough tokens
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Get token bucket status
   *
   * @param key Unique identifier
   * @param config Token bucket configuration
   * @returns Current token count and capacity
   */
  async getTokenBucketStatus(
    key: string,
    config: TokenBucketConfig,
  ): Promise<{
    available: number;
    capacity: number;
    refillRate: number;
  }> {
    const fullKey = this.getFullKey(key);
    const now = Date.now();
    const bucket = this.tokenBuckets.get(fullKey);

    if (!bucket) {
      return {
        available: config.initialTokens ?? config.capacity,
        capacity: config.capacity,
        refillRate: config.refillRate,
      };
    }

    // Calculate current tokens with refill
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * config.refillRate;
    const currentTokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);

    return {
      available: currentTokens,
      capacity: config.capacity,
      refillRate: config.refillRate,
    };
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean up expired rate limit entries
      for (const [key, entry] of this.storage.entries()) {
        if (now >= entry.resetTime) {
          this.storage.delete(key);
        }
      }

      // Clean up old token buckets (not accessed for over an hour)
      const oneHourAgo = now - 3600000;
      for (const [key, bucket] of this.tokenBuckets.entries()) {
        if (bucket.lastRefill < oneHourAgo) {
          this.tokenBuckets.delete(key);
        }
      }
    }, 60000); // Every minute

    // Ensure cleanup doesn't prevent process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}

/**
 * Create a rate limiter middleware factory
 *
 * @param config Rate limiter configuration
 * @returns Express-style middleware function
 */
export function createRateLimiterMiddleware(config: RateLimiterConfig) {
  const limiter = new RateLimiter(config);

  return async (req: any, res: any, next: any) => {
    try {
      // Generate key from request
      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : req.ip || req.connection.remoteAddress || 'anonymous';

      // Check rate limit
      await limiter.consume(key);

      // Add rate limit headers
      const status = await limiter.getStatus(key);
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', status.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(status.reset).toISOString());

      next();
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());
        if (error.retryAfter) {
          res.setHeader('Retry-After', error.retryAfter);
        }
        res.status(429).json({
          error: 'Too Many Requests',
          message: error.message,
          retryAfter: error.retryAfter,
        });
      } else {
        next(error);
      }
    }
  };
}
