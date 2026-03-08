// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Result } from '@domain/common/result';
import { InviteCodeCreatedEvent } from '@domain/events/invite-code-created.event';
import { INVITE_CODE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateInviteHandler } from '../create-invite.handler';
import { CreateInviteCommand } from '../create-invite.command';
import { INVITE_ERROR_CODES } from '../../errors/invite-error.codes';
import { expectDefined, expectSuccess, getMockCallArg, getRequiredLogMessage } from './helpers/result-test.helper';

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

describe('CreateInviteHandler', () => {
  let handler: CreateInviteHandler;
  let mockInviteCodeRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
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
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockInviteCodeRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByCode: jest.fn(),
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
        // Transaction Mock - führt Callback mit Mock Transaction Context aus
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

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'http://localhost:3091';
        if (key === 'FRONTEND_URL') return 'http://localhost:3090';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInviteHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: INVITE_CODE_REPOSITORY, useValue: mockInviteCodeRepository },
        { provide: LOGGER, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    handler = module.get<CreateInviteHandler>(CreateInviteHandler);
  });

  /**
   * Helper: Erstellt einen gültigen CreateInviteCommand
   */
  function createValidCommand(
    overrides: Partial<{
      expiresAt: Date;
      maxUses: number;
      label: string;
      createdById: string;
    }> = {},
  ): CreateInviteCommand {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    return expectSuccess(
      CreateInviteCommand.create({
        expiresAt: futureDate,
        maxUses: 10,
        createdById: 'user_abc123def456ghi789jkl012',
        label: 'Test Invite',
        ...overrides,
      }),
    );
  }

  describe('execute() - Success Cases', () => {
    it('should create invite code successfully with valid command', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBeDefined();
      expect(result.value?.code).toBeDefined();
      expect(result.value?.code).toHaveLength(8);
      expect(result.value?.maxUses).toBe(10);
      expect(result.value?.useCount).toBe(0);
    });

    it('should return response with correct deepLink format', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.deepLink).toBeDefined();
      expect(result.value?.deepLink).toContain('bluelight://connect?');
      expect(result.value?.deepLink).toContain('url=');
      expect(result.value?.deepLink).toContain('invite=');
      expect(result.value?.deepLink).toContain('expires=');
    });

    it('should return response with correct webLink format', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.webLink).toBeDefined();
      expect(result.value?.webLink).toContain('http://localhost:3090');
      expect(result.value?.webLink).toContain('server=');
      expect(result.value?.webLink).toContain('invite=');
    });

    it('should include code in deepLink and webLink', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const code = result.value?.code;
      expect(result.value?.deepLink).toContain(`invite=${code}`);
      expect(result.value?.webLink).toContain(`invite=${code}`);
    });

    it('should return correct expiresAt in ISO format', async () => {
      // Given (Arrange)
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);
      const command = createValidCommand({ expiresAt: futureDate });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.expiresAt).toBe(futureDate.toISOString());
    });

    it('should return createdAt in ISO format', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.createdAt).toBeDefined();
      // ISO Format prüfen
      const createdAt = result.value?.createdAt;
      expect(createdAt).toBeDefined();
      expect(() => new Date(expectDefined(createdAt))).not.toThrow();
    });

    it('should include label in response when provided', async () => {
      // Given (Arrange)
      const command = createValidCommand({ label: 'Onboarding Team Nord' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe('Onboarding Team Nord');
    });

    it('should have undefined label when not provided', async () => {
      // Given (Arrange)
      const command = createValidCommand({ label: undefined });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBeUndefined();
    });
  });

  describe('Repository Interaction', () => {
    it('should call inviteCodeRepository.save with InviteCode aggregate', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockInviteCodeRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = getMockCallArg(mockInviteCodeRepository.save, 0, 0);
      expect(savedAggregate).toBeDefined();
      expect(savedAggregate.code).toBeDefined();
      expect(savedAggregate.maxUses).toBe(10);
    });

    it('should call inviteCodeRepository.save with transaction context', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      const txMarker = { isTx: true };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const txContext = getMockCallArg(mockInviteCodeRepository.save, 0, 1);
      expect(txContext).toBe(txMarker);
    });

    it('should return failure when repository.save fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockInviteCodeRepository.save.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
    });

    it('should return SAVE_FAILED error code when save fails without message', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockInviteCodeRepository.save.mockResolvedValue(Result.fail(undefined as unknown as string));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.SAVE_FAILED);
    });
  });

  describe('Domain Events', () => {
    it('should save InviteCodeCreatedEvent to outbox', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = getMockCallArg(mockOutboxRepository.save, 0, 0);
      expect(Array.isArray(savedEvents)).toBe(true);
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(InviteCodeCreatedEvent);
    });

    it('should include correct data in InviteCodeCreatedEvent', async () => {
      // Given (Arrange)
      const command = createValidCommand({
        maxUses: 25,
        label: 'Event Test Label',
      });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = getMockCallArg(mockOutboxRepository.save, 0, 0);
      const event = savedEvents[0] as InviteCodeCreatedEvent;

      expect(event.maxUses).toBe(25);
      expect(event.label).toBe('Event Test Label');
      expect(event.createdById).toBe(command.createdById);
    });

    it('should have masked code in event (security)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = getMockCallArg(mockOutboxRepository.save, 0, 0);
      const event = savedEvents[0] as InviteCodeCreatedEvent;

      // Code sollte maskiert sein (z.B. "ABC1****")
      expect(event.codeMasked).toMatch(/^[A-Z0-9]{4}\*{4}$/);
      expect(event.codeMasked).not.toBe(result.value?.code);
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
      const txContext = getMockCallArg(mockOutboxRepository.save, 0, 1);
      expect(txContext).toBe(txMarker);
    });

    it('should not save events when repository fails', async () => {
      // Given (Arrange)
      const command = createValidCommand();
      mockInviteCodeRepository.save.mockResolvedValue(Result.fail('DB Error'));

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
      mockInviteCodeRepository.save.mockResolvedValue(Result.fail('Repository Error'));

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
    it('should log invite code creation with masked code', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('Invite code created');
      expect(logMessage).toMatch(/code: [A-Z0-9]{4}\*{4}/);
    });

    it('should log createdById in audit message', async () => {
      // Given (Arrange)
      const command = createValidCommand({ createdById: 'user_testadmin123' });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('by: user_testadmin123');
    });

    it('should log maxUses in audit message', async () => {
      // Given (Arrange)
      const command = createValidCommand({ maxUses: 42 });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const logMessage = getRequiredLogMessage(mockLogger.log);
      expect(logMessage).toContain('maxUses: 42');
    });

    it('should not log raw code (security)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const rawCode = result.value?.code;
      const logMessage = getRequiredLogMessage(mockLogger.log);

      // Der volle Code sollte NICHT im Log erscheinen
      expect(logMessage).not.toContain(rawCode);
    });
  });

  describe('ConfigService Usage', () => {
    it('should use APP_URL from config for deepLink', async () => {
      // Given (Arrange)
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'https://api.example.de';
        if (key === 'FRONTEND_URL') return 'https://app.example.de';
        return undefined;
      });
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.deepLink).toContain(encodeURIComponent('https://api.example.de'));
    });

    it('should use FRONTEND_URL from config for webLink', async () => {
      // Given (Arrange)
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'https://api.example.de';
        if (key === 'FRONTEND_URL') return 'https://app.example.de';
        return undefined;
      });
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.webLink).toContain('https://app.example.de');
    });

    it('should fail when APP_URL is not configured', async () => {
      // Given (Arrange)
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_URL') return undefined;
        if (key === 'FRONTEND_URL') return 'http://localhost:3090';
        return undefined;
      });
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.CREATION_FAILED);
      expect(mockLogger.error).toHaveBeenCalledWith('Missing required configuration: APP_URL or FRONTEND_URL. Cannot generate invite links.');
    });

    it('should fail when FRONTEND_URL is not configured', async () => {
      // Given (Arrange)
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'http://localhost:3091';
        if (key === 'FRONTEND_URL') return undefined;
        return undefined;
      });
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.CREATION_FAILED);
      expect(mockLogger.error).toHaveBeenCalledWith('Missing required configuration: APP_URL or FRONTEND_URL. Cannot generate invite links.');
    });

    it('should fail when both URLs are not configured', async () => {
      // Given (Arrange)
      mockConfigService.get.mockReturnValue(undefined);
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.CREATION_FAILED);
      expect(mockLogger.error).toHaveBeenCalledWith('Missing required configuration: APP_URL or FRONTEND_URL. Cannot generate invite links.');
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
      const response = expectSuccess(result);

      // Prüfe alle erforderlichen Felder
      expect(response.id).toBeDefined();
      expect(response.code).toBeDefined();
      expect(response.expiresAt).toBeDefined();
      expect(response.maxUses).toBeDefined();
      expect(response.useCount).toBeDefined();
      expect(response.createdAt).toBeDefined();
      expect(response.deepLink).toBeDefined();
      expect(response.webLink).toBeDefined();
    });

    it('should have id in correct format (inv_ prefix)', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.id).toMatch(/^inv_[a-z0-9]{24}$/);
    });

    it('should have code as 8-character uppercase alphanumeric', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should have useCount as 0 for new invites', async () => {
      // Given (Arrange)
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.useCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum maxUses (1)', async () => {
      // Given (Arrange)
      const command = createValidCommand({ maxUses: 1 });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(1);
    });

    it('should handle maximum maxUses (100)', async () => {
      // Given (Arrange)
      const command = createValidCommand({ maxUses: 100 });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(100);
    });

    it('should handle long label (100 characters)', async () => {
      // Given (Arrange)
      const longLabel = 'A'.repeat(100);
      const command = createValidCommand({ label: longLabel });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(longLabel);
    });

    it('should handle special characters in label', async () => {
      // Given (Arrange)
      const specialLabel = 'Test Invite äöü ß € @#';
      const command = createValidCommand({ label: specialLabel });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(specialLabel);
    });

    it('should handle far future expiresAt', async () => {
      // Given (Arrange)
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 10);
      const command = createValidCommand({ expiresAt: farFuture });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.expiresAt).toBe(farFuture.toISOString());
    });
  });

  describe('URL Encoding', () => {
    it('should properly encode APP_URL in deepLink', async () => {
      // Given (Arrange)
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'https://api.example.de:8080/path';
        if (key === 'FRONTEND_URL') return 'http://localhost:3090';
        return undefined;
      });
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // URL sollte encoded sein
      expect(result.value?.deepLink).toContain(encodeURIComponent('https://api.example.de:8080/path'));
    });

    it('should properly encode expiresAt in deepLink', async () => {
      // Given (Arrange)
      const futureDate = new Date('2026-12-31T23:59:59.000Z');
      const command = createValidCommand({ expiresAt: futureDate });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.deepLink).toContain(encodeURIComponent(futureDate.toISOString()));
    });

    it('should properly encode server URL in webLink', async () => {
      // Given (Arrange)
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'https://api.example.de:8080/path';
        if (key === 'FRONTEND_URL') return 'http://localhost:3090';
        return undefined;
      });
      const command = createValidCommand();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.webLink).toContain(encodeURIComponent('https://api.example.de:8080/path'));
    });
  });
});
