import { AdminRuntimeConfigController } from '@/modules/admin/controllers/admin-runtime-config.controller';
import type { AppConfigService } from '@/infrastructure/services/app-config.service';
import type { MigrateLegacyRuntimeConfigResultDto, RuntimeConfigListDto } from '@/application/admin/dto/runtime-config.dto';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

describe('AdminRuntimeConfigController', () => {
  let controller: AdminRuntimeConfigController;
  let mockAppConfigService: jest.Mocked<AppConfigService>;

  const mockAdminUser: ValidatedUser = {
    userId: 'admin-user-001',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAppConfigService = {
      listRuntimeConfig: jest.fn(),
      upsertRuntimeConfig: jest.fn(),
      deleteRuntimeConfig: jest.fn(),
      getConfigDoctorReport: jest.fn(),
      migrateLegacyRuntimeKeysToDb: jest.fn(),
      reload: jest.fn(),
      get: jest.fn(),
      getOrThrow: jest.fn(),
      parseValueForStorage: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test Mock Typing
    } as any;

    controller = new AdminRuntimeConfigController(mockAppConfigService);
  });

  describe('listRuntimeConfig()', () => {
    it('sollte Runtime-Config-Liste mit Einträgen zurückgeben', () => {
      const listResponse: RuntimeConfigListDto = {
        entries: [
          {
            key: 'JWT_SECRET',
            value: '********',
            source: 'db',
            sensitive: true,
            category: 'internal_secret',
            editable: false,
            configured: true,
          },
        ],
      };

      mockAppConfigService.listRuntimeConfig.mockReturnValue(listResponse.entries);

      expect(controller.listRuntimeConfig()).toEqual(listResponse);
    });
  });

  describe('upsertRuntimeConfig()', () => {
    it('sollte einen Runtime-Key speichern und mit aktueller Quelle zurückgeben', async () => {
      mockAppConfigService.listRuntimeConfig.mockReturnValue([
        {
          key: 'APP_URL',
          value: 'https://example.local',
          source: 'db',
          sensitive: false,
          category: 'runtime',
          editable: true,
          configured: true,
        },
      ]);

      const entry = await controller.upsertRuntimeConfig('APP_URL', { value: 'https://example.local', sourceHint: 'ui' }, mockAdminUser);

      expect(mockAppConfigService.upsertRuntimeConfig).toHaveBeenCalledWith({
        key: 'APP_URL',
        value: 'https://example.local',
        sensitive: undefined,
        sourceHint: 'ui',
        updatedBy: mockAdminUser.userId,
      });

      expect(entry).toEqual({
        key: 'APP_URL',
        value: 'https://example.local',
        source: 'db',
        sensitive: false,
        category: 'runtime',
        editable: true,
        configured: true,
      });
    });
  });

  describe('deleteRuntimeConfig()', () => {
    it('sollte ein editierbares Secret löschen', async () => {
      await expect(controller.deleteRuntimeConfig('HIORG_OAUTH_CLIENT_SECRET', mockAdminUser)).resolves.toEqual({
        key: 'HIORG_OAUTH_CLIENT_SECRET',
        deleted: true,
      });

      expect(mockAppConfigService.deleteRuntimeConfig).toHaveBeenCalledWith({
        key: 'HIORG_OAUTH_CLIENT_SECRET',
        updatedBy: mockAdminUser.userId,
        sourceHint: 'ui',
      });
    });
  });

  describe('migrateLegacyRuntimeConfig()', () => {
    it('sollte Legacy-ENV-Keys erfolgreich migrieren', async () => {
      const serviceResult: MigrateLegacyRuntimeConfigResultDto = {
        migratedKeys: ['JWT_SECRET'],
        skippedKeys: ['FRONTEND_URL'],
        failedKeys: [],
        summary: {
          requested: 2,
          migrated: 1,
          skipped: 1,
          failed: 0,
        },
      };

      mockAppConfigService.migrateLegacyRuntimeKeysToDb.mockResolvedValue(serviceResult);

      const result = await controller.migrateLegacyRuntimeConfig(
        {
          keys: ['JWT_SECRET', 'FRONTEND_URL'],
        },
        mockAdminUser,
      );

      expect(mockAppConfigService.migrateLegacyRuntimeKeysToDb).toHaveBeenCalledWith({
        keys: ['JWT_SECRET', 'FRONTEND_URL'],
        dryRun: undefined,
        updatedBy: mockAdminUser.userId,
      });
      expect(result).toEqual(serviceResult);
    });

    it('sollte Teilfehler als failed-Element weiterreichen', async () => {
      const serviceResult: MigrateLegacyRuntimeConfigResultDto = {
        migratedKeys: [],
        skippedKeys: ['FRONTEND_URL'],
        failedKeys: [{ key: 'JWT_SECRET', reason: 'MASTER_SECRET fehlt' }],
        summary: {
          requested: 2,
          migrated: 0,
          skipped: 1,
          failed: 1,
        },
      };

      mockAppConfigService.migrateLegacyRuntimeKeysToDb.mockResolvedValue(serviceResult);

      const result = await controller.migrateLegacyRuntimeConfig(
        {
          keys: ['JWT_SECRET', 'FRONTEND_URL'],
          dryRun: true,
        },
        mockAdminUser,
      );

      expect(mockAppConfigService.migrateLegacyRuntimeKeysToDb).toHaveBeenCalledWith({
        keys: ['JWT_SECRET', 'FRONTEND_URL'],
        dryRun: true,
        updatedBy: mockAdminUser.userId,
      });
      expect(result).toEqual(serviceResult);
      expect(result.failedKeys).toHaveLength(1);
      expect(result.failedKeys[0].key).toBe('JWT_SECRET');
    });

    it('sollte den Service-Fehler weiterreichen', async () => {
      mockAppConfigService.migrateLegacyRuntimeKeysToDb.mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(controller.migrateLegacyRuntimeConfig({ keys: ['JWT_SECRET'] }, mockAdminUser)).rejects.toThrow('Service unavailable');
    });
  });
});
