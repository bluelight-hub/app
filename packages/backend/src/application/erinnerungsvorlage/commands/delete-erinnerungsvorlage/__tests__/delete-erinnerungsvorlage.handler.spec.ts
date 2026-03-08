// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { DeleteErinnerungsvorlageHandler } from '../delete-erinnerungsvorlage.handler';
import { DeleteErinnerungsvorlageCommand } from '../delete-erinnerungsvorlage.command';
import { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import { ErinnerungsvorlageGeloeschtEvent } from '@domain/erinnerungsvorlage/events/erinnerungsvorlage-geloescht.event';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNGSVORLAGE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('DeleteErinnerungsvorlageHandler', () => {
  let handler: DeleteErinnerungsvorlageHandler;
  let mockVorlageRepository: jest.Mocked<IErinnerungsvorlageRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  const createTestVorlage = () => {
    const userId = UserId.create().value!;
    return Erinnerungsvorlage.create({
      titel: 'Test Vorlage',
      minuten: 30,
      beschreibung: 'Test Beschreibung',
      createdBy: userId,
    }).value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockVorlageRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IErinnerungsvorlageRepository>;

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    } as unknown as jest.Mocked<IOutboxRepository>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteErinnerungsvorlageHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: ERINNERUNGSVORLAGE_REPOSITORY, useValue: mockVorlageRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<DeleteErinnerungsvorlageHandler>(DeleteErinnerungsvorlageHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should soft-delete vorlage successfully', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = DeleteErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        deletedBy: UserId.create().value?.toString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockVorlageRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should fail when vorlage not found', async () => {
      // Given
      mockVorlageRepository.findById.mockResolvedValue(null);
      const commandResult = DeleteErinnerungsvorlageCommand.create({
        vorlageId: 'non-existent',
        deletedBy: UserId.create().value?.toString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(mockVorlageRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when vorlage is already deleted', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      const userId = UserId.create().value!;
      vorlage.softDelete(userId);
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = DeleteErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        deletedBy: userId.toString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(mockVorlageRepository.save).not.toHaveBeenCalled();
    });

    it('should emit ErinnerungsvorlageGeloeschtEvent with correct properties', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const deletedByUserId = UserId.create().value!;
      const commandResult = DeleteErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        deletedBy: deletedByUserId.toString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(ErinnerungsvorlageGeloeschtEvent);

      const event = savedEvents[0] as ErinnerungsvorlageGeloeschtEvent;
      expect(event.vorlageId.toString()).toBe(vorlage.id.toString());
      expect(event.titel).toBe('Test Vorlage');
      expect(event.deletedBy.equals(deletedByUserId)).toBe(true);
    });

    it('should fail when deletedBy is invalid UserId', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = DeleteErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        deletedBy: 'invalid-user-id-format',
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(mockVorlageRepository.save).not.toHaveBeenCalled();
    });

    it('should log successful deletion', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = DeleteErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        deletedBy: UserId.create().value?.toString(),
      });

      // When
      await handler.execute(commandResult.value!);

      // Then
      expect(mockLogger.log).toHaveBeenCalled();
      const logMsg = mockLogger.log.mock.calls[0]?.[0]!;
      expect(logMsg).toContain('Erinnerungsvorlage gelöscht');
    });
  });
});
