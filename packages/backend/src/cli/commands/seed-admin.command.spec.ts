import { Test, TestingModule } from '@nestjs/testing';
import { SeedAdminCommand } from './seed-admin.command';
import { SeedService } from '@/modules/seed/seed.service';
import { Logger } from '@nestjs/common';

describe('SeedAdminCommand', () => {
  let command: SeedAdminCommand;
  let seedService: jest.Mocked<SeedService>;
  let loggerSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedAdminCommand,
        {
          provide: SeedService,
          useValue: {
            seedAdminAuthentication: jest.fn(),
            seedAdminRolePermissions: jest.fn(),
            seedAdminUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    command = module.get<SeedAdminCommand>(SeedAdminCommand);
    seedService = module.get(SeedService);

    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should run full admin auth seeding with default password', async () => {
      seedService.seedAdminAuthentication.mockResolvedValue(true);

      await command.run([]);

      expect(seedService.seedAdminAuthentication).toHaveBeenCalledWith('admin123');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Authentication erfolgreich geseeded!');
    });

    it('should run full admin auth seeding with custom password', async () => {
      seedService.seedAdminAuthentication.mockResolvedValue(true);

      await command.run([], { password: 'custom-password' });

      expect(seedService.seedAdminAuthentication).toHaveBeenCalledWith('custom-password');
    });

    it('should handle failed admin auth seeding', async () => {
      seedService.seedAdminAuthentication.mockResolvedValue(false);

      await command.run([]);

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Admin-Authentication-Seeding fehlgeschlagen oder bereits vorhanden',
      );
    });

    it('should seed only permissions when permissionsOnly option is set', async () => {
      seedService.seedAdminRolePermissions.mockResolvedValue(true);

      await command.run([], { permissionsOnly: true });

      expect(seedService.seedAdminRolePermissions).toHaveBeenCalled();
      expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
      expect(seedService.seedAdminUsers).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '✅ Admin-Rollen-Berechtigungen erfolgreich erstellt!',
      );
    });

    it('should handle failed permissions seeding', async () => {
      seedService.seedAdminRolePermissions.mockResolvedValue(false);

      await command.run([], { permissionsOnly: true });

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Fehler beim Erstellen der Admin-Rollen-Berechtigungen',
      );
    });

    it('should seed only users when usersOnly option is set', async () => {
      seedService.seedAdminUsers.mockResolvedValue(true);

      await command.run([], { usersOnly: true, password: 'test-password' });

      expect(seedService.seedAdminUsers).toHaveBeenCalledWith('test-password');
      expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
      expect(seedService.seedAdminRolePermissions).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('✅ Admin-Benutzer erfolgreich erstellt!');
      expect(warnSpy).toHaveBeenCalledWith(
        '⚠️  Alle Benutzer verwenden das Passwort: test-password',
      );
    });

    it('should handle failed users seeding', async () => {
      seedService.seedAdminUsers.mockResolvedValue(false);

      await command.run([], { usersOnly: true });

      expect(warnSpy).toHaveBeenCalledWith(
        '⚠️  Admin-Benutzer wurden nicht erstellt (existieren bereits oder Fehler)',
      );
    });

    it('should handle errors during execution', async () => {
      const error = new Error('Test error');
      seedService.seedAdminAuthentication.mockRejectedValue(error);

      await command.run([]);

      expect(errorSpy).toHaveBeenCalledWith(
        'Fehler beim Ausführen des Befehls: Test error',
        error.stack,
      );
    });
  });

  describe('option parsers', () => {
    it('should parse password option', () => {
      const result = command.parsePassword('secure-password');
      expect(result).toBe('secure-password');
    });

    it('should parse permissionsOnly option', () => {
      const result = command.parsePermissionsOnly();
      expect(result).toBe(true);
    });

    it('should parse usersOnly option', () => {
      const result = command.parseUsersOnly();
      expect(result).toBe(true);
    });
  });

  describe('seedFullAdminAuth', () => {
    it('should log all created users when successful', async () => {
      seedService.seedAdminAuthentication.mockResolvedValue(true);

      await command.run([], { password: 'test123' });

      expect(loggerSpy).toHaveBeenCalledWith('📋 Erstelle Benutzer:');
      expect(loggerSpy).toHaveBeenCalledWith('🔹 Super Admin:');
      expect(loggerSpy).toHaveBeenCalledWith('   Email: superadmin@bluelight-hub.com');
      expect(loggerSpy).toHaveBeenCalledWith('   Passwort: test123');
      expect(loggerSpy).toHaveBeenCalledWith('🔹 Admin:');
      expect(loggerSpy).toHaveBeenCalledWith('🔹 Support:');
      expect(loggerSpy).toHaveBeenCalledWith('🔹 User:');
      expect(warnSpy).toHaveBeenCalledWith(
        '⚠️  WICHTIG: Ändern Sie diese Passwörter vor dem Produktivbetrieb!',
      );
    });
  });
});
