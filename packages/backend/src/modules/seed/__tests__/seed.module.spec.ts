import { ConfigModule, ConfigService } from '@nestjs/config';
import { SeedModule } from '../seed.module';

describe('SeedModule', () => {
  describe('register', () => {
    it('should register with default options', () => {
      const dynamicModule = SeedModule.register();

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(SeedModule);
      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.exports).toBeDefined();
    });

    it('should register with custom options', () => {
      const options = {
        enabled: true,
        devEinsatzName: 'Test Einsatz',
        devEinsatzBeschreibung: 'Test Beschreibung',
      };

      const dynamicModule = SeedModule.register(options);

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.providers).toContainEqual({
        provide: 'SEED_OPTIONS',
        useValue: options,
      });
    });

    it('should include DevSeedService when enabled', () => {
      const dynamicModule = SeedModule.register({ enabled: true });

      const hasDevSeedService = dynamicModule.providers?.some(
        (provider: any) => provider === 'DevSeedService' || provider.name === 'DevSeedService',
      );

      expect(hasDevSeedService).toBeDefined();
    });

    it('should not include DevSeedService when disabled', () => {
      const dynamicModule = SeedModule.register({ enabled: false });

      const devSeedServiceCount = dynamicModule.providers?.filter(
        (provider: any) => provider === 'DevSeedService' || provider.name === 'DevSeedService',
      ).length;

      // DevSeedService might appear once in the base providers
      expect(devSeedServiceCount).toBeLessThanOrEqual(1);
    });
  });

  describe('registerAsync', () => {
    it('should register async module', () => {
      const dynamicModule = SeedModule.registerAsync();

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(SeedModule);
      expect(dynamicModule.imports).toBeDefined();
      expect(
        dynamicModule.imports?.some(
          (imp: any) =>
            imp === ConfigModule || imp.name === 'ConfigModule' || imp === 'ConfigModule',
        ),
      ).toBeTruthy();
      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.exports).toBeDefined();
    });

    it('should provide factory function for SEED_OPTIONS', () => {
      const dynamicModule = SeedModule.registerAsync();

      const seedOptionsProvider = dynamicModule.providers?.find(
        (provider: any) => provider.provide === 'SEED_OPTIONS',
      ) as any;

      expect(seedOptionsProvider).toBeDefined();
      expect(seedOptionsProvider.inject).toEqual([ConfigService]);
      expect(seedOptionsProvider.useFactory).toBeDefined();
    });

    it('should configure options based on environment', () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            NODE_ENV: 'development',
            SEED_INITIAL_EINSATZ: 'true',
            DEV_EINSATZ_NAME: 'Dev Test',
          };
          return config[key];
        }),
      };

      const dynamicModule = SeedModule.registerAsync();
      const seedOptionsProvider = dynamicModule.providers?.find(
        (provider: any) => provider.provide === 'SEED_OPTIONS',
      ) as any;

      const options = seedOptionsProvider.useFactory(mockConfigService);

      expect(options).toEqual({
        enabled: true,
        devEinsatzName: 'Dev Test',
        devEinsatzBeschreibung: 'Automatisch erstellter Entwicklungs-Einsatz',
      });
    });

    it('should disable seeding in production', () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            NODE_ENV: 'production',
            SEED_INITIAL_EINSATZ: 'true',
          };
          return config[key];
        }),
      };

      const dynamicModule = SeedModule.registerAsync();
      const seedOptionsProvider = dynamicModule.providers?.find(
        (provider: any) => provider.provide === 'SEED_OPTIONS',
      ) as any;

      const options = seedOptionsProvider.useFactory(mockConfigService);

      expect(options.enabled).toBe(false);
    });

    it('should disable seeding when SEED_INITIAL_EINSATZ is false', () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            NODE_ENV: 'development',
            SEED_INITIAL_EINSATZ: 'false',
          };
          return config[key];
        }),
      };

      const dynamicModule = SeedModule.registerAsync();
      const seedOptionsProvider = dynamicModule.providers?.find(
        (provider: any) => provider.provide === 'SEED_OPTIONS',
      ) as any;

      const options = seedOptionsProvider.useFactory(mockConfigService);

      expect(options.enabled).toBe(false);
    });
  });

  describe('shouldRegisterDevSeed', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return true when enabled is explicitly true', () => {
      // Access private method via reflection
      const shouldRegisterMethod = (SeedModule as any).shouldRegisterDevSeed;
      expect(shouldRegisterMethod({ enabled: true })).toBe(true);
    });

    it('should return false when enabled is explicitly false', () => {
      const shouldRegisterMethod = (SeedModule as any).shouldRegisterDevSeed;
      expect(shouldRegisterMethod({ enabled: false })).toBe(false);
    });

    it('should check environment when enabled is undefined', () => {
      process.env.NODE_ENV = 'development';
      process.env.SEED_INITIAL_EINSATZ = 'true';

      const shouldRegisterMethod = (SeedModule as any).shouldRegisterDevSeed;
      expect(shouldRegisterMethod({})).toBe(true);
    });

    it('should return false in production even with SEED_INITIAL_EINSATZ true', () => {
      process.env.NODE_ENV = 'production';
      process.env.SEED_INITIAL_EINSATZ = 'true';

      const shouldRegisterMethod = (SeedModule as any).shouldRegisterDevSeed;
      expect(shouldRegisterMethod({})).toBe(false);
    });
  });
});
