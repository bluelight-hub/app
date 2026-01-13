import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { TokenHash } from '@domain/value-objects/token-hash';
import type { IServerAccessTokenRepository, ServerAccessTokenPaginatedResult } from '@domain/repositories/i-server-access-token.repository';
import { SERVER_ACCESS_TOKEN_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { GetTokenListHandler } from '../get-token-list.handler';
import { GetTokenListQuery } from '../get-token-list.query';

// Mock CUID2 fuer Jest Kompatibilitaet
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    // Generiere gueltiges CUID2 Format: 24 lowercase alphanumerische Zeichen
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
}));

describe('GetTokenListHandler', () => {
  let handler: GetTokenListHandler;
  let mockTokenRepository: jest.Mocked<IServerAccessTokenRepository>;
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTokenRepository = {
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn(),
      save: jest.fn(),
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
      providers: [GetTokenListHandler, { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository }, { provide: LOGGER, useValue: mockLogger }],
    }).compile();

    handler = module.get<GetTokenListHandler>(GetTokenListHandler);
  });

  /**
   * Helper: Erstellt eine gueltige GetTokenListQuery
   */
  function createValidQuery(
    overrides: Partial<{
      page?: number;
      limit?: number;
      requestedById: string;
      sortBy?: 'createdAt' | 'lastUsedAt' | 'name';
      sortOrder?: 'asc' | 'desc';
      inactiveDays?: number;
    }> = {},
  ): GetTokenListQuery {
    return GetTokenListQuery.create({
      page: 1,
      limit: 20,
      requestedById: 'admin_test123',
      ...overrides,
    }).value!;
  }

  /**
   * Helper: Erstellt ein gueltiges TokenHash Value Object
   */
  function createValidTokenHash(): TokenHash {
    // Gueltiger bcrypt Hash mit Cost Factor 10
    return TokenHash.create('$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS').value!;
  }

  /**
   * Helper: Erstellt ein Mock ServerAccessToken Aggregate
   */
  function createMockToken(
    overrides: Partial<{
      name: string | null;
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      isRevoked: boolean;
      revokedAt: Date | null;
      rotatedFromId: ServerAccessToken | null;
    }> = {},
  ): ServerAccessToken {
    const tokenHash = createValidTokenHash();

    // Fuer spezielle Zustaende oder null-Werte muessen wir reconstruct verwenden
    const needsReconstruct = overrides.isRevoked || overrides.lastUsedAt || overrides.revokedAt || overrides.name === null || overrides.rotatedFromId !== undefined;

    if (needsReconstruct) {
      // Erst ein Token erstellen um eine valide ID zu bekommen
      const tempResult = ServerAccessToken.create({
        tokenHash,
        name: 'temp',
        expiresAt: overrides.expiresAt ?? null,
      });

      if (tempResult.isFailure || !tempResult.value) {
        throw new Error('Failed to create test token');
      }

      return ServerAccessToken.reconstruct({
        id: tempResult.value.id,
        tokenHash,
        name: overrides.name === null ? null : (overrides.name ?? 'Test Token'),
        lastUsedAt: overrides.lastUsedAt ?? null,
        expiresAt: overrides.expiresAt ?? null,
        isRevoked: overrides.isRevoked ?? false,
        revokedAt: overrides.revokedAt ?? null,
        rotatedFromId: overrides.rotatedFromId?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const tokenResult = ServerAccessToken.create({
      tokenHash,
      name: overrides.name ?? 'Test Token',
      expiresAt: overrides.expiresAt ?? null,
    });

    if (tokenResult.isFailure || !tokenResult.value) {
      throw new Error('Failed to create test token');
    }

    return tokenResult.value;
  }

  /**
   * Helper: Erstellt ein Mock PaginatedResult
   */
  function createPaginatedResult(items: ServerAccessToken[], total?: number, page = 1, pageSize = 20): ServerAccessTokenPaginatedResult {
    const actualTotal = total ?? items.length;
    return {
      items,
      total: actualTotal,
      page,
      pageSize,
      totalPages: Math.ceil(actualTotal / pageSize) || 1,
    };
  }

  describe('execute() - Success Cases', () => {
    it('should return paginated tokens successfully', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockTokens = [createMockToken(), createMockToken({ name: 'Second Token' })];
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult(mockTokens)));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.data).toHaveLength(2);
      expect(result.value!.meta.total).toBe(2);
    });

    it('should return empty list when no tokens exist', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data).toHaveLength(0);
      expect(result.value!.meta.total).toBe(0);
    });

    it('should include correct pagination metadata', async () => {
      // Given (Arrange)
      const query = createValidQuery({ page: 2, limit: 5 });
      const mockTokens = [createMockToken()];
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult(mockTokens, 25, 2, 5)));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.meta.page).toBe(2);
      expect(result.value!.meta.pageSize).toBe(5);
      expect(result.value!.meta.total).toBe(25);
      expect(result.value!.meta.totalPages).toBe(5);
    });

    it('should NOT include token hash in response', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockToken = createMockToken();
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const tokenDto = result.value!.data[0];

      // Token Hash DARF NICHT in der Response sein
      expect(tokenDto).not.toHaveProperty('tokenHash');
      expect(tokenDto).not.toHaveProperty('hash');

      // Nur der Prefix sollte vorhanden sein
      expect(tokenDto.prefix).toBeDefined();
      expect(tokenDto.prefix.startsWith('blh_')).toBe(true);
      expect(tokenDto.prefix.length).toBe(12); // blh_ + 8 Zeichen
    });
  });

  describe('Repository Interaction', () => {
    it('should pass pagination options to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({ page: 3, limit: 15 });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          limit: 15,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          inactiveDays: null,
        }),
      );
    });

    it('should pass sorting options to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({ sortBy: 'lastUsedAt', sortOrder: 'asc' });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'lastUsedAt',
          sortOrder: 'asc',
        }),
      );
    });

    it('should pass inactiveDays filter to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({ inactiveDays: 30 });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          inactiveDays: 30,
        }),
      );
    });

    it('should return failure when repository fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
    });
  });

  describe('Status Computation', () => {
    it('should return active status for valid tokens', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockToken = createMockToken({
        isRevoked: false,
        expiresAt: null, // Kein Ablaufdatum
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('active');
    });

    it('should return revoked status for revoked tokens', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockToken = createMockToken({
        isRevoked: true,
        revokedAt: new Date(),
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('revoked');
    });

    it('should return expired status for expired tokens', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Gestern abgelaufen

      const mockToken = createMockToken({
        isRevoked: false,
        expiresAt: pastDate,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('expired');
    });

    it('should return revoked status for expired AND revoked tokens (revoked has priority)', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Abgelaufen UND widerrufen - REVOKED sollte gewinnen
      const mockToken = createMockToken({
        isRevoked: true,
        revokedAt: new Date(),
        expiresAt: pastDate,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('revoked');
    });

    it('should return active status for tokens with future expiry', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // In 30 Tagen

      const mockToken = createMockToken({
        isRevoked: false,
        expiresAt: futureDate,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('active');
    });

    it('should return active status for token expiring exactly now (boundary case)', async () => {
      // Given (Arrange): Token expires exactly at current time
      // Basierend auf der computeStatus Logik: expiresAt < new Date()
      // Wenn expiresAt === now, dann ist expiresAt NICHT < now, also ist das Token noch aktiv
      const query = createValidQuery();
      const now = new Date();

      const mockToken = createMockToken({
        isRevoked: false,
        expiresAt: now,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert): Based on < comparison, token at exactly now is still active
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('active');
    });

    it('should return expired status for token that expired 1ms ago (boundary case)', async () => {
      // Given (Arrange): Token expired just 1ms ago
      const query = createValidQuery();
      const justExpired = new Date(Date.now() - 1);

      const mockToken = createMockToken({
        isRevoked: false,
        expiresAt: justExpired,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert): Token should be expired
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('expired');
    });

    it('should return active status for token expiring 1ms from now (boundary case)', async () => {
      // Given (Arrange): Token expires in 1ms
      const query = createValidQuery();
      const expiresInFuture = new Date(Date.now() + 1);

      const mockToken = createMockToken({
        isRevoked: false,
        expiresAt: expiresInFuture,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert): Token should still be active
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].status).toBe('active');
    });
  });

  describe('Rotated Status Computation', () => {
    it('should return null rotatedStatus for normal tokens', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockToken = createMockToken({
        isRevoked: false,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].rotatedStatus).toBeNull();
      expect(result.value!.data[0].rotatedFromId).toBeNull();
    });

    it('should return replacement status for tokens created by rotation', async () => {
      // Given (Arrange): Token mit rotatedFromId (wurde durch Rotation erstellt)
      const query = createValidQuery();
      const originalToken = createMockToken({ name: 'Original Token' });
      const replacementToken = createMockToken({
        name: 'Replacement Token',
        rotatedFromId: originalToken,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([replacementToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].rotatedStatus).toBe('replacement');
      expect(result.value!.data[0].rotatedFromId).toBe(originalToken.id.value);
    });

    it('should return rotated status for tokens that have been replaced', async () => {
      // Given (Arrange): Original-Token (revoked) + Replacement-Token mit rotatedFromId -> Original
      const query = createValidQuery();
      const originalToken = createMockToken({
        name: 'Original Token',
        isRevoked: true,
        revokedAt: new Date(),
      });
      const replacementToken = createMockToken({
        name: 'Replacement Token',
        rotatedFromId: originalToken,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([originalToken, replacementToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Das Original-Token sollte 'rotated' Status haben
      const originalDto = result.value!.data.find((t) => t.id === originalToken.id.value);
      expect(originalDto?.rotatedStatus).toBe('rotated');
      expect(originalDto?.rotatedFromId).toBeNull();

      // Das Replacement-Token sollte 'replacement' Status haben
      const replacementDto = result.value!.data.find((t) => t.id === replacementToken.id.value);
      expect(replacementDto?.rotatedStatus).toBe('replacement');
      expect(replacementDto?.rotatedFromId).toBe(originalToken.id.value);
    });

    it('should return null status for revoked tokens without a replacement', async () => {
      // Given (Arrange): Token wurde widerrufen, aber NICHT rotiert (kein Replacement existiert)
      const query = createValidQuery();
      const revokedToken = createMockToken({
        name: 'Revoked Token',
        isRevoked: true,
        revokedAt: new Date(),
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([revokedToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Widerrufen aber nicht rotiert -> null Status
      expect(result.value!.data[0].rotatedStatus).toBeNull();
    });

    it('should correctly identify rotation chain with multiple tokens', async () => {
      // Given (Arrange): Drei Tokens in einer Rotations-Kette
      const query = createValidQuery();
      const token1 = createMockToken({
        name: 'Token 1 (original, rotated)',
        isRevoked: true,
        revokedAt: new Date(),
      });
      const token2 = createMockToken({
        name: 'Token 2 (replacement of 1, rotated)',
        isRevoked: true,
        revokedAt: new Date(),
        rotatedFromId: token1,
      });
      const token3 = createMockToken({
        name: 'Token 3 (replacement of 2, active)',
        isRevoked: false,
        rotatedFromId: token2,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([token1, token2, token3])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);

      const dto1 = result.value!.data.find((t) => t.id === token1.id.value);
      const dto2 = result.value!.data.find((t) => t.id === token2.id.value);
      const dto3 = result.value!.data.find((t) => t.id === token3.id.value);

      // Token 1: rotated (widerrufen + hat Nachfolger)
      expect(dto1?.rotatedStatus).toBe('rotated');

      // Token 2: replacement UND rotated (wurde durch Rotation erstellt, aber hat auch Nachfolger)
      // Da rotatedFromId gesetzt ist, hat es 'replacement' Status (Prioritaet)
      expect(dto2?.rotatedStatus).toBe('replacement');

      // Token 3: replacement (wurde durch Rotation erstellt, ist aktiv)
      expect(dto3?.rotatedStatus).toBe('replacement');
    });
  });

  describe('DTO Mapping', () => {
    it('should map all fields correctly', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const lastUsedAt = new Date('2026-01-12T12:30:00.000Z');
      const expiresAt = new Date('2027-01-12T00:00:00.000Z');

      const mockToken = createMockToken({
        name: 'CI/CD Pipeline',
        lastUsedAt,
        expiresAt,
        isRevoked: false,
      });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value!.data[0];

      expect(dto.id).toBeDefined();
      expect(dto.id.startsWith('blh_')).toBe(true);
      expect(dto.name).toBe('CI/CD Pipeline');
      expect(dto.prefix).toBeDefined();
      expect(dto.prefix.length).toBe(12);
      expect(dto.createdAt).toBeDefined();
      expect(dto.status).toBe('active');
      expect(dto.lastUsedAt).toBe('2026-01-12T12:30:00.000Z');
      expect(dto.expiresAt).toBe('2027-01-12T00:00:00.000Z');
      expect(dto.rotatedFromId).toBeNull();
      expect(dto.rotatedStatus).toBeNull();
    });

    it('should handle null name with default value', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockToken = createMockToken({ name: null });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].name).toBe('Unbenanntes Token');
    });

    it('should handle null lastUsedAt correctly', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockToken = createMockToken({ lastUsedAt: null });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].lastUsedAt).toBeNull();
    });

    it('should handle null expiresAt correctly', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockToken = createMockToken({ expiresAt: null });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([mockToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data[0].expiresAt).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log audit trail with count, sorting and requestedById', async () => {
      // Given (Arrange)
      const query = createValidQuery({ requestedById: 'admin_audit123' });
      const mockTokens = [createMockToken(), createMockToken({ name: 'Second' })];
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult(mockTokens, 50)));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('Admin listed access tokens');
      expect(logMessage).toContain('count: 2');
      expect(logMessage).toContain('total: 50');
      expect(logMessage).toContain('sort: createdAt/desc');
      expect(logMessage).toContain('by: admin_audit123');
    });

    it('should log inactiveDays filter in audit trail', async () => {
      // Given (Arrange)
      const query = createValidQuery({ inactiveDays: 30, requestedById: 'admin_audit123' });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('inactive>30d');
    });

    it('should log error when repository fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.fail('DB Error'));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error.mock.calls[0][0]).toContain('Failed to list access tokens');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockTokenRepository.findAllPaginated.mockRejectedValue(new Error('Unexpected DB crash'));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unexpected DB crash');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle null repository result', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(null as unknown as ServerAccessTokenPaginatedResult));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unexpected null result');
    });
  });

  describe('Sorting', () => {
    it('should request tokens sorted by createdAt DESC by default', async () => {
      // Given (Arrange) - Tokens werden vom Repository bereits sortiert zurückgegeben
      const query = createValidQuery();
      const olderToken = createMockToken({ name: 'Older Token' });
      const newerToken = createMockToken({ name: 'Newer Token' });

      // Repository gibt bereits sortiert zurück (neueste zuerst)
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([newerToken, olderToken])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.data).toHaveLength(2);
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      );
    });

    it('should pass custom sorting to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({ sortBy: 'name', sortOrder: 'asc' });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      );
    });

    it('should pass lastUsedAt sorting to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({ sortBy: 'lastUsedAt', sortOrder: 'desc' });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'lastUsedAt',
          sortOrder: 'desc',
        }),
      );
    });
  });

  describe('Filtering', () => {
    it('should pass inactiveDays filter to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({ inactiveDays: 30 });
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          inactiveDays: 30,
        }),
      );
    });

    it('should not pass inactiveDays when not specified', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockTokenRepository.findAllPaginated.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockTokenRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          inactiveDays: null,
        }),
      );
    });
  });
});

describe('GetTokenListQuery', () => {
  describe('create() - Validation', () => {
    it('should create query with minimal parameters', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.requestedById).toBe('admin_123');
      expect(result.value!.page).toBe(1);
      expect(result.value!.limit).toBe(20);
      expect(result.value!.sortBy).toBe('createdAt');
      expect(result.value!.sortOrder).toBe('desc');
      expect(result.value!.inactiveDays).toBeNull();
    });

    it('should create query with custom pagination', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        page: 3,
        limit: 50,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.page).toBe(3);
      expect(result.value!.limit).toBe(50);
    });

    it('should fail when requestedById is empty', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: '',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_REQUESTED_BY_REQUIRED');
    });

    it('should fail when requestedById is whitespace only', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: '   ',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_REQUESTED_BY_REQUIRED');
    });

    it('should fail when page is less than 1', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        page: 0,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_PAGE');
    });

    it('should fail when page is negative', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        page: -1,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_PAGE');
    });

    it('should fail when limit exceeds maximum', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        limit: 101,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_LIMIT');
    });

    it('should fail when limit is less than 1', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        limit: 0,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_LIMIT');
    });

    it('should accept limit at maximum boundary (100)', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        limit: 100,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.limit).toBe(100);
    });

    it('should accept limit at minimum boundary (1)', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        limit: 1,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.limit).toBe(1);
    });

    it('should trim requestedById whitespace', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: '  admin_123  ',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.requestedById).toBe('admin_123');
    });

    it('should fail when requestedById is too short (less than 8 characters)', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin', // 5 Zeichen - zu kurz
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_REQUESTED_BY_TOO_SHORT');
    });

    it('should accept requestedById with exactly 8 characters', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_12', // 8 Zeichen - minimal gueltig
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.requestedById).toBe('admin_12');
    });
  });

  describe('create() - Sorting Validation', () => {
    it('should create query with custom sortBy', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        sortBy: 'lastUsedAt',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.sortBy).toBe('lastUsedAt');
    });

    it('should create query with sortBy name', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        sortBy: 'name',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.sortBy).toBe('name');
    });

    it('should fail when sortBy is invalid', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        sortBy: 'invalid' as 'createdAt',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_SORT_BY');
    });

    it('should create query with sortOrder asc', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        sortOrder: 'asc',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.sortOrder).toBe('asc');
    });

    it('should fail when sortOrder is invalid', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        sortOrder: 'invalid' as 'asc',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_SORT_ORDER');
    });
  });

  describe('create() - InactiveDays Validation', () => {
    it('should create query with valid inactiveDays', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        inactiveDays: 30,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.inactiveDays).toBe(30);
    });

    it('should accept inactiveDays at minimum boundary (1)', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        inactiveDays: 1,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.inactiveDays).toBe(1);
    });

    it('should fail when inactiveDays is 0', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        inactiveDays: 0,
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_INACTIVE_DAYS');
    });

    it('should fail when inactiveDays is negative', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        inactiveDays: -5,
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_INACTIVE_DAYS');
    });

    it('should fail when inactiveDays is not an integer', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        inactiveDays: 5.5,
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_INACTIVE_DAYS');
    });

    it('should accept undefined inactiveDays as null', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        requestedById: 'admin_123',
        inactiveDays: undefined,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.inactiveDays).toBeNull();
    });
  });

  describe('create() - Combined Parameters', () => {
    it('should create query with all parameters', () => {
      // Given & When
      const result = GetTokenListQuery.create({
        page: 2,
        limit: 50,
        sortBy: 'lastUsedAt',
        sortOrder: 'asc',
        inactiveDays: 30,
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.page).toBe(2);
      expect(result.value!.limit).toBe(50);
      expect(result.value!.sortBy).toBe('lastUsedAt');
      expect(result.value!.sortOrder).toBe('asc');
      expect(result.value!.inactiveDays).toBe(30);
      expect(result.value!.requestedById).toBe('admin_123');
    });
  });
});
