// @ts-nocheck
import { expectSuccess } from './helpers/result-test.helper';
/**
 * Separate Test-Datei fuer bcrypt.hash() Failure im RotateAccessTokenHandler.
 *
 * WARUM SEPARATE DATEI:
 * - bcrypt muss auf Modul-Ebene gemockt werden (jest.mock)
 * - Das wuerde andere Tests brechen die den echten bcrypt verwenden
 * - Diese Datei testet NUR den bcrypt-Fehlerfall isoliert
 */
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { Result } from '@domain/common/result';
import { TokenHash } from '@domain/value-objects/token-hash';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY } from '@infrastructure/di-tokens';
import { Test, type TestingModule } from '@nestjs/testing';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';
import { RotateAccessTokenCommand } from '../rotate-access-token.command';
import { RotateAccessTokenHandler } from '../rotate-access-token.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'newtokencuid1234567890ab'),
}));

// Mock bcrypt to simulate hash failure
// WICHTIG: jest.fn() muss inline definiert werden um hoisting-Probleme zu vermeiden
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Import bcrypt NACH dem Mock um die gemockte Version zu erhalten
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt');

describe('RotateAccessTokenHandler - bcrypt Error Handling', () => {
  const VALID_BCRYPT_TOKEN_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS';
  let handler: RotateAccessTokenHandler;
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

  /**
   * Helper: Erstellt ein Mock ServerAccessToken
   */
  const createMockToken = (): ServerAccessToken => {
    const tokenHash = expectSuccess(TokenHash.create(VALID_BCRYPT_TOKEN_HASH));
    const token = expectSuccess(
      ServerAccessToken.create({
        tokenHash,
        name: 'Test Token',
      }),
    );
    token.clearDomainEvents();
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
        RotateAccessTokenHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<RotateAccessTokenHandler>(RotateAccessTokenHandler);
  });

  it('should handle bcrypt.hash() failure gracefully', async () => {
    // Given (Arrange)
    const mockToken = createMockToken();
    mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));

    // Configure bcrypt mock to reject with an error
    (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('bcrypt out of memory'));

    const command = expectSuccess(
      RotateAccessTokenCommand.create({
        tokenId: mockToken.id.toString(),
        requestedById: 'user_abc123def456',
      }),
    );

    // When (Act)
    const result = await handler.execute(command);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('bcrypt.hash() failed'), expect.stringContaining('RotateAccessTokenHandler'));
  });

  it('should log specific bcrypt error message', async () => {
    // Given (Arrange)
    const mockToken = createMockToken();
    mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));

    // Configure bcrypt mock with specific error
    (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('CPU limit exceeded during hashing'));

    const command = expectSuccess(
      RotateAccessTokenCommand.create({
        tokenId: mockToken.id.toString(),
        requestedById: 'user_abc123def456',
      }),
    );

    // When (Act)
    const result = await handler.execute(command);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CPU limit exceeded during hashing'), expect.any(String));
  });

  it('should not save tokens when bcrypt fails', async () => {
    // Given (Arrange)
    const mockToken = createMockToken();
    mockTokenRepository.findById.mockResolvedValue(Result.ok(mockToken));
    (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('bcrypt failure'));

    const command = expectSuccess(
      RotateAccessTokenCommand.create({
        tokenId: mockToken.id.toString(),
        requestedById: 'user_abc123def456',
      }),
    );

    // When (Act)
    await handler.execute(command);

    // Then (Assert) - Repository save should NOT have been called
    expect(mockTokenRepository.save).not.toHaveBeenCalled();
    expect(mockOutboxRepository.save).not.toHaveBeenCalled();
  });
});
