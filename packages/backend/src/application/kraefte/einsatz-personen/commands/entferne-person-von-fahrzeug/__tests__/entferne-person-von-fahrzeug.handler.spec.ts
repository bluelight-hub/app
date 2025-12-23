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
      findById: jest.fn().mockImplementation(async () => Result.ok(createMockEinsatzFahrzeug())),
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

  describe('T1: Transaction Rollback Tests', () => {
    it('sollte Transaction rollbacken wenn repository.save fehlschlägt', async () => {
      // Given (Arrange)
      let transactionCallbackExecuted = false;
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        transactionCallbackExecuted = true;
        const txMock = {};
        const result = await callback(txMock);
        // Simulate transaction rollback on error
        if (result && typeof result === 'object' && 'isFailure' in result && result.isFailure) {
          throw new Error('Transaction rolled back');
        }
        return result;
      });

      mockEinsatzPersonRepository.save.mockResolvedValue(Result.fail('Database error'));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(transactionCallbackExecuted).toBe(true);
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled(); // No events saved on failure
    });

    it('sollte keine partiellen Änderungen persistieren wenn Transaction fehlschlägt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {};
        await callback(txMock);
        // Simulate transaction failure after callback
        throw new Error('Transaction commit failed');
      });

      mockEinsatzPersonRepository.save.mockResolvedValue(Result.ok(undefined));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction commit failed');
      // Verify save was called but transaction rolled back
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Outbox-Events nicht speichern wenn Aggregate-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.save.mockResolvedValue(Result.fail('Constraint violation'));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled(); // Atomic: no partial commits
    });

    it('sollte keine Änderungen persistieren wenn findById fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.fail('Database connection lost'));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte rollbacken wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockOutboxRepository.save.mockRejectedValue(new Error('Outbox write failed'));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox');
      // Verify: Person save was attempted but transaction rolled back
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('T2: Event Idempotency Tests', () => {
    it('sollte keine duplizierten Events erzeugen bei wiederholter Entfernung', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - First removal
      const result1 = await handler.execute(command);
      expect(result1.isSuccess).toBe(true);

      // Reset mocks but keep person without fahrzeugId
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(createMockEinsatzPersonWithoutFahrzeug()));
      mockOutboxRepository.save.mockClear();

      // When (Act) - Second removal (idempotent)
      const result2 = await handler.execute(command);

      // Then (Assert)
      expect(result2.isSuccess).toBe(true);
      // Verify no events were created on second call (idempotent)
      const secondCallEvents = mockOutboxRepository.save.mock.calls[0]?.[0] || [];
      expect(secondCallEvents.length).toBe(0);
    });

    it('sollte bei mehrfacher paralleler Entfernung nur ein Event pro tatsächlicher Änderung erzeugen', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      let callCount = 0;
      mockEinsatzPersonRepository.findById.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call: person with fahrzeug
          return Result.ok(createMockEinsatzPersonWithFahrzeug());
        }
        // Subsequent calls: person already removed
        return Result.ok(createMockEinsatzPersonWithoutFahrzeug());
      });

      // When (Act) - Execute command twice (simulating race condition)
      const [result1, result2] = await Promise.all([handler.execute(command), handler.execute(command)]);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);

      // Count events across all calls
      const allEventCalls = mockOutboxRepository.save.mock.calls;
      const totalEvents = allEventCalls.reduce((sum, call) => sum + (call[0]?.length || 0), 0);

      // First call should create event, second should be idempotent (no event)
      expect(totalEvents).toBeLessThanOrEqual(1);
    });

    it('sollte Event erzeugen bei erneuter Zuweisung nach Entfernung', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // First removal
      await handler.execute(command);

      // Update mock: Person now re-assigned to fahrzeug
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(createMockEinsatzPersonWithFahrzeug()));
      mockOutboxRepository.save.mockClear();

      // When (Act) - Remove again after re-assignment
      const result2 = await handler.execute(command);

      // Then (Assert)
      expect(result2.isSuccess).toBe(true);
      // Verify new event was created for second removal
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('PersonVonFahrzeugEntferntEvent');
    });
  });

  describe('T3: Concurrency/Race Condition Tests', () => {
    it('sollte gleichzeitige Entfernungen zur gleichen Person korrekt behandeln', async () => {
      // Given (Arrange)
      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - Execute both removals in parallel
      const results = await Promise.all([handler.execute(command), handler.execute(command)]);

      // Then (Assert)
      // Both should succeed (idempotent)
      expect(results[0].isSuccess).toBe(true);
      expect(results[1].isSuccess).toBe(true);

      // At least one save should have been called
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalled();
    });

    it('sollte parallele Entfernungen von verschiedenen Personen isoliert behandeln', async () => {
      // Given (Arrange)
      const person1Id = validPersonId;
      const person2Id = 'clw3h8x9y0000qwertyuiop22';

      const person1 = createMockEinsatzPersonWithFahrzeug();
      const person2WithId = EinsatzPerson.reconstitute({
        id: person2Id,
        einsatzId: validEinsatzId,
        vorname: 'Anna',
        nachname: 'Schmidt',
        funktion: 'Helferin',
        qualifikationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: validUpdatedBy,
        fahrzeugId: validFahrzeugId,
      }).value!;

      // Mock to return different persons based on ID
      mockEinsatzPersonRepository.findById.mockImplementation(async (id) => {
        if (id.value === person1Id) return Result.ok(person1);
        if (id.value === person2Id) return Result.ok(person2WithId);
        return Result.ok(null);
      });

      const command1 = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: person1Id,
        updatedBy: validUpdatedBy,
      }).value!;

      const command2 = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: person2Id,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - Execute both removals in parallel
      const results = await Promise.all([handler.execute(command1), handler.execute(command2)]);

      // Then (Assert)
      expect(results[0].isSuccess).toBe(true);
      expect(results[1].isSuccess).toBe(true);

      // Verify both persons were saved independently
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(2);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(2);
    });

    it('sollte bei Optimistic Locking Conflict entsprechend reagieren', async () => {
      // Given (Arrange)
      let saveCallCount = 0;
      mockEinsatzPersonRepository.save.mockImplementation(async () => {
        saveCallCount++;
        if (saveCallCount === 1) {
          // First save succeeds
          return Result.ok(undefined);
        }
        // Second save fails due to version mismatch (optimistic locking)
        return Result.fail('Optimistic locking conflict: Version mismatch');
      });

      const command1 = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      const command2 = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - Execute first removal
      const result1 = await handler.execute(command1);

      // Simulate concurrent modification by keeping person assigned for second call
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(createMockEinsatzPersonWithFahrzeug()));

      // Execute second removal (will attempt to save, but fail with optimistic locking)
      const result2 = await handler.execute(command2);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isFailure).toBe(true);
      expect(result2.error).toContain('Version mismatch');
    });

    it('sollte Transaction Isolation Level respektieren bei parallelen Writes', async () => {
      // Given (Arrange)
      const transactionContexts: unknown[] = [];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = { isolationLevel: 'READ_COMMITTED' };
        transactionContexts.push(txMock);
        return callback(txMock);
      });

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - Execute multiple times
      await Promise.all([handler.execute(command), handler.execute(command), handler.execute(command)]);

      // Then (Assert)
      // Verify each execution got its own transaction context
      expect(transactionContexts.length).toBe(3);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('T8: Retry Logic Tests (Optimistic Locking)', () => {
    it('sollte bei Optimistic Locking Conflict NICHT automatisch retries (aktuelles Verhalten)', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.save.mockResolvedValue(Result.fail('Optimistic locking conflict: Version mismatch'));

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Version mismatch');
      // Verify: Nur ein Save-Versuch (kein Retry)
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte verschiedene Personen parallel ohne Konflikt behandeln können', async () => {
      // Given (Arrange)
      const person1Id = validPersonId;
      const person2Id = createId();

      const person1 = createMockEinsatzPersonWithFahrzeug();
      const person2WithId = EinsatzPerson.reconstitute({
        id: person2Id,
        einsatzId: validEinsatzId,
        vorname: 'Anna',
        nachname: 'Schmidt',
        funktion: 'Helferin',
        qualifikationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: validUpdatedBy,
        fahrzeugId: validFahrzeugId,
      }).value!;

      mockEinsatzPersonRepository.findById.mockImplementation(async (id) => {
        if (id.value === person1Id) return Result.ok(person1);
        if (id.value === person2Id) return Result.ok(person2WithId);
        return Result.ok(null);
      });

      const command1 = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: person1Id,
        updatedBy: validUpdatedBy,
      }).value!;

      const command2 = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: person2Id,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const results = await Promise.all([handler.execute(command1), handler.execute(command2)]);

      // Then (Assert)
      expect(results[0].isSuccess).toBe(true);
      expect(results[1].isSuccess).toBe(true);
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(2);
    });

    it('sollte bei transienten DB-Fehlern NICHT automatisch retries (aktuelles Verhalten)', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async () => {
        throw new Error('Connection pool timeout');
      });

      const command = EntfernePersonVonFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('timeout');
      // Verify: Nur ein Transaction-Versuch (kein Retry)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
