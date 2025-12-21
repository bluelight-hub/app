import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EINSATZ_PERSON_ERROR_CODES } from '@domain/kraefte/common/einsatz-person-error-codes';
import { EntfernePersonVonFahrzeugHandler } from '../entferne-person-von-fahrzeug.handler';
import { EntfernePersonVonFahrzeugCommand } from '../entferne-person-von-fahrzeug.command';

describe('EntfernePersonVonFahrzeugHandler', () => {
  let handler: EntfernePersonVonFahrzeugHandler;

  // Mock Repositories
  let mockEinsatzPersonRepository: jest.Mocked<{
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
  }>;
  let mockEinsatzFahrzeugRepository: jest.Mocked<{
    findById: jest.Mock;
    save: jest.Mock;
  }>;
  let mockOutboxRepository: jest.Mocked<{
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  }>;
  let mockPrismaService: jest.Mocked<{
    $transaction: jest.Mock;
  }>;
  let mockLogger: jest.Mocked<{
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  }>;

  // Test Data
  const validEinsatzId = '123e4567-e89b-12d3-a456-426614174000';
  const validPersonId = createId();
  const validFahrzeugId = createId();
  const validUpdatedBy = createId();

  /**
   * Erstellt ein mock EinsatzPerson Aggregate mit Fahrzeug-Zuweisung
   */
  function createMockEinsatzPersonWithFahrzeug(): EinsatzPerson {
    const result = EinsatzPerson.reconstitute({
      id: validPersonId,
      einsatzId: validEinsatzId,
      vorname: 'Max',
      nachname: 'Mustermann',
      funktion: 'Helfer',
      qualifikationIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validUpdatedBy,
      fahrzeugId: validFahrzeugId,
    });
    return result.value!;
  }

  /**
   * Erstellt ein mock EinsatzPerson Aggregate ohne Fahrzeug-Zuweisung
   */
  function createMockEinsatzPersonWithoutFahrzeug(): EinsatzPerson {
    const result = EinsatzPerson.reconstitute({
      id: validPersonId,
      einsatzId: validEinsatzId,
      vorname: 'Max',
      nachname: 'Mustermann',
      funktion: 'Helfer',
      qualifikationIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validUpdatedBy,
      fahrzeugId: undefined,
    });
    return result.value!;
  }

  /**
   * Erstellt ein mock EinsatzFahrzeug Aggregate
   */
  function createMockEinsatzFahrzeug(): EinsatzFahrzeug {
    const result = EinsatzFahrzeug.reconstitute({
      id: validFahrzeugId,
      einsatzId: validEinsatzId,
      fahrzeugtypId: createId(), // Pflichtfeld
      funkrufname: 'LF 10/1',
      fmsStatus: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validUpdatedBy,
    });
    return result.value!;
  }

  beforeEach(async () => {
    mockEinsatzPersonRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn().mockResolvedValue(Result.ok(createMockEinsatzPersonWithFahrzeug())),
      findByEinsatzId: jest.fn(),
    } as jest.Mocked<typeof mockEinsatzPersonRepository>;

    mockEinsatzFahrzeugRepository = {
      findById: jest.fn().mockResolvedValue(Result.ok(createMockEinsatzFahrzeug())),
      save: jest.fn(),
    } as jest.Mocked<typeof mockEinsatzFahrzeugRepository>;

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    } as jest.Mocked<typeof mockOutboxRepository>;

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    } as jest.Mocked<typeof mockPrismaService>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<typeof mockLogger>;

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntfernePersonVonFahrzeugHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockEinsatzPersonRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockEinsatzFahrzeugRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<EntfernePersonVonFahrzeugHandler>(EntfernePersonVonFahrzeugHandler);
  });

  describe('execute - Success Cases', () => {
    it('sollte Person erfolgreich von Fahrzeug entfernen', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockEinsatzPersonRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte PersonVonFahrzeugEntferntEvent in Outbox speichern', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('PersonVonFahrzeugEntferntEvent');
    });

    it('sollte fahrzeugId auf undefined setzen', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0][0];
      expect(savedAggregate.fahrzeugId).toBeUndefined();
    });
  });

  describe('execute - Error Cases', () => {
    it('sollte fehlschlagen wenn Person nicht gefunden (AC)', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(null));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND);
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });
  });

  describe('Idempotency', () => {
    it('sollte bei Person ohne Fahrzeug-Zuweisung Success ohne Event zurückgeben (idempotent)', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(createMockEinsatzPersonWithoutFahrzeug()));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Bei Idempotenz wird save trotzdem aufgerufen aber ohne Events
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction aufrufen', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
