import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
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
    sign: jest.fn(),
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
      role: UserRole.USER,
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

    it('sollte den Benutzer erfolgreich zum Admin mit gehashtem Passwort aktualisieren, wenn kein Admin existiert', async () => {
      const updatedUser = {
        ...mockUser,
        role: UserRole.ADMIN,
        passwordHash: 'hashed_SecurePassword123!_10',
      };

      jest.spyOn(service, 'adminExists').mockResolvedValue(false);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.adminSetup(mockAdminSetupDto, mockValidatedUser);

      expect(service.adminExists).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          role: UserRole.ADMIN,
          passwordHash: 'hashed_SecurePassword123!_10',
        },
      });

      // Verifiziere, dass das Passwort nicht in der Antwort enthalten ist
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.user.username).toBe('testuser');
    });

    it('sollte eine ConflictException werfen, wenn bereits ein Admin existiert', async () => {
      jest.spyOn(service, 'adminExists').mockResolvedValue(true);

      await expect(service.adminSetup(mockAdminSetupDto, mockValidatedUser)).rejects.toThrow(
        ConflictException,
      );

      expect(service.adminExists).toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('sollte die richtige Fehlermeldung enthalten, wenn Admin bereits existiert', async () => {
      jest.spyOn(service, 'adminExists').mockResolvedValue(true);

      await expect(service.adminSetup(mockAdminSetupDto, mockValidatedUser)).rejects.toThrow(
        'Ein Admin-Account existiert bereits',
      );
    });
  });
});
