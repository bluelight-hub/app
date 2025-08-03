import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

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
});
