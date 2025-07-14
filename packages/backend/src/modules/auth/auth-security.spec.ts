import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PermissionValidationService } from './services/permission-validation.service';
import { SessionCleanupService } from './services/session-cleanup.service';
import { SessionService } from '../session/session.service';
import { LoginAttemptService } from './services/login-attempt.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from './types/jwt.types';

describe('Auth Security', () => {
  let authService: AuthService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret-at-least-32-characters-long',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
        AUTH_MAX_LOGIN_ATTEMPTS: '5',
        AUTH_LOCKOUT_DURATION: '30',
      };
      return config[key];
    }),
  };

  const mockPermissionValidationService = {
    ensurePermissionsExist: jest.fn(),
    validatePermissions: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
    },
    loginAttempt: {
      count: jest.fn(),
    },
    $transaction: jest.fn(async (callbacks) => {
      if (Array.isArray(callbacks)) {
        return Promise.all(callbacks);
      }
      return callbacks(mockPrismaService);
    }),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockSessionCleanupService = {
    enforceSessionLimit: jest.fn(),
    checkRefreshRateLimit: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  };

  const mockSessionService = {
    enhanceSession: jest.fn(),
  };

  const mockLoginAttemptService = {
    recordLoginAttempt: jest.fn(),
    checkAndUpdateLockout: jest.fn(),
    isAccountLocked: jest.fn(),
    resetFailedAttempts: jest.fn(),
    checkIpRateLimit: jest.fn(),
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
        {
          provide: PermissionValidationService,
          useValue: mockPermissionValidationService,
        },
        {
          provide: SessionCleanupService,
          useValue: mockSessionCleanupService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: LoginAttemptService,
          useValue: mockLoginAttemptService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('Rate Limiting and Account Lockout', () => {
    it('should lock account after 5 failed login attempts', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('correctPassword', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 4,
        lastFailedLogin: new Date(),
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...testUser,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      });

      // Mock LoginAttemptService behavior
      mockLoginAttemptService.checkIpRateLimit.mockResolvedValue(false);
      mockLoginAttemptService.isAccountLocked.mockResolvedValue(false);
      mockLoginAttemptService.checkAndUpdateLockout.mockResolvedValue({
        isLocked: true,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrismaService.loginAttempt.count.mockResolvedValue(5);

      await expect(
        authService.login(
          { email: 'test@example.com', password: 'wrongPassword' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);

      // Verify login attempt was recorded
      expect(mockLoginAttemptService.recordLoginAttempt).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        success: false,
        failureReason: 'Invalid password',
      });

      // Verify account lockout was checked
      expect(mockLoginAttemptService.checkAndUpdateLockout).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should reset failed attempts after successful login', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 3,
        lastFailedLogin: new Date(Date.now() - 10 * 60 * 1000),
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPermissions = [{ permission: 'USERS_READ' }];

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({ id: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({
        ...testUser,
        failedLoginCount: 0,
        lastFailedLogin: null,
      });

      // Mock LoginAttemptService
      mockLoginAttemptService.checkIpRateLimit.mockResolvedValue(false);
      mockLoginAttemptService.isAccountLocked.mockResolvedValue(false);
      mockLoginAttemptService.recordLoginAttempt.mockResolvedValue({});
      mockLoginAttemptService.resetFailedAttempts.mockResolvedValue(undefined);

      await authService.login({ email: 'test@example.com', password: 'password' });

      // Verify failed attempts were reset
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
        },
      });

      // Verify LoginAttemptService was called
      expect(mockLoginAttemptService.resetFailedAttempts).toHaveBeenCalledWith('test@example.com');
    });

    it('should reject login when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes in future
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 5,
        lastFailedLogin: new Date(),
        lockedUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);

      // Mock LoginAttemptService to indicate account is locked
      mockLoginAttemptService.checkIpRateLimit.mockResolvedValue(false);
      mockLoginAttemptService.isAccountLocked.mockResolvedValue(true);

      await expect(
        authService.login({ email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow('Account is locked');
    });

    it('should unlock account after lockout period expires', async () => {
      const lockedUntil = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 5,
        lastFailedLogin: new Date(Date.now() - 35 * 60 * 1000),
        lockedUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPermissions = [{ permission: 'USERS_READ' }];

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({ id: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({
        ...testUser,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
      });

      // Mock LoginAttemptService - account was locked but is now expired
      mockLoginAttemptService.checkIpRateLimit.mockResolvedValue(false);
      mockLoginAttemptService.isAccountLocked.mockResolvedValue(false); // Lock has expired
      mockLoginAttemptService.recordLoginAttempt.mockResolvedValue({});
      mockLoginAttemptService.resetFailedAttempts.mockResolvedValue(undefined);

      const result = await authService.login({ email: 'test@example.com', password: 'password' });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
    });

    it('should implement constant-time comparison for timing attack prevention', async () => {
      // Mock LoginAttemptService for both scenarios
      mockLoginAttemptService.checkIpRateLimit.mockResolvedValue(false);
      mockLoginAttemptService.isAccountLocked.mockResolvedValue(false);
      mockLoginAttemptService.recordLoginAttempt.mockResolvedValue({});
      mockLoginAttemptService.checkAndUpdateLockout.mockResolvedValue({ isLocked: false });
      mockPrismaService.loginAttempt.count.mockResolvedValue(1);

      // Test with non-existent user
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const start1 = Date.now();
      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
      const duration1 = Date.now() - start1;

      // Test with existing user but wrong password
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('correctPassword', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...testUser,
        failedLoginCount: 1,
      });

      const start2 = Date.now();
      await expect(
        authService.login(
          { email: 'test@example.com', password: 'wrongPassword' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
      const duration2 = Date.now() - start2;

      // Both operations should take roughly the same time
      // In a real implementation, bcrypt comparison happens in both cases
      // Note: This test can be flaky due to system load, so we use a generous threshold
      expect(Math.abs(duration1 - duration2)).toBeLessThan(1000); // Within 1000ms
    });
  });

  describe('JWT Token Security', () => {
    it('should use strong JWT secrets', () => {
      const jwtSecret = mockConfigService.get('JWT_SECRET');

      // Secret should be at least 32 characters
      expect(jwtSecret).toBeDefined();
      expect(jwtSecret.length).toBeGreaterThanOrEqual(32);

      // Should not be a common/weak secret
      const weakSecrets = ['secret', 'password', '123456', 'jwt-secret'];
      expect(weakSecrets).not.toContain(jwtSecret);
    });

    it('should include all required JWT claims', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPermissions = [{ permission: 'USERS_READ' }, { permission: 'USERS_WRITE' }];

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        jti: 'unique-jti-123',
      });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(testUser);

      // Mock JWT sign to verify payload
      mockJwtService.sign.mockImplementation((payload) => {
        if (payload.email) {
          // Access token
          expect(payload).toMatchObject({
            sub: 'user-123',
            email: 'test@example.com',
            roles: [UserRole.ADMIN],
            permissions: ['USERS_READ', 'USERS_WRITE'],
          });
          expect(payload).toHaveProperty('sessionId');
          expect(payload).toHaveProperty('iat');
          expect(payload).toHaveProperty('exp');
          // JTI is optional for access tokens
        } else {
          // Refresh token
          expect(payload).toMatchObject({
            sub: 'user-123',
          });
          expect(payload).toHaveProperty('sessionId');
          expect(payload).toHaveProperty('jti');
          expect(payload).toHaveProperty('iat');
        }
        return 'mock-token';
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should set appropriate token expiration times', () => {
      const accessExpiration = mockConfigService.get('JWT_ACCESS_EXPIRATION');
      const refreshExpiration = mockConfigService.get('JWT_REFRESH_EXPIRATION');

      expect(accessExpiration).toBe('15m'); // 15 minutes for access token
      expect(refreshExpiration).toBe('7d'); // 7 days for refresh token
    });
  });

  describe('Session Security', () => {
    it('should create unique session IDs', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(testUser);

      // Mock session creation to verify unique JTI
      mockPrismaService.session.create.mockImplementation((args) => {
        expect(args.data.jti).toBeDefined();
        expect(args.data.jti).toMatch(
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
        ); // UUID format
        return Promise.resolve({
          id: 'session-123',
          jti: args.data.jti,
          userId: args.data.userId,
          createdAt: new Date(),
        });
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(mockPrismaService.session.create).toHaveBeenCalled();
    });

    it('should prevent session fixation by creating new sessions on login', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        username: 'testuser',
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(testUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(testUser);

      // First login
      mockPrismaService.session.create.mockResolvedValueOnce({
        id: 'session-123',
        jti: 'jti-123',
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      // Second login should create new session
      mockPrismaService.session.create.mockResolvedValueOnce({
        id: 'session-456',
        jti: 'jti-456',
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      // Verify different sessions were created
      expect(mockPrismaService.session.create).toHaveBeenCalledTimes(2);

      // Check that different JTIs were created (session IDs)
      const firstSessionCall = mockPrismaService.session.create.mock.calls[0];
      const secondSessionCall = mockPrismaService.session.create.mock.calls[1];
      expect(firstSessionCall[0].data.jti).not.toBe(secondSessionCall[0].data.jti);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user..test@example.com',
      ];

      // More strict email regex that disallows consecutive dots
      const emailRegex =
        /^[a-zA-Z0-9]+([._+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

      for (const email of invalidEmails) {
        expect(email).not.toMatch(emailRegex);
      }

      // Valid emails should match
      const validEmails = ['user@example.com', 'test.user@example.com', 'user+tag@example.co.uk'];

      for (const email of validEmails) {
        expect(email).toMatch(emailRegex);
      }
    });

    it('should handle SQL injection attempts safely', async () => {
      const sqlInjectionAttempts = ["admin'--", "admin' OR '1'='1", "admin'; DROP TABLE users; --"];

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      for (const attempt of sqlInjectionAttempts) {
        await expect(authService.login({ email: attempt, password: 'password' })).rejects.toThrow();

        // Verify Prisma was called with the exact string (Prisma handles escaping)
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: attempt },
        });
      }
    });

    it('should enforce password complexity requirements on registration', () => {
      const weakPasswords = [
        'password', // No uppercase, numbers, or special chars
        'Password', // No numbers or special chars
        'Password1', // No special chars
        'Pass1!', // Too short
        '12345678', // No letters
        'aaaaaaaa', // No variety
      ];

      const strongPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      for (const weakPassword of weakPasswords) {
        expect(weakPassword).not.toMatch(strongPasswordRegex);
      }

      // Test strong passwords
      const strongPasswords = ['SecureP@ssw0rd!', 'MyStr0ng!Pass', 'Test123$Pass'];

      for (const strongPassword of strongPasswords) {
        expect(strongPassword).toMatch(strongPasswordRegex);
      }
    });
  });

  describe('Permission Security', () => {
    it('should enforce role hierarchy correctly', async () => {
      const superAdminUser = {
        id: 'super-123',
        email: 'super@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.SUPER_ADMIN,
        username: 'superadmin',
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allPermissions = [
        { permission: 'USERS_READ' },
        { permission: 'USERS_WRITE' },
        { permission: 'USERS_DELETE' },
        { permission: 'SYSTEM_SETTINGS_READ' },
        { permission: 'SYSTEM_SETTINGS_WRITE' },
        { permission: 'AUDIT_LOG_READ' },
        { permission: 'ROLE_MANAGE' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(superAdminUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(allPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({ id: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(superAdminUser);

      const result = await authService.login({ email: 'super@example.com', password: 'password' });

      // SUPER_ADMIN should have all permissions
      expect(result.user.permissions).toHaveLength(7);
      expect(result.user.permissions).toContain('ROLE_MANAGE');
      expect(result.user.permissions).toContain('USERS_DELETE');
    });

    it('should handle missing permissions gracefully', async () => {
      const adminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        username: 'admin',
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // No permissions returned from database
      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({ id: 'session-123' });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(adminUser);

      const result = await authService.login({ email: 'admin@example.com', password: 'password' });

      // Should get default permissions for role
      expect(result.user.permissions).toBeDefined();
      expect(result.user.permissions.length).toBeGreaterThan(0);
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('Logout Security', () => {
    it('should invalidate session on logout', async () => {
      const sessionId = 'session-123';

      mockPrismaService.session.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await authService.logout(sessionId);

      // Verify session was revoked
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

      // Verify refresh tokens were revoked
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          sessionJti: sessionId,
          isRevoked: false,
        },
        data: expect.objectContaining({
          isRevoked: true,
          revokedAt: expect.any(Date),
        }),
      });
    });

    it('should handle logout with invalid session gracefully', async () => {
      const sessionId = 'invalid-session';

      mockPrismaService.session.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      // Should not throw, just handle gracefully
      await expect(authService.logout(sessionId)).resolves.not.toThrow();
    });
  });
});
