import { describe, expect, it, jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { AppConfigService } from '@/infrastructure/services/app-config.service';

describe('AppConfigService', () => {
  const createMockConfigService = (values: Record<string, string | undefined>): jest.Mocked<ConfigService> => {
    return {
      get: jest.fn((key: string) => values[key]),
    } as jest.Mocked<ConfigService>;
  };

  const createMockPrismaService = (): jest.Mocked<PrismaService> => {
    return {
      appConfig: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      appConfigSecret: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
  };

  const createMockLogger = (): jest.Mocked<ILogger> => {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
  };

  it('migrates nur Legacy-ENV-Fallback-Keys und markiert unbekannte Keys als failed', async () => {
    const mockConfigService = createMockConfigService({
      JWT_SECRET: 'legacy-jwt',
      FRONTEND_URL: 'https://legacy-frontend.local',
    });
    const service = new AppConfigService(mockConfigService, createMockPrismaService(), createMockLogger());

    const upsertSpy = jest.spyOn(service, 'upsertRuntimeConfig').mockResolvedValue();

    const result = await service.migrateLegacyRuntimeKeysToDb({
      keys: ['JWT_SECRET', 'NICHT_BEARBEITBAR', 'JWT_SECRET', 'FRONTEND_URL'],
      updatedBy: 'admin-user',
    });

    expect(result).toEqual({
      migratedKeys: ['JWT_SECRET', 'FRONTEND_URL'],
      skippedKeys: [],
      failedKeys: [
        {
          key: 'NICHT_BEARBEITBAR',
          reason: 'Migration abgelehnt für NICHT_BEARBEITBAR: Schlüssel ist nicht im Runtime-Katalog enthalten.',
        },
      ],
      summary: {
        requested: 3,
        migrated: 2,
        skipped: 0,
        failed: 1,
      },
    });

    expect(upsertSpy).toHaveBeenCalledWith({
      key: 'JWT_SECRET',
      value: 'legacy-jwt',
      updatedBy: 'admin-user',
      sensitive: true,
      sourceHint: 'legacy_env_migration',
    });
    expect(upsertSpy).toHaveBeenCalledWith({
      key: 'FRONTEND_URL',
      value: 'https://legacy-frontend.local',
      updatedBy: 'admin-user',
      sensitive: false,
      sourceHint: 'legacy_env_migration',
    });
    expect(upsertSpy).toHaveBeenCalledTimes(2);
  });

  it('überspringt Keys, die bereits in der Runtime-DB liegen', async () => {
    const mockConfigService = createMockConfigService({ JWT_SECRET: 'legacy-jwt' });
    const service = new AppConfigService(mockConfigService, createMockPrismaService(), createMockLogger());

    const secretsMap = service as unknown as { dbRuntimeSecrets: Map<string, string> };
    secretsMap.dbRuntimeSecrets = new Map([['JWT_SECRET', 'already-from-db']]);

    const upsertSpy = jest.spyOn(service, 'upsertRuntimeConfig').mockResolvedValue();

    const result = await service.migrateLegacyRuntimeKeysToDb({
      keys: ['JWT_SECRET'],
      updatedBy: 'admin-user',
    });

    expect(result).toEqual({
      migratedKeys: [],
      skippedKeys: ['JWT_SECRET'],
      failedKeys: [],
      summary: {
        requested: 1,
        migrated: 0,
        skipped: 1,
        failed: 0,
      },
    });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('kann im DRY-RUN-Mode laufen, ohne DB-Write', async () => {
    const mockConfigService = createMockConfigService({ JWT_SECRET: 'legacy-jwt-secret' });
    const service = new AppConfigService(mockConfigService, createMockPrismaService(), createMockLogger());

    const upsertSpy = jest.spyOn(service, 'upsertRuntimeConfig').mockResolvedValue();

    const result = await service.migrateLegacyRuntimeKeysToDb({
      keys: ['JWT_SECRET'],
      dryRun: true,
      updatedBy: 'admin-user',
    });

    expect(result).toEqual({
      migratedKeys: ['JWT_SECRET'],
      skippedKeys: [],
      failedKeys: [],
      summary: {
        requested: 1,
        migrated: 1,
        skipped: 0,
        failed: 0,
      },
    });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('liefert einen failed-Eintrag bei fehlendem MASTER_SECRET_KEY für Secret-Migration', async () => {
    const mockConfigService = createMockConfigService({ JWT_SECRET: 'legacy-jwt-secret' });
    const service = new AppConfigService(mockConfigService, createMockPrismaService(), createMockLogger());

    const result = await service.migrateLegacyRuntimeKeysToDb({
      keys: ['JWT_SECRET'],
      updatedBy: 'admin-user',
    });

    expect(result).toEqual({
      migratedKeys: [],
      skippedKeys: [],
      failedKeys: [
        {
          key: 'JWT_SECRET',
          reason: 'Migration fehlgeschlagen für JWT_SECRET: MASTER_SECRET_KEY ist nicht verfügbar, Secret-Operation nicht möglich.',
        },
      ],
      summary: {
        requested: 1,
        migrated: 0,
        skipped: 0,
        failed: 1,
      },
    });
  });

  it('bevorzugt Legacy-ENV vor Runtime-Defaults, wenn kein DB-Wert existiert', () => {
    const mockConfigService = createMockConfigService({
      FRONTEND_URL: 'https://legacy-frontend.local',
    });
    const service = new AppConfigService(mockConfigService, createMockPrismaService(), createMockLogger());

    expect(service.get<string>('FRONTEND_URL')).toBe('https://legacy-frontend.local');
  });

  it('bevorzugt DB-Werte vor Legacy-ENV-Fallback', () => {
    const mockConfigService = createMockConfigService({
      FRONTEND_URL: 'https://legacy-frontend.local',
    });
    const service = new AppConfigService(mockConfigService, createMockPrismaService(), createMockLogger());

    const valuesMap = service as unknown as { dbRuntimeValues: Map<string, string> };
    valuesMap.dbRuntimeValues = new Map([['FRONTEND_URL', 'https://db-frontend.local']]);

    expect(service.get<string>('FRONTEND_URL')).toBe('https://db-frontend.local');
  });

  it('fällt auf Runtime-Defaults zurück, wenn weder DB noch Legacy-ENV gesetzt sind', () => {
    const mockConfigService = createMockConfigService({});
    const service = new AppConfigService(mockConfigService, createMockPrismaService(), createMockLogger());

    expect(service.get<string>('FRONTEND_URL')).toBe('http://localhost:3090');
  });

  it('erzwingt für sensible Katalog-Keys die Secret-Tabelle trotz sensitive=false im Input', async () => {
    const mockConfigService = createMockConfigService({
      MASTER_SECRET_KEY: 'a'.repeat(64),
    });
    const mockPrismaService = createMockPrismaService();
    const service = new AppConfigService(mockConfigService, mockPrismaService, createMockLogger());

    await service.upsertRuntimeConfig({
      key: 'JWT_SECRET',
      value: 'runtime-secret',
      sensitive: false,
      updatedBy: 'admin-user',
      sourceHint: 'ui',
    });

    expect(mockPrismaService.appConfigSecret.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'JWT_SECRET' },
      }),
    );
    expect(mockPrismaService.appConfig.upsert).not.toHaveBeenCalled();
    expect(mockPrismaService.appConfig.deleteMany).toHaveBeenCalledWith({ where: { key: 'JWT_SECRET' } });
  });

  it('erzwingt für nicht-sensible Katalog-Keys die Config-Tabelle trotz sensitive=true im Input', async () => {
    const mockConfigService = createMockConfigService({});
    const mockPrismaService = createMockPrismaService();
    const service = new AppConfigService(mockConfigService, mockPrismaService, createMockLogger());

    await service.upsertRuntimeConfig({
      key: 'APP_URL',
      value: 'https://runtime.example',
      sensitive: true,
      updatedBy: 'admin-user',
      sourceHint: 'ui',
    });

    expect(mockPrismaService.appConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'APP_URL' },
      }),
    );
    expect(mockPrismaService.appConfigSecret.upsert).not.toHaveBeenCalled();
    expect(mockPrismaService.appConfigSecret.deleteMany).toHaveBeenCalledWith({ where: { key: 'APP_URL' } });
  });
});
