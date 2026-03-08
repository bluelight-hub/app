// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { InviteCode } from '@domain/aggregates/invite-code.aggregate';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';
import type { IInviteCodeRepository, InviteCodePaginatedResult } from '@domain/repositories/i-invite-code.repository';
import { INVITE_CODE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { ListInvitesHandler } from '../list-invites.handler';
import { ListInvitesQuery } from '../list-invites.query';

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

describe('ListInvitesHandler', () => {
  let handler: ListInvitesHandler;
  let mockInviteCodeRepository: jest.Mocked<IInviteCodeRepository>;
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  function expectSuccess<T>(result: Result<T>): T {
    expect(result.isSuccess).toBe(true);

    if (result.isFailure) {
      throw new Error(result.error ?? 'Expected successful result');
    }

    return result.value as T;
  }

  function expectDefined<T>(value: T | null | undefined): T {
    expect(value).toBeDefined();

    if (value == null) {
      throw new Error('Expected value to be defined');
    }

    return value;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockInviteCodeRepository = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAllActive: jest.fn(),
      findByCreator: jest.fn(),
      save: jest.fn(),
      existsByCode: jest.fn(),
      countActive: jest.fn(),
      findAll: jest.fn(),
      markAsUsedAtomic: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ListInvitesHandler, { provide: INVITE_CODE_REPOSITORY, useValue: mockInviteCodeRepository }, { provide: LOGGER, useValue: mockLogger }],
    }).compile();

    handler = module.get<ListInvitesHandler>(ListInvitesHandler);
  });

  /**
   * Helper: Erstellt eine gueltige ListInvitesQuery
   */
  function createValidQuery(
    overrides: Partial<{
      filters?: { status?: InviteCodeStatus; createdById?: string };
      sort?: { field: 'createdAt' | 'expiresAt' | 'useCount'; direction: 'asc' | 'desc' };
      pagination?: { page: number; pageSize: number };
      requestedById: string;
    }> = {},
  ): ListInvitesQuery {
    return expectSuccess(
      ListInvitesQuery.create({
        requestedById: 'admin_test123',
        ...overrides,
      }),
    );
  }

  /**
   * Helper: Erstellt ein Mock InviteCode Aggregate
   */
  function createMockInviteCode(
    overrides: Partial<{
      id: string;
      code: string;
      expiresAt: Date;
      maxUses: number;
      usedCount: number;
      createdById: string;
      label: string | null;
      isRevoked: boolean;
      revokedAt: Date | null;
    }> = {},
  ): InviteCode {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    const defaults = {
      id: expectSuccess(InviteCodeId.create()),
      code: expectSuccess(InviteCodeValue.generate()),
      expiresAt: futureDate,
      maxUses: 10,
      usedCount: 0,
      createdById: 'user_creator123',
      label: 'Test Label',
      isRevoked: false,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const props = { ...defaults, ...overrides };

    return InviteCode.reconstruct({
      id: typeof props.id === 'string' ? expectSuccess(InviteCodeId.create(props.id)) : props.id,
      code: typeof props.code === 'string' ? expectSuccess(InviteCodeValue.fromString(props.code)) : props.code,
      expiresAt: props.expiresAt,
      maxUses: props.maxUses,
      usedCount: props.usedCount,
      createdById: props.createdById,
      label: props.label,
      isRevoked: props.isRevoked,
      revokedAt: props.revokedAt,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  /**
   * Helper: Erstellt ein Mock PaginatedResult
   */
  function createPaginatedResult(items: InviteCode[], total?: number, page = 1, pageSize = 20): InviteCodePaginatedResult<InviteCode> {
    const actualTotal = total ?? items.length;
    return {
      items,
      total: actualTotal,
      page,
      pageSize,
      totalPages: Math.ceil(actualTotal / pageSize),
    };
  }

  function getFirstInviteDto(result: Awaited<ReturnType<ListInvitesHandler['execute']>>) {
    const response = expectSuccess(result);
    return expectDefined(response.data[0]);
  }

  function getRequiredLogMessage(mockFn: jest.Mock): string {
    expect(mockFn).toHaveBeenCalled();
    return expectDefined(mockFn.mock.calls[0])?.[0] as string;
  }

  describe('execute() - Success Cases', () => {
    it('should return paginated invite codes successfully', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockInvites = [createMockInviteCode(), createMockInviteCode()];
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult(mockInvites)));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.data).toHaveLength(2);
      expect(result.value?.meta.total).toBe(2);
    });

    it('should return empty list when no codes exist', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.data).toHaveLength(0);
      expect(result.value?.meta.total).toBe(0);
    });

    it('should return masked codes in response', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockInvite = createMockInviteCode();
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const codeInResponse = getFirstInviteDto(result).code;
      // Code sollte maskiert sein (z.B. "ABC1****")
      expect(codeInResponse).toMatch(/^[A-Z0-9]{4}\*{4}$/);
    });

    it('should include computed status in response', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockInvite = createMockInviteCode(); // ACTIVE by default
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(getFirstInviteDto(result).status).toBe(InviteCodeStatus.ACTIVE);
    });

    it('should include correct pagination metadata', async () => {
      // Given (Arrange)
      const query = createValidQuery({
        pagination: { page: 2, pageSize: 5 },
      });
      const mockInvites = [createMockInviteCode()];
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult(mockInvites, 25, 2, 5)));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.meta.page).toBe(2);
      expect(result.value?.meta.pageSize).toBe(5);
      expect(result.value?.meta.total).toBe(25);
      expect(result.value?.meta.totalPages).toBe(5);
    });
  });

  describe('Repository Interaction', () => {
    it('should pass filters to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({
        filters: { status: InviteCodeStatus.ACTIVE, createdById: 'admin_xyz' },
      });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockInviteCodeRepository.findAll).toHaveBeenCalledWith({ status: InviteCodeStatus.ACTIVE, createdById: 'admin_xyz' }, expect.any(Object), expect.any(Object));
    });

    it('should pass sort options to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({
        sort: { field: 'expiresAt', direction: 'asc' },
      });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockInviteCodeRepository.findAll).toHaveBeenCalledWith(
        undefined, // filters ist undefined wenn nicht gesetzt
        { field: 'expiresAt', direction: 'asc' },
        expect.any(Object),
      );
    });

    it('should pass pagination options to repository', async () => {
      // Given (Arrange)
      const query = createValidQuery({
        pagination: { page: 3, pageSize: 15 },
      });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockInviteCodeRepository.findAll).toHaveBeenCalledWith(
        undefined, // filters ist undefined wenn nicht gesetzt
        { field: 'createdAt', direction: 'desc' }, // default sort
        { page: 3, pageSize: 15 },
      );
    });

    it('should return failure when repository fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit trail with count and requestedById', async () => {
      // Given (Arrange)
      const query = createValidQuery({ requestedById: 'admin_audit123' });
      const mockInvites = [createMockInviteCode(), createMockInviteCode()];
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult(mockInvites, 50)));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('Admin listed invite codes');
      expect(logMessage).toContain('count: 2');
      expect(logMessage).toContain('total: 50');
      expect(logMessage).toContain('by: admin_audit123');
    });

    it('should log filter parameters in audit trail', async () => {
      // Given (Arrange)
      const query = createValidQuery({
        filters: { status: InviteCodeStatus.EXPIRED },
        requestedById: 'admin_xyz',
      });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([])));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('status: expired');
    });

    it('should log error when repository fails', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.fail('DB Error'));

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(getRequiredLogMessage(mockLogger.error)).toContain('Failed to list invite codes');
    });
  });

  describe('DTO Mapping', () => {
    it('should map all fields correctly', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const expiresAt = new Date('2026-02-01T12:00:00.000Z');
      const mockInvite = createMockInviteCode({
        expiresAt,
        maxUses: 5,
        usedCount: 2,
        label: 'Team Nord',
        createdById: 'user_creator_abc',
      });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = getFirstInviteDto(result);
      expect(dto.expiresAt).toBe('2026-02-01T12:00:00.000Z');
      expect(dto.maxUses).toBe(5);
      expect(dto.useCount).toBe(2);
      expect(dto.label).toBe('Team Nord');
      expect(dto.createdBy.id).toBe('user_creator_abc');
    });

    it('should handle null label', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockInvite = createMockInviteCode({ label: null });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(getFirstInviteDto(result).label).toBeNull();
    });

    it('should handle revokedAt correctly', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const revokedAt = new Date('2026-01-05T10:00:00.000Z');

      // Erstelle einen widerrufenen Code
      const mockInvite = InviteCode.reconstruct({
        id: expectSuccess(InviteCodeId.create()),
        code: expectSuccess(InviteCodeValue.generate()),
        expiresAt: new Date('2026-02-01'),
        maxUses: 10,
        usedCount: 0,
        createdById: 'user_123',
        label: null,
        isRevoked: true,
        revokedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = getFirstInviteDto(result);
      expect(dto.revokedAt).toBe('2026-01-05T10:00:00.000Z');
      expect(dto.status).toBe(InviteCodeStatus.REVOKED);
    });

    it('should return null revokedAt for non-revoked codes', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const mockInvite = createMockInviteCode({ isRevoked: false, revokedAt: null });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(getFirstInviteDto(result).revokedAt).toBeNull();
    });
  });

  describe('Status Computation', () => {
    it('should return ACTIVE status for valid codes', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const mockInvite = createMockInviteCode({
        expiresAt: futureDate,
        maxUses: 10,
        usedCount: 0,
        isRevoked: false,
      });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(getFirstInviteDto(result).status).toBe(InviteCodeStatus.ACTIVE);
    });

    it('should return USED status when maxUses reached', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const mockInvite = createMockInviteCode({
        expiresAt: futureDate,
        maxUses: 5,
        usedCount: 5, // Vollstaendig aufgebraucht
        isRevoked: false,
      });
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(getFirstInviteDto(result).status).toBe(InviteCodeStatus.USED);
    });

    it('should return EXPIRED status for expired codes', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Gestern abgelaufen

      const mockInvite = InviteCode.reconstruct({
        id: expectSuccess(InviteCodeId.create()),
        code: expectSuccess(InviteCodeValue.generate()),
        expiresAt: pastDate,
        maxUses: 10,
        usedCount: 0,
        createdById: 'user_123',
        label: null,
        isRevoked: false,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(getFirstInviteDto(result).status).toBe(InviteCodeStatus.EXPIRED);
    });

    it('should return REVOKED status for revoked codes (highest priority)', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Abgelaufen UND widerrufen - REVOKED sollte gewinnen
      const mockInvite = InviteCode.reconstruct({
        id: expectSuccess(InviteCodeId.create()),
        code: expectSuccess(InviteCodeValue.generate()),
        expiresAt: pastDate,
        maxUses: 10,
        usedCount: 10,
        createdById: 'user_123',
        label: null,
        isRevoked: true,
        revokedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(createPaginatedResult([mockInvite])));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(getFirstInviteDto(result).status).toBe(InviteCodeStatus.REVOKED);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Given (Arrange)
      const query = createValidQuery();
      mockInviteCodeRepository.findAll.mockRejectedValue(new Error('Unexpected DB crash'));

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
      mockInviteCodeRepository.findAll.mockResolvedValue(Result.ok(null as unknown as InviteCodePaginatedResult<InviteCode>));

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unexpected null result');
    });
  });
});

describe('ListInvitesQuery', () => {
  describe('create() - Validation', () => {
    it('should create query with minimal parameters', () => {
      // Given & When
      const result = ListInvitesQuery.create({
        requestedById: 'admin_123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.requestedById).toBe('admin_123');
      expect(result.value?.pagination.page).toBe(1);
      expect(result.value?.pagination.pageSize).toBe(20);
      expect(result.value?.sort.field).toBe('createdAt');
      expect(result.value?.sort.direction).toBe('desc');
    });

    it('should fail when requestedById is empty', () => {
      // Given & When
      const result = ListInvitesQuery.create({
        requestedById: '',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_REQUESTED_BY_REQUIRED');
    });

    it('should fail when status is invalid', () => {
      // Given & When
      const result = ListInvitesQuery.create({
        requestedById: 'admin_123',
        filters: { status: 'invalid' as InviteCodeStatus },
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_STATUS');
    });

    it('should fail when sort field is invalid', () => {
      // Given & When
      const result = ListInvitesQuery.create({
        requestedById: 'admin_123',
        sort: { field: 'invalid' as 'createdAt', direction: 'asc' },
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_SORT_FIELD');
    });

    it('should fail when page is less than 1', () => {
      // Given & When
      const result = ListInvitesQuery.create({
        requestedById: 'admin_123',
        pagination: { page: 0, pageSize: 20 },
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_PAGE');
    });

    it('should fail when pageSize exceeds maximum', () => {
      // Given & When
      const result = ListInvitesQuery.create({
        requestedById: 'admin_123',
        pagination: { page: 1, pageSize: 101 },
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('QUERY_INVALID_PAGE_SIZE');
    });

    it('should accept valid status filter', () => {
      // Given & When
      const result = ListInvitesQuery.create({
        requestedById: 'admin_123',
        filters: { status: InviteCodeStatus.ACTIVE },
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.filters?.status).toBe(InviteCodeStatus.ACTIVE);
    });

    it('should accept all valid sort fields', () => {
      // Given
      const sortFields: Array<'createdAt' | 'expiresAt' | 'useCount'> = ['createdAt', 'expiresAt', 'useCount'];

      // When & Then
      for (const field of sortFields) {
        const result = ListInvitesQuery.create({
          requestedById: 'admin_123',
          sort: { field, direction: 'asc' },
        });
        expect(result.isSuccess).toBe(true);
        expect(result.value?.sort.field).toBe(field);
      }
    });
  });
});
