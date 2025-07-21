import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorHandlingService } from '../../../common/services/error-handling.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EinsatzService } from '../../einsatz/einsatz.service';
import { DatabaseCheckService } from '../database-check.service';
import { SeedService } from '../seed.service';
import * as bcrypt from 'bcrypt';
import { RuleStatus } from '@prisma/generated/prisma/enums';
import { getRulesForPreset } from '../../auth/constants';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$mocked_hash'),
}));

// Mock auth constants
jest.mock('../../auth/constants', () => ({
  DefaultRolePermissions: {
    USER: ['VIEW_EINSATZ'],
    ADMIN: ['VIEW_EINSATZ', 'MANAGE_EINSATZ'],
  },
  getRulesForPreset: jest.fn(),
}));

describe('SeedService', () => {
  let service: SeedService;
  let prismaService: jest.Mocked<PrismaService>;
  let _configService: jest.Mocked<ConfigService>;
  let _databaseCheckService: jest.Mocked<DatabaseCheckService>;
  let einsatzService: jest.Mocked<EinsatzService>;
  let errorHandlingService: jest.Mocked<ErrorHandlingService>;

  const mockEinsatz = {
    id: 'test-id',
    name: 'test-name',
    beschreibung: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (fn) => await fn(mockPrismaService)),
      $queryRaw: jest.fn().mockResolvedValue([mockEinsatz]),
      einsatz: {
        count: jest.fn() as jest.Mock,
        findFirst: jest.fn() as jest.Mock,
      },
    } as any;

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockDatabaseCheckService = {
      checkConnection: jest.fn(),
    };

    const mockEinsatzService = {
      create: jest.fn().mockResolvedValue(mockEinsatz),
    };

    const mockErrorHandlingService = {
      executeWithErrorHandling: jest.fn().mockImplementation(async (fn) => await fn()),
      validateOperation: jest.fn(),
      getConfig: jest.fn().mockReturnValue({ operationTimeout: 30000 }),
      getDuplicateDetectionStats: jest.fn().mockReturnValue({}),
      getMetrics: jest.fn().mockReturnValue({}),
      cleanup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DatabaseCheckService,
          useValue: mockDatabaseCheckService,
        },
        {
          provide: EinsatzService,
          useValue: mockEinsatzService,
        },
        {
          provide: ErrorHandlingService,
          useValue: mockErrorHandlingService,
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
    prismaService = module.get(PrismaService);
    _configService = module.get(ConfigService);
    _databaseCheckService = module.get(DatabaseCheckService);
    einsatzService = module.get(EinsatzService);
    errorHandlingService = module.get(ErrorHandlingService);

    // Silence logger during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have logger instance', () => {
      expect(service['logger']).toBeDefined();
    });
  });

  describe('executeWithTransaction', () => {
    it('should execute seed function successfully', async () => {
      const mockSeedFunction = jest.fn().mockResolvedValue('success');
      errorHandlingService.executeWithErrorHandling.mockResolvedValue('success');
      prismaService.$transaction.mockResolvedValue('success');

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(true);
      expect(errorHandlingService.executeWithErrorHandling).toHaveBeenCalledTimes(1);
    });

    it('should handle unique constraint violation (23505)', async () => {
      const mockSeedFunction = jest.fn();
      const uniqueError = { code: '23505' };
      errorHandlingService.executeWithErrorHandling.mockRejectedValue(uniqueError);

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(false);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Seed-Prozess abgebrochen: Datensatz existiert bereits',
      );
    });

    it('should handle P2002 constraint violation', async () => {
      const mockSeedFunction = jest.fn();
      const uniqueError = { code: 'P2002' };
      errorHandlingService.executeWithErrorHandling.mockRejectedValue(uniqueError);

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(false);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Seed-Prozess abgebrochen: Datensatz existiert bereits',
      );
    });

    it('should handle generic errors', async () => {
      const mockSeedFunction = jest.fn();
      const genericError = new Error('Generic error');
      errorHandlingService.executeWithErrorHandling.mockRejectedValue(genericError);

      const result = await service.executeWithTransaction(mockSeedFunction);

      expect(result).toBe(false);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Seed-Prozess nach allen Wiederholungsversuchen fehlgeschlagen:',
        genericError,
      );
    });

    it('should pass correct transaction options', async () => {
      const mockSeedFunction = jest.fn().mockResolvedValue('success');
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        // Execute the inner function that contains the transaction call
        return await fn();
      });

      await service.executeWithTransaction(mockSeedFunction);

      expect(prismaService.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        timeout: 30000,
        isolationLevel: 'Serializable',
      });
    });
  });

  describe('seedInitialEinsatz', () => {
    it('should skip seeding when einsatz already exists', async () => {
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(1);

      const result = await service.seedInitialEinsatz('Test Einsatz');

      expect(result).toBeNull();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Einsätze bereits vorhanden, überspringe Seed',
      );
      expect(einsatzService.create).not.toHaveBeenCalled();
    });

    it('should create initial einsatz when none exists', async () => {
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      const createdEinsatz = { ...mockEinsatz, name: 'Test Einsatz' };
      einsatzService.create.mockResolvedValue(createdEinsatz);
      (prismaService.einsatz.findFirst as jest.Mock).mockResolvedValue(createdEinsatz);
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.seedInitialEinsatz('Test Einsatz', 'Test beschreibung');

      expect(prismaService.einsatz.count).toHaveBeenCalled();
      expect(einsatzService.create).toHaveBeenCalledWith({
        name: 'Test Einsatz',
        beschreibung: 'Test beschreibung',
      });
      expect(result).toEqual(createdEinsatz);
    });

    it('should handle failure during einsatz creation', async () => {
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      const error = new Error('Creation failed');
      errorHandlingService.executeWithErrorHandling.mockRejectedValue(error);

      const result = await service.seedInitialEinsatz('Test Einsatz');

      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Fehler beim Erstellen des initialen Einsatzes',
      );
    });
  });

  describe('createEinsatzWithRetry', () => {
    it('should return null if any einsatz already exists', async () => {
      // Es gibt bereits einen Einsatz in der Datenbank
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(1);
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.createEinsatzWithRetry('Neuer Einsatz');

      expect(result).toBeNull();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Es existiert bereits ein Einsatz, Seeding wird übersprungen',
      );
      expect(einsatzService.create).not.toHaveBeenCalled();
      expect(prismaService.einsatz.findFirst).not.toHaveBeenCalled();
    });

    it('should return existing einsatz if already exists with same name', async () => {
      const existingEinsatz = { ...mockEinsatz, name: 'Existing Einsatz' };
      // Kein Einsatz existiert
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      (prismaService.einsatz.findFirst as jest.Mock).mockResolvedValue(existingEinsatz);
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.createEinsatzWithRetry('Existing Einsatz');

      expect(result).toEqual(existingEinsatz);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Einsatz "Existing Einsatz" existiert bereits, verwende existierenden',
      );
      expect(einsatzService.create).not.toHaveBeenCalled();
    });

    it('should create new einsatz if none exists', async () => {
      const newEinsatz = { ...mockEinsatz, name: 'New Einsatz' };
      // Keine Einsätze existieren
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      (prismaService.einsatz.findFirst as jest.Mock).mockResolvedValue(null);
      einsatzService.create.mockResolvedValue(newEinsatz);
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.createEinsatzWithRetry('New Einsatz', 'Description');

      expect(errorHandlingService.validateOperation).toHaveBeenCalledWith(
        { name: 'New Einsatz', beschreibung: 'Description' },
        'create-einsatz',
      );
      expect(einsatzService.create).toHaveBeenCalledWith({
        name: 'New Einsatz',
        beschreibung: 'Description',
      });
      expect(result).toEqual(newEinsatz);
    });

    it('should handle unique constraint violation and return existing einsatz', async () => {
      const existingEinsatz = { ...mockEinsatz, name: 'Test Einsatz' };
      // Keine Einsätze existieren beim ersten Check
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      (prismaService.einsatz.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // First check: not found
        .mockResolvedValueOnce(existingEinsatz); // After error: found

      const uniqueError = { code: '23505' };
      einsatzService.create.mockRejectedValue(uniqueError);

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.createEinsatzWithRetry('Test Einsatz');

      expect(result).toEqual(existingEinsatz);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Einsatz "Test Einsatz" wurde parallel erstellt, verwende existierenden',
      );
    });

    it('should handle P2002 constraint violation and return existing einsatz', async () => {
      const existingEinsatz = { ...mockEinsatz, name: 'Test Einsatz' };
      // Keine Einsätze existieren beim ersten Check
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      (prismaService.einsatz.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingEinsatz);

      const uniqueError = { code: 'P2002' };
      einsatzService.create.mockRejectedValue(uniqueError);

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.createEinsatzWithRetry('Test Einsatz');

      expect(result).toEqual(existingEinsatz);
    });

    it('should rethrow non-unique constraint errors', async () => {
      // Keine Einsätze existieren
      (prismaService.einsatz.count as jest.Mock).mockResolvedValue(0);
      (prismaService.einsatz.findFirst as jest.Mock).mockResolvedValue(null);
      const genericError = new Error('Generic error');
      einsatzService.create.mockRejectedValue(genericError);

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      await expect(service.createEinsatzWithRetry('Test Einsatz')).rejects.toThrow('Generic error');
    });
  });

  describe('createEinsatzWithUpsert', () => {
    it('should create einsatz using upsert query', async () => {
      const upsertResult = { ...mockEinsatz, name: 'Upsert Einsatz' };
      prismaService.$queryRaw.mockResolvedValue([upsertResult]);
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.createEinsatzWithUpsert('Upsert Einsatz', 'Description');

      expect(errorHandlingService.validateOperation).toHaveBeenCalledWith(
        { name: 'Upsert Einsatz', beschreibung: 'Description' },
        'create-einsatz',
      );
      expect(prismaService.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual(upsertResult);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Einsatz upserted: Upsert Einsatz (ID: test-id)',
      );
    });

    it('should handle single result from upsert', async () => {
      const upsertResult = { ...mockEinsatz, name: 'Single Einsatz' };
      prismaService.$queryRaw.mockResolvedValue(upsertResult);
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());

      const result = await service.createEinsatzWithUpsert('Single Einsatz');

      expect(result).toEqual(upsertResult);
    });
  });

  describe('Utility Methods', () => {
    it('should return duplicate detection stats', () => {
      const mockStats: any = { size: 5, oldestEntry: 1000, newestEntry: 2000 };
      errorHandlingService.getDuplicateDetectionStats.mockReturnValue(mockStats);

      const result = service.getDuplicateDetectionStats();

      expect(result).toEqual(mockStats);
      expect(errorHandlingService.getDuplicateDetectionStats).toHaveBeenCalled();
    });

    it('should return error metrics', () => {
      const mockMetrics: any = {
        retryableErrors: 2,
        nonRetryableErrors: 1,
        totalErrors: 3,
        duplicateOperations: 1,
        averageRetryAttempts: 2.5,
      };
      errorHandlingService.getMetrics.mockReturnValue(mockMetrics);

      const result = service.getErrorMetrics();

      expect(result).toEqual(mockMetrics);
      expect(errorHandlingService.getMetrics).toHaveBeenCalled();
    });

    it('should return config', () => {
      const mockConfig: any = {
        operationTimeout: 30000,
        retryConfig: {
          maxRetries: 3,
          baseDelay: 1000,
        },
        duplicateDetectionConfig: {
          enabled: true,
        },
        verboseErrorReporting: false,
        strictValidation: true,
      };
      errorHandlingService.getConfig.mockReturnValue(mockConfig);

      const result = service.getConfig();

      expect(result).toEqual(mockConfig);
      expect(errorHandlingService.getConfig).toHaveBeenCalled();
    });

    it('should cleanup resources', () => {
      service.cleanup();

      expect(errorHandlingService.cleanup).toHaveBeenCalled();
    });
  });

  describe('seedRolePermissions', () => {
    beforeEach(() => {
      // Setup mock for rolePermission
      (prismaService as any).rolePermission = {
        upsert: jest.fn(),
        count: jest.fn(),
      };
    });

    it('should seed role permissions successfully', async () => {
      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => await fn());
      prismaService.$transaction.mockImplementation(async (fn) => await fn(prismaService));
      (prismaService as any).rolePermission.upsert.mockResolvedValue({});
      (prismaService as any).rolePermission.count.mockResolvedValue(50);

      const result = await service.seedRolePermissions();

      expect(result).toBe(true);
      expect((prismaService as any).rolePermission.upsert).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Rollen-Berechtigungen erfolgreich erstellt'),
      );
    });

    it('should handle errors during permission seeding', async () => {
      const error = new Error('Permission error');
      errorHandlingService.executeWithErrorHandling.mockRejectedValue(error);

      const result = await service.seedRolePermissions();

      expect(result).toBe(false);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Seed-Prozess nach allen Wiederholungsversuchen fehlgeschlagen:',
        error,
      );
    });
  });

  describe('seedUsers', () => {
    beforeEach(() => {
      // Setup mock for user
      (prismaService as any).user = {
        upsert: jest.fn(),
        count: jest.fn(),
      };
    });

    it('should seed users successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'test',
        role: 'ADMIN',
      };

      prismaService.$transaction.mockImplementation(async (fn) => await fn(prismaService));
      (prismaService as any).user.upsert.mockResolvedValue(mockUser);
      (prismaService as any).user.count.mockResolvedValue(4);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.seedUsers('testpassword');

      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 10);
      expect((prismaService as any).user.upsert).toHaveBeenCalledTimes(4); // 4 users
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Benutzer erfolgreich erstellt'),
      );
    });

    it('should handle errors during user seeding', async () => {
      const error = new Error('User creation error');
      prismaService.$transaction.mockRejectedValue(error);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.seedUsers();

      expect(result).toBe(false);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Fehler beim Erstellen der Benutzer:',
        error,
      );
    });

    it('should use default password if not provided', async () => {
      prismaService.$transaction.mockImplementation(async (fn) => await fn(prismaService));
      (prismaService as any).user.upsert.mockResolvedValue({});
      (prismaService as any).user.count.mockResolvedValue(4);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      await service.seedUsers();

      expect(bcrypt.hash).toHaveBeenCalledWith('admin123', 10);
      expect((prismaService as any).user.upsert).toHaveBeenCalled();
    });
  });

  describe('seedAuthentication', () => {
    it('should complete authentication seeding successfully', async () => {
      // Mock successful seedRolePermissions
      jest.spyOn(service, 'seedRolePermissions').mockResolvedValue(true);
      // Mock successful seedUsers
      jest.spyOn(service, 'seedUsers').mockResolvedValue(true);

      const result = await service.seedAuthentication('testpass');

      expect(result).toBe(true);
      expect(service.seedRolePermissions).toHaveBeenCalled();
      expect(service.seedUsers).toHaveBeenCalledWith('testpass');
      expect(Logger.prototype.log).toHaveBeenCalledWith('Authentication-Seeding abgeschlossen');
    });

    it('should fail if role permissions seeding fails', async () => {
      jest.spyOn(service, 'seedRolePermissions').mockResolvedValue(false);
      jest.spyOn(service, 'seedUsers').mockResolvedValue(true);

      const result = await service.seedAuthentication();

      expect(result).toBe(false);
      expect(service.seedRolePermissions).toHaveBeenCalled();
      expect(service.seedUsers).not.toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Fehler beim Seeden der Rollen-Berechtigungen',
      );
    });

    it('should continue if user seeding fails', async () => {
      jest.spyOn(service, 'seedRolePermissions').mockResolvedValue(true);
      jest.spyOn(service, 'seedUsers').mockResolvedValue(false);

      const result = await service.seedAuthentication();

      expect(result).toBe(true);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Benutzer wurden nicht erstellt (existieren bereits oder Fehler)',
      );
    });
  });

  describe('seedThreatDetectionRules', () => {
    beforeEach(() => {
      // Setup mock for threatDetectionRule
      (prismaService as any).threatDetectionRule = {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      };
    });

    const mockRules = [
      {
        id: 'rule-1',
        name: 'Test Rule 1',
        description: 'Test description 1',
        version: '1.0.0',
        status: RuleStatus.ACTIVE,
        severity: 'HIGH',
        conditionType: 'THRESHOLD',
        config: { threshold: 5 },
        tags: ['test'],
      },
      {
        id: 'rule-2',
        name: 'Test Rule 2',
        description: 'Test description 2',
        version: '1.0.0',
        status: RuleStatus.ACTIVE,
        severity: 'MEDIUM',
        conditionType: 'PATTERN',
        config: { patterns: ['test'] },
        tags: ['test'],
      },
    ];

    it('should import rules successfully', async () => {
      (getRulesForPreset as jest.Mock).mockReturnValue(mockRules);
      (prismaService as any).threatDetectionRule.findUnique.mockResolvedValue(null);
      (prismaService as any).threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: true,
        skipExisting: true,
      });

      expect(getRulesForPreset).toHaveBeenCalledWith('standard');
      expect((prismaService as any).threatDetectionRule.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        imported: 2,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1' }),
          expect.objectContaining({ id: 'rule-2' }),
        ]),
      });
    });

    it('should handle dry run mode', async () => {
      (getRulesForPreset as jest.Mock).mockReturnValue(mockRules);
      (prismaService as any).threatDetectionRule.findUnique
        .mockResolvedValueOnce({ id: 'rule-1' })
        .mockResolvedValueOnce(null);

      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        dryRun: true,
        activate: true,
        skipExisting: true,
      });

      expect((prismaService as any).threatDetectionRule.create).not.toHaveBeenCalled();
      expect((prismaService as any).threatDetectionRule.update).not.toHaveBeenCalled();
      expect((prismaService as any).threatDetectionRule.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        wouldImport: 1,
        wouldUpdate: 0,
        wouldSkip: 1,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1', wouldBe: 'skipped' }),
          expect.objectContaining({ id: 'rule-2', wouldBe: 'imported' }),
        ]),
      });
    });

    it('should reset and import all rules when reset is true', async () => {
      (getRulesForPreset as jest.Mock).mockReturnValue(mockRules);
      (prismaService as any).threatDetectionRule.deleteMany.mockResolvedValue({ count: 5 });
      (prismaService as any).threatDetectionRule.findUnique.mockResolvedValue(null);
      (prismaService as any).threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        reset: true,
        activate: true,
        skipExisting: true,
      });

      expect((prismaService as any).threatDetectionRule.deleteMany).toHaveBeenCalled();
      expect((prismaService as any).threatDetectionRule.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        imported: 2,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1' }),
          expect.objectContaining({ id: 'rule-2' }),
        ]),
      });
    });

    it('should update existing rules when skipExisting is false', async () => {
      (getRulesForPreset as jest.Mock).mockReturnValue(mockRules);
      (prismaService as any).threatDetectionRule.findUnique
        .mockResolvedValueOnce({ id: 'rule-1' })
        .mockResolvedValueOnce(null);
      (prismaService as any).threatDetectionRule.update.mockImplementation((data) =>
        Promise.resolve(data.data),
      );
      (prismaService as any).threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: true,
        skipExisting: false,
      });

      expect((prismaService as any).threatDetectionRule.update).toHaveBeenCalledTimes(1);
      expect((prismaService as any).threatDetectionRule.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        imported: 1,
        updated: 1,
        skipped: 0,
        errors: 0,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1' }),
          expect.objectContaining({ id: 'rule-2' }),
        ]),
      });
    });

    it('should handle errors during rule import', async () => {
      (getRulesForPreset as jest.Mock).mockReturnValue(mockRules);
      (prismaService as any).threatDetectionRule.findUnique.mockResolvedValue(null);
      (prismaService as any).threatDetectionRule.create
        .mockRejectedValueOnce(new Error('Create failed'))
        .mockImplementation((data) => Promise.resolve(data.data));

      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: true,
        skipExisting: true,
      });

      expect(result).toEqual({
        imported: 1,
        updated: 0,
        skipped: 0,
        errors: 1,
        rules: [expect.objectContaining({ id: 'rule-2' })],
      });
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should use inactive status when activate is false', async () => {
      (getRulesForPreset as jest.Mock).mockReturnValue(mockRules);
      (prismaService as any).threatDetectionRule.findUnique.mockResolvedValue(null);
      (prismaService as any).threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: false,
        skipExisting: true,
      });

      expect((prismaService as any).threatDetectionRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: RuleStatus.INACTIVE,
        }),
      });
    });

    it('should handle general errors during seeding', async () => {
      const error = new Error('General seeding error');
      (getRulesForPreset as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        service.seedThreatDetectionRules({
          preset: 'standard',
          activate: true,
          skipExisting: true,
        }),
      ).rejects.toThrow('General seeding error');
    });
  });

  describe('Legacy methods', () => {
    it('should call seedRolePermissions from seedAdminRolePermissions', async () => {
      jest.spyOn(service, 'seedRolePermissions').mockResolvedValue(true);

      const result = await service.seedAdminRolePermissions();

      expect(result).toBe(true);
      expect(service.seedRolePermissions).toHaveBeenCalled();
    });

    it('should call seedUsers from seedAdminUsers', async () => {
      jest.spyOn(service, 'seedUsers').mockResolvedValue(true);

      const result = await service.seedAdminUsers('password');

      expect(result).toBe(true);
      expect(service.seedUsers).toHaveBeenCalledWith('password');
    });

    it('should call seedUsers from seedAdminUsers with default password', async () => {
      jest.spyOn(service, 'seedUsers').mockResolvedValue(true);

      const result = await service.seedAdminUsers();

      expect(result).toBe(true);
      expect(service.seedUsers).toHaveBeenCalledWith('admin123');
    });

    it('should call seedAuthentication from seedAdminAuthentication', async () => {
      jest.spyOn(service, 'seedAuthentication').mockResolvedValue(true);

      const result = await service.seedAdminAuthentication('password');

      expect(result).toBe(true);
      expect(service.seedAuthentication).toHaveBeenCalledWith('password');
    });
  });
});
