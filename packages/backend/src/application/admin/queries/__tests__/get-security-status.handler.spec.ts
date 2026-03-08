// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { IServerConfigRepository, ServerConfig } from '@domain/repositories/i-server-config.repository';
import { SERVER_ACCESS_TOKEN_REPOSITORY, SERVER_CONFIG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { GetSecurityStatusHandler } from '../get-security-status.handler';
import { GetSecurityStatusQuery } from '../get-security-status.query';
import { SECURITY_ERROR_CODES } from '../../errors/security-error.codes';

describe('GetSecurityStatusHandler', () => {
  let handler: GetSecurityStatusHandler;
  let mockConfigRepository: jest.Mocked<IServerConfigRepository>;
  let mockTokenRepository: jest.Mocked<IServerAccessTokenRepository>;
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  function expectDefined<T>(value: T | null | undefined): T {
    expect(value).toBeDefined();

    if (value == null) {
      throw new Error('Expected value to be defined');
    }

    return value;
  }

  function getRequiredLogMessage(mockFn: jest.Mock): string {
    expect(mockFn).toHaveBeenCalled();
    return expectDefined(mockFn.mock.calls[0])?.[0] as string;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigRepository = {
      getOrCreate: jest.fn(),
      update: jest.fn(),
      isInsecureMode: jest.fn(),
      hasMigrated: jest.fn(),
    };

    mockTokenRepository = {
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn(),
      save: jest.fn(),
      saveWithInviteCode: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
      countActive: jest.fn(),
      findAllPaginated: jest.fn(),
      updateLastUsed: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSecurityStatusHandler,
        { provide: SERVER_CONFIG_REPOSITORY, useValue: mockConfigRepository },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<GetSecurityStatusHandler>(GetSecurityStatusHandler);
  });

  /**
   * Helper: Erstellt eine gueltige GetSecurityStatusQuery
   */
  function createValidQuery(requestedById = 'admin_test123'): GetSecurityStatusQuery {
    const result = GetSecurityStatusQuery.create({ requestedById });

    if (result.isFailure) {
      throw new Error(result.error ?? 'Failed to create GetSecurityStatusQuery');
    }

    return result.value as GetSecurityStatusQuery;
  }

  /**
   * Helper: Erstellt eine Mock ServerConfig
   */
  function createMockConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
    return {
      id: 'singleton',
      insecureMode: true,
      migratedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  describe('execute() - Success Cases', () => {
    it('should return INSECURE mode without tokens (setupComplete=false)', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(0));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.insecureMode).toBe(true);
      expect(result.value?.setupComplete).toBe(false);
      expect(result.value?.activeTokenCount).toBe(0);
    });

    it('should return INSECURE mode with active tokens (setupComplete=true)', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(3));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.insecureMode).toBe(true);
      expect(result.value?.setupComplete).toBe(true);
      expect(result.value?.activeTokenCount).toBe(3);
    });

    it('should return SECURE mode with migratedAt', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(
        Result.ok(
          createMockConfig({
            insecureMode: false,
            migratedAt: new Date('2026-01-10T14:30:00.000Z'),
          }),
        ),
      );
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(5));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.insecureMode).toBe(false);
      expect(result.value?.setupComplete).toBe(true);
      expect(result.value?.activeTokenCount).toBe(5);
      expect(result.value?.migratedAt).toBe('2026-01-10T14:30:00.000Z');
    });

    it('should return setupComplete=true when exactly 1 token exists (boundary)', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(1));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.setupComplete).toBe(true);
      expect(result.value?.activeTokenCount).toBe(1);
    });

    it('should return setupComplete=false when 0 tokens exist', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(0));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.setupComplete).toBe(false);
      expect(result.value?.activeTokenCount).toBe(0);
    });

    it('should return SECURE mode without tokens (setupComplete=false)', async () => {
      // Given (Arrange): SECURE mode mit 0 Tokens (ungewoehnlich aber moeglich)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(
        Result.ok(
          createMockConfig({
            insecureMode: false,
          }),
        ),
      );
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(0));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.insecureMode).toBe(false);
      expect(result.value?.setupComplete).toBe(false);
      expect(result.value?.activeTokenCount).toBe(0);
    });
  });

  describe('Repository Interaction', () => {
    it('should call getOrCreate on config repository', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(0));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockConfigRepository.getOrCreate).toHaveBeenCalledTimes(1);
    });

    it('should call countActive on token repository', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(0));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.countActive).toHaveBeenCalledTimes(1);
    });

    it('should not call countActive if config load fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.fail('DB Error'));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.countActive).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Config Repository', () => {
    it('should return failure when config repository fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
    });

    it('should return failure when config repository returns null', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(null as unknown as ServerConfig));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SECURITY_ERROR_CODES.CONFIG_NULL);
    });

    it('should log error when config repository fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.fail('Config load error'));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(getRequiredLogMessage(mockLogger.error)).toContain('Failed to load server config');
    });
  });

  describe('Error Handling - Token Repository', () => {
    it('should return failure when token repository countActive fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.fail('Token count error'));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Token count error');
    });

    it('should handle null value from countActive as 0', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(null as unknown as number));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.activeTokenCount).toBe(0);
      expect(result.value?.setupComplete).toBe(false);
    });

    it('should log error when token repository fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.fail('Count error'));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(getRequiredLogMessage(mockLogger.error)).toContain('Failed to count active tokens');
    });
  });

  describe('Error Handling - Unexpected Errors', () => {
    it('should handle unexpected exception from config repository', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockRejectedValue(new Error('Unexpected DB crash'));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SECURITY_ERROR_CODES.STATUS_QUERY_FAILED);
    });

    it('should handle unexpected exception from token repository', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockRejectedValue(new Error('Token service crashed'));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SECURITY_ERROR_CODES.STATUS_QUERY_FAILED);
    });

    it('should handle non-Error exceptions gracefully', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockRejectedValue('String error');

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SECURITY_ERROR_CODES.STATUS_QUERY_FAILED);
    });

    it('should log unexpected errors', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockRejectedValue(new Error('Crash'));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(getRequiredLogMessage(mockLogger.error)).toContain('GetSecurityStatusHandler');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit trail with status and requestedById', async () => {
      // Given (Arrange)
      const query = createValidQuery('admin_audit456');
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(2));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('Security status queried');
      expect(logMessage).toContain('insecureMode: true');
      expect(logMessage).toContain('setupComplete: true');
      expect(logMessage).toContain('activeTokens: 2');
      expect(logMessage).toContain('by: admin_audit456');
    });

    it('should log correct setupComplete status based on token count', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(Result.ok(createMockConfig()));
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(0));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('setupComplete: false');
    });

    it('should log SECURE mode in audit trail', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(
        Result.ok(
          createMockConfig({
            insecureMode: false,
          }),
        ),
      );
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(1));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('insecureMode: false');
      expect(logMessage).toContain('setupComplete: true');
    });
  });

  describe('setupComplete Logic', () => {
    it('should set setupComplete=true when tokens > 0', async () => {
      // Given (Arrange): INSECURE mit Tokens
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(
        Result.ok(
          createMockConfig({
            insecureMode: true,
          }),
        ),
      );
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(5));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.setupComplete).toBe(true);
    });

    it('should set setupComplete=false when tokens = 0', async () => {
      // Given (Arrange): INSECURE ohne Tokens
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(
        Result.ok(
          createMockConfig({
            insecureMode: true,
          }),
        ),
      );
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(0));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.setupComplete).toBe(false);
    });

    it('should set setupComplete=true when SECURE with many tokens', async () => {
      // Given (Arrange): SECURE mit vielen Tokens
      const query = createValidQuery();
      mockConfigRepository.getOrCreate.mockResolvedValue(
        Result.ok(
          createMockConfig({
            insecureMode: false,
          }),
        ),
      );
      mockTokenRepository.countActive.mockResolvedValue(Result.ok(100));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.setupComplete).toBe(true);
    });
  });
});

describe('GetSecurityStatusQuery', () => {
  describe('create() - Validation', () => {
    it('should create query with valid requestedById', () => {
      // Given & When
      const result = GetSecurityStatusQuery.create({
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.requestedById).toBe('admin_123');
    });

    it('should fail when requestedById is empty', () => {
      // Given & When
      const result = GetSecurityStatusQuery.create({
        requestedById: '',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_REQUESTED_BY_REQUIRED');
    });

    it('should fail when requestedById is whitespace only', () => {
      // Given & When
      const result = GetSecurityStatusQuery.create({
        requestedById: '   ',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_REQUESTED_BY_REQUIRED');
    });

    it('should fail when requestedById is too short (less than 8 characters)', () => {
      // Given & When
      const result = GetSecurityStatusQuery.create({
        requestedById: 'admin', // 5 Zeichen - zu kurz
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_REQUESTED_BY_TOO_SHORT');
    });

    it('should accept requestedById with exactly 8 characters (boundary)', () => {
      // Given & When
      const result = GetSecurityStatusQuery.create({
        requestedById: 'admin_12', // 8 Zeichen - minimal gueltig
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.requestedById).toBe('admin_12');
    });

    it('should trim requestedById whitespace', () => {
      // Given & When
      const result = GetSecurityStatusQuery.create({
        requestedById: '  admin_123  ',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.requestedById).toBe('admin_123');
    });

    it('should accept long requestedById', () => {
      // Given & When
      const longId = `admin_${'x'.repeat(100)}`;
      const result = GetSecurityStatusQuery.create({
        requestedById: longId,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.requestedById).toBe(longId);
    });
  });
});
