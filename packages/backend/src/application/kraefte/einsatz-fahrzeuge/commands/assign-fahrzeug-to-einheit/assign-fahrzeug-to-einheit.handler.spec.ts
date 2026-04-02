// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { AssignFahrzeugToEinheitHandler } from './assign-fahrzeug-to-einheit.handler';
import { AssignFahrzeugToEinheitCommand } from './assign-fahrzeug-to-einheit.command';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import { EinsatzEinheit } from '@domain/kraefte/aggregates/einsatz-einheit.aggregate';
import { Result } from '@domain/common/result';
import { EINSATZ_FAHRZEUG_ERROR_CODES } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';

/**
 * Unit Tests für AssignFahrzeugToEinheitHandler.
 *
 * Testet die Handler-Orchestrierung gemäß AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repositories für Unit Test Isolation.
 *
 * **Test Coverage:**
 * - Happy Path: Fahrzeug erfolgreich einer Einheit zuweisen
 * - Happy Path: Zuweisung entfernen (einheitId = null)
 * - Error Handling: Fahrzeug nicht gefunden
 * - Error Handling: Einheit nicht gefunden
 * - Error Handling: Einheit gehört nicht zum selben Einsatz
 * - Persistierung: Fahrzeug wird nach Zuweisung gespeichert
 */
describe('AssignFahrzeugToEinheitHandler', () => {
  let handler: AssignFahrzeugToEinheitHandler;
  let mockFahrzeugRepository: jest.Mocked<IEinsatzFahrzeugRepository>;
  let mockEinheitRepository: jest.Mocked<IEinsatzEinheitRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  /** Gemeinsame Test-IDs */
  const einsatzId = 'einsatz-uuid-1234';
  const fahrzeugId = createId();
  const einheitId = createId();
  const userId = createId();
  const fahrzeugtypId = createId();

  /**
   * Erstellt ein rekonstituiertes EinsatzFahrzeug Aggregate für Tests.
   */
  const createMockFahrzeug = (overrides?: { einsatzId?: string; einheitId?: string }) => {
    const result = EinsatzFahrzeug.reconstitute({
      id: fahrzeugId,
      einsatzId: overrides?.einsatzId ?? einsatzId,
      fahrzeugtypId,
      funkrufname: 'Florian 1/46',
      fmsStatus: 2,
      einheitId: overrides?.einheitId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    });
    expect(result.isSuccess).toBe(true);
    return result.value!;
  };

  /**
   * Erstellt ein rekonstituiertes EinsatzEinheit Aggregate für Tests.
   */
  const createMockEinheit = (overrides?: { id?: string; einsatzId?: string; name?: string }) => {
    const result = EinsatzEinheit.reconstitute({
      id: overrides?.id ?? einheitId,
      einsatzId: overrides?.einsatzId ?? einsatzId,
      name: overrides?.name ?? '1. Bergungsgruppe',
      typ: 'GRUPPE',
      status: 'AUFGESTELLT',
      sollStaerke: 9,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    });
    expect(result.isSuccess).toBe(true);
    return result.value!;
  };

  /**
   * Erstellt einen gültigen AssignFahrzeugToEinheitCommand.
   */
  const createValidCommand = (overrides?: { einheitId?: string | null }) => {
    const cmdResult = AssignFahrzeugToEinheitCommand.create({
      einsatzId,
      fahrzeugId,
      einheitId: overrides?.einheitId !== undefined ? overrides.einheitId : einheitId,
      updatedBy: userId,
    });
    expect(cmdResult.isSuccess).toBe(true);
    return cmdResult.value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository für EinsatzFahrzeug
    mockFahrzeugRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
      existsByEinsatzIdAndFunkrufname: jest.fn().mockResolvedValue(Result.ok(false)),
    } as jest.Mocked<IEinsatzFahrzeugRepository>;

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

    // Mock PrismaService mit Transaction-Support
    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignFahrzeugToEinheitHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockFahrzeugRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<AssignFahrzeugToEinheitHandler>(AssignFahrzeugToEinheitHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('sollte ein Fahrzeug erfolgreich einer Einheit zuweisen', async () => {
      // Given: Fahrzeug und Einheit existieren im selben Einsatz
      const fahrzeug = createMockFahrzeug();
      const einheit = createMockEinheit();
      const command = createValidCommand();

      mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      mockEinheitRepository.findById.mockResolvedValue(Result.ok(einheit));

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Zuweisung erfolgreich
      expect(result.isSuccess).toBe(true);
      expect(mockFahrzeugRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockEinheitRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockFahrzeugRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte einen Fehler zurückgeben wenn das Fahrzeug nicht gefunden wird', async () => {
      // Given: Fahrzeug existiert nicht
      const command = createValidCommand();
      mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(null));

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Fehler mit NOT_FOUND Code
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND);
      expect(result.error).toContain(fahrzeugId);
      expect(mockEinheitRepository.findById).not.toHaveBeenCalled();
      expect(mockFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte einen Fehler zurückgeben wenn die Einheit nicht gefunden wird', async () => {
      // Given: Fahrzeug existiert, Einheit nicht
      const fahrzeug = createMockFahrzeug();
      const command = createValidCommand();

      mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      mockEinheitRepository.findById.mockResolvedValue(Result.ok(null));

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Fehler mit Einheit-Referenz
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(einheitId);
      expect(mockFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte einen Fehler zurückgeben wenn die Einheit nicht zum selben Einsatz gehört', async () => {
      // Given: Fahrzeug und Einheit existieren, aber in verschiedenen Einsätzen
      const fahrzeug = createMockFahrzeug();
      const einheitAndererEinsatz = createMockEinheit({ einsatzId: 'anderer-einsatz-uuid' });
      const command = createValidCommand();

      mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      mockEinheitRepository.findById.mockResolvedValue(Result.ok(einheitAndererEinsatz));

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Fehler mit Einsatz-Referenz
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(einheitId);
      expect(result.error).toContain(einsatzId);
      expect(mockFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte die Zuweisung entfernen wenn einheitId null ist (Einheit-Repository wird NICHT aufgerufen)', async () => {
      // Given: Fahrzeug hat bereits eine Einheit zugewiesen, einheitId = null
      const fahrzeug = createMockFahrzeug({ einheitId });
      const command = createValidCommand({ einheitId: null });

      mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Zuweisung entfernt, Einheit-Repository nicht aufgerufen
      expect(result.isSuccess).toBe(true);
      expect(mockEinheitRepository.findById).not.toHaveBeenCalled();
      expect(mockFahrzeugRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte das Fahrzeug nach erfolgreicher Zuweisung speichern', async () => {
      // Given: Fahrzeug und Einheit existieren
      const fahrzeug = createMockFahrzeug();
      const einheit = createMockEinheit();
      const command = createValidCommand();

      mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      mockEinheitRepository.findById.mockResolvedValue(Result.ok(einheit));

      // When: Handler ausführen
      const result = await handler.execute(command);

      // Then: Fahrzeug wurde gespeichert
      expect(result.isSuccess).toBe(true);
      expect(mockFahrzeugRepository.save).toHaveBeenCalledTimes(1);
      const savedFahrzeug = mockFahrzeugRepository.save.mock.calls[0]?.[0]!;
      expect(savedFahrzeug).toBeDefined();
      expect(savedFahrzeug.einheitId).toBe(einheitId);
    });
  });
});
