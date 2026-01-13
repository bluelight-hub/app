import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { ServerAccessTokenRevokedEvent } from '@domain/events/server-access-token-revoked.event';
import { TokenHash } from '@domain/value-objects/token-hash';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RevokeAccessTokenHandler } from '../revoke-access-token.handler';
import { RevokeAccessTokenCommand } from '../revoke-access-token.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';

describe('RevokeAccessTokenHandler', () => {
  let handler: RevokeAccessTokenHandler;
  let mockTokenRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByTokenHash: jest.Mock;
    findAllActive: jest.Mock;
    delete: jest.Mock;
    existsByTokenHash: jest.Mock;
    countActive: jest.Mock;
    findAllPaginated: jest.Mock;
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

  // Helper: Create a mock ServerAccessToken
  const createMockToken = (overrides: Partial<{ isRevoked: boolean; name: string }> = {}): ServerAccessToken => {
    const tokenHash = TokenHash.create('$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234').value!;
    const token = ServerAccessToken.create({
      tokenHash,
      name: overrides.name ?? 'Test Token',
    }).value!;

    // Clear creation event first
    token.clearDomainEvents();

    // If token should be already revoked, call revoke()
    if (overrides.isRevoked) {
      token.revoke();
      token.clearDomainEvents(); // Clear events from setup
    }

    return token;
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
      findAllPaginated: jest.fn(),
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
        RevokeAccessTokenHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<RevokeAccessTokenHandler>(RevokeAccessTokenHandler);
  });

  /**
   * Helper: Erstellt einen gueltigen RevokeAccessTokenCommand
   */
  function createValidCommand(tokenId?: string): RevokeAccessTokenCommand {
    return RevokeAccessTokenCommand.create({
      tokenId: tokenId ?? 'blh_abc123def456ghi789jkl012',
      requestedById: 'user_abc123def456',
    }).value!;
  }

  describe('execute() - Success Cases', () => {
    it('should revoke token successfully', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.status).toBe('revoked');
    });

    it('should return TokenListItemDto with correct fields', async () => {
      // Given (Arrange)
      const mockToken = createMockToken({ name: 'CI/CD Token' });
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.id).toBe(mockToken.id.toString());
      expect(result.value!.name).toBe('CI/CD Token');
      expect(result.value!.prefix).toBeDefined();
      expect(result.value!.createdAt).toBeDefined();
      expect(result.value!.status).toBe('revoked');
    });

    it('should be idempotent - revoking already revoked token succeeds', async () => {
      // Given (Arrange)
      const mockToken = createMockToken({ isRevoked: true });
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.status).toBe('revoked');
    });

    it('should save token to repository', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      expect(mockTokenRepository.save).toHaveBeenCalledWith(mockToken, expect.any(Object));
    });
  });

  describe('execute() - Failure Cases', () => {
    it('should fail when token not found', async () => {
      // Given (Arrange)
      mockTokenRepository.findById.mockResolvedValue(Result.ok(null));
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    });

    it('should fail when repository findById fails', async () => {
      // Given (Arrange)
      mockTokenRepository.findById.mockResolvedValue(Result.fail('Database error'));
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });

    it('should fail when repository save fails', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      mockTokenRepository.save.mockResolvedValue(Result.fail('Save failed'));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Save failed');
    });
  });

  describe('Domain Events', () => {
    it('should save ServerAccessTokenRevokedEvent to outbox', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(savedEvents)).toBe(true);
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(ServerAccessTokenRevokedEvent);
    });

    it('should emit ServerAccessTokenRevokedEvent on successful revoke', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents).toHaveLength(1);
      expect(savedEvents[0]).toBeInstanceOf(ServerAccessTokenRevokedEvent);
      expect(savedEvents[0].tokenId).toEqual(mockToken.id);
    });

    it('should not emit event when token already revoked (idempotent)', async () => {
      // Given (Arrange)
      const mockToken = createMockToken({ isRevoked: true });
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // No new events should be emitted for already revoked token
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0] ?? [];
      expect(savedEvents.length).toBe(0);
    });
  });

  describe('Transaction Behavior', () => {
    it('should execute within a transaction', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should pass transaction context to repository', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const txMarker = { isTx: true };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepository.findById).toHaveBeenCalledWith(expect.any(Object), txMarker);
      expect(mockTokenRepository.save).toHaveBeenCalledWith(mockToken, txMarker);
    });
  });

  describe('Audit Logging', () => {
    it('should log token revocation with masked prefix', async () => {
      // Given (Arrange)
      const mockToken = createMockToken({ name: 'Audit Test Token' });
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = createValidCommand(mockToken.id.toString());

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('Access token revoked');
      expect(logMessage).toContain('Audit Test Token');
      expect(logMessage).toContain('prefix:');
    });

    it('should log requestedById in audit message', async () => {
      // Given (Arrange)
      const mockToken = createMockToken();
      mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
      const command = RevokeAccessTokenCommand.create({
        tokenId: mockToken.id.toString(),
        requestedById: 'admin_user_123',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('admin_user_123');
    });
  });
});
