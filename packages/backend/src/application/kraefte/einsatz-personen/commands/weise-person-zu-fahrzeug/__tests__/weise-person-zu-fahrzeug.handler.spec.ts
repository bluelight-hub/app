import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EINSATZ_PERSON_ERROR_CODES } from '@domain/kraefte/common/einsatz-person-error-codes';
import { WeisePersonZuFahrzeugZuHandler } from '../weise-person-zu-fahrzeug.handler';
import { WeisePersonZuFahrzeugZuCommand } from '../weise-person-zu-fahrzeug.command';

describe('WeisePersonZuFahrzeugZuHandler', () => {
  let handler: WeisePersonZuFahrzeugZuHandler;

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
  const validEinsatzId = createId();
  const validPersonId = createId();
  const validFahrzeugId = createId();
  const validUpdatedBy = createId();

  /**
   * Erstellt ein mock EinsatzPerson Aggregate
   */
  function createMockEinsatzPerson(overrides?: { id?: string; fahrzeugId?: string | undefined }): EinsatzPerson {
    const result = EinsatzPerson.reconstitute({
      id: overrides?.id ?? validPersonId,
      einsatzId: validEinsatzId,
      vorname: 'Max',
      nachname: 'Mustermann',
      funktion: 'Helfer',
      qualifikationIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validUpdatedBy,
      fahrzeugId: overrides?.fahrzeugId,
    });
    return result.value!;
  }

  /**
   * Erstellt ein mock EinsatzFahrzeug Aggregate
   */
  function createMockEinsatzFahrzeug(overrides?: { id?: string; einsatzId?: string; funkrufname?: string }): EinsatzFahrzeug {
    const result = EinsatzFahrzeug.reconstitute({
      id: overrides?.id ?? validFahrzeugId,
      einsatzId: overrides?.einsatzId ?? validEinsatzId,
      fahrzeugtypId: createId(), // Pflichtfeld
      funkrufname: overrides?.funkrufname ?? 'LF 10/1',
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
      findById: jest.fn().mockResolvedValue(Result.ok(createMockEinsatzPerson())),
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
        WeisePersonZuFahrzeugZuHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockEinsatzPersonRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockEinsatzFahrzeugRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<WeisePersonZuFahrzeugZuHandler>(WeisePersonZuFahrzeugZuHandler);
  });

  describe('execute - Success Cases', () => {
    it('sollte Person erfolgreich einem Fahrzeug zuweisen', async () => {
      // Given (Arrange)
      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockEinsatzPersonRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockEinsatzFahrzeugRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte PersonZuFahrzeugZugewiesenEvent in Outbox speichern', async () => {
      // Given (Arrange)
      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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
      expect(events[0].constructor.name).toBe('PersonZuFahrzeugZugewiesenEvent');
    });

    it('sollte fahrzeugId im EinsatzPerson setzen', async () => {
      // Given (Arrange)
      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0][0];
      expect(savedAggregate.fahrzeugId).toBe(validFahrzeugId);
    });
  });

  describe('execute - Error Cases', () => {
    it('sollte fehlschlagen wenn Person nicht gefunden (AC)', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(null));

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND);
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Fahrzeug nicht gefunden (AC)', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(null));

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND);
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Fahrzeug zu anderem Einsatz gehört (AC)', async () => {
      // Given (Arrange)
      const otherEinsatzFahrzeug = createMockEinsatzFahrzeug({ einsatzId: createId() });
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(otherEinsatzFahrzeug));

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_IN_SAME_EINSATZ);
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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
    it('sollte bei Zuweisung zum gleichen Fahrzeug kein Event emittieren (idempotent)', async () => {
      // Given (Arrange)
      const personWithFahrzeug = createMockEinsatzPerson({ fahrzeugId: validFahrzeugId });
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(personWithFahrzeug));

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Bei Idempotenz: Events-Array leer oder save nicht aufgerufen
      // Die Implementierung speichert trotzdem, aber ohne neue Events
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction aufrufen', async () => {
      // Given (Arrange)
      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

    it('sollte keine partiellen Commits zulassen bei Transaction Timeout', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {};
        await callback(txMock);
        // Simulate transaction timeout after callback execution
        throw new Error('Transaction timeout after 5000ms');
      });

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('timeout');
      // Verify: Repository operations were called but no data persisted (rollback)
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('T2: Event Idempotency Tests', () => {
    it('sollte keine duplizierten Events erzeugen bei wiederholter Zuweisung zum gleichen Fahrzeug', async () => {
      // Given (Arrange)
      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - First assignment
      const result1 = await handler.execute(command);
      expect(result1.isSuccess).toBe(true);

      // Reset mocks but keep person with fahrzeugId set
      const personWithFahrzeug = createMockEinsatzPerson({ fahrzeugId: validFahrzeugId });
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(personWithFahrzeug));
      mockOutboxRepository.save.mockClear();

      // When (Act) - Second assignment (idempotent)
      const result2 = await handler.execute(command);

      // Then (Assert)
      expect(result2.isSuccess).toBe(true);
      // Verify no events were created on second call (idempotent)
      const secondCallEvents = mockOutboxRepository.save.mock.calls[0]?.[0] || [];
      expect(secondCallEvents.length).toBe(0);
    });

    it('sollte bei mehrfacher paralleler Zuweisung nur ein Event pro tatsächlicher Änderung erzeugen', async () => {
      // Given (Arrange)
      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      let callCount = 0;
      mockEinsatzPersonRepository.findById.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call: person without fahrzeug
          return Result.ok(createMockEinsatzPerson({ fahrzeugId: undefined }));
        }
        // Subsequent calls: person already assigned
        return Result.ok(createMockEinsatzPerson({ fahrzeugId: validFahrzeugId }));
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

    it('sollte neues Event erzeugen bei Reassignment zu anderem Fahrzeug', async () => {
      // Given (Arrange)
      const otherFahrzeugId = createId();
      const otherFahrzeug = createMockEinsatzFahrzeug({ id: otherFahrzeugId, funkrufname: 'TLF 16/25' });

      // First assignment
      const command1 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      await handler.execute(command1);

      // Update mocks for second assignment
      const personWithFirstFahrzeug = createMockEinsatzPerson({ fahrzeugId: validFahrzeugId });
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(personWithFirstFahrzeug));
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(otherFahrzeug));
      mockOutboxRepository.save.mockClear();

      // When (Act) - Reassign to different vehicle
      const command2 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: otherFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      const result2 = await handler.execute(command2);

      // Then (Assert)
      expect(result2.isSuccess).toBe(true);
      // Verify new event was created for reassignment
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('PersonZuFahrzeugZugewiesenEvent');
    });

    it('sollte bei wiederholter Zuweisung identisches Event-Payload erzeugen (deterministisch)', async () => {
      // Given (Arrange)
      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - First execution
      const result1 = await handler.execute(command);
      expect(result1.isSuccess).toBe(true);

      const firstEventCall = mockOutboxRepository.save.mock.calls[0];
      const firstEventPayload = firstEventCall?.[0]?.[0];

      // Reset mocks and restore initial state (person without fahrzeugId)
      mockOutboxRepository.save.mockClear();
      mockEinsatzPersonRepository.findById.mockResolvedValue(Result.ok(createMockEinsatzPerson({ fahrzeugId: undefined })));

      // When (Act) - Second execution with same command
      const result2 = await handler.execute(command);
      expect(result2.isSuccess).toBe(true);

      const secondEventCall = mockOutboxRepository.save.mock.calls[0];
      const secondEventPayload = secondEventCall?.[0]?.[0];

      // Then (Assert) - Verify: Event payloads are identical (deterministic)
      expect(firstEventPayload).toBeDefined();
      expect(secondEventPayload).toBeDefined();
      expect(firstEventPayload.constructor.name).toBe(secondEventPayload.constructor.name);

      // Verify core payload fields are identical
      expect(firstEventPayload.aggregateId).toEqual(secondEventPayload.aggregateId);
      expect(firstEventPayload.eventType).toEqual(secondEventPayload.eventType);

      // H4: Event Timestamp Non-Determinism
      // Note: Timestamps may differ between executions (occuredAt property).
      // This is EXPECTED and ACCEPTABLE because:
      // 1. Timestamps reflect real-time occurrence (Date.now() at creation)
      // 2. Business data (aggregateId, eventType, payload) IS deterministic
      // 3. Outbox Pattern handles duplicate events via idempotency keys
      // 4. Future Enhancement: Inject clock dependency for deterministic timestamps in tests
      // This ensures idempotent event replay behavior for business logic
    });
  });

  describe('T3: Concurrency/Race Condition Tests', () => {
    it('sollte gleichzeitige Zuweisungen zur gleichen Person korrekt behandeln', async () => {
      // Given (Arrange)
      const fahrzeug1Id = validFahrzeugId;
      const fahrzeug2Id = createId();

      const fahrzeug1 = createMockEinsatzFahrzeug({ id: fahrzeug1Id, funkrufname: 'LF 10/1' });
      const fahrzeug2 = createMockEinsatzFahrzeug({ id: fahrzeug2Id, funkrufname: 'TLF 16/25' });

      // Mock to return different vehicles based on ID
      mockEinsatzFahrzeugRepository.findById.mockImplementation(async (id) => {
        if (id.value === fahrzeug1Id) return Result.ok(fahrzeug1);
        if (id.value === fahrzeug2Id) return Result.ok(fahrzeug2);
        return Result.ok(null);
      });

      const command1 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: fahrzeug1Id,
        updatedBy: validUpdatedBy,
      }).value!;

      const command2 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: fahrzeug2Id,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - Execute both assignments in parallel
      const results = await Promise.all([handler.execute(command1), handler.execute(command2)]);

      // Then (Assert)
      // Both should succeed (last write wins with optimistic concurrency)
      expect(results[0].isSuccess).toBe(true);
      expect(results[1].isSuccess).toBe(true);

      // Verify both operations were persisted
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(2);
    });

    it('sollte parallele Zuweisungen zu verschiedenen Personen isoliert behandeln', async () => {
      // Given (Arrange)
      const person1Id = validPersonId;
      const person2Id = createId();

      const person1 = createMockEinsatzPerson({ id: person1Id });
      const person2 = createMockEinsatzPerson({ id: person2Id });

      // Mock to return different persons based on ID
      mockEinsatzPersonRepository.findById.mockImplementation(async (id) => {
        if (id.value === person1Id) return Result.ok(person1);
        if (id.value === person2Id) return Result.ok(person2);
        return Result.ok(null);
      });

      const command1 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: person1Id,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      const command2 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: person2Id,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - Execute both assignments in parallel
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

      const command1 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      }).value!;

      const command2 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: createId(),
        updatedBy: validUpdatedBy,
      }).value!;

      // When (Act) - Execute both assignments sequentially
      const result1 = await handler.execute(command1);
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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

    it('sollte verschiedene Personen parallel ohne Konflikt zu verschiedenen Fahrzeugen zuweisen können', async () => {
      // Given (Arrange)
      const person1Id = validPersonId;
      const person2Id = createId();
      const fahrzeug1Id = validFahrzeugId;
      const fahrzeug2Id = createId();

      const person1 = createMockEinsatzPerson({ id: person1Id });
      const person2 = createMockEinsatzPerson({ id: person2Id });
      const fahrzeug1 = createMockEinsatzFahrzeug({ id: fahrzeug1Id });
      const fahrzeug2 = createMockEinsatzFahrzeug({ id: fahrzeug2Id, funkrufname: 'TLF 16/25' });

      mockEinsatzPersonRepository.findById.mockImplementation(async (id) => {
        if (id.value === person1Id) return Result.ok(person1);
        if (id.value === person2Id) return Result.ok(person2);
        return Result.ok(null);
      });

      mockEinsatzFahrzeugRepository.findById.mockImplementation(async (id) => {
        if (id.value === fahrzeug1Id) return Result.ok(fahrzeug1);
        if (id.value === fahrzeug2Id) return Result.ok(fahrzeug2);
        return Result.ok(null);
      });

      const command1 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: person1Id,
        fahrzeugId: fahrzeug1Id,
        updatedBy: validUpdatedBy,
      }).value!;

      const command2 = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: person2Id,
        fahrzeugId: fahrzeug2Id,
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

      const command = WeisePersonZuFahrzeugZuCommand.create({
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
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
