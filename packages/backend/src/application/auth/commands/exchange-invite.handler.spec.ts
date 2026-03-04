import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Result } from '@/domain/common/result';
import { InviteCode } from '@/domain/aggregates/invite-code.aggregate';
import { InviteCodeId } from '@/domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@/domain/value-objects/invite-code-value';
import type { IInviteCodeRepository } from '@/domain/repositories/i-invite-code.repository';
import type { IServerAccessTokenRepository } from '@/domain/repositories/i-server-access-token.repository';
import type { IRuntimeConfigPort } from '@/domain/ports/i-runtime-config.port';
import { INVITE_CODE_REPOSITORY, RUNTIME_CONFIG, SERVER_ACCESS_TOKEN_REPOSITORY } from '@/infrastructure/di-tokens';
import { ExchangeInviteHandler } from './exchange-invite.handler';
import type { ExchangeInviteDto } from './dto/exchange-invite.dto';

// Mock bcrypt für deterministische Tests
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock CUID2 für Jest Kompatibilität
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    // Generiere gültiges CUID2 Format: 24 lowercase alphanumerische Zeichen
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
}));

describe('ExchangeInviteHandler', () => {
  let handler: ExchangeInviteHandler;
  let mockInviteRepo: jest.Mocked<IInviteCodeRepository>;
  let mockTokenRepo: jest.Mocked<IServerAccessTokenRepository>;
  let mockRuntimeConfig: jest.Mocked<IRuntimeConfigPort>;

  beforeEach(async () => {
    jest.clearAllMocks(); // WICHTIG: Mock Reset (AC6 Pattern)

    // Mock Repositories
    mockInviteRepo = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAllActive: jest.fn(),
      findByCreator: jest.fn(),
      save: jest.fn(),
      existsByCode: jest.fn(),
      countActive: jest.fn(),
      findAll: jest.fn(),
      markAsUsedAtomic: jest.fn(),
    } as unknown as jest.Mocked<IInviteCodeRepository>;

    mockTokenRepo = {
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
    } as unknown as jest.Mocked<IServerAccessTokenRepository>;

    mockRuntimeConfig = {
      getString: jest.fn((key: string, fallback?: string) => {
        if (key === 'SERVER_NAME') return 'Bluelight Hub';
        if (key === 'APP_URL') return 'http://localhost:3091';
        return fallback ?? '';
      }),
    };

    // Bcrypt Mock: Default Success (exakte 60 Zeichen bcrypt Format)
    mockedBcrypt.hash.mockResolvedValue('$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS' as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeInviteHandler,
        { provide: INVITE_CODE_REPOSITORY, useValue: mockInviteRepo },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepo },
        { provide: RUNTIME_CONFIG, useValue: mockRuntimeConfig },
      ],
    }).compile();

    handler = module.get<ExchangeInviteHandler>(ExchangeInviteHandler);
  });

  /**
   * Helper: Erstellt ein gültiges InviteCode Aggregate
   */
  function _createValidInviteCode(overrides: { usedCount?: number; expiresAt?: Date; maxUses?: number } = {}): InviteCode {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24); // 1 Tag in Zukunft

    const inviteCodeId = InviteCodeId.create().value!;
    const inviteCodeValue = InviteCodeValue.generate().value!;

    return InviteCode.reconstruct({
      id: inviteCodeId,
      code: inviteCodeValue,
      expiresAt: overrides.expiresAt ?? futureDate,
      maxUses: overrides.maxUses ?? 1,
      usedCount: overrides.usedCount ?? 0,
      createdById: 'admin-user-id-123',
      label: 'Test Invite',
      isRevoked: false,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Helper: Erstellt ein gültiges ExchangeInviteDto
   */
  function createValidDto(inviteCode = 'INV12345'): ExchangeInviteDto {
    return { inviteCode };
  }

  describe('execute() - Success Cases (AC1)', () => {
    it('should exchange valid invite code successfully', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      // Mock atomic marking success - returns inviteCodeId
      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.accessToken).toBeDefined();
      expect(result.value?.serverInfo).toBeDefined();
      expect(mockInviteRepo.markAsUsedAtomic).toHaveBeenCalledTimes(1);
      expect(mockTokenRepo.saveWithInviteCode).toHaveBeenCalledTimes(1);
      expect(mockTokenRepo.saveWithInviteCode).toHaveBeenCalledWith(expect.anything(), inviteCodeId);
    });

    it('should return access token with blh_ prefix', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.accessToken).toMatch(/^blh_[a-z0-9]{24}$/);
    });

    it('should include serverInfo in response', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.serverInfo).toEqual({
        name: expect.any(String),
        version: expect.any(String),
        baseUrl: expect.any(String),
      });
    });

    it('should call markAsUsedAtomic with correct InviteCodeValue', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockInviteRepo.markAsUsedAtomic).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            value: 'ABC12345',
          }),
        }),
      );
    });
  });

  describe('execute() - Validation Errors (AC2-AC4)', () => {
    it('should fail when invite code is expired (AC2)', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');

      // Atomic marking detects expired code
      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.fail('INVITE_EXPIRED'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_EXPIRED');
      expect(mockTokenRepo.save).not.toHaveBeenCalled();
    });

    it('should fail when invite code is already used (AC3)', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');

      // Atomic marking detects already used code (Race-Condition-safe!)
      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.fail('INVITE_ALREADY_USED'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_ALREADY_USED');
      expect(mockTokenRepo.save).not.toHaveBeenCalled();
    });

    it('should fail when invite code is invalid/not found (AC4)', async () => {
      // Given (Arrange)
      const dto = createValidDto('INVALID1');

      // Atomic marking detects non-existent code
      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.fail('INVITE_INVALID'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_INVALID');
      expect(mockTokenRepo.save).not.toHaveBeenCalled();
    });

    it('should fail when invite code format is invalid', async () => {
      // Given (Arrange)
      const dto = createValidDto('SHORT'); // Nur 5 Zeichen statt 8

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_LENGTH');
      expect(mockInviteRepo.markAsUsedAtomic).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle repository errors gracefully', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.fail('DATABASE_ERROR'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('DATABASE_ERROR');
    });

    it('should generate unique tokens for each exchange', async () => {
      // Given (Arrange)
      const dto1 = createValidDto('ABC12345');
      const dto2 = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result1 = await handler.execute(dto1);
      const result2 = await handler.execute(dto2);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value?.accessToken).not.toBe(result2.value?.accessToken);
    });

    it('should hash token with bcrypt before storing', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // bcrypt.hash() sollte aufgerufen werden (exakte 60 Zeichen)
      mockedBcrypt.hash.mockResolvedValue('$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS' as never);

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(expect.stringMatching(/^blh_/), 10);
      expect(mockTokenRepo.saveWithInviteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: expect.objectContaining({
            value: expect.stringMatching(/^\$2a\$10\$/), // bcrypt format
          }),
        }),
        inviteCodeId,
      );
    });

    it('should handle bcrypt errors gracefully', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockedBcrypt.hash.mockRejectedValue(new Error('Bcrypt failed'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SERVER_ERROR');
      expect(mockTokenRepo.saveWithInviteCode).not.toHaveBeenCalled();
    });

    it('should fail when token repository saveWithInviteCode fails', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.fail('Token save failed'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('DATABASE_ERROR');
    });

    it('should handle empty invite code', async () => {
      // Given (Arrange)
      const dto = createValidDto('');

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_EMPTY');
      expect(mockInviteRepo.markAsUsedAtomic).not.toHaveBeenCalled();
    });
  });

  describe('execute() - ServerAccessToken Creation', () => {
    it('should create ServerAccessToken with correct name', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepo.saveWithInviteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Invite Exchange:'),
        }),
        inviteCodeId,
      );
    });

    it('should create ServerAccessToken without expiration', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepo.saveWithInviteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: null, // Token läuft nie ab
        }),
        inviteCodeId,
      );
    });
  });

  describe('execute() - Token Hash Validation', () => {
    it('should fail when TokenHash validation fails', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));

      // Mock bcrypt to return invalid hash format
      mockedBcrypt.hash.mockResolvedValue('invalid-bcrypt-format' as never);

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SERVER_ERROR');
    });
  });

  describe('execute() - Concurrent Exchange Protection (AC6)', () => {
    it('should handle invite code that was used between validation and marking', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');

      // Simuliere dass markAsUsedAtomic() fehlschlägt weil Code parallel verwendet wurde
      // Die atomare Operation in der DB erkennt dass kein Update möglich ist (count = 0)
      // weil ein paralleler Request den Code bereits als verwendet markiert hat
      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.fail('INVITE_ALREADY_USED'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      // Der Handler gibt INVITE_ALREADY_USED zurück - Race-Condition korrekt verhindert!
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_ALREADY_USED');
      expect(mockTokenRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Runtime Config', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use runtime config values for serverInfo', async () => {
      // Given (Arrange)
      mockRuntimeConfig.getString.mockImplementation((key: string, fallback?: string) => {
        if (key === 'SERVER_NAME') return 'Test Server';
        if (key === 'APP_URL') return 'https://test.example.com';
        return fallback ?? '';
      });
      process.env.npm_package_version = '2.0.0';

      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.serverInfo).toEqual({
        name: 'Test Server',
        version: '2.0.0',
        baseUrl: 'https://test.example.com',
      });
    });

    it('should use fallback values when runtime config has no values', async () => {
      // Given (Arrange)
      mockRuntimeConfig.getString.mockImplementation((_key: string, fallback?: string) => fallback ?? '');
      delete process.env.npm_package_version;

      const dto = createValidDto('ABC12345');
      const inviteCodeId = 'inv_test123456789012345';

      mockInviteRepo.markAsUsedAtomic.mockResolvedValue(Result.ok(inviteCodeId));
      mockTokenRepo.saveWithInviteCode.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.serverInfo).toEqual({
        name: 'Bluelight Hub',
        version: '1.0.0',
        baseUrl: 'http://localhost:3091',
      });
    });
  });
});
