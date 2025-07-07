import { Test, TestingModule } from '@nestjs/testing';
import { SeedService } from './seed.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DatabaseCheckService } from './database-check.service';
import { EinsatzService } from '@/modules/einsatz/einsatz.service';
import { ErrorHandlingService } from '@/common/services/error-handling.service';
// import { UserRole, Permission } from '@prisma/generated/prisma/enums';
import { DefaultRolePermissions } from '@/modules/auth/constants';
import * as bcrypt from 'bcrypt';
// Remove unused import

jest.mock('bcrypt');

describe('SeedService', () => {
  let service: SeedService;
  let prismaService: PrismaService;
  let _configService: ConfigService;
  let _databaseCheckService: DatabaseCheckService;
  let einsatzService: EinsatzService;
  let errorHandlingService: ErrorHandlingService;

  const mockPrismaTransaction = jest.fn();
  const mockPrismaQueryRaw = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: mockPrismaTransaction,
            $queryRaw: mockPrismaQueryRaw,
            einsatz: {
              count: jest.fn(),
              findFirst: jest.fn(),
            },
            rolePermission: {
              upsert: jest.fn(),
              count: jest.fn(),
            },
            user: {
              upsert: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: DatabaseCheckService,
          useValue: {
            checkConnection: jest.fn(),
          },
        },
        {
          provide: EinsatzService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: ErrorHandlingService,
          useValue: {
            executeWithErrorHandling: jest.fn(),
            getConfig: jest.fn().mockReturnValue({
              operationTimeout: 30000,
            }),
            validateOperation: jest.fn(),
            getDuplicateDetectionStats: jest.fn(),
            getMetrics: jest.fn(),
            cleanup: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
    prismaService = module.get<PrismaService>(PrismaService);
    _configService = module.get<ConfigService>(ConfigService);
    _databaseCheckService = module.get<DatabaseCheckService>(DatabaseCheckService);
    einsatzService = module.get<EinsatzService>(EinsatzService);
    errorHandlingService = module.get<ErrorHandlingService>(ErrorHandlingService);

    jest.clearAllMocks();
  });

  describe('executeWithTransaction', () => {
    it('should execute seed function successfully within transaction', async () => {
      const mockSeedFunction = jest.fn().mockResolvedValue('success');

      mockPrismaTransaction.mockImplementation(async (fn) => {
        return await fn();
      });

      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockImplementation(
        async (fn) => await fn(),
      );

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(true);
      expect(errorHandlingService.executeWithErrorHandling).toHaveBeenCalled();
      expect(mockPrismaTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          timeout: 30000,
          isolationLevel: 'Serializable',
        }),
      );
    });

    it('should handle unique constraint violations gracefully', async () => {
      const mockSeedFunction = jest.fn();
      const uniqueConstraintError = new Error('Unique constraint violation');
      (uniqueConstraintError as any).code = '23505';

      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockRejectedValue(
        uniqueConstraintError,
      );

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(false);
    });

    it('should handle Prisma unique constraint violations', async () => {
      const mockSeedFunction = jest.fn();
      const prismaUniqueError = new Error('Unique constraint failed');
      (prismaUniqueError as any).code = 'P2002';

      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockRejectedValue(
        prismaUniqueError,
      );

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(false);
    });

    it('should handle general errors and return false', async () => {
      const mockSeedFunction = jest.fn();
      const generalError = new Error('General error');

      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockRejectedValue(generalError);

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(false);
    });
  });

  describe('seedInitialEinsatz', () => {
    it('should skip seeding if einsätze already exist', async () => {
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(1);

      const result = await service.seedInitialEinsatz('Test Einsatz');

      expect(result).toBeNull();
      expect(einsatzService.create).not.toHaveBeenCalled();
    });

    it('should create initial einsatz when none exist', async () => {
      const mockEinsatz = {
        id: '1',
        name: 'Test Einsatz',
        beschreibung: 'Test Beschreibung',
      };

      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      mockPrismaTransaction.mockImplementation(async (fn) => await fn());
      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockImplementation(
        async (fn) => await fn(),
      );
      (einsatzService.create as jest.Mock).mockResolvedValue(mockEinsatz);
      (prismaService.einsatz.findFirst as jest.Mock).mockResolvedValue(mockEinsatz);

      const result = await service.seedInitialEinsatz('Test Einsatz', 'Test Beschreibung');

      expect(result).toEqual(mockEinsatz);
      expect(einsatzService.create).toHaveBeenCalledWith({
        name: 'Test Einsatz',
        beschreibung: 'Test Beschreibung',
      });
      expect(prismaService.einsatz.findFirst).toHaveBeenCalledWith({
        where: { name: 'Test Einsatz' },
      });
    });
  });

  describe('seedRolePermissions', () => {
    it('should create role permissions for all roles', async () => {
      mockPrismaTransaction.mockImplementation(async (fn) => await fn());
      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockImplementation(
        async (fn) => await fn(),
      );
      (prismaService.rolePermission.upsert as jest.Mock).mockResolvedValue({});
      (prismaService.rolePermission.count as jest.Mock)
        .mockResolvedValueOnce(50) // total permissions
        .mockResolvedValueOnce(20) // SUPER_ADMIN
        .mockResolvedValueOnce(15) // ADMIN
        .mockResolvedValueOnce(10) // SUPPORT
        .mockResolvedValueOnce(5); // USER

      const result = await service.seedRolePermissions();

      expect(result).toBe(true);

      // Verify upsert was called for each permission
      let expectedCallCount = 0;
      for (const permissions of Object.values(DefaultRolePermissions)) {
        expectedCallCount += permissions.length;
      }
      expect(prismaService.rolePermission.upsert).toHaveBeenCalledTimes(expectedCallCount);

      // Verify count was called for verification
      expect(prismaService.rolePermission.count).toHaveBeenCalledTimes(5);
    });

    it('should handle errors during permission seeding', async () => {
      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.seedRolePermissions();

      expect(result).toBe(false);
    });
  });

  describe('seedUsers', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
    });

    it('should create all default users', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'test',
      };

      mockPrismaTransaction.mockImplementation(
        async (fn) =>
          await fn({
            user: {
              upsert: jest.fn().mockResolvedValue(mockUser),
            },
          }),
      );
      (prismaService.user.count as jest.Mock).mockResolvedValue(4);

      const result = await service.seedUsers('testPassword');

      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('testPassword', 10);
      expect(prismaService.user.count).toHaveBeenCalled();
    });

    it('should use default password if none provided', async () => {
      mockPrismaTransaction.mockImplementation(
        async (fn) =>
          await fn({
            user: {
              upsert: jest.fn().mockResolvedValue({}),
            },
          }),
      );
      (prismaService.user.count as jest.Mock).mockResolvedValue(4);

      await service.seedUsers();

      expect(bcrypt.hash).toHaveBeenCalledWith('admin123', 10);
    });

    it('should handle errors during user creation', async () => {
      mockPrismaTransaction.mockRejectedValue(new Error('Database error'));

      const result = await service.seedUsers();

      expect(result).toBe(false);
    });
  });

  describe('seedAuthentication', () => {
    it('should seed both role permissions and users', async () => {
      // Mock successful role permissions seeding
      mockPrismaTransaction.mockImplementation(async (fn) => await fn());
      (errorHandlingService.executeWithErrorHandling as jest.Mock).mockImplementation(
        async (fn) => await fn(),
      );
      (prismaService.rolePermission.upsert as jest.Mock).mockResolvedValue({});
      (prismaService.rolePermission.count as jest.Mock).mockResolvedValue(10);

      // Mock successful user seeding
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.user.count as jest.Mock).mockResolvedValue(4);

      jest.spyOn(service, 'seedRolePermissions').mockResolvedValue(true);
      jest.spyOn(service, 'seedUsers').mockResolvedValue(true);

      const result = await service.seedAuthentication();

      expect(result).toBe(true);
      expect(service.seedRolePermissions).toHaveBeenCalled();
      expect(service.seedUsers).toHaveBeenCalled();
    });

    it('should return false if role permissions seeding fails', async () => {
      jest.spyOn(service, 'seedRolePermissions').mockResolvedValue(false);
      jest.spyOn(service, 'seedUsers').mockResolvedValue(true);

      const result = await service.seedAuthentication();

      expect(result).toBe(false);
      expect(service.seedUsers).not.toHaveBeenCalled();
    });
  });

  // Remove upsertEinsatz tests as this method is private

  describe('utility methods', () => {
    it('should return duplicate detection stats', () => {
      const mockStats = { hits: 10, misses: 5 };
      (errorHandlingService.getDuplicateDetectionStats as jest.Mock).mockReturnValue(mockStats);

      const result = service.getDuplicateDetectionStats();

      expect(result).toEqual(mockStats);
    });

    it('should return error metrics', () => {
      const mockMetrics = { errors: 2, successes: 10 };
      (errorHandlingService.getMetrics as jest.Mock).mockReturnValue(mockMetrics);

      const result = service.getErrorMetrics();

      expect(result).toEqual(mockMetrics);
    });

    it('should return configuration', () => {
      const mockConfig = { timeout: 5000 };
      (errorHandlingService.getConfig as jest.Mock).mockReturnValue(mockConfig);

      const result = service.getConfig();

      expect(result).toEqual(mockConfig);
    });

    it('should cleanup resources', () => {
      service.cleanup();

      expect(errorHandlingService.cleanup).toHaveBeenCalled();
    });
  });
});
