import { Test, type TestingModule } from '@nestjs/testing';
import { CreateFuehrungsrhythmusTemplateHandler } from '../create-fuehrungsrhythmus-template.handler';
import { CreateFuehrungsrhythmusTemplateCommand } from '../create-fuehrungsrhythmus-template.command';
import { Result } from '@domain/common/result';
import { FuehrungsrhythmusTemplateErstelltEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-template-erstellt.event';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { FuehrungsrhythmusTemplateResponseFactory } from '../../../dto/fuehrungsrhythmus-template-response.factory';

/**
 * Unit Tests fuer CreateFuehrungsrhythmusTemplateHandler.
 *
 * Testet die Handler-Orchestrierung gemaess AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repositories fuer Unit Test Isolation (AC6 Compliance).
 *
 * **Test Coverage:**
 * - Happy Path: FuehrungsrhythmusTemplate erfolgreich erstellen
 * - Error Handling: Validation Errors (UserId)
 * - Event Emission: FuehrungsrhythmusTemplateErstelltEvent in Outbox
 * - Transaction Behavior: Atomare Persistierung via TransactionalCommandHandler
 */
describe('CreateFuehrungsrhythmusTemplateHandler', () => {
  let handler: CreateFuehrungsrhythmusTemplateHandler;
  let mockTemplateRepository: jest.Mocked<IFuehrungsrhythmusTemplateRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  /**
   * Erstellt einen gueltigen CreateFuehrungsrhythmusTemplateCommand fuer Tests.
   */
  const createValidCommand = () => {
    return CreateFuehrungsrhythmusTemplateCommand.create({
      name: 'Fuehrungsrhythmus 30min',
      beschreibung: 'Standard-Fuehrungsrhythmus',
      eintraege: [
        { titel: 'Lagebeurteilung', intervallMinuten: 30, offsetMinuten: 0 },
        { titel: 'Funkmeldecheck', intervallMinuten: 15 },
      ],
      createdBy: UserId.create().value?.toString(),
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository fuer FuehrungsrhythmusTemplates
    mockTemplateRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IFuehrungsrhythmusTemplateRepository>;

    // Mock Repository fuer Outbox Events
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
        CreateFuehrungsrhythmusTemplateHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, useValue: mockTemplateRepository },
        { provide: LOGGER, useValue: mockLogger },
        {
          provide: FuehrungsrhythmusTemplateResponseFactory,
          useValue: {
            create: jest.fn().mockImplementation((template) => ({
              id: template.id.toString(),
              name: template.name.value,
              beschreibung: template.beschreibung,
              eintraege: template.eintraege.map((e: { id: string; titel: string; intervallMinuten: number; offsetMinuten: number; sortOrder: number }) => ({
                id: e.id,
                titel: e.titel,
                intervallMinuten: e.intervallMinuten,
                offsetMinuten: e.offsetMinuten,
                sortOrder: e.sortOrder,
              })),
              createdBy: template.createdBy.toString(),
              createdAt: template.createdAt.toISOString(),
              updatedAt: template.updatedAt.toISOString(),
            })),
          },
        },
      ],
    }).compile();

    handler = module.get<CreateFuehrungsrhythmusTemplateHandler>(CreateFuehrungsrhythmusTemplateHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create fuehrungsrhythmus template successfully', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBeDefined();
      expect(result.value?.name).toBe('Fuehrungsrhythmus 30min');
      expect(result.value?.beschreibung).toBe('Standard-Fuehrungsrhythmus');
      expect(result.value?.eintraege).toHaveLength(2);
      expect(mockTemplateRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should emit FuehrungsrhythmusTemplateErstelltEvent', async () => {
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
      expect(createdEvent).toBeInstanceOf(FuehrungsrhythmusTemplateErstelltEvent);
      expect(createdEvent.name).toBe('Fuehrungsrhythmus 30min');
      expect(createdEvent.eintraegeCount).toBe(2);
    });

    it('should fail when UserId creation fails (invalid createdBy)', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // DANN Mock setzen fuer Handler-Ausfuehrung
      const userIdCreateSpy = jest.spyOn(UserId, 'create').mockReturnValue(Result.fail('INVALID_USER_ID'));

      try {
        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('INVALID_USER_ID');

        // Repository.save sollte NICHT aufgerufen werden bei Value Object Validation Fehler
        expect(mockTemplateRepository.save).not.toHaveBeenCalled();
        // Outbox.save sollte ebenfalls NICHT aufgerufen werden
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      } finally {
        // Cleanup - IMMER ausfuehren, auch bei Fehlern
        userIdCreateSpy.mockRestore();
      }
    });

    it('should create template without beschreibung', async () => {
      // Given (Arrange)
      const commandResult = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Basis-Rhythmus',
        eintraege: [{ titel: 'Lagebeurteilung', intervallMinuten: 30 }],
        createdBy: UserId.create().value?.toString(),
      });
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.beschreibung).toBeNull();
    });

    it('should assign correct sortOrder to eintraege based on index', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.eintraege[0].sortOrder).toBe(0);
      expect(result.value?.eintraege[1].sortOrder).toBe(1);
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
        expect(mockTemplateRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      } finally {
        userIdCreateSpy.mockRestore();
      }
    });
  });

  describe('Outbox Integration', () => {
    it('should save exactly one FuehrungsrhythmusTemplateErstelltEvent', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(FuehrungsrhythmusTemplateErstelltEvent);
    });

    it('should save event with correct aggregateId', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const templateId = result.value?.id;
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const createdEvent = savedEvents[0] as FuehrungsrhythmusTemplateErstelltEvent;
      expect(createdEvent.templateId.toString()).toBe(templateId);
    });
  });

  describe('Response DTO Mapping', () => {
    it('should return correctly mapped FuehrungsrhythmusTemplateResponseDto', async () => {
      // Given (Arrange)
      const createdBy = UserId.create().value?.toString();
      const commandResult = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        beschreibung: 'Test Beschreibung',
        eintraege: [{ titel: 'Lagebeurteilung', intervallMinuten: 30, offsetMinuten: 5 }],
        createdBy,
      });
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value!;

      expect(dto.id).toBeDefined();
      expect(dto.name).toBe('Test Template');
      expect(dto.beschreibung).toBe('Test Beschreibung');
      expect(dto.createdBy).toBe(createdBy);
      expect(dto.createdAt).toBeDefined();
      expect(dto.updatedAt).toBeDefined();
      expect(dto.eintraege).toHaveLength(1);
      expect(dto.eintraege[0].titel).toBe('Lagebeurteilung');
      expect(dto.eintraege[0].intervallMinuten).toBe(30);
      expect(dto.eintraege[0].offsetMinuten).toBe(5);
      expect(dto.eintraege[0].sortOrder).toBe(0);

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
      expect(logCall).toContain('FuehrungsrhythmusTemplate erstellt');
    });
  });
});
