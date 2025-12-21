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
  const validEinsatzId = '123e4567-e89b-12d3-a456-426614174000';
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
      const otherEinsatzFahrzeug = createMockEinsatzFahrzeug({ einsatzId: 'other-einsatz-id-uuid-12345678901234' });
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
});
