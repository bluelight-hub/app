import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { RateLimitGuard, generateSecureRateLimitKey } from './rate-limit.guard';
import { CacheRateLimiterService } from '../services/cache-rate-limiter.service';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let cacheRateLimiterService: CacheRateLimiterService;

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'test-agent',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
    },
    connection: {
      remoteAddress: '127.0.0.1',
    },
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };

  const mockContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: CacheRateLimiterService,
          useValue: {
            isAllowed: jest.fn(),
            getStatus: jest.fn(),
            reset: jest.fn(),
            consume: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
    cacheRateLimiterService = module.get<CacheRateLimiterService>(CacheRateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow requests when no rate limit is configured', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(cacheRateLimiterService.isAllowed).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });

    it('should allow requests within rate limit', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        maxRequests: 10,
        windowMs: 60000,
      });
      jest.spyOn(cacheRateLimiterService, 'isAllowed').mockResolvedValue(true);
      jest.spyOn(cacheRateLimiterService, 'getStatus').mockResolvedValue({
        requests: 3,
        resetTime: new Date(Date.now() + 50000),
        remaining: 7,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(cacheRateLimiterService.isAllowed).toHaveBeenCalledWith(expect.stringContaining('api:'), 10, 60000);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 7);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should block requests exceeding rate limit', async () => {
      const resetTime = new Date(Date.now() + 30000);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        maxRequests: 10,
        windowMs: 60000,
      });
      jest.spyOn(cacheRateLimiterService, 'isAllowed').mockResolvedValue(false);
      jest.spyOn(cacheRateLimiterService, 'getStatus').mockResolvedValue({
        requests: 10,
        resetTime,
        remaining: 0,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: expect.stringContaining('Rate limit exceeded'),
        retryAfter: expect.any(Number),
      });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', resetTime.toISOString());
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });

    it('should use custom prefix when provided', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        maxRequests: 5,
        windowMs: 30000,
        prefix: 'custom-api',
      });
      jest.spyOn(cacheRateLimiterService, 'isAllowed').mockResolvedValue(true);
      jest.spyOn(cacheRateLimiterService, 'getStatus').mockResolvedValue({
        requests: 1,
        resetTime: new Date(),
        remaining: 4,
      });

      await guard.canActivate(mockContext);

      expect(cacheRateLimiterService.isAllowed).toHaveBeenCalledWith(expect.stringContaining('custom-api:'), 5, 30000);
    });

    it('should use custom key generator when provided', async () => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom-key');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        maxRequests: 10,
        windowMs: 60000,
        keyGenerator: customKeyGenerator,
      });
      jest.spyOn(cacheRateLimiterService, 'isAllowed').mockResolvedValue(true);
      jest.spyOn(cacheRateLimiterService, 'getStatus').mockResolvedValue({
        requests: 1,
        resetTime: new Date(),
        remaining: 9,
      });

      await guard.canActivate(mockContext);

      expect(customKeyGenerator).toHaveBeenCalledWith(mockRequest);
      expect(cacheRateLimiterService.isAllowed).toHaveBeenCalledWith('api:custom-key', 10, 60000);
    });

    it('should handle cache service errors gracefully', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        maxRequests: 10,
        windowMs: 60000,
      });
      jest.spyOn(cacheRateLimiterService, 'isAllowed').mockRejectedValue(new Error('Cache error'));

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true); // Allow request on error (graceful degradation)
      expect(cacheRateLimiterService.isAllowed).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('generateSecureRateLimitKey', () => {
    it('should generate key with user ID when authenticated', () => {
      const request = {
        ...mockRequest,
        user: { id: 'user123' },
      };

      const key = generateSecureRateLimitKey(request);

      expect(key).toContain('user:user123');
      expect(key).toContain('fp:');
      expect(key).toContain('ip:127.0.0.1');
    });

    it('should generate key with session ID when available', () => {
      const request = {
        ...mockRequest,
        session: { id: 'session456' },
      };

      const key = generateSecureRateLimitKey(request);

      expect(key).toContain('session:session456');
      expect(key).toContain('fp:');
      expect(key).toContain('ip:127.0.0.1');
    });

    it('should generate key with API key when present', () => {
      const request = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          'x-api-key': 'api-key-789',
        },
      };

      const key = generateSecureRateLimitKey(request);

      expect(key).toContain('api:api-key-789');
      expect(key).toContain('fp:');
      expect(key).toContain('ip:127.0.0.1');
    });

    it('should generate key with Bearer token when present', () => {
      const request = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          authorization: 'Bearer abcdefghijklmnop',
        },
      };

      const key = generateSecureRateLimitKey(request);

      expect(key).toContain('token:abcdefgh');
      expect(key).toContain('fp:');
      expect(key).toContain('ip:127.0.0.1');
    });

    it('should handle missing headers gracefully', () => {
      const request = {
        ip: '127.0.0.1',
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };

      const key = generateSecureRateLimitKey(request);

      expect(key).toContain('fp:');
      expect(key).toContain('ip:127.0.0.1');
      expect(key).not.toContain('user:');
      expect(key).not.toContain('session:');
      expect(key).not.toContain('api:');
      expect(key).not.toContain('token:');
    });

    it('should handle x-forwarded-for header', () => {
      const request = {
        headers: {
          'user-agent': 'test-agent',
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
        connection: {
          remoteAddress: '127.0.0.1',
        },
      };

      const key = generateSecureRateLimitKey(request);

      expect(key).toContain('ip:192.168.1.1'); // Should use first IP in x-forwarded-for
    });
  });
});
