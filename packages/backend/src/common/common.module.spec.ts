import { Test, type TestingModule } from '@nestjs/testing';
import { CommonModule } from './common.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheConfigService } from './config/cache-config.service';
import { AppConfigService } from './services/app-config.service';
import { ConfigModule } from '@nestjs/config';
import type { Cache } from 'cache-manager';

describe('CommonModule', () => {
  let module: TestingModule;
  let cacheManager: Cache;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CommonModule, ConfigModule.forRoot()],
    }).compile();

    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Module Registration', () => {
    it('sollte CommonModule erfolgreich laden', () => {
      expect(module).toBeDefined();
    });

    it('sollte CacheConfigService bereitstellen', () => {
      const cacheConfigService = module.get<CacheConfigService>(CacheConfigService);
      expect(cacheConfigService).toBeDefined();
      expect(cacheConfigService).toBeInstanceOf(CacheConfigService);
    });

    it('sollte AppConfigService bereitstellen', () => {
      const appConfigService = module.get<AppConfigService>(AppConfigService);
      expect(appConfigService).toBeDefined();
      expect(appConfigService).toBeInstanceOf(AppConfigService);
    });

    it('sollte CacheManager global verfügbar machen', () => {
      expect(cacheManager).toBeDefined();
    });
  });

  describe('Cache Functionality', () => {
    it('sollte Cache set/get Operationen unterstützen', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheManager.set(key, value, 1000);
      const cachedValue = await cacheManager.get(key);

      expect(cachedValue).toEqual(value);
    });

    it('sollte Cache del Operation unterstützen', async () => {
      const key = 'test-key-del';
      const value = 'test-value-del';

      await cacheManager.set(key, value, 1000);
      await cacheManager.del(key);
      const cachedValue = await cacheManager.get(key);

      expect(cachedValue).toBeUndefined();
    });

    it('sollte mehrere Cache-Einträge verwalten können', async () => {
      await cacheManager.set('key1', 'value1', 1000);
      await cacheManager.set('key2', 'value2', 1000);

      const value1 = await cacheManager.get('key1');
      const value2 = await cacheManager.get('key2');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');

      // Einzeln löschen
      await cacheManager.del('key1');
      const deletedValue1 = await cacheManager.get('key1');
      expect(deletedValue1).toBeUndefined();

      // key2 sollte noch existieren
      const stillExists = await cacheManager.get('key2');
      expect(stillExists).toBe('value2');
    });

    it('sollte TTL respektieren', async () => {
      const key = 'ttl-test';
      const value = 'ttl-value';

      // Set mit sehr kurzer TTL (100ms)
      await cacheManager.set(key, value, 100);

      // Sofort abrufen - sollte noch da sein
      let cachedValue = await cacheManager.get(key);
      expect(cachedValue).toBe(value);

      // Nach 150ms sollte es abgelaufen sein
      await new Promise((resolve) => setTimeout(resolve, 150));
      cachedValue = await cacheManager.get(key);
      expect(cachedValue).toBeUndefined();
    });
  });

  describe('Configuration', () => {
    it('sollte Cache-Konfiguration aus CacheConfigService verwenden', () => {
      const cacheConfigService = module.get<CacheConfigService>(CacheConfigService);
      const config = cacheConfigService.getCacheConfig();

      expect(config).toHaveProperty('store', 'memory');
      expect(config).toHaveProperty('ttl');
      expect(config).toHaveProperty('max');
      expect(typeof config.ttl).toBe('number');
      expect(typeof config.max).toBe('number');
    });
  });
});
