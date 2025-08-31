import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { CacheDuplicateDetectionService } from './cache-duplicate-detection.service';

describe('CacheDuplicateDetectionService', () => {
  let service: CacheDuplicateDetectionService;
  let cacheManager: Cache;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheDuplicateDetectionService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheDuplicateDetectionService>(CacheDuplicateDetectionService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('executeIdempotent', () => {
    it('sollte Operation ausführen und Ergebnis cachen bei Cache-Miss', async () => {
      const key = 'test-operation';
      const expectedResult = { data: 'test-result' };
      const operation = jest.fn().mockResolvedValue(expectedResult);

      mockCacheManager.get.mockResolvedValue(null); // Cache miss
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.executeIdempotent(key, operation);

      expect(result).toEqual(expectedResult);
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining('duplicate-detection:'));
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('duplicate-detection:'),
        { result: expectedResult },
        60000, // Default TTL
      );
    });

    it('sollte gecachtes Ergebnis zurückgeben bei Cache-Hit', async () => {
      const key = 'test-operation';
      const cachedResult = { data: 'cached-result' };
      const operation = jest.fn();

      mockCacheManager.get.mockResolvedValue({ result: cachedResult });

      const result = await service.executeIdempotent(key, operation);

      expect(result).toEqual(cachedResult);
      expect(operation).not.toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining('duplicate-detection:'));
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('sollte gecachten Fehler erneut werfen', async () => {
      const key = 'test-operation';
      const errorMessage = 'Cached error';
      const operation = jest.fn();

      mockCacheManager.get.mockResolvedValue({ error: errorMessage });

      await expect(service.executeIdempotent(key, operation)).rejects.toThrow(errorMessage);
      expect(operation).not.toHaveBeenCalled();
    });

    it('sollte Fehler cachen wenn Operation fehlschlägt', async () => {
      const key = 'test-operation';
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      await expect(service.executeIdempotent(key, operation)).rejects.toThrow(error);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledWith(expect.stringContaining('duplicate-detection:'), { error: error.message }, 60000);
    });

    it('sollte custom TTL verwenden wenn angegeben', async () => {
      const key = 'test-operation';
      const customTtl = 120000; // 2 Minuten
      const expectedResult = { data: 'test' };
      const operation = jest.fn().mockResolvedValue(expectedResult);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.executeIdempotent(key, operation, customTtl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(expect.stringContaining('duplicate-detection:'), { result: expectedResult }, customTtl);
    });

    it('sollte Operation ausführen wenn Cache-Zugriff fehlschlägt', async () => {
      const key = 'test-operation';
      const expectedResult = { data: 'test' };
      const operation = jest.fn().mockResolvedValue(expectedResult);

      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.executeIdempotent(key, operation);

      expect(result).toEqual(expectedResult);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('sollte Operation-Ergebnis zurückgeben auch wenn Cache-Speicherung fehlschlägt', async () => {
      const key = 'test-operation';
      const expectedResult = { data: 'test' };
      const operation = jest.fn().mockResolvedValue(expectedResult);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockRejectedValue(new Error('Cache write error'));

      const result = await service.executeIdempotent(key, operation);

      expect(result).toEqual(expectedResult);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('sollte identische Cache-Keys für identische Inputs generieren', async () => {
      const key1 = 'same-key';
      const key2 = 'same-key';
      const operation = jest.fn().mockResolvedValue('result');

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.executeIdempotent(key1, operation);
      await service.executeIdempotent(key2, operation);

      const calls = mockCacheManager.get.mock.calls;
      expect(calls[0][0]).toEqual(calls[1][0]); // Gleiche Cache-Keys
    });

    it('sollte unterschiedliche Cache-Keys für unterschiedliche Inputs generieren', async () => {
      const key1 = 'key-1';
      const key2 = 'key-2';
      const operation = jest.fn().mockResolvedValue('result');

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.executeIdempotent(key1, operation);
      await service.executeIdempotent(key2, operation);

      const calls = mockCacheManager.get.mock.calls;
      expect(calls[0][0]).not.toEqual(calls[1][0]); // Unterschiedliche Cache-Keys
    });
  });

  describe('invalidateCache', () => {
    it('sollte Cache-Eintrag löschen', async () => {
      const key = 'test-key';
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidateCache(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(expect.stringContaining('duplicate-detection:'));
    });

    it('sollte Fehler beim Löschen loggen aber nicht werfen', async () => {
      const key = 'test-key';
      mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));

      await expect(service.invalidateCache(key)).resolves.not.toThrow();
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('sollte Warnung loggen da reset nicht verfügbar', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.clearCache();

      expect(loggerSpy).toHaveBeenCalledWith('Cache-Reset ist in cache-manager v7 nicht direkt verfügbar');
    });

    it('sollte keine Fehler werfen', async () => {
      await expect(service.clearCache()).resolves.not.toThrow();
    });
  });

  describe('Hash-Key Generierung', () => {
    it('sollte SHA-256 Hash mit Prefix verwenden', async () => {
      const key = 'test-key-for-hash';
      const operation = jest.fn().mockResolvedValue('result');

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.executeIdempotent(key, operation);

      const cacheKey = mockCacheManager.get.mock.calls[0][0];
      expect(cacheKey).toMatch(/^duplicate-detection:[a-f0-9]{64}$/);
    });
  });
});
