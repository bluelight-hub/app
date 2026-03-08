// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { InviteCode } from '@domain/aggregates/invite-code.aggregate';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';
import { InviteCodeRevokedEvent } from '@domain/events/invite-code-revoked.event';
import { INVITE_CODE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RevokeInviteHandler } from '../revoke-invite.handler';
import { RevokeInviteCommand } from '../revoke-invite.command';
import { expectDefined, expectSuccess, getMockCallArg, getRequiredLogMessage } from './helpers/result-test.helper';

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

describe('RevokeInviteHandler', () => {
  let handler: RevokeInviteHandler;
  let mockInviteCodeRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    findAll: jest.Mock;
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

    mockInviteCodeRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
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
        RevokeInviteHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: INVITE_CODE_REPOSITORY, useValue: mockInviteCodeRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<RevokeInviteHandler>(RevokeInviteHandler);
  });

  /**
   * Helper: Erstellt einen gueltigen RevokeInviteCommand
   */
  function createValidCommand(
    overrides: Partial<{
      inviteCodeId: string;
      revokedById: string;
    }> = {},
  ): RevokeInviteCommand {
    return expectSuccess(
      RevokeInviteCommand.create({
        inviteCodeId: 'inv_abc123def456ghi789jkl012',
        revokedById: 'user_admin123def456ghi789j',
        ...overrides,
      }),
    );
  }

  /**
   * Helper: Erstellt ein aktives InviteCode Aggregate zur Rekonstruktion
   */
  function createActiveInviteCode(
    overrides: Partial<{
      id: string;
      code: string;
      usedCount: number;
      maxUses: number;
      isRevoked: boolean;
      revokedAt: Date | null;
      expiresAt: Date;
    }> = {},
  ): InviteCode {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    const inviteCodeId = expectSuccess(InviteCodeId.create(overrides.id ?? 'inv_abc123def456ghi789jkl012'));
    const inviteCodeValue = expectSuccess(InviteCodeValue.fromString(overrides.code ?? 'ABCD1234'));

    return InviteCode.reconstruct({
      id: inviteCodeId,
      code: inviteCodeValue,
      expiresAt: overrides.expiresAt ?? futureDate,
      maxUses: overrides.maxUses ?? 10,
      usedCount: overrides.usedCount ?? 0,
      createdById: 'user_creator123def456ghi78',
      label: 'Test Invite',
      isRevoked: overrides.isRevoked ?? false,
      revokedAt: overrides.revokedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  describe('execute() - Normal Revoke (Success Cases)', () => {
    it('should revoke active invite code successfully', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBe('inv_abc123def456ghi789jkl012');
      expect(result.value?.status).toBe(InviteCodeStatus.REVOKED);
      expect(result.value?.revokedAt).toBeDefined();
      expect(result.value?.revokedAt).not.toBeNull();
    });

    it('should return masked code in response', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode({ code: 'TEST1234' });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.code).toBe('TEST****');
      expect(result.value?.code).not.toBe('TEST1234');
    });

    it('should call repository.save with updated InviteCode', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockInviteCodeRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = getMockCallArg(mockInviteCodeRepository.save, 0, 0);
      expect(savedAggregate.isRevoked).toBe(true);
    });

    it('should save InviteCodeRevokedEvent to outbox', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = getMockCallArg(mockOutboxRepository.save, 0, 0);
      expect(Array.isArray(savedEvents)).toBe(true);
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(InviteCodeRevokedEvent);
    });

    it('should log audit trail with masked code', async () => {
      // Given (Arrange)
      const command = createValidCommand({ revokedById: 'user_testadmin12345678901' });
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('Invite code revoked');
      expect(logMessage).toContain('id: inv_abc123def456ghi789jkl012');
      expect(logMessage).toMatch(/code: [A-Z0-9]{4}\*{4}/);
      expect(logMessage).toContain('by: user_testadmin12345678901');
    });
  });

  describe('execute() - Already Revoked (Idempotent)', () => {
    it('should succeed for already revoked code (idempotent)', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const revokedAt = new Date();
      const alreadyRevokedCode = createActiveInviteCode({
        isRevoked: true,
        revokedAt: revokedAt,
      });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(alreadyRevokedCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.status).toBe(InviteCodeStatus.REVOKED);
    });

    it('should not emit event for already revoked code', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const alreadyRevokedCode = createActiveInviteCode({
        isRevoked: true,
        revokedAt: new Date(),
      });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(alreadyRevokedCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Keine Events sollten in Outbox gespeichert werden (idempotent)
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('should preserve original revokedAt timestamp for already revoked code', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const originalRevokedAt = new Date('2026-01-01T10:00:00.000Z');
      const alreadyRevokedCode = createActiveInviteCode({
        isRevoked: true,
        revokedAt: originalRevokedAt,
      });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(alreadyRevokedCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.revokedAt).toBe(originalRevokedAt.toISOString());
    });
  });

  describe('execute() - Used Code (Idempotent)', () => {
    it('should succeed for fully used code without changing status', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const usedCode = createActiveInviteCode({
        usedCount: 10,
        maxUses: 10,
      });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(usedCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Status bleibt USED (nicht REVOKED)
      expect(result.value?.status).toBe(InviteCodeStatus.USED);
    });

    it('should not emit event for fully used code', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const usedCode = createActiveInviteCode({
        usedCount: 10,
        maxUses: 10,
      });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(usedCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Keine Events (idempotent, Code war bereits aufgebraucht)
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('should have null revokedAt for used but not explicitly revoked code', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const usedCode = createActiveInviteCode({
        usedCount: 10,
        maxUses: 10,
        isRevoked: false,
        revokedAt: null,
      });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(usedCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.revokedAt).toBeNull();
    });
  });

  describe('execute() - Not Found', () => {
    it('should throw NotFoundException when invite code does not exist', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(null));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      // NotFoundException wird in Transaction geworfen und zu Result.fail konvertiert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
    });

    it('should not save anything when invite code not found', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(null));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockInviteCodeRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Invalid InviteCodeId', () => {
    it('should fail for invalid inviteCodeId format', async () => {
      // Given (Arrange)
      // Wir muessen den Command direkt erstellen um Validierung zu umgehen
      const command = {
        inviteCodeId: 'invalid_id',
        revokedById: 'user_admin123def456ghi789j',
      } as RevokeInviteCommand;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('InviteCodeId');
    });

    it('should not query repository for invalid inviteCodeId', async () => {
      // Given (Arrange)
      const command = {
        inviteCodeId: 'invalid',
        revokedById: 'user_admin123def456ghi789j',
      } as RevokeInviteCommand;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockInviteCodeRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Repository Errors', () => {
    it('should fail when repository.save returns failure', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));
      mockInviteCodeRepository.save.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
    });

    it('should not save events when repository.save fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));
      mockInviteCodeRepository.save.mockResolvedValue(Result.fail('DB Error'));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Behavior', () => {
    it('should execute within a transaction', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should pass transaction context to repository', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      const txMarker = { isTx: true };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const findByIdTx = getMockCallArg(mockInviteCodeRepository.findById, 0, 1);
      expect(findByIdTx).toBe(txMarker);
      const saveTx = getMockCallArg(mockInviteCodeRepository.save, 0, 1);
      expect(saveTx).toBe(txMarker);
    });

    it('should rollback on outbox save error', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));
      mockOutboxRepository.save.mockRejectedValue(new Error('Outbox Error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox Error');
    });
  });

  describe('Domain Events Content', () => {
    it('should include correct data in InviteCodeRevokedEvent', async () => {
      // Given (Arrange)
      const command = createValidCommand({
        inviteCodeId: 'inv_abc123def456ghi789jkl012',
        revokedById: 'user_revoker123456789012',
      });
      const activeInviteCode = createActiveInviteCode({
        id: 'inv_abc123def456ghi789jkl012',
        code: 'REVK1234',
      });
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = getMockCallArg(mockOutboxRepository.save, 0, 0);
      const event = savedEvents[0] as InviteCodeRevokedEvent;

      expect(event.inviteCodeId).toBe('inv_abc123def456ghi789jkl012');
      expect(event.codeMasked).toBe('REVK****');
      expect(event.revokedById).toBe('user_revoker123456789012');
      expect(event.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('Response Structure', () => {
    it('should return all required fields in response', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const response = expectSuccess(result);

      expect(response.id).toBeDefined();
      expect(response.code).toBeDefined();
      expect(response.status).toBeDefined();
      // revokedAt kann null oder string sein
      expect('revokedAt' in response).toBe(true);
    });

    it('should have revokedAt as ISO string for revoked code', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const activeInviteCode = createActiveInviteCode();
      mockInviteCodeRepository.findById.mockResolvedValue(Result.ok(activeInviteCode));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.revokedAt).toBeDefined();
      expect(typeof result.value?.revokedAt).toBe('string');
      // ISO Format pruefen
      expect(() => new Date(expectDefined(result.value?.revokedAt))).not.toThrow();
    });
  });
});

describe('RevokeInviteCommand', () => {
  describe('create() - Validation', () => {
    it('should create command with valid inputs', () => {
      // Given (Arrange)
      const props = {
        inviteCodeId: 'inv_abc123def456ghi789jkl012',
        revokedById: 'user_admin123',
      };

      // When (Act)
      const result = RevokeInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inviteCodeId).toBe('inv_abc123def456ghi789jkl012');
      expect(result.value?.revokedById).toBe('user_admin123');
    });

    it('should fail when inviteCodeId is empty', () => {
      // Given (Arrange)
      const props = {
        inviteCodeId: '',
        revokedById: 'user_admin123',
      };

      // When (Act)
      const result = RevokeInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invite-Code-ID erforderlich');
    });

    it('should fail when inviteCodeId is only whitespace', () => {
      // Given (Arrange)
      const props = {
        inviteCodeId: '   ',
        revokedById: 'user_admin123',
      };

      // When (Act)
      const result = RevokeInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invite-Code-ID erforderlich');
    });

    it('should fail when revokedById is empty', () => {
      // Given (Arrange)
      const props = {
        inviteCodeId: 'inv_abc123def456ghi789jkl012',
        revokedById: '',
      };

      // When (Act)
      const result = RevokeInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Revoker-ID erforderlich');
    });

    it('should fail when revokedById is only whitespace', () => {
      // Given (Arrange)
      const props = {
        inviteCodeId: 'inv_abc123def456ghi789jkl012',
        revokedById: '   ',
      };

      // When (Act)
      const result = RevokeInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Revoker-ID erforderlich');
    });

    it('should trim whitespace from inputs', () => {
      // Given (Arrange)
      const props = {
        inviteCodeId: '  inv_abc123def456ghi789jkl012  ',
        revokedById: '  user_admin123  ',
      };

      // When (Act)
      const result = RevokeInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inviteCodeId).toBe('inv_abc123def456ghi789jkl012');
      expect(result.value?.revokedById).toBe('user_admin123');
    });
  });
});
