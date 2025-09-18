import { Test, type TestingModule } from '@nestjs/testing';
import { CacheConfigService } from './cache-config.service';
import { cacheConfig } from './cache.config';

describe('CacheConfigService', () => {
  let service: CacheConfigService;
  let mockConfig: any;

  beforeEach(async () => {
    mockConfig = {
      ttl: 60000,
      max: 100,
      store: 'memory',
      isGlobal: true,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheConfigService,
        {
          provide: cacheConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<CacheConfigService>(CacheConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCacheTtl', () => {
    it('sollte TTL aus Konfiguration zurückgeben', () => {
      mockConfig.ttl = 7200000;

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(7200000);
    });

    it('sollte Default-TTL bei ungültigem Wert verwenden', () => {
      const loggerSpy = jest.spyOn(service.logger, 'warn').mockImplementation();
      mockConfig.ttl = -100;

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(60000);
      expect(loggerSpy).toHaveBeenCalledWith('Invalid CACHE_TTL value: -100. Using default: 60000');
      loggerSpy.mockRestore();
    });

    it('sollte Default-TTL bei Nicht-Integer-Wert verwenden', () => {
      const loggerSpy = jest.spyOn(service.logger, 'warn').mockImplementation();
      mockConfig.ttl = 3.14;

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(60000);
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('getCacheMaxItems', () => {
    it('sollte MAX_ITEMS aus Konfiguration zurückgeben', () => {
      mockConfig.max = 2000;

      const maxItems = service.getCacheMaxItems();

      expect(maxItems).toBe(2000);
    });

    it('sollte Default-MAX_ITEMS bei ungültigem Wert verwenden', () => {
      const loggerSpy = jest.spyOn(service.logger, 'warn').mockImplementation();
      mockConfig.max = 0;

      const maxItems = service.getCacheMaxItems();

      expect(maxItems).toBe(100);
      expect(loggerSpy).toHaveBeenCalledWith('Invalid CACHE_MAX_ITEMS value: 0. Using default: 100');
      loggerSpy.mockRestore();
    });
  });

  describe('createCacheOptions', () => {
    it('sollte vollständige Cache-Konfiguration erstellen', () => {
      mockConfig.ttl = 7200000;
      mockConfig.max = 2000;

      const options = service.createCacheOptions();

      expect(options).toEqual({
        store: 'memory',
        ttl: 7200000,
        max: 2000,
      });
    });

    it('sollte Default-Werte verwenden', () => {
      const options = service.createCacheOptions();

      expect(options).toEqual({
        store: 'memory',
        ttl: 60000,
        max: 100,
      });
    });
  });

  describe('getCacheConfig', () => {
    it('sollte aktuelle Cache-Konfiguration zurückgeben', () => {
      mockConfig.ttl = 1800000;
      mockConfig.max = 500;

      const config = service.getCacheConfig();

      expect(config).toEqual({
        store: 'memory',
        ttl: 1800000,
        max: 500,
      });
    });

    it('sollte konsistente Werte zwischen getCacheConfig und createCacheOptions liefern', () => {
      mockConfig.ttl = 4800000;
      mockConfig.max = 1500;

      const config = service.getCacheConfig();
      const options = service.createCacheOptions();

      expect(config.ttl).toBe(options.ttl);
      expect(config.max).toBe(options.max);
      expect(config.store).toBe(options.store);
    });
  });

  describe('Validierung', () => {
    it('sollte bei verschiedenen NODE_ENV-Einstellungen funktionieren', () => {
      const envs = ['development', 'production', 'test'];

      envs.forEach((env) => {
        process.env.NODE_ENV = env;
        mockConfig.ttl = 3600000;

        const ttl = service.getCacheTtl();

        expect(ttl).toBe(3600000);
      });
    });

    it('sollte große Werte korrekt verarbeiten', () => {
      mockConfig.ttl = 86400000; // 24 Stunden in ms

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(86400000);
    });

    it('sollte Null-Werte als ungültig behandeln', () => {
      const loggerSpy = jest.spyOn(service.logger, 'warn').mockImplementation();
      mockConfig.ttl = null;

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(60000);
      loggerSpy.mockRestore();
    });
  });
});
