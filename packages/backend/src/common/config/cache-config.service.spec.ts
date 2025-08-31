import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { CacheConfigService } from './cache-config.service';

describe('CacheConfigService', () => {
  let service: CacheConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheConfigService>(CacheConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCacheTtl', () => {
    it('sollte TTL aus Environment-Variable zurückgeben', () => {
      jest.spyOn(configService, 'get').mockReturnValue(7200);

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(7200);
      expect(configService.get).toHaveBeenCalledWith('CACHE_TTL_SECONDS', 3600);
    });

    it('sollte Default-TTL bei fehlender Environment-Variable verwenden', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(3600);
    });

    it('sollte Default-TTL bei ungültigem Wert verwenden', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(configService, 'get').mockReturnValue(-100);

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(3600);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid CACHE_TTL_SECONDS value: -100. Using default: 3600');
      consoleSpy.mockRestore();
    });

    it('sollte Default-TTL bei Nicht-Integer-Wert verwenden', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(configService, 'get').mockReturnValue(3.14);

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(3600);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getCacheMaxItems', () => {
    it('sollte MAX_ITEMS aus Environment-Variable zurückgeben', () => {
      jest.spyOn(configService, 'get').mockReturnValue(2000);

      const maxItems = service.getCacheMaxItems();

      expect(maxItems).toBe(2000);
      expect(configService.get).toHaveBeenCalledWith('CACHE_MAX_ITEMS', 1000);
    });

    it('sollte Default-MAX_ITEMS bei fehlender Environment-Variable verwenden', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const maxItems = service.getCacheMaxItems();

      expect(maxItems).toBe(1000);
    });

    it('sollte Default-MAX_ITEMS bei ungültigem Wert verwenden', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(configService, 'get').mockReturnValue(0);

      const maxItems = service.getCacheMaxItems();

      expect(maxItems).toBe(1000);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid CACHE_MAX_ITEMS value: 0. Using default: 1000');
      consoleSpy.mockRestore();
    });
  });

  describe('createCacheOptions', () => {
    it('sollte vollständige Cache-Konfiguration erstellen', () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(7200) // TTL
        .mockReturnValueOnce(2000); // MAX_ITEMS

      const options = service.createCacheOptions();

      expect(options).toEqual({
        store: 'memory',
        ttl: 7200,
        max: 2000,
        isGlobal: true,
      });
    });

    it('sollte Default-Werte bei fehlenden Environment-Variables verwenden', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const options = service.createCacheOptions();

      expect(options).toEqual({
        store: 'memory',
        ttl: 3600,
        max: 1000,
        isGlobal: true,
      });
    });
  });

  describe('getCacheConfig', () => {
    it('sollte aktuelle Cache-Konfiguration zurückgeben', () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(1800) // TTL
        .mockReturnValueOnce(500); // MAX_ITEMS

      const config = service.getCacheConfig();

      expect(config).toEqual({
        store: 'memory',
        ttl: 1800,
        max: 500,
      });
    });

    it('sollte konsistente Werte zwischen getCacheConfig und createCacheOptions liefern', () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(4800) // TTL für getCacheConfig
        .mockReturnValueOnce(1500) // MAX_ITEMS für getCacheConfig
        .mockReturnValueOnce(4800) // TTL für createCacheOptions
        .mockReturnValueOnce(1500); // MAX_ITEMS für createCacheOptions

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
        jest.spyOn(configService, 'get').mockReturnValue(3600);

        const ttl = service.getCacheTtl();

        expect(ttl).toBe(3600);
      });
    });

    it('sollte große Werte korrekt verarbeiten', () => {
      jest.spyOn(configService, 'get').mockReturnValue(86400); // 24 Stunden

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(86400);
    });

    it('sollte Null-Werte als ungültig behandeln', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(configService, 'get').mockReturnValue(null);

      const ttl = service.getCacheTtl();

      expect(ttl).toBe(3600);
      consoleSpy.mockRestore();
    });
  });
});
