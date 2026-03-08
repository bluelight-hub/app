// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { CreateNotizHandler } from '../create-notiz.handler';
import { CreateNotizCommand } from '../create-notiz.command';
import { NotizErstelltEvent } from '@domain/notiz/events/notiz-erstellt.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { NOTIZ_REPOSITORY, KATEGORIE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { NOTIZ_ERROR_CODES } from '../../../errors/notiz-error.codes';
import type { INotizRepository } from '@domain/notiz/repositories/i-notiz.repository';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { NotizResponseFactory } from '@application/notiz/dto';

/**
 * Unit Tests fuer CreateNotizHandler.
 *
 * Testet die Handler-Orchestrierung gemaess AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repositories fuer Unit Test Isolation (AC6 Compliance).
 *
 * **Test Coverage:**
 * - Happy Path: Notiz erfolgreich erstellen
 * - Error Handling: Validation Errors, DB Errors
 * - Event Emission: NotizErstelltEvent in Outbox
 * - Transaction Behavior: Atomare Persistierung
 * - Story 8.2: kategorieId Tests
 */
describe('CreateNotizHandler', () => {
  let handler: CreateNotizHandler;
  let mockNotizRepository: jest.Mocked<INotizRepository>;
  let mockKategorieRepository: jest.Mocked<IKategorieRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  /**
   * Generiert eine gueltige CUID2 ID fuer Tests.
   */
  const generateValidEinsatzId = () => EinsatzId.create().value?.toString();

  /**
   * Generiert eine gueltige CUID2 UserId fuer Tests.
   */
  const generateValidUserId = () => UserId.create().value?.toString();

  /**
   * Erstellt einen gueltigen CreateNotizCommand fuer Tests.
   */
  const createValidCommand = () => {
    return CreateNotizCommand.create({
      einsatzId: generateValidEinsatzId(),
      titel: 'Test Notiz',
      inhalt: 'Test Inhalt',
      erstelltVon: generateValidUserId(),
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository fuer Notizen
    mockNotizRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
    } as jest.Mocked<INotizRepository>;

    // Mock Repository fuer Kategorien (Story 8.2)
    mockKategorieRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      existsByNameAndEinsatzId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IKategorieRepository>;

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
        CreateNotizHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: NOTIZ_REPOSITORY, useValue: mockNotizRepository },
        { provide: KATEGORIE_REPOSITORY, useValue: mockKategorieRepository },
        { provide: LOGGER, useValue: mockLogger },
        {
          provide: NotizResponseFactory,
          useValue: {
            create: jest.fn().mockImplementation((notiz) => ({
              id: notiz.id.toString(),
              einsatzId: notiz.einsatzId,
              titel: notiz.titel.value,
              inhalt: notiz.inhalt,
              kategorie: notiz.kategorie,
              kategorieId: notiz.kategorieId,
              istTeamsichtbar: notiz.istTeamsichtbar,
              erstelltVon: notiz.erstelltVon.toString(),
              createdAt: notiz.createdAt.toISOString(),
              updatedAt: notiz.updatedAt.toISOString(),
            })),
          },
        },
      ],
    }).compile();

    handler = module.get<CreateNotizHandler>(CreateNotizHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create notiz successfully', async () => {
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
      expect(result.value?.titel).toBe('Test Notiz');
      expect(result.value?.inhalt).toBe('Test Inhalt');
      expect(mockNotizRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should emit NotizErstelltEvent', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents.length).toBeGreaterThan(0);

      const createdEvent = savedEvents[0];
      expect(createdEvent).toBeInstanceOf(NotizErstelltEvent);
      expect(createdEvent.titel).toBe('Test Notiz');
    });
  });

  describe('Command Validation', () => {
    it('should fail when titel is empty', () => {
      // Given & When (Arrange & Act)
      const result = CreateNotizCommand.create({
        einsatzId: generateValidEinsatzId(),
        titel: '',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(NOTIZ_ERROR_CODES.TITEL_REQUIRED);
    });

    it('should fail when titel is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = CreateNotizCommand.create({
        einsatzId: generateValidEinsatzId(),
        titel: '   ',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(NOTIZ_ERROR_CODES.TITEL_REQUIRED);
    });

    it('should fail when einsatzId is empty', () => {
      // Given & When (Arrange & Act)
      const result = CreateNotizCommand.create({
        einsatzId: '',
        titel: 'Test',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(NOTIZ_ERROR_CODES.EINSATZ_ID_REQUIRED);
    });

    it('should fail when erstelltVon is empty', () => {
      // Given & When (Arrange & Act)
      const result = CreateNotizCommand.create({
        einsatzId: generateValidEinsatzId(),
        titel: 'Test',
        erstelltVon: '',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(NOTIZ_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    });
  });

  describe('kategorieId (Story 8.2)', () => {
    it('should create Notiz with kategorieId', async () => {
      // Given
      const kategorieId = 'clw3h8x9y0000kategorie1a'; // Valid CUID2
      const einsatzId = generateValidEinsatzId();
      const commandResult = CreateNotizCommand.create({
        einsatzId,
        titel: 'Notiz mit Kategorie',
        erstelltVon: generateValidUserId(),
        kategorieId,
      });
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // Story 8.2: Mock Kategorie existiert und gehört zum selben Einsatz
      const prismaTx = {
        kategorie: {
          findUnique: jest.fn().mockResolvedValue({
            id: kategorieId,
            einsatzId,
            geloeschtAm: null,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(prismaTx));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockNotizRepository.save).toHaveBeenCalledWith(expect.objectContaining({ kategorieId }), expect.any(Object));
    });

    it('should create Notiz without kategorieId (optional)', async () => {
      // Given
      const commandResult = CreateNotizCommand.create({
        einsatzId: generateValidEinsatzId(),
        titel: 'Notiz ohne Kategorie',
        erstelltVon: generateValidUserId(),
        // Keine kategorieId
      });
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockNotizRepository.save).toHaveBeenCalledWith(expect.objectContaining({ kategorieId: null }), expect.any(Object));
    });

    it('should create command with kategorieId set to null explicitly', () => {
      // Given & When
      const result = CreateNotizCommand.create({
        einsatzId: generateValidEinsatzId(),
        titel: 'Test',
        erstelltVon: generateValidUserId(),
        kategorieId: null, // Explizit null
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorieId).toBeNull();
    });

    it('should create command with valid kategorieId', () => {
      // Given & When
      const kategorieId = 'clw3h8x9y0000kategorie1a';
      const result = CreateNotizCommand.create({
        einsatzId: generateValidEinsatzId(),
        titel: 'Test',
        erstelltVon: generateValidUserId(),
        kategorieId,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorieId).toBe(kategorieId);
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

    it('should pass transaction context to repository save', async () => {
      // Given (Arrange)
      const commandResult = createValidCommand();
      const command = commandResult.value!;
      const txMarker = { txId: 'test-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockNotizRepository.save).toHaveBeenCalledTimes(1);
      const txContext = mockNotizRepository.save.mock.calls[0]?.[1]!;
      expect(txContext).toBe(txMarker);
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
      const logCall = mockLogger.log.mock.calls[0]?.[0]!;
      expect(logCall).toContain('Notiz erstellt');
    });
  });
});
