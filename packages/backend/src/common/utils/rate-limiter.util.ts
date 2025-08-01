import * as crypto from 'crypto';
import { RedisService } from '../services/redis.service';

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
 * Storage Adapter Interface
 */
interface StorageAdapter {
  get(key: string): Promise<string | null>;

  set(key: string, value: string, ttlMs?: number): Promise<void>;

  del(key: string): Promise<void>;

  incr(key: string): Promise<number>;

  expire(key: string, seconds: number): Promise<void>;

  ttl(key: string): Promise<number>;

  deletePattern(pattern: string): Promise<void>;

  isAvailable(): boolean;
}

/**
 * Redis Storage Adapter
 */
class RedisStorageAdapter implements StorageAdapter {
  constructor(private readonly redisService: RedisService) {}

  async get(key: string): Promise<string | null> {
    return await this.redisService.get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    await this.redisService.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async incr(key: string): Promise<number> {
    return await this.redisService.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redisService.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.redisService.ttl(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    await this.redisService.deletePattern(pattern);
  }

  isAvailable(): boolean {
    return this.redisService.isAvailable();
  }
}

/**
 * In-Memory Storage Adapter (Fallback)
 */
class InMemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, { value: string; expiresAt?: number }>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.storage.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const entry: { value: string; expiresAt?: number } = { value };
    if (ttlMs) {
      entry.expiresAt = Date.now() + ttlMs;
    }
    this.storage.set(key, entry);
  }

  async del(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const value = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, value.toString());
    return value;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.storage.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.storage.get(key);
    if (!entry || !entry.expiresAt) return -1;

    const ttl = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.storage.keys()) {
      if (regex.test(key)) {
        this.storage.delete(key);
      }
    }
  }

  isAvailable(): boolean {
    return true;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.storage.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.storage.delete(key);
        }
      }
    }, 60000); // Every minute

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}

/**
 * Rate Limiter Implementation
 *
 * Provides both fixed window and token bucket algorithms for rate limiting.
 * Automatically uses Redis when available for distributed rate limiting,
 * falls back to in-memory storage when Redis is not available.
 */
export class RateLimiter {
  private storage: StorageAdapter;
  private inMemoryFallback: InMemoryStorageAdapter;

  constructor(
    private readonly config: RateLimiterConfig,
    redisService?: RedisService,
  ) {
    // Setup storage adapter
    if (redisService && redisService.isAvailable()) {
      this.storage = new RedisStorageAdapter(redisService);
    } else {
      this.storage = new InMemoryStorageAdapter();
    }

    // Always keep in-memory fallback ready
    this.inMemoryFallback = new InMemoryStorageAdapter();
  }

  /**
   * Check if request is allowed under rate limit
   *
   * @param key Unique identifier for the rate limit (e.g., user ID, IP address)
   * @returns Whether the request is allowed
   */
  async isAllowed(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const windowKey = `${fullKey}:window`;
    const countKey = `${fullKey}:count`;

    try {
      const storage = this.getActiveStorage();

      // Get current window
      const currentWindow = await storage.get(windowKey);
      const now = Date.now();

      if (!currentWindow || parseInt(currentWindow, 10) + this.config.windowMs < now) {
        // New window
        await storage.set(windowKey, now.toString(), this.config.windowMs);
        await storage.set(countKey, '1', this.config.windowMs);
        return true;
      }

      // Within current window
      const count = await storage.incr(countKey);
      return count <= this.config.maxRequests;
    } catch (error) {
      // Fallback to in-memory on Redis error
      if (this.storage.isAvailable()) {
        console.error('Rate limiter Redis error, falling back to in-memory:', error);
        return this.inMemoryFallback
          .incr(fullKey)
          .then((count) => count <= this.config.maxRequests);
      }
      throw error;
    }
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
      const windowKey = `${fullKey}:window`;

      try {
        const storage = this.getActiveStorage();
        const windowStart = await storage.get(windowKey);
        const retryAfter = windowStart
          ? Math.ceil((parseInt(windowStart, 10) + this.config.windowMs - Date.now()) / 1000)
          : 0;

        throw new RateLimitExceededError(
          `Rate limit exceeded. Try again in ${retryAfter} seconds`,
          retryAfter,
        );
      } catch (error) {
        if (error instanceof RateLimitExceededError) throw error;
        throw new RateLimitExceededError('Rate limit exceeded', 0);
      }
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
    const windowKey = `${fullKey}:window`;
    const countKey = `${fullKey}:count`;

    try {
      const storage = this.getActiveStorage();
      const windowStart = await storage.get(windowKey);
      const count = await storage.get(countKey);
      const now = Date.now();

      if (!windowStart || parseInt(windowStart, 10) + this.config.windowMs < now) {
        return {
          remaining: this.config.maxRequests,
          reset: now + this.config.windowMs,
          total: this.config.maxRequests,
        };
      }

      const used = count ? parseInt(count, 10) : 0;
      return {
        remaining: Math.max(0, this.config.maxRequests - used),
        reset: parseInt(windowStart, 10) + this.config.windowMs,
        total: this.config.maxRequests,
      };
    } catch (error) {
      console.error('Rate limiter status error:', error);
      return {
        remaining: this.config.maxRequests,
        reset: Date.now() + this.config.windowMs,
        total: this.config.maxRequests,
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   *
   * @param key Unique identifier for the rate limit
   */
  async reset(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    const storage = this.getActiveStorage();

    await storage.deletePattern(`${fullKey}:*`);
  }

  /**
   * Clear all rate limit data
   */
  async clear(): Promise<void> {
    const storage = this.getActiveStorage();
    const prefix = this.config.keyPrefix || 'rate-limit';

    await storage.deletePattern(`${prefix}:*`);
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
    const fullKey = `${this.getFullKey(key)}:bucket`;
    const storage = this.getActiveStorage();

    try {
      const bucketData = await storage.get(fullKey);
      const now = Date.now();

      let bucket: { tokens: number; lastRefill: number };

      if (!bucketData) {
        // Initialize new bucket
        bucket = {
          tokens: config.initialTokens ?? config.capacity,
          lastRefill: now,
        };
      } else {
        bucket = JSON.parse(bucketData);
      }

      // Refill tokens based on elapsed time
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = elapsedSeconds * config.refillRate;
      bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;

      // Check if we have enough tokens
      if (bucket.tokens >= tokens) {
        bucket.tokens -= tokens;
        await storage.set(fullKey, JSON.stringify(bucket), 3600000); // 1 hour TTL
        return true;
      }

      // Save updated bucket even if request denied
      await storage.set(fullKey, JSON.stringify(bucket), 3600000);
      return false;
    } catch (error) {
      console.error('Token bucket error:', error);
      // Fallback to allowing request on error
      return true;
    }
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
    const fullKey = `${this.getFullKey(key)}:bucket`;
    const storage = this.getActiveStorage();

    try {
      const bucketData = await storage.get(fullKey);
      const now = Date.now();

      if (!bucketData) {
        return {
          available: config.initialTokens ?? config.capacity,
          capacity: config.capacity,
          refillRate: config.refillRate,
        };
      }

      const bucket = JSON.parse(bucketData);

      // Calculate current tokens with refill
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = elapsedSeconds * config.refillRate;
      const currentTokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);

      return {
        available: currentTokens,
        capacity: config.capacity,
        refillRate: config.refillRate,
      };
    } catch (error) {
      console.error('Token bucket status error:', error);
      return {
        available: config.capacity,
        capacity: config.capacity,
        refillRate: config.refillRate,
      };
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.inMemoryFallback instanceof InMemoryStorageAdapter) {
      this.inMemoryFallback.destroy();
    }
    if (this.storage instanceof InMemoryStorageAdapter) {
      (this.storage as InMemoryStorageAdapter).destroy();
    }
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    const prefix = this.config.keyPrefix || 'rate-limit';
    return `${prefix}:${key}`;
  }

  /**
   * Get active storage adapter
   */
  private getActiveStorage(): StorageAdapter {
    return this.storage.isAvailable() ? this.storage : this.inMemoryFallback;
  }
}

/**
 * Generate a secure key from multiple request factors
 *
 * This function creates a composite key that is much harder to manipulate than
 * relying solely on IP addresses. It combines multiple factors in order of reliability:
 *
 * 1. Session ID - Most reliable for logged-in users
 * 2. User ID - For authenticated requests
 * 3. Browser fingerprint - Combination of stable headers (User-Agent, Accept headers, etc.)
 * 4. IP address - Still included but not primary identifier
 * 5. API key/Token - For API requests
 *
 * The combination makes it difficult for attackers to bypass rate limits by:
 * - Changing IP addresses (fingerprint remains)
 * - Spoofing headers (session/auth remains)
 * - Using different sessions (fingerprint helps correlate)
 *
 * @param req Express request object
 * @returns Combined key string in format "factor1:value1:factor2:value2:..."
 * @example
 * // Authenticated user: "user:123:fp:a1b2c3d4:ip:192.168.1.1"
 * // Anonymous user: "fp:a1b2c3d4:ip:192.168.1.1"
 * // API request: "api:key123:fp:a1b2c3d4:ip:192.168.1.1"
 */
export function generateSecureRateLimitKey(req: any): string {
  const factors: string[] = [];

  // 1. Session ID (if available)
  if (req.session?.id) {
    factors.push(`session:${req.session.id}`);
  }

  // 2. User ID (if authenticated)
  if (req.user?.id) {
    factors.push(`user:${req.user.id}`);
  }

  // 3. Fingerprint from headers combination
  const fingerprint = [
    req.headers['user-agent'] || 'no-ua',
    req.headers['accept-language'] || 'no-lang',
    req.headers['accept-encoding'] || 'no-encoding',
    // Add more stable headers that are less likely to change during a session
    req.headers['sec-ch-ua'] || '',
    req.headers['sec-ch-ua-platform'] || '',
  ].join('|');

  // Hash the fingerprint to keep keys shorter
  const fingerprintHash = crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars of hash

  factors.push(`fp:${fingerprintHash}`);

  // 4. IP address as fallback (still useful but not primary)
  const ip =
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection.remoteAddress ||
    'no-ip';
  factors.push(`ip:${ip}`);

  // 5. API key or OAuth client ID (for API endpoints)
  if (req.headers['x-api-key']) {
    factors.push(`api:${req.headers['x-api-key']}`);
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    // Extract token identifier (first 8 chars of token)
    const token = req.headers.authorization.substring(7, 15);
    factors.push(`token:${token}`);
  }

  // Combine all factors
  return factors.join(':');
}

/**
 * Create a rate limiter middleware factory
 *
 * @param config Rate limiter configuration
 * @param redisService Optional Redis service for distributed rate limiting
 * @returns Express-style middleware function
 */
export function createRateLimiterMiddleware(
  config: RateLimiterConfig,
  redisService?: RedisService,
) {
  const limiter = new RateLimiter(config, redisService);

  return async (req: any, res: any, next: any) => {
    try {
      // Generate key from request using secure multi-factor approach
      const key = config.keyGenerator ? config.keyGenerator(req) : generateSecureRateLimitKey(req);

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
