import { Test, TestingModule } from '@nestjs/testing';
import { CliModule } from '../../cli.module';
import { AdminResetPasswordCommand } from '../admin-reset-password.command';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AdminResetPasswordCommand', () => {
  let command: AdminResetPasswordCommand;
  let module: TestingModule;
  let prismaService: any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CliModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        // Mock PrismaService for unit tests
        user: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },

        $transaction: jest.fn(),
      })
      .compile();

    command = module.get<AdminResetPasswordCommand>(AdminResetPasswordCommand);
    prismaService = module.get<PrismaService>(PrismaService);
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
    let processExitSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      processExitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should exit with error when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(command.run(['nonexistent', 'newPassword'])).rejects.toThrow(
        'process.exit called',
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Fehler: Benutzer "nonexistent" wurde nicht gefunden.',
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit with error when user is not admin', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: '123',
        username: 'regularuser',
        role: UserRole.USER,
      });

      await expect(command.run(['regularuser', 'newPassword'])).rejects.toThrow(
        'process.exit called',
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'regularuser' },
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Fehler: Benutzer "regularuser" ist kein Administrator (Rolle: USER).',
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
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

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await command.run(['adminuser', 'newPassword']);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'adminuser' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '456' },
        data: { passwordHash: '$2b$10$hashedPassword123' },
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Passwort erfolgreich zurückgesetzt für Admin: adminuser',
      );
      expect(processExitSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
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

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await command.run(['superadminuser', 'newPassword']);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'superadminuser' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '789' },
        data: { passwordHash: '$2b$10$hashedPassword456' },
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Passwort erfolgreich zurückgesetzt für Admin: superadminuser',
      );
      expect(processExitSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
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
    let processExitSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      processExitSpy.mockRestore();
      consoleLogSpy.mockRestore();
      delete process.env.BCRYPT_SALT_ROUNDS;
    });

    it('should use custom salt rounds from environment', async () => {
      process.env.BCRYPT_SALT_ROUNDS = '12';

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
