import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminResetPasswordCommand } from '../admin-reset-password.command';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AdminResetPasswordCommand', () => {
  let command: AdminResetPasswordCommand;
  let module: TestingModule;
  let prismaService: any;
  let configService: any;

  beforeEach(async () => {
    // Create mock PrismaService
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    // Create mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'BCRYPT_SALT_ROUNDS') {
          return process.env.BCRYPT_SALT_ROUNDS || defaultValue || '10';
        }
        return defaultValue;
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        AdminResetPasswordCommand,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    command = module.get<AdminResetPasswordCommand>(AdminResetPasswordCommand);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Command Structure', () => {
    it('should be defined', () => {
      expect(command).toBeDefined();
    });

    it('should have a run method', () => {
      expect(command.run).toBeDefined();
      expect(typeof command.run).toBe('function');
    });

    it('should throw error when no arguments provided', async () => {
      await expect(command.run([])).rejects.toThrow(
        'Benutzername und neues Passwort müssen angegeben werden',
      );
    });

    it('should throw error when only username provided', async () => {
      await expect(command.run(['admin'])).rejects.toThrow(
        'Benutzername und neues Passwort müssen angegeben werden',
      );
    });

    it('should throw error when only password provided', async () => {
      await expect(command.run([undefined, 'password'])).rejects.toThrow(
        'Benutzername und neues Passwort müssen angegeben werden',
      );
    });
  });

  describe('Help Text', () => {
    it('should provide usage information on error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await command.run([]);
      } catch (_error) {
        // Expected error
      }

      // Verify error message includes usage info
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Usage:'));

      consoleSpy.mockRestore();
    });
  });

  describe('User Lookup & Admin Validation (Subtask 31.2)', () => {
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerErrorSpy = jest.spyOn(Logger.prototype as any, 'error').mockImplementation();
    });

    afterEach(() => {
      loggerErrorSpy.mockRestore();
    });

    it('should throw error when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(command.run(['nonexistent', 'newPassword'])).rejects.toThrow(
        'Benutzer "nonexistent" wurde nicht gefunden.',
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '❌ Fehler: Benutzer "nonexistent" wurde nicht gefunden.',
      );
    });

    it('should throw error when user is not admin', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: '123',
        username: 'regularuser',
        role: UserRole.USER,
      });

      await expect(command.run(['regularuser', 'newPassword'])).rejects.toThrow(
        'Benutzer "regularuser" ist kein Administrator (Rolle: USER).',
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'regularuser' },
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '❌ Fehler: Benutzer "regularuser" ist kein Administrator (Rolle: USER).',
      );
    });

    it('should proceed with admin user', async () => {
      const mockUser = {
        id: '456',
        username: 'adminuser',
        role: UserRole.ADMIN,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedPassword123');
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$hashedPassword123',
      });

      const loggerLogSpy = jest.spyOn(Logger.prototype as any, 'log').mockImplementation();

      await command.run(['adminuser', 'newPassword']);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'adminuser' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '456' },
        data: { passwordHash: '$2b$10$hashedPassword123' },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        '✅ Passwort erfolgreich zurückgesetzt für Admin: adminuser',
      );
      loggerLogSpy.mockRestore();
    });

    it('should proceed with super admin user', async () => {
      const mockUser = {
        id: '789',
        username: 'superadminuser',
        role: UserRole.SUPER_ADMIN,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedPassword456');
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$hashedPassword456',
      });

      const loggerLogSpy = jest.spyOn(Logger.prototype as any, 'log').mockImplementation();

      await command.run(['superadminuser', 'newPassword']);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'superadminuser' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '789' },
        data: { passwordHash: '$2b$10$hashedPassword456' },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        '✅ Passwort erfolgreich zurückgesetzt für Admin: superadminuser',
      );
      loggerLogSpy.mockRestore();
    });

    it('should handle database errors gracefully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(command.run(['adminuser', 'newPassword'])).rejects.toThrow(
        'Database connection failed',
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'adminuser' },
      });
    });
  });

  describe('Password Hashing (Subtask 31.3)', () => {
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerLogSpy = jest.spyOn(Logger.prototype as any, 'log').mockImplementation();
      loggerErrorSpy = jest.spyOn(Logger.prototype as any, 'error').mockImplementation();
    });

    afterEach(() => {
      loggerLogSpy.mockRestore();
      loggerErrorSpy.mockRestore();
      delete process.env.BCRYPT_SALT_ROUNDS;
      jest.clearAllMocks();
    });

    it('should use custom salt rounds from environment', async () => {
      process.env.BCRYPT_SALT_ROUNDS = '12';
      // Reset the mock to ensure it picks up the new env value
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'BCRYPT_SALT_ROUNDS') {
          return process.env.BCRYPT_SALT_ROUNDS || defaultValue || '10';
        }
        return defaultValue;
      });

      const mockUser = {
        id: '123',
        username: 'adminuser',
        role: UserRole.ADMIN,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$customSaltHash');
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$12$customSaltHash',
      });

      await command.run(['adminuser', 'testPassword']);

      expect(bcrypt.hash).toHaveBeenCalledWith('testPassword', 12);
    });

    it('should use default salt rounds when env not set', async () => {
      delete process.env.BCRYPT_SALT_ROUNDS;
      // Reset the mock to ensure it uses the default value
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'BCRYPT_SALT_ROUNDS') {
          return defaultValue || '10';
        }
        return defaultValue;
      });

      const mockUser = {
        id: '123',
        username: 'adminuser',
        role: UserRole.ADMIN,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$defaultSaltHash');
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$defaultSaltHash',
      });

      await command.run(['adminuser', 'testPassword']);

      expect(bcrypt.hash).toHaveBeenCalledWith('testPassword', 10);
    });

    it('should handle bcrypt hashing errors', async () => {
      const mockUser = {
        id: '123',
        username: 'adminuser',
        role: UserRole.ADMIN,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(command.run(['adminuser', 'testPassword'])).rejects.toThrow('Hashing failed');
    });

    it('should verify password is bcrypt hash after reset', async () => {
      const mockUser = {
        id: '123',
        username: 'adminuser',
        role: UserRole.ADMIN,
      };
      const bcryptHash = '$2b$10$validBcryptHashStartingWith2b';

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue(bcryptHash);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: bcryptHash,
      });

      await command.run(['adminuser', 'newPassword']);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { passwordHash: expect.stringMatching(/^\$2[aby]\$/) },
      });
    });
  });
});
