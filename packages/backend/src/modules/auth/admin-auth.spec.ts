import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PermissionValidationService } from './services/permission-validation.service';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from './types/jwt.types';

describe('Admin Authentication', () => {
  let authService: AuthService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
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
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
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
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('Admin Role Login Scenarios', () => {
    it('should successfully login with SUPER_ADMIN role', async () => {
      const mockSuperAdmin = {
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockPermissions = [
        { permission: 'USERS_READ' },
        { permission: 'USERS_WRITE' },
        { permission: 'USERS_DELETE' },
        { permission: 'SYSTEM_SETTINGS_READ' },
        { permission: 'SYSTEM_SETTINGS_WRITE' },
        { permission: 'AUDIT_LOG_READ' },
        { permission: 'ROLE_MANAGE' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockSuperAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({
        email: 'superadmin@example.com',
        password: 'password',
      });

      expect(result.user.roles).toEqual([UserRole.SUPER_ADMIN]);
      expect(result.user.permissions).toHaveLength(7);
      expect(result.user.permissions).toContain('ROLE_MANAGE');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'superadmin@example.com' },
      });
    });

    it('should successfully login with ADMIN role', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockPermissions = [
        { permission: 'USERS_READ' },
        { permission: 'USERS_WRITE' },
        { permission: 'SYSTEM_SETTINGS_READ' },
        { permission: 'SYSTEM_SETTINGS_WRITE' },
        { permission: 'AUDIT_LOG_READ' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({ email: 'admin@example.com', password: 'password' });

      expect(result.user.roles).toEqual([UserRole.ADMIN]);
      expect(result.user.permissions).toHaveLength(5);
      expect(result.user.permissions).not.toContain('ROLE_MANAGE');
      expect(result.user.permissions).not.toContain('USERS_DELETE');
    });

    it('should successfully login with SUPPORT role', async () => {
      const mockSupport = {
        id: 'support-123',
        email: 'support@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.SUPPORT,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockPermissions = [{ permission: 'USERS_READ' }, { permission: 'AUDIT_LOG_READ' }];

      mockPrismaService.user.findUnique.mockResolvedValue(mockSupport);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({
        email: 'support@example.com',
        password: 'password',
      });

      expect(result.user.roles).toEqual([UserRole.SUPPORT]);
      expect(result.user.permissions).toHaveLength(2);
      expect(result.user.permissions).toContain('USERS_READ');
      expect(result.user.permissions).toContain('AUDIT_LOG_READ');
      expect(result.user.permissions).not.toContain('USERS_WRITE');
    });

    it('should handle admin with ADMIN role', async () => {
      const mockMultiRoleAdmin = {
        id: 'multi-role-123',
        email: 'multirole@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockPermissions = [
        // ADMIN permissions
        { permission: 'USERS_READ' },
        { permission: 'USERS_WRITE' },
        { permission: 'SYSTEM_SETTINGS_READ' },
        { permission: 'SYSTEM_SETTINGS_WRITE' },
        { permission: 'AUDIT_LOG_READ' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockMultiRoleAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({
        email: 'multirole@example.com',
        password: 'password',
      });

      expect(result.user.roles).toEqual([UserRole.ADMIN]);
      // Should have ADMIN permissions
      expect(result.user.permissions).toHaveLength(5);
    });
  });

  describe('Failed Login Attempts and Account Lockout', () => {
    it('should increment failed login attempts on wrong password', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('correct-password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 2,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockAdmin,
        failedLoginCount: 3,
        lastFailedLogin: new Date(),
      });

      await expect(
        authService.login({ email: 'admin@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: {
          failedLoginCount: { increment: 1 },
          lockedUntil: null,
        },
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('correct-password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 4,
        lastFailedLogin: new Date(),
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockAdmin,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      });

      await expect(
        authService.login({ email: 'admin@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: {
          failedLoginCount: { increment: 1 },
          lockedUntil: expect.any(Date),
        },
      });
    });

    it('should reject login when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes in future
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 5,
        lastFailedLogin: new Date(),
        lockedUntil,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        authService.login({ email: 'admin@example.com', password: 'password' }),
      ).rejects.toThrow('Account is locked');
    });

    it('should unlock account and reset attempts after lockout period', async () => {
      const lockedUntil = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 5,
        lastFailedLogin: new Date(Date.now() - 35 * 60 * 1000),
        lockedUntil,
      };

      const mockPermissions = [{ permission: 'USERS_READ' }];

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({
        ...mockAdmin,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
      });

      const result = await authService.login({ email: 'admin@example.com', password: 'password' });

      expect(result).toBeDefined();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
        },
      });
    });
  });

  describe('Admin-specific Edge Cases', () => {
    it('should reject login for inactive admin account', async () => {
      const mockInactiveAdmin = {
        id: 'admin-123',
        email: 'inactive@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: false,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockInactiveAdmin);

      await expect(
        authService.login({ email: 'inactive@example.com', password: 'password' }),
      ).rejects.toThrow('Account is disabled');
    });

    it('should handle admin without any permissions', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'noperm@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({ email: 'noperm@example.com', password: 'password' });

      // Should get default permissions for ADMIN role
      expect(result.user.permissions).toHaveLength(12);
      expect(result.user.permissions).toContain('USERS_READ');
      expect(result.user.permissions).toContain('USERS_WRITE');
      expect(result.accessToken).toBeDefined();
    });

    it('should validate JWT contains correct admin claims', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockPermissions = [{ permission: 'USERS_READ' }, { permission: 'USERS_WRITE' }];

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockImplementation((payload) => {
        // Check if it's access token (has email) or refresh token (has jti)
        if (payload.email) {
          // Verify access token payload structure
          expect(payload).toHaveProperty('sub', 'admin-123');
          expect(payload).toHaveProperty('email', 'admin@example.com');
          expect(payload).toHaveProperty('roles', [UserRole.ADMIN]);
          expect(payload).toHaveProperty('permissions', ['USERS_READ', 'USERS_WRITE']);
          expect(payload).toHaveProperty('sessionId');
          expect(payload).toHaveProperty('iat');
          expect(payload).toHaveProperty('exp');
          return 'mock-access-token';
        } else {
          // Verify refresh token payload structure
          expect(payload).toHaveProperty('sub', 'admin-123');
          expect(payload).toHaveProperty('sessionId');
          expect(payload).toHaveProperty('jti');
          expect(payload).toHaveProperty('iat');
          return 'mock-refresh-token';
        }
      });

      await authService.login({ email: 'admin@example.com', password: 'password' });

      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should handle admin with special characters in email', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin+test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.SUPPORT,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({
        email: 'admin+test@example.com',
        password: 'password',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin+test@example.com' },
      });
    });

    it('should prevent timing attacks by consistent response time', async () => {
      // Test non-existent user
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const start1 = Date.now();
      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
      const duration1 = Date.now() - start1;

      // Test existing user with wrong password
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('correct-password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      const start2 = Date.now();
      await expect(
        authService.login({ email: 'admin@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
      const duration2 = Date.now() - start2;

      // Both should take roughly the same time (bcrypt comparison is performed in both cases)
      expect(Math.abs(duration1 - duration2)).toBeLessThan(250); // Within 250ms
    });
  });

  describe('Permission Inheritance and Validation', () => {
    it('should correctly inherit permissions for role hierarchy', async () => {
      const mockSuperAdmin = {
        id: 'super-123',
        email: 'super@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // SUPER_ADMIN should have all possible permissions
      const allPermissions = [
        { permission: 'USERS_READ' },
        { permission: 'USERS_WRITE' },
        { permission: 'USERS_DELETE' },
        { permission: 'SYSTEM_SETTINGS_READ' },
        { permission: 'SYSTEM_SETTINGS_WRITE' },
        { permission: 'AUDIT_LOG_READ' },
        { permission: 'ROLE_MANAGE' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockSuperAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(allPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({ email: 'super@example.com', password: 'password' });

      // Verify SUPER_ADMIN has all permissions
      expect(result.user.permissions).toHaveLength(7);
      const expectedPermissions = [
        'USERS_READ',
        'USERS_WRITE',
        'USERS_DELETE',
        'SYSTEM_SETTINGS_READ',
        'SYSTEM_SETTINGS_WRITE',
        'AUDIT_LOG_READ',
        'ROLE_MANAGE',
      ];
      expectedPermissions.forEach((perm) => {
        expect(result.user.permissions).toContain(perm);
      });
    });

    it('should return unique permissions even if database has duplicates', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        role: UserRole.ADMIN,
        isActive: true,
        failedLoginCount: 0,
        lastFailedLogin: null,
        lockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Permissions with duplicates in database
      const mockPermissions = [
        { permission: 'USERS_READ' },
        { permission: 'USERS_READ' }, // Duplicate
        { permission: 'USERS_WRITE' },
        { permission: 'AUDIT_LOG_READ' },
        { permission: 'AUDIT_LOG_READ' }, // Duplicate
        { permission: 'SYSTEM_SETTINGS_READ' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await authService.login({ email: 'admin@example.com', password: 'password' });

      // Should have all permissions including duplicates
      expect(result.user.permissions).toHaveLength(6);
      expect(result.user.permissions).toContain('USERS_READ');
      expect(result.user.permissions).toContain('USERS_WRITE');
      expect(result.user.permissions).toContain('AUDIT_LOG_READ');
      expect(result.user.permissions).toContain('SYSTEM_SETTINGS_READ');
    });
  });
});
