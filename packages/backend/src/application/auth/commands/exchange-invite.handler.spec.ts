import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Result } from '@/domain/common/result';
import { InviteCode } from '@/domain/aggregates/invite-code.aggregate';
import { ServerAccessToken } from '@/domain/aggregates/server-access-token.aggregate';
import { InviteCodeId } from '@/domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@/domain/value-objects/invite-code-value';
import { TokenHash } from '@/domain/value-objects/token-hash';
import type { IInviteCodeRepository } from '@/domain/repositories/i-invite-code.repository';
import type { IServerAccessTokenRepository } from '@/domain/repositories/i-server-access-token.repository';
import { INVITE_CODE_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY } from '@/infrastructure/di-tokens';
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
    } as unknown as jest.Mocked<IInviteCodeRepository>;

    mockTokenRepo = {
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
      countActive: jest.fn(),
    } as unknown as jest.Mocked<IServerAccessTokenRepository>;

    // Bcrypt Mock: Default Success (exakte 60 Zeichen bcrypt Format)
    mockedBcrypt.hash.mockResolvedValue('$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS' as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangeInviteHandler, { provide: INVITE_CODE_REPOSITORY, useValue: mockInviteRepo }, { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepo }],
    }).compile();

    handler = module.get<ExchangeInviteHandler>(ExchangeInviteHandler);
  });

  /**
   * Helper: Erstellt ein gültiges InviteCode Aggregate
   */
  function createValidInviteCode(overrides: { usedCount?: number; expiresAt?: Date; maxUses?: number } = {}): InviteCode {
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
      const mockInviteCode = createValidInviteCode();

      // Mock repository to accept any InviteCodeValue
      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.accessToken).toBeDefined();
      expect(result.value?.serverInfo).toBeDefined();
      expect(mockInviteRepo.save).toHaveBeenCalledTimes(1);
      expect(mockTokenRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should return access token with blh_ prefix', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.accessToken).toMatch(/^blh_[a-z0-9]{24}$/);
    });

    it('should include serverInfo in response', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

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

    it('should increment invite code useCount', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode({ usedCount: 0, maxUses: 5 });

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockInviteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          usedCount: 1, // Increment von 0 → 1
        }),
      );
    });
  });

  describe('execute() - Validation Errors (AC2-AC4)', () => {
    it('should fail when invite code is expired (AC2)', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 24); // 1 Tag in Vergangenheit
      const expiredInvite = createValidInviteCode({ expiresAt: pastDate });

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(expiredInvite));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_EXPIRED');
      expect(mockTokenRepo.save).not.toHaveBeenCalled();
      expect(mockInviteRepo.save).not.toHaveBeenCalled();
    });

    it('should fail when invite code is already used (AC3)', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const usedInvite = createValidInviteCode({ usedCount: 1, maxUses: 1 });

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(usedInvite));

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

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(null));

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
      expect(mockInviteRepo.findByCode).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle repository errors gracefully', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');

      mockInviteRepo.findByCode.mockImplementation(async () => Result.fail('Database connection failed'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SERVER_ERROR');
    });

    it('should generate unique tokens for each exchange', async () => {
      // Given (Arrange)
      const dto1 = createValidDto('ABC12345');
      const dto2 = createValidDto('ABC12345');
      const mockInviteCode1 = createValidInviteCode({ maxUses: 10 });
      const mockInviteCode2 = createValidInviteCode({ maxUses: 10 });

      mockInviteRepo.findByCode.mockImplementationOnce(async () => Result.ok(mockInviteCode1)).mockImplementationOnce(async () => Result.ok(mockInviteCode2));

      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

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
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

      // bcrypt.hash() sollte aufgerufen werden (exakte 60 Zeichen)
      mockedBcrypt.hash.mockResolvedValue('$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS' as never);

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(expect.stringMatching(/^blh_/), 10);
      expect(mockTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: expect.objectContaining({
            value: expect.stringMatching(/^\$2a\$10\$/), // bcrypt format
          }),
        }),
      );
    });

    it('should handle bcrypt errors gracefully', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockedBcrypt.hash.mockRejectedValue(new Error('Bcrypt failed'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SERVER_ERROR');
      expect(mockInviteRepo.save).not.toHaveBeenCalled();
    });

    it('should fail when invite repository save fails', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.fail('DB Error'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SERVER_ERROR');
      expect(mockTokenRepo.save).not.toHaveBeenCalled();
    });

    it('should fail when token repository save fails', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.fail('Token save failed'));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SERVER_ERROR');
    });

    it('should handle empty invite code', async () => {
      // Given (Arrange)
      const dto = createValidDto('');

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_EMPTY');
      expect(mockInviteRepo.findByCode).not.toHaveBeenCalled();
    });
  });

  describe('execute() - ServerAccessToken Creation', () => {
    it('should create ServerAccessToken with correct name', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Invite Exchange:'),
        }),
      );
    });

    it('should create ServerAccessToken without expiration', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: null, // Token läuft nie ab
        }),
      );
    });
  });

  describe('execute() - Token Hash Validation', () => {
    it('should fail when TokenHash validation fails', async () => {
      // Given (Arrange)
      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));

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

      // Erstelle einen Code der beim ersten Check valid ist
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const inviteCodeId = InviteCodeId.create().value!;
      const inviteCodeValue = InviteCodeValue.generate().value!;

      // Erstelle Invite-Code mit maxUses=1 und usedCount=0
      const mockInviteCode = InviteCode.reconstruct({
        id: inviteCodeId,
        code: inviteCodeValue,
        expiresAt: futureDate,
        maxUses: 1,
        usedCount: 0, // Noch nicht verwendet
        createdById: 'admin-user-id-123',
        label: 'Test Invite',
        isRevoked: false,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));

      // Simuliere dass der Code bereits verwendet wurde (use() wurde bereits aufgerufen)
      // Dies passiert wenn zwischen findByCode und use() ein paralleler Request den Code verwendet
      mockInviteCode.use(); // Erhöht usedCount auf 1

      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(dto);

      // Then (Assert)
      // Der Handler sollte trotzdem erfolgreich sein, da use() idempotent ist
      // und der Handler prüft ob usedCount < maxUses BEVOR use() aufgerufen wird
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_ALREADY_USED');
    });
  });

  describe('execute() - Environment Variables', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use environment variables for serverInfo', async () => {
      // Given (Arrange)
      process.env.SERVER_NAME = 'Test Server';
      process.env.npm_package_version = '2.0.0';
      process.env.APP_URL = 'https://test.example.com';

      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

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

    it('should use default values when environment variables are missing', async () => {
      // Given (Arrange)
      delete process.env.SERVER_NAME;
      delete process.env.npm_package_version;
      delete process.env.APP_URL;

      const dto = createValidDto('ABC12345');
      const mockInviteCode = createValidInviteCode();

      mockInviteRepo.findByCode.mockImplementation(async () => Result.ok(mockInviteCode));
      mockInviteRepo.save.mockResolvedValue(Result.ok(undefined));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));

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
