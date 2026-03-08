// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { UpdateErinnerungsvorlageHandler } from '../update-erinnerungsvorlage.handler';
import { UpdateErinnerungsvorlageCommand } from '../update-erinnerungsvorlage.command';
import { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import { ErinnerungsvorlageAktualisiertEvent } from '@domain/erinnerungsvorlage/events/erinnerungsvorlage-aktualisiert.event';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNGSVORLAGE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ErinnerungsvorlageResponseFactory } from '@application/erinnerungsvorlage/dto';

describe('UpdateErinnerungsvorlageHandler', () => {
  let handler: UpdateErinnerungsvorlageHandler;
  let mockVorlageRepository: jest.Mocked<IErinnerungsvorlageRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  /** Generiert eine gueltige UserId als String fuer Command-Tests. */
  const generateValidUserIdString = () => UserId.create().value?.toString();

  const createTestVorlage = () => {
    const userId = UserId.create().value!;
    return Erinnerungsvorlage.create({
      titel: 'Original Titel',
      minuten: 30,
      beschreibung: 'Original Beschreibung',
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
        UpdateErinnerungsvorlageHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: ERINNERUNGSVORLAGE_REPOSITORY, useValue: mockVorlageRepository },
        { provide: LOGGER, useValue: mockLogger },
        {
          provide: ErinnerungsvorlageResponseFactory,
          useValue: {
            create: jest.fn().mockImplementation((vorlage) => ({
              id: vorlage.id.toString(),
              titel: vorlage.titel.value,
              minuten: vorlage.minuten,
              beschreibung: vorlage.beschreibung,
              createdBy: vorlage.createdBy.toString(),
              createdAt: vorlage.createdAt.toISOString(),
              updatedAt: vorlage.updatedAt.toISOString(),
            })),
          },
        },
      ],
    }).compile();

    handler = module.get<UpdateErinnerungsvorlageHandler>(UpdateErinnerungsvorlageHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update vorlage successfully', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents(); // Clear create event
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = UpdateErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        titel: 'Neuer Titel',
        minuten: 45,
        updatedBy: generateValidUserIdString(),
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.titel).toBe('Neuer Titel');
      expect(result.value?.minuten).toBe(45);
      expect(mockVorlageRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should fail when vorlage not found', async () => {
      // Given
      mockVorlageRepository.findById.mockResolvedValue(null);
      const commandResult = UpdateErinnerungsvorlageCommand.create({
        vorlageId: 'non-existent-id',
        titel: 'Test',
        updatedBy: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(mockVorlageRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when vorlage is deleted', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      const userId = UserId.create().value!;
      vorlage.softDelete(userId);
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = UpdateErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        titel: 'Test',
        updatedBy: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(mockVorlageRepository.save).not.toHaveBeenCalled();
    });

    it('should emit ErinnerungsvorlageAktualisiertEvent with correct properties', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = UpdateErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        titel: 'Updated Titel',
        minuten: 90,
        updatedBy: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(ErinnerungsvorlageAktualisiertEvent);

      const event = savedEvents[0] as ErinnerungsvorlageAktualisiertEvent;
      expect(event.vorlageId.toString()).toBe(vorlage.id.toString());
      expect(event.titel).toBe('Updated Titel');
      expect(event.minuten).toBe(90);
    });

    it('should fail when repository findById throws error', async () => {
      // Given - Verwende eine gueltige vorlageId damit ErinnerungsvorlageId.create() erfolgreich ist
      const vorlage = createTestVorlage();
      mockVorlageRepository.findById.mockRejectedValue(new Error('DB connection lost'));
      const commandResult = UpdateErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        titel: 'Test',
        updatedBy: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then - TransactionalCommandHandler faengt Exceptions und konvertiert zu Result.fail()
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('DB connection lost');
      expect(mockVorlageRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when repository save throws error', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);
      mockVorlageRepository.save.mockRejectedValue(new Error('Save failed'));

      const commandResult = UpdateErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        titel: 'Neuer Titel',
        updatedBy: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then - TransactionalCommandHandler faengt Exceptions und konvertiert zu Result.fail()
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Save failed');
    });

    it('should log successful update', async () => {
      // Given
      const vorlage = createTestVorlage();
      vorlage.clearDomainEvents();
      mockVorlageRepository.findById.mockResolvedValue(vorlage);

      const commandResult = UpdateErinnerungsvorlageCommand.create({
        vorlageId: vorlage.id.toString(),
        minuten: 60,
        updatedBy: generateValidUserIdString(),
      });

      // When
      await handler.execute(commandResult.value!);

      // Then
      expect(mockLogger.log).toHaveBeenCalled();
      const logMsg = mockLogger.log.mock.calls[0]?.[0]!;
      expect(logMsg).toContain('Erinnerungsvorlage aktualisiert');
    });
  });
});
