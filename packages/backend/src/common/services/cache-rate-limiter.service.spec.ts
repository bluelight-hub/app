import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { CacheRateLimiterService } from './cache-rate-limiter.service';

describe('CacheRateLimiterService', () => {
  let service: CacheRateLimiterService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheRateLimiterService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheRateLimiterService>(CacheRateLimiterService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAllowed', () => {
    it('should allow first request in a new window', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.isAllowed('test-key', 10, 60000);

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(expect.stringContaining('ratelimit:test-key:'), 1, expect.any(Number));
    });

    it('should allow requests under the limit', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(5);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.isAllowed('test-key', 10, 60000);

      expect(result).toBe(true);
      expect(cacheManager.set).toHaveBeenCalledWith(expect.stringContaining('ratelimit:test-key:'), 6, expect.any(Number));
    });

    it('should block requests over the limit', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(10);

      const result = await service.isAllowed('test-key', 10, 60000);

      expect(result).toBe(false);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Cache error'));

      const result = await service.isAllowed('test-key', 10, 60000);

      expect(result).toBe(true); // Graceful degradation - allow on error
    });
  });

  describe('getStatus', () => {
    it('should return correct status for existing key', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;

      jest.spyOn(cacheManager, 'get').mockResolvedValue(3);

      const result = await service.getStatus('test-key', 10, 60000);

      expect(result.requests).toBe(3);
      expect(result.remaining).toBe(7);
      expect(result.resetTime.getTime()).toBeGreaterThanOrEqual(windowStart + 60000);
    });

    it('should return default status for non-existent key', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);

      const result = await service.getStatus('test-key', 10, 60000);

      expect(result.requests).toBe(0);
      expect(result.remaining).toBe(10);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should handle cache errors gracefully', async () => {
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Cache error'));

      const result = await service.getStatus('test-key', 10, 60000);

      expect(result.requests).toBe(0);
      expect(result.remaining).toBe(10);
      expect(result.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('reset', () => {
    it('should delete the cache key', async () => {
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined as never);

      await service.reset('test-key', 60000);

      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining('ratelimit:test-key:'));
    });

    it('should throw error on cache failure', async () => {
      jest.spyOn(cacheManager, 'del').mockRejectedValue(new Error('Cache error'));

      await expect(service.reset('test-key', 60000)).rejects.toThrow('Cache error');
    });
  });

  describe('consume', () => {
    it('should consume and return count for allowed request', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(2);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.consume('test-key', 10, 60000);

      expect(result).toBe(3);
      expect(cacheManager.set).toHaveBeenCalledWith(expect.stringContaining('ratelimit:test-key:'), 3, expect.any(Number));
    });

    it('should return null when limit exceeded', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(10);

      const result = await service.consume('test-key', 10, 60000);

      expect(result).toBeNull();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle first request in window', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.consume('test-key', 10, 60000);

      expect(result).toBe(1);
      expect(cacheManager.set).toHaveBeenCalledWith(expect.stringContaining('ratelimit:test-key:'), 1, expect.any(Number));
    });

    it('should handle cache errors gracefully', async () => {
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Cache error'));

      const result = await service.consume('test-key', 10, 60000);

      expect(result).toBe(1); // Graceful degradation
    });
  });

  describe('Sliding Window Algorithm', () => {
    it('should use different cache keys for different time windows', async () => {
      const spy = jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      // Mock time to control window boundaries
      const baseTime = 1700000000000;
      const windowMs = 60000;

      // First call - baseTime
      jest.spyOn(Date, 'now').mockReturnValue(baseTime);
      await service.isAllowed('test-key', 10, windowMs);
      const firstKey = spy.mock.calls[0]?.[0];

      // Second call - next window (baseTime + windowMs + 1)
      jest.spyOn(Date, 'now').mockReturnValue(baseTime + windowMs + 1);
      await service.isAllowed('test-key', 10, windowMs);
      const secondKey = spy.mock.calls[1]?.[0];

      expect(firstKey).not.toBe(secondKey);
      expect(firstKey).toContain('ratelimit:test-key:');
      expect(secondKey).toContain('ratelimit:test-key:');

      // Verify the window start times are different
      const firstWindowStart = Math.floor(baseTime / windowMs) * windowMs;
      const secondWindowStart = Math.floor((baseTime + windowMs + 1) / windowMs) * windowMs;
      expect(firstKey).toBe(`ratelimit:test-key:${firstWindowStart}`);
      expect(secondKey).toBe(`ratelimit:test-key:${secondWindowStart}`);
      expect(firstWindowStart).not.toBe(secondWindowStart);
    });
  });
});
