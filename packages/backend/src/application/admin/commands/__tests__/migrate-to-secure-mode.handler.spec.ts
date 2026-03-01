import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Result } from '@domain/common/result';
import { ServerAccessTokenCreatedEvent } from '@domain/events/server-access-token-created.event';
import { ServerMigratedToSecureModeEvent } from '@domain/events/server-migrated-to-secure-mode.event';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY, SERVER_CONFIG_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { MigrateToSecureModeHandler } from '../migrate-to-secure-mode.handler';
import { MigrateToSecureModeCommand } from '../migrate-to-secure-mode.command';
import { SECURITY_ERROR_CODES } from '../../errors/security-error.codes';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';
import type { ServerConfig } from '@domain/repositories/i-server-config.repository';

// Mock CUID2 fuer deterministische Tests
const MOCK_CUID = 'abc123def456ghi789jkl012';
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => MOCK_CUID),
}));

describe('MigrateToSecureModeHandler', () => {
  let handler: MigrateToSecureModeHandler;
  let mockTokenRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByTokenHash: jest.Mock;
    findAllActive: jest.Mock;
    delete: jest.Mock;
    existsByTokenHash: jest.Mock;
    countActive: jest.Mock;
  };
  let mockConfigRepository: {
    getOrCreate: jest.Mock;
    update: jest.Mock;
    isInsecureMode: jest.Mock;
    hasMigrated: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  /**
   * Helper: Erstellt eine Mock-ServerConfig im INSECURE Mode
   */
  function createInsecureConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
    return {
      id: 'singleton',
      insecureMode: true,
      migratedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  /**
   * Helper: Erstellt eine Mock-ServerConfig im SECURE Mode
   */
  function createSecureConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
    return {
      id: 'singleton',
      insecureMode: false,
      migratedAt: new Date('2026-01-13T10:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-13T10:00:00.000Z'),
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTokenRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
      countActive: jest.fn(),
    };

    mockConfigRepository = {
      getOrCreate: jest.fn().mockResolvedValue(Result.ok(createInsecureConfig())),
      update: jest.fn().mockResolvedValue(Result.ok(createSecureConfig())),
      isInsecureMode: jest.fn().mockResolvedValue(Result.ok(true)),
      hasMigrated: jest.fn().mockResolvedValue(Result.ok(false)),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrateToSecureModeHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: SERVER_CONFIG_REPOSITORY, useValue: mockConfigRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<MigrateToSecureModeHandler>(MigrateToSecureModeHandler);
  });

  /**
   * Helper: Erstellt einen gueltigen MigrateToSecureModeCommand
   */
  function createValidCommand(
    overrides: Partial<{
      tokenName: string;
      requestedById: string;
    }> = {},
  ): MigrateToSecureModeCommand {
    return MigrateToSecureModeCommand.create({
      tokenName: 'Admin Initial Token',
      requestedById: 'admin_test_123',
      ...overrides,
    }).value;
  }

  describe('execute() - Success Cases', () => {
    it('should migrate to secure mode successfully with valid command', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value.success).toBe(true);
      expect(result.value.previousMode).toBe('INSECURE');
      expect(result.value.newMode).toBe('SECURE');
    });

    it('should return token in response', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.token).toBeDefined();
      expect(result.value.token).toMatch(/^blh_[a-z0-9]{24}$/);
    });

    it('should return correct tokenName in response', async () => {
      // Given (Arrange)
      const command = createValidCommand({ tokenName: 'My Admin Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenName).toBe('My Admin Token');
    });

    it('should return tokenPrefix (first 12 characters)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenPrefix).toBeDefined();
      expect(result.value.tokenPrefix).toHaveLength(12);
      expect(result.value.tokenPrefix).toMatch(/^blh_[a-z0-9]{8}$/);
    });

    it('should return migratedAt in ISO format', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.migratedAt).toBeDefined();
      expect(() => new Date(result.value.migratedAt)).not.toThrow();
      expect(result.value.migratedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use default tokenName when not provided', async () => {
      // Given (Arrange)
      const command = MigrateToSecureModeCommand.create({ requestedById: 'admin_test_123' }).value;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });
  });

  describe('Token Generation', () => {
    it('should generate token with blh_ prefix and 28 characters total', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const token = result.value.token;

      expect(token).toMatch(/^blh_[a-z0-9]{24}$/);
      expect(token).toHaveLength(28);
      expect(token.startsWith('blh_')).toBe(true);
    });

    it('should extract correct prefix (first 12 characters)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const prefix = result.value.tokenPrefix;
      const token = result.value.token;

      expect(prefix).toHaveLength(12);
      expect(prefix).toBe(token.substring(0, 12));
    });
  });

  describe('bcrypt Hashing', () => {
    it('should create valid bcrypt hash with cost factor 10', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      const savedToken = mockTokenRepository.save.mock.calls[0][0];

      // TokenHash sollte valides bcrypt-Format haben
      const hashValue = savedToken.tokenHash.value;
      expect(hashValue).toMatch(/^\$2[aby]\$10\$/);
      expect(hashValue).toHaveLength(60);
    });

    it('should verify raw token against stored hash', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedToken = mockTokenRepository.save.mock.calls[0][0];
      const hashValue = savedToken.tokenHash.value;
      const rawToken = result.value.token;

      const isValid = await bcrypt.compare(rawToken, hashValue);
      expect(isValid).toBe(true);
    });
  });

  describe('Repository Interactions', () => {
    it('should call configRepository.getOrCreate to check mode', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockConfigRepository.getOrCreate).toHaveBeenCalledTimes(1);
    });

    it('should call tokenRepository.save with ServerAccessToken aggregate', async () => {
      // Given (Arrange)
      const command = createValidCommand({ tokenName: 'Migration Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = mockTokenRepository.save.mock.calls[0][0];

      expect(savedAggregate).toBeDefined();
      expect(savedAggregate.name).toBe('Migration Token');
      expect(savedAggregate.tokenHash).toBeDefined();
    });

    it('should call configRepository.update to set insecureMode to false', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockConfigRepository.update).toHaveBeenCalledTimes(1);
      const updateCall = mockConfigRepository.update.mock.calls[0][0];

      expect(updateCall.insecureMode).toBe(false);
      expect(updateCall.migratedAt).toBeInstanceOf(Date);
    });

    it('should pass transaction context to all repository methods', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const txMarker = { isTx: true };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);

      // Check getOrCreate
      const getOrCreateTx = mockConfigRepository.getOrCreate.mock.calls[0][0];
      expect(getOrCreateTx).toBe(txMarker);

      // Check token save
      const tokenSaveTx = mockTokenRepository.save.mock.calls[0][1];
      expect(tokenSaveTx).toBe(txMarker);

      // Check config update
      const configUpdateTx = mockConfigRepository.update.mock.calls[0][1];
      expect(configUpdateTx).toBe(txMarker);
    });
  });

  describe('Domain Events', () => {
    it('should save ServerAccessTokenCreatedEvent to outbox', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];

      expect(Array.isArray(savedEvents)).toBe(true);
      const tokenCreatedEvent = savedEvents.find((e: unknown) => e instanceof ServerAccessTokenCreatedEvent);
      expect(tokenCreatedEvent).toBeDefined();
    });

    it('should save ServerMigratedToSecureModeEvent to outbox', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];

      const migrationEvent = savedEvents.find((e: unknown) => e instanceof ServerMigratedToSecureModeEvent);
      expect(migrationEvent).toBeDefined();
    });

    it('should include correct data in ServerMigratedToSecureModeEvent', async () => {
      // Given (Arrange)
      const command = createValidCommand({ tokenName: 'Event Test Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const migrationEvent = savedEvents.find((e: unknown) => e instanceof ServerMigratedToSecureModeEvent) as ServerMigratedToSecureModeEvent;

      expect(migrationEvent.tokenName).toBe('Event Test Token');
      expect(migrationEvent.initialTokenId).toBeDefined();
      expect(migrationEvent.migratedAt).toBeInstanceOf(Date);
    });

    it('should save both events (token created + migration)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(2);
    });
  });

  describe('Error Handling - Already in Secure Mode', () => {
    it('should fail with ALREADY_IN_SECURE_MODE when server is not in insecure mode', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createSecureConfig()));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE);
    });

    it('should log warning when migration is attempted in secure mode', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createSecureConfig()));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already in SECURE mode'), expect.any(String));
    });

    it('should not save token when already in secure mode', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createSecureConfig()));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should not update config when already in secure mode', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createSecureConfig()));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockConfigRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Config Not Found', () => {
    it('should fail with CONFIG_NOT_FOUND when getOrCreate fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.fail('Database error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SECURITY_ERROR_CODES.CONFIG_NOT_FOUND);
    });

    it('should log error when config loading fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.fail('Database connection failed'));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load ServerConfig'), expect.any(String));
    });
  });

  describe('Error Handling - Token Repository Failures', () => {
    it('should fail when token repository.save fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail('Database write error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database write error');
    });

    it('should return SAVE_FAILED error code when save fails without message', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail(undefined as unknown as string));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED);
    });

    it('should not update config when token save fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail('Token save error'));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockConfigRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Config Update Failures', () => {
    it('should fail with CONFIG_UPDATE_FAILED when update fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.update.mockResolvedValue(Result.fail('Update error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SECURITY_ERROR_CODES.CONFIG_UPDATE_FAILED);
    });

    it('should log error when config update fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.update.mockResolvedValue(Result.fail('Config update failed'));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to update ServerConfig'), expect.any(String));
    });
  });

  describe('Transaction Behavior', () => {
    it('should execute within a transaction', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should rollback on token save error', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail('Token save error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('should rollback on config update error', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockConfigRepository.update.mockResolvedValue(Result.fail('Config update error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('should rollback on outbox save error', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockOutboxRepository.save.mockRejectedValue(new Error('Outbox error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox error');
    });

    it('should handle transaction timeout gracefully', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction timeout'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction timeout');
    });
  });

  describe('Audit Logging', () => {
    it('should log migration with token prefix (not raw token)', async () => {
      // Given (Arrange)
      const command = createValidCommand({ tokenName: 'Audit Test Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('migrated to SECURE mode');
      expect(logMessage).toContain('"Audit Test Token"');
      expect(logMessage).toContain('prefix:');
    });

    it('should NOT log raw token (security)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const rawToken = result.value.token;
      const logMessage = mockLogger.log.mock.calls[0][0];

      expect(logMessage).not.toContain(rawToken);
    });
  });

  describe('Response Structure', () => {
    it('should return all required fields in response', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const response = result.value;

      expect(response.success).toBeDefined();
      expect(response.previousMode).toBeDefined();
      expect(response.newMode).toBeDefined();
      expect(response.token).toBeDefined();
      expect(response.tokenName).toBeDefined();
      expect(response.tokenPrefix).toBeDefined();
      expect(response.migratedAt).toBeDefined();
    });

    it('should have success=true in response', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(true);
    });

    it('should have previousMode=INSECURE in response', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.previousMode).toBe('INSECURE');
    });

    it('should have newMode=SECURE in response', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newMode).toBe('SECURE');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum tokenName length (3 characters)', async () => {
      // Given (Arrange)
      const command = createValidCommand({ tokenName: 'ABC' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenName).toBe('ABC');
    });

    it('should handle maximum tokenName length (50 characters)', async () => {
      // Given (Arrange)
      const longName = 'A'.repeat(50);
      const command = createValidCommand({ tokenName: longName });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenName).toBe(longName);
    });

    it('should handle special characters in tokenName', async () => {
      // Given (Arrange)
      const specialName = 'Test-Token_123 (äöü)';
      const command = createValidCommand({ tokenName: specialName });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenName).toBe(specialName);
    });
  });
});
