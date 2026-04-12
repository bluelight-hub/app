// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ErstelleZeichenHandler } from '../erstelle-zeichen.handler';
import { ErstelleZeichenCommand } from '../erstelle-zeichen.command';
import { ZeichenErstelltEvent } from '@domain/taktische-zeichen/events/zeichen-erstellt.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, LOGGER, TAKTISCHE_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TaktischesZeichenResponseFactory } from '../../../factories/taktisches-zeichen-response.factory';
import { Result } from '@domain/common/result';

/**
 * Unit Tests für ErstelleZeichenHandler.
 *
 * Testet die Handler-Orchestrierung gemäß AAA-Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repositories für Unit Test Isolation.
 *
 * **Test Coverage:**
 * - Happy Path: Zeichen erfolgreich erstellen
 * - Command Validation: Pflichtfelder prüfen
 * - Event Emission: ZeichenErstelltEvent in Outbox
 * - Transaction Behavior: Atomare Persistierung
 */
describe('ErstelleZeichenHandler', () => {
  let handler: ErstelleZeichenHandler;
  let mockRepository: jest.Mocked<ITaktischesZeichenRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  const VALID_EINSATZ_ID = 'clw3h8x9y0000qwertyuiopas';
  const VALID_USER_ID = 'clw3h8x9y0001qwertyuiopas';

  const validZeichenDefinition = {
    grundzeichen: 'kraftfahrzeug-gelaendegaengig',
    organisation: 'feuerwehr',
    fachaufgabe: 'brandbekaempfung',
  };

  /**
   * Erstellt einen gültigen ErstelleZeichenCommand für Tests.
   */
  const createValidCommand = (overrides = {}) => {
    return ErstelleZeichenCommand.create({
      einsatzId: VALID_EINSATZ_ID,
      zeichenDefinition: validZeichenDefinition,
      erstelltVon: VALID_USER_ID,
      ...overrides,
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      findByLagekarteId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ITaktischesZeichenRepository>;

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
        ErstelleZeichenHandler,
        TaktischesZeichenResponseFactory,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: TAKTISCHE_ZEICHEN_REPOSITORY, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<ErstelleZeichenHandler>(ErstelleZeichenHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create zeichen successfully', async () => {
      // Given
      const commandResult = createValidCommand();
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.einsatzId).toBe(VALID_EINSATZ_ID);
      expect(result.value?.zeichenDefinition.grundzeichen).toBe('kraftfahrzeug-gelaendegaengig');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should return DTO with correct zeichenDefinition', async () => {
      // Given
      const commandResult = createValidCommand({
        zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'gruppe' },
      });
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.zeichenDefinition.grundzeichen).toBe('taktische-formation');
      expect(result.value?.zeichenDefinition.einheit).toBe('gruppe');
    });

    it('should create zeichen with optional label', async () => {
      // Given
      const commandResult = createValidCommand({ label: 'RTW 1' });
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe('RTW 1');
    });

    it('should create zeichen with referenz (Fahrzeug-Verknüpfung)', async () => {
      // Given
      const referenzId = 'clw3h8x9y0002qwertyuiopas';
      const commandResult = createValidCommand({ referenzTyp: 'FAHRZEUG', referenzId });
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.referenzTyp).toBe('FAHRZEUG');
      expect(result.value?.referenzId).toBe(referenzId);
    });

    it('should mark zeichen as aus Katalog', async () => {
      // Given
      const katalogEintragId = 'clw3h8x9y0003qwertyuiopas';
      const commandResult = createValidCommand({ istAusKatalog: true, katalogEintragId });
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.istAusKatalog).toBe(true);
      expect(result.value?.katalogEintragId).toBe(katalogEintragId);
    });

    it('should set istPlatziert to false for new zeichen', async () => {
      // Given
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.istPlatziert).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit ZeichenErstelltEvent', async () => {
      // Given
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents.length).toBeGreaterThan(0);

      const event = savedEvents[0];
      expect(event).toBeInstanceOf(ZeichenErstelltEvent);
      expect(event.einsatzId).toBe(VALID_EINSATZ_ID);
      expect(event.createdBy).toBe(VALID_USER_ID);
    });

    it('should include zeichenDefinition in ZeichenErstelltEvent', async () => {
      // Given
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When
      await handler.execute(command);

      // Then
      const event = mockOutboxRepository.save.mock.calls[0]?.[0][0] as ZeichenErstelltEvent;
      expect(event.zeichenDefinition).toMatchObject({
        grundzeichen: 'kraftfahrzeug-gelaendegaengig',
      });
    });
  });

  describe('Command Validation', () => {
    it('should fail when einsatzId is empty', () => {
      // Given & When
      const result = ErstelleZeichenCommand.create({
        einsatzId: '',
        zeichenDefinition: validZeichenDefinition,
        erstelltVon: VALID_USER_ID,
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('EINSATZ_ID_REQUIRED');
    });

    it('should fail when erstelltVon is empty', () => {
      // Given & When
      const result = ErstelleZeichenCommand.create({
        einsatzId: VALID_EINSATZ_ID,
        zeichenDefinition: validZeichenDefinition,
        erstelltVon: '',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('ERSTELLT_VON_REQUIRED');
    });

    it('should fail when grundzeichen is missing', () => {
      // Given & When
      const result = ErstelleZeichenCommand.create({
        einsatzId: VALID_EINSATZ_ID,
        zeichenDefinition: { grundzeichen: '' },
        erstelltVon: VALID_USER_ID,
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GRUNDZEICHEN_REQUIRED');
    });

    it('should fail when zeichenDefinition has no grundzeichen property', () => {
      // Given & When
      const result = ErstelleZeichenCommand.create({
        einsatzId: VALID_EINSATZ_ID,
        zeichenDefinition: {} as any,
        erstelltVon: VALID_USER_ID,
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GRUNDZEICHEN_REQUIRED');
    });

    it('should trim whitespace from einsatzId', () => {
      // Given & When
      const result = ErstelleZeichenCommand.create({
        einsatzId: '  clw3h8x9y0000qwertyuiopas  ',
        zeichenDefinition: validZeichenDefinition,
        erstelltVon: VALID_USER_ID,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe('clw3h8x9y0000qwertyuiopas');
    });

    it('should default istAusKatalog to false', () => {
      // Given & When
      const result = ErstelleZeichenCommand.create({
        einsatzId: VALID_EINSATZ_ID,
        zeichenDefinition: validZeichenDefinition,
        erstelltVon: VALID_USER_ID,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.istAusKatalog).toBe(false);
    });
  });

  describe('Transaction Behavior', () => {
    it('should execute within prisma transaction', async () => {
      // Given
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should pass transaction context to repository save', async () => {
      // Given
      const commandResult = createValidCommand();
      const command = commandResult.value!;
      const txMarker = { txId: 'test-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      const txContext = mockRepository.save.mock.calls[0]?.[1]!;
      expect(txContext).toBe(txMarker);
    });
  });

  describe('Logging', () => {
    it('should log successful creation', async () => {
      // Given
      const commandResult = createValidCommand();
      const command = commandResult.value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalled();
      const logCall = mockLogger.log.mock.calls[0]?.[0]!;
      expect(logCall).toContain('Taktisches Zeichen erstellt');
    });
  });
});
