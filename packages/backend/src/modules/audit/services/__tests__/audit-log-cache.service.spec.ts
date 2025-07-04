import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditLogCacheService } from '../audit-log-cache.service';
import { logger } from '../../../../logger/consola.logger';

// Mock the logger
jest.mock('../../../../logger/consola.logger', () => ({
  logger: {
    info: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ioredis
const mockRedisInstance = {
  on: jest.fn(),
  setex: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () => ({
  default: jest.fn().mockImplementation(() => mockRedisInstance),
}));

describe('AuditLogCacheService', () => {
  let service: AuditLogCacheService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock ConfigService
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          AUDIT_CACHE_TTL: 300,
          AUDIT_CACHE_ENABLED: true,
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          REDIS_PASSWORD: undefined,
          REDIS_CACHE_DB: 1,
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogCacheService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuditLogCacheService>(AuditLogCacheService);
  });

  describe('onModuleInit', () => {
    it('should initialize Redis connection when cache is enabled', () => {
      const Redis = require('ioredis').default;
      service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 1,
        retryStrategy: expect.any(Function),
      });

      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should not initialize Redis when cache is disabled', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AUDIT_CACHE_ENABLED') return false;
        return defaultValue;
      });

      const disabledService = new AuditLogCacheService(configService);
      disabledService.onModuleInit();

      const Redis = require('ioredis').default;
      expect(Redis).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Audit log cache is disabled');
    });

    it('should log on successful connection', () => {
      service.onModuleInit();

      // Simulate connect event
      const connectHandler = mockRedisInstance.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler?.();

      expect(logger.info).toHaveBeenCalledWith('Audit log cache connected to Redis');
    });

    it('should log errors on connection failure', () => {
      service.onModuleInit();

      // Simulate error event
      const errorHandler = mockRedisInstance.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      const error = new Error('Connection failed');
      errorHandler?.(error);

      expect(logger.error).toHaveBeenCalledWith('Redis cache connection error', {
        error: 'Connection failed',
      });
    });

    it('should configure retry strategy', () => {
      service.onModuleInit();

      const Redis = require('ioredis').default;
      const redisConfig = (Redis as any).mock.calls[0][0];
      const retryStrategy = redisConfig.retryStrategy;

      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(10)).toBe(500);
      expect(retryStrategy(100)).toBe(2000); // Max delay
    });
  });

  describe('set', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should set data with default TTL', async () => {
      const data = { foo: 'bar' };
      mockRedisInstance.setex.mockResolvedValue('OK');

      await service.set('test-key', data);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'audit:test-key',
        300,
        JSON.stringify(data),
      );
      expect(logger.trace).toHaveBeenCalledWith('Cache set', {
        key: 'audit:test-key',
        ttl: 300,
      });
    });

    it('should set data with custom TTL', async () => {
      const data = { foo: 'bar' };
      mockRedisInstance.setex.mockResolvedValue('OK');

      await service.set('test-key', data, 600);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'audit:test-key',
        600,
        JSON.stringify(data),
      );
      expect(logger.trace).toHaveBeenCalledWith('Cache set', {
        key: 'audit:test-key',
        ttl: 600,
      });
    });

    it('should set data without TTL when defaultTTL is 0', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AUDIT_CACHE_TTL') return 0;
        if (key === 'AUDIT_CACHE_ENABLED') return true;
        return defaultValue;
      });

      const noTTLService = new AuditLogCacheService(configService);
      noTTLService.onModuleInit();

      const data = { foo: 'bar' };
      mockRedisInstance.set.mockResolvedValue('OK');

      await noTTLService.set('test-key', data);

      expect(mockRedisInstance.set).toHaveBeenCalledWith('audit:test-key', JSON.stringify(data));
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.setex.mockRejectedValue(error);

      await service.set('test-key', { foo: 'bar' });

      expect(logger.error).toHaveBeenCalledWith('Failed to set cache', {
        key: 'test-key',
        error: 'Redis error',
      });
    });

    it('should not set data when cache is disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AUDIT_CACHE_ENABLED') return false;
        return defaultValue;
      });

      const disabledService = new AuditLogCacheService(configService);
      disabledService.onModuleInit();

      await disabledService.set('test-key', { foo: 'bar' });

      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
      expect(mockRedisInstance.set).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should get data from cache', async () => {
      const data = { foo: 'bar' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.get<typeof data>('test-key');

      expect(result).toEqual(data);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('audit:test-key');
      expect(logger.trace).toHaveBeenCalledWith('Cache hit', { key: 'audit:test-key' });
    });

    it('should return null on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(logger.trace).toHaveBeenCalledWith('Cache miss', { key: 'audit:test-key' });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.get.mockRejectedValue(error);

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Failed to get cache', {
        key: 'test-key',
        error: 'Redis error',
      });
    });

    it('should return null when cache is disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AUDIT_CACHE_ENABLED') return false;
        return defaultValue;
      });

      const disabledService = new AuditLogCacheService(configService);
      disabledService.onModuleInit();

      const result = await disabledService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should delete cache entry', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await service.delete('test-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('audit:test-key');
      expect(logger.trace).toHaveBeenCalledWith('Cache deleted', { key: 'audit:test-key' });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.del.mockRejectedValue(error);

      await service.delete('test-key');

      expect(logger.error).toHaveBeenCalledWith('Failed to delete cache', {
        key: 'test-key',
        error: 'Redis error',
      });
    });

    it('should not delete when cache is disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AUDIT_CACHE_ENABLED') return false;
        return defaultValue;
      });

      const disabledService = new AuditLogCacheService(configService);
      disabledService.onModuleInit();

      await disabledService.delete('test-key');

      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('deletePattern', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should delete all keys matching pattern', async () => {
      const keys = ['audit:stats:1', 'audit:stats:2', 'audit:stats:3'];
      mockRedisInstance.keys.mockResolvedValue(keys);
      mockRedisInstance.del.mockResolvedValue(3);

      await service.deletePattern('stats:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('audit:stats:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith(...keys);
      expect(logger.trace).toHaveBeenCalledWith('Cache pattern deleted', {
        pattern: 'audit:stats:*',
        count: 3,
      });
    });

    it('should handle empty key list', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      await service.deletePattern('stats:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('audit:stats:*');
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.keys.mockRejectedValue(error);

      await service.deletePattern('stats:*');

      expect(logger.error).toHaveBeenCalledWith('Failed to delete cache pattern', {
        pattern: 'stats:*',
        error: 'Redis error',
      });
    });
  });

  describe('invalidate methods', () => {
    beforeEach(() => {
      service.onModuleInit();
      jest.spyOn(service, 'deletePattern');
    });

    it('should invalidate all caches', async () => {
      await service.invalidateAll();
      expect(service.deletePattern).toHaveBeenCalledWith('*');
    });

    it('should invalidate statistics caches', async () => {
      await service.invalidateStatistics();
      expect(service.deletePattern).toHaveBeenCalledWith('stats:*');
    });

    it('should invalidate query caches', async () => {
      await service.invalidateQueries();
      expect(service.deletePattern).toHaveBeenCalledWith('query:*');
    });
  });

  describe('key generation methods', () => {
    it('should generate statistics key with sorted filters', () => {
      const filters = {
        userId: '123',
        action: 'CREATE',
        startDate: '2023-01-01',
      };

      const key = service.generateStatisticsKey(filters);

      expect(key).toBe('stats:{"action":"CREATE","startDate":"2023-01-01","userId":"123"}');
    });

    it('should ignore null and undefined values in statistics key', () => {
      const filters = {
        userId: '123',
        action: null,
        resource: undefined,
        valid: 'yes',
      };

      const key = service.generateStatisticsKey(filters);

      expect(key).toBe('stats:{"userId":"123","valid":"yes"}');
    });

    it('should generate query key with sorted filters', () => {
      const filters = {
        page: 1,
        limit: 10,
        orderBy: 'createdAt',
      };

      const key = service.generateQueryKey(filters);

      expect(key).toBe('query:{"limit":10,"orderBy":"createdAt","page":1}');
    });

    it('should handle empty filters', () => {
      const statsKey = service.generateStatisticsKey({});
      const queryKey = service.generateQueryKey({});

      expect(statsKey).toBe('stats:{}');
      expect(queryKey).toBe('query:{}');
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection', async () => {
      service.onModuleInit();
      mockRedisInstance.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Audit log cache disconnected from Redis');
    });

    it('should handle missing Redis instance', async () => {
      // Service without Redis initialized
      await service.onModuleDestroy();

      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle complex data structures', async () => {
      service.onModuleInit();

      const complexData = {
        nested: {
          array: [1, 2, { foo: 'bar' }],
          date: new Date().toISOString(),
        },
        nullValue: null,
        undefinedValue: undefined,
      };

      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(complexData));

      await service.set('complex', complexData);
      const result = await service.get('complex');

      expect(result).toEqual(complexData);
    });

    it('should handle very large keys', async () => {
      service.onModuleInit();

      const longKey = 'a'.repeat(1000);
      const data = { test: true };

      mockRedisInstance.setex.mockResolvedValue('OK');

      await service.set(longKey, data);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        `audit:${longKey}`,
        300,
        JSON.stringify(data),
      );
    });
  });
});
