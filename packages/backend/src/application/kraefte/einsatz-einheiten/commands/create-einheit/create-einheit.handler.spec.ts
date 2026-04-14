// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { CreateEinheitHandler } from './create-einheit.handler';
import { CreateEinheitCommand } from './create-einheit.command';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, TAKTISCHE_ZEICHEN_REPOSITORY, DEFAULT_ZEICHEN_REPOSITORY } from '@/infrastructure/di-tokens';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { IDefaultZeichenRepository } from '@domain/taktische-zeichen/ports/idefault-zeichen.repository';

/**
 * Unit Tests für CreateEinheitHandler.
 *
 * Testet die Handler-Orchestrierung gemäß AAA Pattern mit Given-When-Then Kommentaren.
 * Dient als Referenz-Pattern für weitere Einheiten-Handler-Tests.
 *
 * **Test Coverage:**
 * - Happy Path: Einheit erfolgreich erstellen
 * - Error Handling: Fehlender Name (Domain-Validierung)
 * - Persistierung: Einheit wird via Repository gespeichert
 */
describe('CreateEinheitHandler', () => {
  let handler: CreateEinheitHandler;
  let mockEinheitRepository: jest.Mocked<IEinsatzEinheitRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;
  let mockZeichenRepository: jest.Mocked<ITaktischesZeichenRepository>;
  let mockDefaultZeichenRepository: jest.Mocked<IDefaultZeichenRepository>;

  /** Gemeinsame Test-IDs */
  const einsatzId = 'einsatz-uuid-1234';
  const userId = createId();

  /**
   * Erstellt einen gültigen CreateEinheitCommand für Tests.
   */
  const createValidCommand = (overrides?: { name?: string }) => {
    const cmdResult = CreateEinheitCommand.create({
      einsatzId,
      name: overrides?.name ?? '1. Bergungsgruppe',
      typ: 'GRUPPE',
      createdBy: userId,
    });
    return cmdResult;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository für EinsatzEinheit
    mockEinheitRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
      delete: jest.fn().mockResolvedValue(Result.ok(undefined)),
      existsPersonenZuordnung: jest.fn().mockResolvedValue(false),
      savePersonenZuordnung: jest.fn().mockResolvedValue(Result.ok(undefined)),
      removePersonenZuordnung: jest.fn().mockResolvedValue(Result.ok(undefined)),
      countChildren: jest.fn().mockResolvedValue(0),
      countPersonen: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<IEinsatzEinheitRepository>;

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

    // Mock TaktischesZeichen Repository
    mockZeichenRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
      findByLagekarteId: jest.fn().mockResolvedValue(Result.ok([])),
      findByReferenz: jest.fn().mockResolvedValue(Result.ok([])),
      delete: jest.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as jest.Mocked<ITaktischesZeichenRepository>;

    // Mock DefaultZeichen Repository
    mockDefaultZeichenRepository = {
      findAllFahrzeugtypen: jest.fn().mockResolvedValue(Result.ok([])),
      findAllEinheitentypen: jest.fn().mockResolvedValue(Result.ok([])),
      saveFahrzeugtypDefault: jest.fn().mockResolvedValue(Result.ok(undefined)),
      saveEinheitentypDefault: jest.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as jest.Mocked<IDefaultZeichenRepository>;

    // Mock PrismaService mit Transaction-Support
    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEinheitHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepository },
        { provide: TAKTISCHE_ZEICHEN_REPOSITORY, useValue: mockZeichenRepository },
        { provide: DEFAULT_ZEICHEN_REPOSITORY, useValue: mockDefaultZeichenRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<CreateEinheitHandler>(CreateEinheitHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('sollte eine Einheit erfolgreich erstellen', async () => {
      // Given: Gültiger Command
      const cmdResult = createValidCommand();
      expect(cmdResult.isSuccess).toBe(true);
      const command = cmdResult.value!;

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Einheit erstellt mit gültiger ID
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('string');
      expect(result.value!.length).toBeGreaterThan(0);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte einen Fehler bei fehlendem Namen zurückgeben', async () => {
      // Given: Command mit leerem Namen
      const cmdResult = createValidCommand({ name: '' });

      // Then: Command-Validierung schlägt fehl
      expect(cmdResult.isFailure).toBe(true);
      expect(cmdResult.error).toContain('Name');
    });

    it('sollte die Einheit via Repository speichern', async () => {
      // Given: Gültiger Command
      const cmdResult = createValidCommand();
      expect(cmdResult.isSuccess).toBe(true);
      const command = cmdResult.value!;

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Repository.save wurde aufgerufen
      expect(result.isSuccess).toBe(true);
      expect(mockEinheitRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      // Gespeichertes Aggregate prüfen
      const savedEinheit = mockEinheitRepository.save.mock.calls[0]?.[0]!;
      expect(savedEinheit).toBeDefined();
      expect(savedEinheit.name).toBe('1. Bergungsgruppe');
      expect(savedEinheit.einsatzId).toBe(einsatzId);
    });
  });
});
