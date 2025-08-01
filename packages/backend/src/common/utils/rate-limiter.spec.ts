import { RateLimiter, RateLimiterConfig, RateLimitExceededError } from './rate-limiter.util';
import { RedisService } from '../services/redis.service';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockRedisService: RedisService;
  let config: RateLimiterConfig;

  beforeEach(() => {
    config = {
      maxRequests: 3,
      windowMs: 1000, // 1 second
      keyPrefix: 'test',
    };

    // Mock Redis service
    mockRedisService = {
      isAvailable: jest.fn().mockReturnValue(false),
      getClient: jest.fn().mockReturnValue(null),
    } as any;
  });

  afterEach(() => {
    if (rateLimiter) {
      rateLimiter.destroy();
    }
  });

  describe('In-Memory Storage', () => {
    beforeEach(() => {
      rateLimiter = new RateLimiter(config);
    });

    it('should allow requests within limit', async () => {
      const key = 'test-user';

      expect(await rateLimiter.isAllowed(key)).toBe(true);
      expect(await rateLimiter.isAllowed(key)).toBe(true);
      expect(await rateLimiter.isAllowed(key)).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      const key = 'test-user';

      // Consume all allowed requests
      await rateLimiter.consume(key);
      await rateLimiter.consume(key);
      await rateLimiter.consume(key);

      // Fourth request should be blocked
      await expect(rateLimiter.consume(key)).rejects.toThrow(RateLimitExceededError);
    });

    it('should reset after window expires', async () => {
      const key = 'test-user';

      // Consume all allowed requests
      for (let i = 0; i < config.maxRequests; i++) {
        await rateLimiter.consume(key);
      }

      // Should be blocked
      expect(await rateLimiter.isAllowed(key)).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, config.windowMs + 100));

      // Should be allowed again
      expect(await rateLimiter.isAllowed(key)).toBe(true);
    });

    it('should return correct status', async () => {
      const key = 'test-user';

      // Initial status
      let status = await rateLimiter.getStatus(key);
      expect(status.remaining).toBe(config.maxRequests);
      expect(status.total).toBe(config.maxRequests);

      // After one request
      await rateLimiter.consume(key);
      status = await rateLimiter.getStatus(key);
      expect(status.remaining).toBe(config.maxRequests - 1);

      // After all requests
      await rateLimiter.consume(key);
      await rateLimiter.consume(key);
      status = await rateLimiter.getStatus(key);
      expect(status.remaining).toBe(0);
    });

    it('should handle token bucket algorithm', async () => {
      const key = 'test-user';
      const bucketConfig = {
        capacity: 10,
        refillRate: 2, // 2 tokens per second
        initialTokens: 5,
      };

      // Should consume initial tokens
      expect(await rateLimiter.consumeTokens(key, 3, bucketConfig)).toBe(true);
      expect(await rateLimiter.consumeTokens(key, 2, bucketConfig)).toBe(true);

      // Should fail when no tokens left
      expect(await rateLimiter.consumeTokens(key, 1, bucketConfig)).toBe(false);

      // Wait for refill
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should have refilled tokens
      expect(await rateLimiter.consumeTokens(key, 2, bucketConfig)).toBe(true);
    });

    it('should reset rate limit for a key', async () => {
      const key = 'test-user';

      // Consume some requests
      await rateLimiter.consume(key);
      await rateLimiter.consume(key);

      let status = await rateLimiter.getStatus(key);
      expect(status.remaining).toBe(1);

      // Reset
      await rateLimiter.reset(key);

      // Should be back to full limit
      status = await rateLimiter.getStatus(key);
      expect(status.remaining).toBe(config.maxRequests);
    });

    it('should clear all rate limit data', async () => {
      // Add rate limits for multiple keys
      await rateLimiter.consume('user1');
      await rateLimiter.consume('user2');
      await rateLimiter.consume('user3');

      // Clear all
      await rateLimiter.clear();

      // All keys should have full limit
      expect((await rateLimiter.getStatus('user1')).remaining).toBe(config.maxRequests);
      expect((await rateLimiter.getStatus('user2')).remaining).toBe(config.maxRequests);
      expect((await rateLimiter.getStatus('user3')).remaining).toBe(config.maxRequests);
    });
  });

  describe('With Redis (Distributed)', () => {
    beforeEach(() => {
      // Mock Redis service as available
      mockRedisService.isAvailable = jest.fn().mockReturnValue(true);
      rateLimiter = new RateLimiter(config, mockRedisService);
    });

    it('should use Redis storage adapter when Redis is available', async () => {
      // The implementation should work the same way
      // RedisStorageAdapter when Redis is available
      expect(rateLimiter['storage'].constructor.name).toBe('RedisStorageAdapter');
    });
  });
});
