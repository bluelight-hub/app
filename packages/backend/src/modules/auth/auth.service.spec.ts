import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Permission, UserRole } from './types/jwt.types';
import { PrismaService } from '@/prisma/prisma.service';
import { DefaultRolePermissions } from './constants';
import { SessionCleanupService } from './services/session-cleanup.service';
import { SessionService } from '../session/session.service';
import {
  InvalidCredentialsException,
  AccountDisabledException,
  AccountLockedException,
  InvalidTokenException,
  TokenRevokedException,
} from './exceptions/auth.exceptions';
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
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockSessionCleanupService = {
    enforceSessionLimit: jest.fn(),
    checkRefreshRateLimit: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  };

  const mockSessionService = {
    enhanceSession: jest.fn(),
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
        {
          provide: SessionCleanupService,
          useValue: mockSessionCleanupService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
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

    // Mock transaction to execute the callbacks
    mockPrismaService.$transaction.mockImplementation(async (callbacks) => {
      if (Array.isArray(callbacks)) {
        return Promise.all(callbacks);
      }
      return callbacks();
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
      mockPrismaService.session.create.mockResolvedValue({ jti: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockSessionCleanupService.enforceSessionLimit.mockResolvedValue(undefined);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJwtService.sign.mockReturnValueOnce('access_token');
      mockJwtService.sign.mockReturnValueOnce('refresh_token');

      const result = await service.login(mockLoginDto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.roles).toEqual([UserRole.ADMIN]);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(mockLoginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, failedLoginCount: 1 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(mockLoginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(mockLoginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        AccountDisabledException,
      );
    });

    it('should use default permissions when no permissions found in database', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]); // Empty permissions
      mockPrismaService.session.create.mockResolvedValue({ jti: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockSessionCleanupService.enforceSessionLimit.mockResolvedValue(undefined);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      const result = await service.login(mockLoginDto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      // Should use default permissions for ADMIN role
      expect(result.user.permissions).toEqual(DefaultRolePermissions[UserRole.ADMIN]);
    });

    it('should throw UnauthorizedException for locked user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60000), // Locked for 1 minute
      });

      await expect(service.login(mockLoginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        AccountLockedException,
      );
    });

    it('should increment failed login count on invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login(mockLoginDto, '127.0.0.1', 'test-agent');
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
        await service.login(mockLoginDto, '127.0.0.1', 'test-agent');
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

    it('should use fallback permissions when none found in database', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock empty permissions from database
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({ jti: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockSessionCleanupService.enforceSessionLimit.mockResolvedValue(undefined);

      mockJwtService.sign.mockReturnValueOnce('access_token');
      mockJwtService.sign.mockReturnValueOnce('refresh_token');

      const result = await service.login(mockLoginDto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken', 'access_token');

      // Verify JWT was signed with fallback permissions
      const jwtSignCall = mockJwtService.sign.mock.calls[0][0];
      expect(jwtSignCall.permissions).toBeDefined();
      expect(jwtSignCall.permissions.length).toBeGreaterThan(0);
    });

    it('should load permissions from database when available', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock permissions from database
      const dbPermissions = [
        { permission: Permission.USERS_READ },
        { permission: Permission.USERS_WRITE },
      ];
      mockPrismaService.rolePermission.findMany.mockResolvedValue(dbPermissions);

      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({ jti: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockSessionCleanupService.enforceSessionLimit.mockResolvedValue(undefined);

      mockJwtService.sign.mockReturnValueOnce('access_token');
      mockJwtService.sign.mockReturnValueOnce('refresh_token');

      const result = await service.login(mockLoginDto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken', 'access_token');

      // Verify JWT was signed with database permissions
      const jwtSignCall = mockJwtService.sign.mock.calls[0][0];
      expect(jwtSignCall.permissions).toEqual([Permission.USERS_READ, Permission.USERS_WRITE]);
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
      mockPrismaService.session.create.mockResolvedValue({ jti: 'new-session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockSessionCleanupService.checkRefreshRateLimit.mockResolvedValue({ allowed: true });

      mockJwtService.sign.mockReturnValueOnce('new_access_token');
      mockJwtService.sign.mockReturnValueOnce('new_refresh_token');

      const result = await service.refreshTokens(mockRefreshToken);

      expect(result).toHaveProperty('accessToken', 'new_access_token');
      expect(result).toHaveProperty('refreshToken', 'new_refresh_token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockRefreshToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('should use fallback permissions when refreshing with empty database permissions', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);

      // Mock empty permissions from database
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.session.create.mockResolvedValue({ jti: 'new-session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockSessionCleanupService.checkRefreshRateLimit.mockResolvedValue({ allowed: true });

      mockJwtService.sign.mockReturnValueOnce('new_access_token');
      mockJwtService.sign.mockReturnValueOnce('new_refresh_token');

      const result = await service.refreshTokens(mockRefreshToken);

      expect(result).toHaveProperty('accessToken', 'new_access_token');

      // Verify JWT was signed with fallback permissions
      const jwtSignCall = mockJwtService.sign.mock.calls[0][0];
      expect(jwtSignCall.permissions).toBeDefined();
      expect(jwtSignCall.permissions.length).toBeGreaterThan(0);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(InvalidTokenException);
    });

    it('should throw UnauthorizedException for used refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        isUsed: true,
      });
      mockSessionCleanupService.revokeAllUserSessions.mockResolvedValue(undefined);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(InvalidTokenException);
    });

    it('should throw UnauthorizedException for revoked refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        isRevoked: true,
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(TokenRevokedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(InvalidTokenException);
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
      mockSessionCleanupService.checkRefreshRateLimit.mockResolvedValue({ allowed: true });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        AccountDisabledException,
      );
    });

    it('should use default permissions when no permissions found during refresh', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]); // Empty permissions
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.session.create.mockResolvedValue({ jti: 'new-session-jti' });
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'new-refresh-id',
        token: 'new_refresh_token',
      });
      mockSessionCleanupService.checkRefreshRateLimit.mockResolvedValue({ allowed: true });

      mockJwtService.sign
        .mockReturnValueOnce('new_access_token')
        .mockReturnValueOnce('new_refresh_token');

      const result = await service.refreshTokens(mockRefreshToken);

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });

      // Check that default permissions were used in JWT payload
      const jwtPayloadCall = mockJwtService.sign.mock.calls[0][0];
      expect(jwtPayloadCall.permissions).toEqual(DefaultRolePermissions[UserRole.ADMIN]);
    });
  });

  describe('logout', () => {
    it('should invalidate session and refresh tokens', async () => {
      const sessionId = 'session-123';

      mockPrismaService.session.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.session.findUnique.mockResolvedValue({ jti: sessionId, userId: '123' });

      await service.logout(sessionId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
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

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      const userId = '123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPermissions = [{ permission: Permission.USERS_READ }];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getCurrentUser(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        roles: ['ADMIN'],
        permissions: [Permission.USERS_READ], // Using mocked permissions from database
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('123')).rejects.toThrow(InvalidTokenException);
    });
  });
});
