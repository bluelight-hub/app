import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('admin_token_123'),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'ADMIN_JWT_SECRET') return 'test-admin-secret';
      if (key === 'ADMIN_JWT_EXPIRATION') return '15m';
      throw new Error(`Config key not found: ${key}`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('adminExists', () => {
    it('sollte false zurückgeben, wenn kein Admin existiert', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.adminExists();

      expect(result).toBe(false);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
          },
          passwordHash: {
            not: null,
          },
        },
      });
    });

    it('sollte true zurückgeben, wenn ein Admin existiert', async () => {
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.adminExists();

      expect(result).toBe(true);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
          },
          passwordHash: {
            not: null,
          },
        },
      });
    });

    it('sollte true zurückgeben, wenn mehrere Admins existieren', async () => {
      mockPrismaService.user.count.mockResolvedValue(3);

      const result = await service.adminExists();

      expect(result).toBe(true);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
          },
          passwordHash: {
            not: null,
          },
        },
      });
    });
  });

  describe('adminSetup', () => {
    const mockValidatedUser = { userId: 'user123' };
    const mockAdminSetupDto = { password: 'SecurePassword123!' };
    const mockUser = {
      id: 'user123',
      username: 'testuser',
      passwordHash: null,
      role: UserRole.ADMIN,
      isActive: true,
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
    };

    beforeEach(() => {
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation((password: string, saltRounds: number) =>
          Promise.resolve(`hashed_${password}_${saltRounds}`),
        );
    });

    it('sollte den Benutzer erfolgreich zum Admin mit gehashtem Passwort aktualisieren', async () => {
      const updatedUser = {
        ...mockUser,
        passwordHash: 'hashed_SecurePassword123!_10',
      };

      jest.spyOn(service, 'findUserById').mockResolvedValue(mockUser);
      jest.spyOn(service, 'signAdminToken').mockReturnValue('admin_token_123');
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.adminSetup(mockAdminSetupDto, mockValidatedUser);

      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          passwordHash: 'hashed_SecurePassword123!_10',
        },
      });

      // Verifiziere, dass das Passwort nicht in der Antwort enthalten ist
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.user.username).toBe('testuser');
      expect(result.token).toBe('admin_token_123');
    });

    it('sollte eine ConflictException werfen, wenn der Benutzer kein Admin ist', async () => {
      const nonAdminUser = { ...mockUser, role: UserRole.USER };
      jest.spyOn(service, 'findUserById').mockResolvedValue(nonAdminUser);

      await expect(service.adminSetup(mockAdminSetupDto, mockValidatedUser)).rejects.toThrow(
        ConflictException,
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('sollte die richtige Fehlermeldung enthalten, wenn Benutzer kein Admin ist', async () => {
      const nonAdminUser = { ...mockUser, role: UserRole.USER };
      jest.spyOn(service, 'findUserById').mockResolvedValue(nonAdminUser);

      await expect(service.adminSetup(mockAdminSetupDto, mockValidatedUser)).rejects.toThrow(
        'Nur Admin-Benutzer können diese Funktion nutzen',
      );
    });
  });

  describe('validateAdminCredentials', () => {
    const mockAdminUser = {
      id: 'admin123',
      username: 'admin',
      passwordHash: 'hashed_password',
      role: UserRole.ADMIN,
      isActive: true,
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
    };

    beforeEach(() => {
      jest.spyOn(bcrypt, 'compare').mockImplementation((password: string, hash: string) => {
        return Promise.resolve(password === 'correct_password' && hash === 'hashed_password');
      });
    });

    it('sollte den Admin-User zurückgeben, wenn die Anmeldedaten korrekt sind', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockAdminUser,
        lastLoginAt: new Date(),
      });

      const result = await service.validateAdminCredentials('admin123', 'correct_password');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'admin123',
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'admin123' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(result).toEqual(mockAdminUser);
    });

    it('sollte null zurückgeben, wenn der Benutzer nicht existiert', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateAdminCredentials('nonexistent-id', 'any_password');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'nonexistent-id',
        },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('sollte null zurückgeben, wenn der Benutzer kein Passwort hat', async () => {
      const userWithoutPassword = { ...mockAdminUser, passwordHash: null };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutPassword);

      const result = await service.validateAdminCredentials('admin', 'any_password');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('sollte null zurückgeben, wenn das Passwort falsch ist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);

      const result = await service.validateAdminCredentials('admin', 'wrong_password');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong_password', 'hashed_password');
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('sollte auch mit SUPER_ADMIN Rolle funktionieren', async () => {
      const superAdminUser = { ...mockAdminUser, role: UserRole.SUPER_ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(superAdminUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...superAdminUser,
        lastLoginAt: new Date(),
      });

      const result = await service.validateAdminCredentials('admin123', 'correct_password');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'admin123',
        },
      });
      expect(result).toEqual(superAdminUser);
    });
  });
});
