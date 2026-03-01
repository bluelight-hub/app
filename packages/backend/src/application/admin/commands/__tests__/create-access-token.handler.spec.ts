import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Result } from '@domain/common/result';
import { ServerAccessTokenCreatedEvent } from '@domain/events/server-access-token-created.event';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateAccessTokenHandler } from '../create-access-token.handler';
import { CreateAccessTokenCommand } from '../create-access-token.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';

// Mock CUID2 fuer deterministische Tests
const MOCK_CUID = 'abc123def456ghi789jkl012';
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => MOCK_CUID),
}));

describe('CreateAccessTokenHandler', () => {
  let handler: CreateAccessTokenHandler;
  let mockTokenRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByTokenHash: jest.Mock;
    findAllActive: jest.Mock;
    delete: jest.Mock;
    existsByTokenHash: jest.Mock;
    countActive: jest.Mock;
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

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        // Transaction Mock - fuehrt Callback mit Mock Transaction Context aus
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
        CreateAccessTokenHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<CreateAccessTokenHandler>(CreateAccessTokenHandler);
  });

  /**
   * Helper: Erstellt einen gueltigen CreateAccessTokenCommand
   */
  function createValidCommand(
    overrides: Partial<{
      name: string;
      createdById: string;
    }> = {},
  ): CreateAccessTokenCommand {
    return CreateAccessTokenCommand.create({
      name: 'CI/CD Pipeline Token',
      createdById: 'user_abc123def456ghi789jkl012',
      ...overrides,
    }).value;
  }

  describe('execute() - Success Cases', () => {
    it('should create access token successfully with valid command', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value.token).toBeDefined();
      expect(result.value.name).toBe('CI/CD Pipeline Token');
      expect(result.value.prefix).toBeDefined();
      expect(result.value.createdAt).toBeDefined();
    });

    it('should generate token with blh_ prefix and 28 characters total', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const token = result.value.token;

      // Token Format: blh_ + cuid2 (24 Zeichen) = 28 Zeichen
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
      const prefix = result.value.prefix;
      const token = result.value.token;

      // Prefix sollte die ersten 12 Zeichen sein (blh_xxxxxxxx)
      expect(prefix).toHaveLength(12);
      expect(prefix).toBe(token.substring(0, 12));
      expect(prefix).toMatch(/^blh_[a-z0-9]{8}$/);
    });

    it('should return createdAt in ISO format', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.createdAt).toBeDefined();
      // ISO Format pruefen
      expect(() => new Date(result.value.createdAt)).not.toThrow();
      expect(result.value.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return name in response', async () => {
      // Given (Arrange)
      const command = createValidCommand({ name: 'HiOrg Integration Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('HiOrg Integration Token');
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

      // Pruefe dass Repository mit einem ServerAccessToken aufgerufen wurde
      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      const savedToken = mockTokenRepository.save.mock.calls[0][0];

      // TokenHash sollte valides bcrypt-Format haben
      const hashValue = savedToken.tokenHash.value;
      expect(hashValue).toMatch(/^\$2[aby]\$10\$/);
      expect(hashValue).toHaveLength(60);

      // Hash sollte gegen Raw-Token verifizierbar sein
      const rawToken = result.value.token;
      const isValid = await bcrypt.compare(rawToken, hashValue);
      expect(isValid).toBe(true);
    });

    it('should use cost factor 10 (NFR-S1 compliant)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedToken = mockTokenRepository.save.mock.calls[0][0];
      const hashValue = savedToken.tokenHash.value;

      // Cost Factor ist in Position 4-5 des bcrypt Hashes
      const costFactor = hashValue.substring(4, 6);
      expect(costFactor).toBe('10');
    });

    it('should generate different hashes for same token on multiple calls', async () => {
      // Given (Arrange)
      const command1 = createValidCommand();
      const command2 = createValidCommand();

      // When (Act)
      const result1 = await handler.execute(command1);
      const result2 = await handler.execute(command2);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);

      // bcrypt generiert mit Salt immer unterschiedliche Hashes
      const hash1 = mockTokenRepository.save.mock.calls[0][0].tokenHash.value;
      const hash2 = mockTokenRepository.save.mock.calls[1][0].tokenHash.value;
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Repository Interaction', () => {
    it('should call tokenRepository.save with ServerAccessToken aggregate', async () => {
      // Given (Arrange)
      const command = createValidCommand({ name: 'Test Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = mockTokenRepository.save.mock.calls[0][0];

      expect(savedAggregate).toBeDefined();
      expect(savedAggregate.name).toBe('Test Token');
      expect(savedAggregate.tokenHash).toBeDefined();
      expect(savedAggregate.id).toBeDefined();
    });

    it('should call tokenRepository.save with transaction context', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const txMarker = { isTx: true };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const txContext = mockTokenRepository.save.mock.calls[0][1];
      expect(txContext).toBe(txMarker);
    });

    it('should return failure when repository.save fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
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
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(ServerAccessTokenCreatedEvent);
    });

    it('should include correct data in ServerAccessTokenCreatedEvent', async () => {
      // Given (Arrange)
      const command = createValidCommand({ name: 'Event Test Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const event = savedEvents[0] as ServerAccessTokenCreatedEvent;

      expect(event.name).toBe('Event Test Token');
      expect(event.tokenId).toBeDefined();
      expect(event.expiresAt).toBeNull(); // Kein Ablaufdatum gesetzt
    });

    it('should save events with transaction context', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const txMarker = { outboxTx: true };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const txContext = mockOutboxRepository.save.mock.calls[0][1];
      expect(txContext).toBe(txMarker);
    });

    it('should not save events when repository fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail('DB Error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
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

    it('should rollback on repository error', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail('Repository Error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('should rollback on outbox save error', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockOutboxRepository.save.mockRejectedValue(new Error('Outbox Error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox Error');
    });
  });

  describe('Audit Logging', () => {
    it('should log token creation with prefix (not raw token)', async () => {
      // Given (Arrange)
      const command = createValidCommand({ name: 'Audit Test Token' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('Access token created');
      expect(logMessage).toContain('"Audit Test Token"');
      expect(logMessage).toContain('prefix:');
    });

    it('should log only prefix in audit message (first 12 characters)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const logMessage = mockLogger.log.mock.calls[0][0];
      const prefix = result.value.prefix;

      // Prefix sollte im Log enthalten sein
      expect(logMessage).toContain(prefix);
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

      // Der volle Token sollte NICHT im Log erscheinen
      expect(logMessage).not.toContain(rawToken);
    });

    it('should log token name in audit message', async () => {
      // Given (Arrange)
      const command = createValidCommand({ name: 'HiOrg Server Integration' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('HiOrg Server Integration');
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

      // Pruefe alle erforderlichen Felder
      expect(response.token).toBeDefined();
      expect(response.name).toBeDefined();
      expect(response.prefix).toBeDefined();
      expect(response.createdAt).toBeDefined();
    });

    it('should have token in expected format (blh_ prefix)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.token).toMatch(/^blh_[a-z0-9]{24}$/);
    });

    it('should have prefix as first 12 characters of token', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const token = result.value.token;
      const prefix = result.value.prefix;

      expect(token.startsWith(prefix)).toBe(true);
      expect(prefix).toHaveLength(12);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum name length (3 characters)', async () => {
      // Given (Arrange)
      const command = createValidCommand({ name: 'ABC' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('ABC');
    });

    it('should handle maximum name length (50 characters)', async () => {
      // Given (Arrange)
      const longName = 'A'.repeat(50);
      const command = createValidCommand({ name: longName });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe(longName);
    });

    it('should handle special characters in name', async () => {
      // Given (Arrange)
      const specialName = 'Test-Token_123 (äöü)';
      const command = createValidCommand({ name: specialName });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe(specialName);
    });
  });

  describe('Error Handling', () => {
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

    it('should handle database constraint violation', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockTokenRepository.save.mockResolvedValue(Result.fail('Unique constraint violation on tokenHash'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unique constraint violation');
    });
  });
});
