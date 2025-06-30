import { Test, TestingModule } from '@nestjs/testing';
import { PermissionValidationService } from './permission-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Permission, UserRole } from '../types/jwt.types';
import { DefaultRolePermissions } from '../constants';

describe('PermissionValidationService', () => {
  let service: PermissionValidationService;

  const mockPrismaService = {
    rolePermission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionValidationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionValidationService>(PermissionValidationService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validatePermissions', () => {
    it('should return valid report when permissions match', async () => {
      // Mock database permissions that match the defaults
      const dbPermissions = [];
      for (const [role, permissions] of Object.entries(DefaultRolePermissions)) {
        for (const permission of permissions) {
          dbPermissions.push({
            role: role as UserRole,
            permission: permission as Permission,
          });
        }
      }

      mockPrismaService.rolePermission.findMany.mockResolvedValue(dbPermissions);

      const report = await service.validatePermissions();

      expect(report.isValid).toBe(true);
      expect(report.missingInDatabase).toHaveLength(0);
      expect(report.extraInDatabase).toHaveLength(0);
    });

    it('should detect missing permissions in database', async () => {
      // Mock database with missing ADMIN permissions
      const dbPermissions = [];
      for (const [role, permissions] of Object.entries(DefaultRolePermissions)) {
        if (role !== UserRole.ADMIN) {
          for (const permission of permissions) {
            dbPermissions.push({
              role: role as UserRole,
              permission: permission as Permission,
            });
          }
        }
      }

      mockPrismaService.rolePermission.findMany.mockResolvedValue(dbPermissions);

      const report = await service.validatePermissions();

      expect(report.isValid).toBe(false);
      expect(report.missingInDatabase.length).toBeGreaterThan(0);
      expect(report.missingInDatabase.some((m) => m.role === UserRole.ADMIN)).toBe(true);
    });

    it('should detect extra permissions in database', async () => {
      // Mock database with all defaults plus extra permissions
      const dbPermissions = [];
      for (const [role, permissions] of Object.entries(DefaultRolePermissions)) {
        for (const permission of permissions) {
          dbPermissions.push({
            role: role as UserRole,
            permission: permission as Permission,
          });
        }
      }

      // Add extra permission that shouldn't be there
      dbPermissions.push({
        role: UserRole.USER,
        permission: Permission.USERS_DELETE, // USER shouldn't have this
      });

      mockPrismaService.rolePermission.findMany.mockResolvedValue(dbPermissions);

      const report = await service.validatePermissions();

      expect(report.isValid).toBe(false);
      expect(report.extraInDatabase).toHaveLength(1);
      expect(report.extraInDatabase[0]).toEqual({
        role: UserRole.USER,
        permission: Permission.USERS_DELETE,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.rolePermission.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const report = await service.validatePermissions();

      expect(report.isValid).toBe(false);
      expect(report.error).toBe('Database connection failed');
    });
  });

  describe('syncPermissionsToDatabase', () => {
    it('should add missing permissions to database', async () => {
      // Mock that some permissions don't exist
      mockPrismaService.rolePermission.findUnique
        .mockResolvedValueOnce(null) // First permission doesn't exist
        .mockResolvedValueOnce({ id: '1' }) // Second permission exists
        .mockResolvedValueOnce(null); // Third permission doesn't exist

      mockPrismaService.rolePermission.create.mockResolvedValue({ id: 'new' });

      // Run sync for a subset to keep test manageable
      const addedCount = await service.syncPermissionsToDatabase();

      expect(mockPrismaService.rolePermission.create).toHaveBeenCalled();
      expect(addedCount).toBeGreaterThan(0);
    });

    it('should not add permissions that already exist', async () => {
      // Mock that all permissions exist
      mockPrismaService.rolePermission.findUnique.mockResolvedValue({ id: 'exists' });

      const addedCount = await service.syncPermissionsToDatabase();

      expect(mockPrismaService.rolePermission.create).not.toHaveBeenCalled();
      expect(addedCount).toBe(0);
    });

    it('should handle creation errors', async () => {
      mockPrismaService.rolePermission.findUnique.mockResolvedValue(null);
      mockPrismaService.rolePermission.create.mockRejectedValue(
        new Error('Unique constraint violated'),
      );

      await expect(service.syncPermissionsToDatabase()).rejects.toThrow(
        'Unique constraint violated',
      );
    });
  });

  describe('getPermissionReport', () => {
    it('should generate detailed permission report', async () => {
      const mockDbPermissions = [
        {
          id: '1',
          role: UserRole.ADMIN,
          permission: Permission.USERS_READ,
          grantedBy: 'system',
          grantedAt: new Date('2024-01-01'),
          grantedByUser: { email: 'admin@example.com' },
        },
        {
          id: '2',
          role: UserRole.ADMIN,
          permission: Permission.USERS_WRITE,
          grantedBy: null,
          grantedAt: new Date('2024-01-02'),
          grantedByUser: null,
        },
        {
          id: '3',
          role: UserRole.USER,
          permission: Permission.ETB_READ,
          grantedBy: 'system',
          grantedAt: new Date('2024-01-03'),
          grantedByUser: null,
        },
      ];

      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockDbPermissions);

      const report = await service.getPermissionReport();

      expect(report.totalPermissions).toBe(3);
      expect(report.roles[UserRole.ADMIN]).toBeDefined();
      expect(report.roles[UserRole.ADMIN].count).toBe(2);
      expect(report.roles[UserRole.ADMIN].permissions).toHaveLength(2);
      expect(report.roles[UserRole.USER]).toBeDefined();
      expect(report.roles[UserRole.USER].count).toBe(1);
    });

    it('should handle empty permission set', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      const report = await service.getPermissionReport();

      expect(report.totalPermissions).toBe(0);
      expect(Object.keys(report.roles)).toHaveLength(0);
    });
  });

  describe('onModuleInit', () => {
    it('should validate permissions on module initialization', async () => {
      const validateSpy = jest.spyOn(service, 'validatePermissions').mockResolvedValue({
        isValid: true,
        missingInDatabase: [],
        extraInDatabase: [],
        roleMismatches: [],
        timestamp: new Date(),
      });

      await service.onModuleInit();

      expect(validateSpy).toHaveBeenCalled();
    });
  });
});
