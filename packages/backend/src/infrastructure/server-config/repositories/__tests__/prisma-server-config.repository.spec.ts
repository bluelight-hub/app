/**
 * Unit Tests für PrismaServerConfigRepository (Infrastructure Layer).
 *
 * Diese Tests validieren die Singleton-Repository-Implementierung:
 * - getOrCreate() erstellt Konfiguration mit Defaults oder gibt existierende zurück
 * - update() aktualisiert partielle Felder korrekt
 * - isInsecureMode() gibt korrekten Boolean zurück
 * - hasMigrated() prüft ob migratedAt gesetzt ist
 * - Transaction-Support für atomare Operationen
 * - Error Handling bei Datenbankfehlern
 *
 * Story 4.6 | AC 1, 3, 5
 */

import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaServerConfigRepository } from '../prisma-server-config.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';

describe('PrismaServerConfigRepository', () => {
  let repository: PrismaServerConfigRepository;
  let prismaService: jest.Mocked<PrismaService>;
  let mockLogger: jest.Mocked<ILogger>;

  // Mock data
  const mockConfigDefault = {
    id: 'singleton',
    insecureMode: true,
    migratedAt: null,
    createdAt: new Date('2024-11-26T10:00:00.000Z'),
    updatedAt: new Date('2024-11-26T10:00:00.000Z'),
  };

  const mockConfigSecure = {
    id: 'singleton',
    insecureMode: false,
    migratedAt: new Date('2024-11-26T12:00:00.000Z'),
    createdAt: new Date('2024-11-26T10:00:00.000Z'),
    updatedAt: new Date('2024-11-26T12:00:00.000Z'),
  };

  beforeEach(async () => {
    // Given: Reset mocks before each test
    jest.clearAllMocks();

    // Create mocks
    const mockPrismaService = {
      serverConfig: {
        upsert: jest.fn().mockResolvedValue(mockConfigDefault),
        findUnique: jest.fn().mockResolvedValue(mockConfigDefault),
        update: jest.fn().mockResolvedValue(mockConfigDefault),
      },
    };

    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaServerConfigRepository, { provide: PrismaService, useValue: mockPrismaService }, { provide: LOGGER, useValue: mockLogger }],
    }).compile();

    repository = module.get<PrismaServerConfigRepository>(PrismaServerConfigRepository);
    prismaService = module.get(PrismaService);
  });

  // ===== getOrCreate() TESTS =====

  describe('getOrCreate()', () => {
    it('should create config with default values when not exists', async () => {
      // Given: No config exists (upsert will create)
      (prismaService.serverConfig.upsert as jest.Mock).mockResolvedValue(mockConfigDefault);

      // When: getOrCreate is called
      const result = await repository.getOrCreate();

      // Then: Config is created with defaults
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockConfigDefault);
      expect(prismaService.serverConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          insecureMode: true,
          migratedAt: null,
        },
        update: {},
      });
    });

    it('should return existing config when already exists', async () => {
      // Given: Config already exists with secure mode
      (prismaService.serverConfig.upsert as jest.Mock).mockResolvedValue(mockConfigSecure);

      // When: getOrCreate is called
      const result = await repository.getOrCreate();

      // Then: Existing config is returned
      expect(result.isSuccess).toBe(true);
      expect(result.value!.insecureMode).toBe(false);
      expect(result.value!.migratedAt).toEqual(new Date('2024-11-26T12:00:00.000Z'));
    });

    it('should use provided transaction client', async () => {
      // Given: Transaction client is provided
      const txUpsert = jest.fn().mockResolvedValue(mockConfigDefault);
      const mockTx = {
        serverConfig: { upsert: txUpsert },
      };

      // When: getOrCreate is called with transaction
      const result = await repository.getOrCreate(mockTx as never);

      // Then: Transaction client is used instead of PrismaService
      expect(result.isSuccess).toBe(true);
      expect(txUpsert).toHaveBeenCalled();
      expect(prismaService.serverConfig.upsert).not.toHaveBeenCalled();
    });

    it('should return failure on database error', async () => {
      // Given: Database throws error
      (prismaService.serverConfig.upsert as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      // When: getOrCreate is called
      const result = await repository.getOrCreate();

      // Then: Failure result is returned with error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
      expect(result.error).toContain('Connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions gracefully', async () => {
      // Given: Database throws string error
      (prismaService.serverConfig.upsert as jest.Mock).mockRejectedValue('Unknown error');

      // When: getOrCreate is called
      const result = await repository.getOrCreate();

      // Then: Failure result contains stringified error
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unknown error');
    });
  });

  // ===== update() TESTS =====

  describe('update()', () => {
    it('should update insecureMode to false', async () => {
      // Given: Update to secure mode
      const updatedConfig = { ...mockConfigDefault, insecureMode: false };
      (prismaService.serverConfig.update as jest.Mock).mockResolvedValue(updatedConfig);

      // When: update is called with insecureMode = false
      const result = await repository.update({ insecureMode: false });

      // Then: Config is updated correctly
      expect(result.isSuccess).toBe(true);
      expect(result.value!.insecureMode).toBe(false);
      expect(prismaService.serverConfig.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { insecureMode: false },
      });
    });

    it('should update migratedAt timestamp', async () => {
      // Given: Set migration timestamp
      const migratedAt = new Date('2024-11-26T12:00:00.000Z');
      const updatedConfig = { ...mockConfigDefault, migratedAt };
      (prismaService.serverConfig.update as jest.Mock).mockResolvedValue(updatedConfig);

      // When: update is called with migratedAt
      const result = await repository.update({ migratedAt });

      // Then: MigratedAt is set correctly
      expect(result.isSuccess).toBe(true);
      expect(result.value!.migratedAt).toEqual(migratedAt);
      expect(prismaService.serverConfig.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { migratedAt },
      });
    });

    it('should update both insecureMode and migratedAt simultaneously', async () => {
      // Given: Full migration update
      const migratedAt = new Date('2024-11-26T12:00:00.000Z');
      (prismaService.serverConfig.update as jest.Mock).mockResolvedValue(mockConfigSecure);

      // When: update is called with both fields
      const result = await repository.update({
        insecureMode: false,
        migratedAt,
      });

      // Then: Both fields are updated
      expect(result.isSuccess).toBe(true);
      expect(prismaService.serverConfig.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: {
          insecureMode: false,
          migratedAt,
        },
      });
    });

    it('should handle empty update gracefully', async () => {
      // Given: Empty update data
      (prismaService.serverConfig.update as jest.Mock).mockResolvedValue(mockConfigDefault);

      // When: update is called with empty object
      const result = await repository.update({});

      // Then: Update succeeds with empty data object
      expect(result.isSuccess).toBe(true);
      expect(prismaService.serverConfig.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: {},
      });
    });

    it('should use provided transaction client', async () => {
      // Given: Transaction client is provided
      const txUpdate = jest.fn().mockResolvedValue(mockConfigSecure);
      const mockTx = {
        serverConfig: { update: txUpdate },
      };

      // When: update is called with transaction
      const result = await repository.update({ insecureMode: false }, mockTx as never);

      // Then: Transaction client is used
      expect(result.isSuccess).toBe(true);
      expect(txUpdate).toHaveBeenCalled();
      expect(prismaService.serverConfig.update).not.toHaveBeenCalled();
    });

    it('should return failure on database error', async () => {
      // Given: Database throws error
      (prismaService.serverConfig.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      // When: update is called
      const result = await repository.update({ insecureMode: false });

      // Then: Failure result is returned
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log successful update', async () => {
      // Given: Update succeeds
      (prismaService.serverConfig.update as jest.Mock).mockResolvedValue(mockConfigSecure);

      // When: update is called
      await repository.update({ insecureMode: false });

      // Then: Success is logged
      expect(mockLogger.log).toHaveBeenCalledWith('ServerConfig updated', expect.any(Object));
    });
  });

  // ===== isInsecureMode() TESTS =====

  describe('isInsecureMode()', () => {
    it('should return true when insecureMode is true', async () => {
      // Given: Config exists with insecureMode = true
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({ insecureMode: true });

      // When: isInsecureMode is called
      const result = await repository.isInsecureMode();

      // Then: Returns true
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false when insecureMode is false', async () => {
      // Given: Config exists with insecureMode = false
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({ insecureMode: false });

      // When: isInsecureMode is called
      const result = await repository.isInsecureMode();

      // Then: Returns false
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should create config with defaults when not exists and return true', async () => {
      // Given: Config does not exist
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.serverConfig.upsert as jest.Mock).mockResolvedValue(mockConfigDefault);

      // When: isInsecureMode is called
      const result = await repository.isInsecureMode();

      // Then: Config is created and insecureMode defaults to true
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
      expect(prismaService.serverConfig.upsert).toHaveBeenCalled();
    });

    it('should use optimized query selecting only insecureMode', async () => {
      // Given: Config exists
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({ insecureMode: true });

      // When: isInsecureMode is called
      await repository.isInsecureMode();

      // Then: Query selects only insecureMode field
      expect(prismaService.serverConfig.findUnique).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        select: { insecureMode: true },
      });
    });

    it('should return failure on database error', async () => {
      // Given: Database throws error
      (prismaService.serverConfig.findUnique as jest.Mock).mockRejectedValue(new Error('Query failed'));

      // When: isInsecureMode is called
      const result = await repository.isInsecureMode();

      // Then: Failure result is returned
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });
  });

  // ===== hasMigrated() TESTS =====

  describe('hasMigrated()', () => {
    it('should return false when migratedAt is null', async () => {
      // Given: Config exists without migration
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({ migratedAt: null });

      // When: hasMigrated is called
      const result = await repository.hasMigrated();

      // Then: Returns false
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should return true when migratedAt is set', async () => {
      // Given: Config exists with migration timestamp
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({
        migratedAt: new Date('2024-11-26T12:00:00.000Z'),
      });

      // When: hasMigrated is called
      const result = await repository.hasMigrated();

      // Then: Returns true
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should create config with defaults when not exists and return false', async () => {
      // Given: Config does not exist
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.serverConfig.upsert as jest.Mock).mockResolvedValue(mockConfigDefault);

      // When: hasMigrated is called
      const result = await repository.hasMigrated();

      // Then: Config is created and migratedAt defaults to null (false)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
      expect(prismaService.serverConfig.upsert).toHaveBeenCalled();
    });

    it('should use optimized query selecting only migratedAt', async () => {
      // Given: Config exists
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({ migratedAt: null });

      // When: hasMigrated is called
      await repository.hasMigrated();

      // Then: Query selects only migratedAt field
      expect(prismaService.serverConfig.findUnique).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        select: { migratedAt: true },
      });
    });

    it('should return failure on database error', async () => {
      // Given: Database throws error
      (prismaService.serverConfig.findUnique as jest.Mock).mockRejectedValue(new Error('Query failed'));

      // When: hasMigrated is called
      const result = await repository.hasMigrated();

      // Then: Failure result is returned
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });
  });

  // ===== Transaction Support Tests =====

  describe('Transaction Support', () => {
    it('should use PrismaService when no transaction provided for getOrCreate', async () => {
      // Given: No transaction provided

      // When: getOrCreate is called without transaction
      await repository.getOrCreate();

      // Then: PrismaService is used
      expect(prismaService.serverConfig.upsert).toHaveBeenCalled();
    });

    it('should use PrismaService when no transaction provided for update', async () => {
      // Given: No transaction provided
      (prismaService.serverConfig.update as jest.Mock).mockResolvedValue(mockConfigSecure);

      // When: update is called without transaction
      await repository.update({ insecureMode: false });

      // Then: PrismaService is used
      expect(prismaService.serverConfig.update).toHaveBeenCalled();
    });

    it('should use PrismaService when no transaction provided for isInsecureMode', async () => {
      // Given: No transaction provided
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({ insecureMode: true });

      // When: isInsecureMode is called without transaction
      await repository.isInsecureMode();

      // Then: PrismaService is used
      expect(prismaService.serverConfig.findUnique).toHaveBeenCalled();
    });

    it('should use PrismaService when no transaction provided for hasMigrated', async () => {
      // Given: No transaction provided
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue({ migratedAt: null });

      // When: hasMigrated is called without transaction
      await repository.hasMigrated();

      // Then: PrismaService is used
      expect(prismaService.serverConfig.findUnique).toHaveBeenCalled();
    });

    it('should propagate getOrCreate failure in isInsecureMode when config creation fails', async () => {
      // Given: Config does not exist and creation fails
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.serverConfig.upsert as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      // When: isInsecureMode is called
      const result = await repository.isInsecureMode();

      // Then: Failure is propagated
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });

    it('should propagate getOrCreate failure in hasMigrated when config creation fails', async () => {
      // Given: Config does not exist and creation fails
      (prismaService.serverConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.serverConfig.upsert as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      // When: hasMigrated is called
      const result = await repository.hasMigrated();

      // Then: Failure is propagated
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });
  });
});
