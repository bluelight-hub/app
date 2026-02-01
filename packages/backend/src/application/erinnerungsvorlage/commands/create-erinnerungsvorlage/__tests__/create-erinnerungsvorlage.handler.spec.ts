import { Test, type TestingModule } from '@nestjs/testing';
import { CreateErinnerungsvorlageHandler } from '../create-erinnerungsvorlage.handler';
import { CreateErinnerungsvorlageCommand } from '../create-erinnerungsvorlage.command';
import { Result } from '@domain/common/result';
import { ErinnerungsvorlageErstelltEvent } from '@domain/erinnerungsvorlage/events/erinnerungsvorlage-erstellt.event';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNGSVORLAGE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ErinnerungsvorlageResponseFactory } from '../../../dto/erinnerungsvorlage-response.factory';

/**
 * Unit Tests für CreateErinnerungsvorlageHandler.
 *
 * Testet die Handler-Orchestrierung gemäß AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repositories für Unit Test Isolation (AC6 Compliance).
 *
 * **Test Coverage:**
 * - Happy Path: Erinnerungsvorlage erfolgreich erstellen
 * - Error Handling: Validation Errors (UserId)
 * - Event Emission: ErinnerungsvorlageErstelltEvent in Outbox
 * - Transaction Behavior: Atomare Persistierung via TransactionalCommandHandler
 */
describe('CreateErinnerungsvorlageHandler', () => {
  let handler: CreateErinnerungsvorlageHandler;
  let mockVorlageRepository: jest.Mocked<IErinnerungsvorlageRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  /**
   * Erstellt einen gültigen CreateErinnerungsvorlageCommand für Tests.
   */
  const createValidCommand = () => {
    return CreateErinnerungsvorlageCommand.create({
      titel: 'Lagebesprechung',
      minuten: 30,
      beschreibung: 'Regelmäßige Lagebesprechung',
      createdBy: UserId.create().value!.toString(),
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository für Erinnerungsvorlagen
    mockVorlageRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IErinnerungsvorlageRepository>;

    // Mock Repository für Outbox Events
    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    } as unknown as jest.Mocked<IOutboxRepository>;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Mock PrismaService mit Transaction-Support
    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {}; // Minimaler TX Mock
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateErinnerungsvorlageHandler,
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

    handler = module.get<CreateErinnerungsvorlageHandler>(CreateErinnerungsvorlageHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create erinnerungsvorlage successfully', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.id).toBeDefined();
      expect(result.value!.titel).toBe('Lagebesprechung');
      expect(result.value!.minuten).toBe(30);
      expect(result.value!.beschreibung).toBe('Regelmäßige Lagebesprechung');
      expect(mockVorlageRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should emit ErinnerungsvorlageErstelltEvent', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBeGreaterThan(0);

      const createdEvent = savedEvents[0];
      expect(createdEvent).toBeInstanceOf(ErinnerungsvorlageErstelltEvent);
      expect(createdEvent.titel).toBe('Lagebesprechung');
      expect(createdEvent.minuten).toBe(30);
    });

    it('should fail when UserId creation fails (invalid createdBy)', async () => {
      // Given (Arrange)
      // Erstelle Command ZUERST mit gültigen Werten (bevor Mock aktiv ist)
      const commandResult = createValidCommand();
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // DANN Mock setzen für Handler-Ausführung
      const userIdCreateSpy = jest.spyOn(UserId, 'create').mockReturnValue(Result.fail('INVALID_USER_ID'));

      try {
        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('INVALID_USER_ID');

        // Repository.save sollte NICHT aufgerufen werden bei Value Object Validation Fehler
        expect(mockVorlageRepository.save).not.toHaveBeenCalled();
        // Outbox.save sollte ebenfalls NICHT aufgerufen werden
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      } finally {
        // Cleanup - IMMER ausführen, auch bei Fehlern
        userIdCreateSpy.mockRestore();
      }
    });

    it('should create vorlage without beschreibung', async () => {
      // Given (Arrange)
      const commandResult = CreateErinnerungsvorlageCommand.create({
        titel: 'Ablösung',
        minuten: 60,
        createdBy: UserId.create().value!.toString(),
      });
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBeNull();
    });
  });

  describe('Transaction Behavior', () => {
    it('should execute within prisma transaction', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should save event within same transaction as aggregate', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;
      const txMarker = { txId: 'same-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Outbox save bekommt TX-Kontext
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const outboxTxContext = mockOutboxRepository.save.mock.calls[0][1];
      expect(outboxTxContext).toBe(txMarker);
    });

    it('should not save events when UserId validation fails', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      const userIdCreateSpy = jest.spyOn(UserId, 'create').mockReturnValue(Result.fail('INVALID_USER_ID'));

      try {
        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(mockVorlageRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      } finally {
        userIdCreateSpy.mockRestore();
      }
    });
  });

  describe('Outbox Integration', () => {
    it('should save exactly one ErinnerungsvorlageErstelltEvent', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(ErinnerungsvorlageErstelltEvent);
    });

    it('should save event with correct aggregateId', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const vorlageId = result.value!.id;
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const createdEvent = savedEvents[0] as ErinnerungsvorlageErstelltEvent;
      expect(createdEvent.vorlageId.toString()).toBe(vorlageId);
    });
  });

  describe('Response DTO Mapping', () => {
    it('should return correctly mapped ErinnerungsvorlageResponseDto', async () => {
      // Given (Arrange)
      const createdBy = UserId.create().value!.toString();
      const commandResult = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 45,
        beschreibung: 'Test Beschreibung',
        createdBy,
      });
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value!;

      expect(dto.id).toBeDefined();
      expect(dto.titel).toBe('Test Vorlage');
      expect(dto.minuten).toBe(45);
      expect(dto.beschreibung).toBe('Test Beschreibung');
      expect(dto.createdBy).toBe(createdBy);
      expect(dto.createdAt).toBeDefined();
      expect(dto.updatedAt).toBeDefined();

      // createdAt und updatedAt sollten ISO-Strings sein
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });
  });

  describe('Logging', () => {
    it('should log successful creation', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalled();
      const logCall = mockLogger.log.mock.calls[0][0];
      expect(logCall).toContain('Erinnerungsvorlage erstellt');
    });
  });
});
