import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole, Permission } from './types/jwt.types';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
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
    const validLoginDto = {
      email: 'admin@bluelight-hub.com',
      password: 'SecurePassword123!',
      rememberMe: false,
    };

    it('should successfully login with valid credentials', async () => {
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(validLoginDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: '1',
        email: 'admin@bluelight-hub.com',
        roles: [UserRole.ADMIN],
        isActive: true,
        isMfaEnabled: false,
      });
      expect(result.user.permissions).toContain(Permission.USERS_READ);
      expect(result.user.permissions).toContain(Permission.USERS_WRITE);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const invalidLoginDto = {
        email: 'wrong@example.com',
        password: 'SecurePassword123!',
      };

      await expect(service.login(invalidLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const invalidLoginDto = {
        email: 'admin@bluelight-hub.com',
        password: 'WrongPassword!',
      };

      await expect(service.login(invalidLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should generate different session IDs for each login', async () => {
      mockJwtService.sign.mockReturnValue('token');

      await service.login(validLoginDto);
      await service.login(validLoginDto);

      const payload1 = mockJwtService.sign.mock.calls[0][0];
      const payload2 = mockJwtService.sign.mock.calls[2][0];

      expect(payload1.sessionId).toBeDefined();
      expect(payload2.sessionId).toBeDefined();
      expect(payload1.sessionId).not.toBe(payload2.sessionId);
    });
  });

  describe('refreshTokens', () => {
    const validRefreshToken = 'valid-refresh-token';
    const mockPayload = {
      sub: '1',
      sessionId: 'session-123',
      jti: 'jti-123',
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 604800,
    };

    it('should successfully refresh tokens with valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshTokens(validRefreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        validRefreshToken,
        { secret: 'test-refresh-secret' },
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.refreshTokens('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should generate new session ID on refresh', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockJwtService.sign.mockReturnValue('token');

      await service.refreshTokens(validRefreshToken);

      const newAccessTokenPayload = mockJwtService.sign.mock.calls[0][0];
      expect(newAccessTokenPayload.sessionId).toBeDefined();
      expect(newAccessTokenPayload.sessionId).not.toBe(mockPayload.sessionId);
    });
  });

  describe('logout', () => {
    it('should accept session ID for logout', async () => {
      await expect(
        service.logout('session-123'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getPermissionsForRoles', () => {
    it('should return correct permissions for SUPER_ADMIN', () => {
      const service = new AuthService(
        {} as JwtService,
        {} as ConfigService,
      );
      const permissions = service['getPermissionsForRoles']([UserRole.SUPER_ADMIN]);
      
      expect(permissions).toContain(Permission.USERS_READ);
      expect(permissions).toContain(Permission.USERS_WRITE);
      expect(permissions).toContain(Permission.USERS_DELETE);
      expect(permissions).toContain(Permission.SYSTEM_CONFIG);
      expect(permissions.length).toBe(Object.values(Permission).length);
    });

    it('should return correct permissions for ADMIN', () => {
      const service = new AuthService(
        {} as JwtService,
        {} as ConfigService,
      );
      const permissions = service['getPermissionsForRoles']([UserRole.ADMIN]);
      
      expect(permissions).toContain(Permission.USERS_READ);
      expect(permissions).toContain(Permission.USERS_WRITE);
      expect(permissions).not.toContain(Permission.USERS_DELETE);
      expect(permissions).not.toContain(Permission.SYSTEM_CONFIG);
    });

    it('should return correct permissions for MODERATOR', () => {
      const service = new AuthService(
        {} as JwtService,
        {} as ConfigService,
      );
      const permissions = service['getPermissionsForRoles']([UserRole.MODERATOR]);
      
      expect(permissions).toContain(Permission.USERS_READ);
      expect(permissions).toContain(Permission.CONTENT_READ);
      expect(permissions).not.toContain(Permission.USERS_WRITE);
      expect(permissions).not.toContain(Permission.ORGS_WRITE);
    });

    it('should return correct permissions for USER', () => {
      const service = new AuthService(
        {} as JwtService,
        {} as ConfigService,
      );
      const permissions = service['getPermissionsForRoles']([UserRole.USER]);
      
      expect(permissions).toEqual([Permission.CONTENT_READ]);
    });

    it('should combine permissions for multiple roles', () => {
      const service = new AuthService(
        {} as JwtService,
        {} as ConfigService,
      );
      const permissions = service['getPermissionsForRoles']([
        UserRole.USER,
        UserRole.MODERATOR,
      ]);
      
      expect(permissions).toContain(Permission.CONTENT_READ);
      expect(permissions).toContain(Permission.USERS_READ);
      expect(permissions).toContain(Permission.CONTENT_WRITE);
      expect(permissions).toContain(Permission.ANALYTICS_READ);
    });

    it('should handle empty roles array', () => {
      const service = new AuthService(
        {} as JwtService,
        {} as ConfigService,
      );
      const permissions = service['getPermissionsForRoles']([]);
      
      expect(permissions).toEqual([]);
    });
  });
});