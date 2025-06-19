import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Permission, UserRole } from './types/jwt.types';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset mocks
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    });
  });

  describe('login', () => {
    const mockLoginDto = {
      email: 'admin@bluelight-hub.com',
      password: 'SecurePassword123!',
    };

    const mockUser = {
      id: '1',
      email: 'admin@bluelight-hub.com',
      username: 'admin',
      passwordHash: 'hashed_password',
      role: UserRole.ADMIN,
      isActive: true,
      isMfaEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login successfully with valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USERS_READ },
        { permission: Permission.USERS_WRITE },
      ]);
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJwtService.sign.mockReturnValueOnce('access_token');
      mockJwtService.sign.mockReturnValueOnce('refresh_token');

      const result = await service.login(mockLoginDto);

      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.roles).toEqual([UserRole.ADMIN]);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(mockLoginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(mockLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(mockLoginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(mockLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(mockLoginDto)).rejects.toThrow('Account is disabled');
    });

    it('should throw UnauthorizedException for locked user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60000), // Locked for 1 minute
      });

      await expect(service.login(mockLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(mockLoginDto)).rejects.toThrow('Account is locked');
    });

    it('should increment failed login count on invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login(mockLoginDto);
      } catch {
        // Expected to throw
      }

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginCount: { increment: 1 },
          lockedUntil: null,
        },
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedLoginCount: 4,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login(mockLoginDto);
      } catch {
        // Expected to throw
      }

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginCount: { increment: 1 },
          lockedUntil: expect.any(Date),
        },
      });
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'valid_refresh_token';
    const mockPayload = {
      sub: '1',
      sessionId: 'session-123',
      jti: 'jti-123',
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 604800,
    };

    const mockStoredToken = {
      id: '1',
      token: mockRefreshToken,
      userId: '1',
      sessionJti: 'jti-123',
      expiresAt: new Date(Date.now() + 604800 * 1000),
      isUsed: false,
      isRevoked: false,
      user: {
        id: '1',
        email: 'admin@bluelight-hub.com',
        role: UserRole.ADMIN,
        isActive: true,
      },
    };

    it('should refresh tokens successfully', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USERS_READ },
        { permission: Permission.USERS_WRITE },
      ]);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      mockJwtService.sign.mockReturnValueOnce('new_access_token');
      mockJwtService.sign.mockReturnValueOnce('new_refresh_token');

      const result = await service.refreshTokens(mockRefreshToken);

      expect(result).toHaveProperty('accessToken', 'new_access_token');
      expect(result).toHaveProperty('refreshToken', 'new_refresh_token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockRefreshToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for used refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        isUsed: true,
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        isRevoked: true,
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        user: {
          ...mockStoredToken.user,
          isActive: false,
        },
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should invalidate session and refresh tokens', async () => {
      const sessionId = 'session-123';

      mockPrismaService.session.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(sessionId);

      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          jti: sessionId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revokedReason: 'User logout',
        },
      });

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          sessionJti: sessionId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });
  });
});
