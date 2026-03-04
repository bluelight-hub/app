import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EINSATZ_FAHRZEUG_ERROR_CODES } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { ErfasseTemporalesFahrzeugHandler } from '../erfasse-temporales-fahrzeug.handler';
import { ErfasseTemporalesFahrzeugCommand } from '../erfasse-temporales-fahrzeug.command';

describe('ErfasseTemporalesFahrzeugHandler', () => {
  let handler: ErfasseTemporalesFahrzeugHandler;

  // Mock Repositories
  let mockEinsatzFahrzeugRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
    existsByEinsatzIdAndFunkrufname: jest.Mock;
  };
  let mockFahrzeugtypRepository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    save: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  // Test Data
  const validEinsatzId = '123e4567-e89b-12d3-a456-426614174000';
  const validCreatedBy = createId();
  const validFahrzeugtypId = createId();

  /**
   * Erstellt ein mock Fahrzeugtyp Aggregate
   */
  function createMockFahrzeugtyp(): Fahrzeugtyp {
    const result = Fahrzeugtyp.reconstitute({
      id: validFahrzeugtypId,
      code: 'RTW',
      bezeichnung: 'Rettungswagen',
      kategorie: 'RETTUNGSDIENST',
      istAktiv: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validCreatedBy,
    });
    return result.value!;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repositories initialisieren
    mockEinsatzFahrzeugRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByEinsatzIdAndFunkrufname: jest.fn().mockResolvedValue(Result.ok(false)),
    };

    mockFahrzeugtypRepository = {
      findById: jest.fn().mockResolvedValue(Result.ok(createMockFahrzeugtyp())),
      findAll: jest.fn(),
      save: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErfasseTemporalesFahrzeugHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockEinsatzFahrzeugRepository },
        { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockFahrzeugtypRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<ErfasseTemporalesFahrzeugHandler>(ErfasseTemporalesFahrzeugHandler);
  });

  describe('execute - Success Cases', () => {
    it('sollte temporäres EinsatzFahrzeug erfolgreich erfassen (AC1)', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.funkrufname).toBe('RTW 1');
      expect(result.value!.stammId).toBeUndefined(); // WICHTIG: kein stammId bei temporär!
      expect(result.value!.fmsStatus).toBe(2); // Initial: Einsatzbereit
      expect(result.value!.einsatzId).toBe(validEinsatzId);
      expect(mockEinsatzFahrzeugRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte FahrzeugErfasstEvent in Outbox speichern (AC4)', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('FahrzeugErfasstEvent');
      expect(events[0].stammId).toBeUndefined(); // WICHTIG: kein stammId im Event!
    });

    it('sollte temporäres EinsatzFahrzeug mit Kennzeichen erfassen', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        kennzeichen: 'DA-RK 101',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.kennzeichen).toBe('DA-RK 101');
    });

    it('sollte temporäres EinsatzFahrzeug mit Position erfassen', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
        position: { lat: 49.8728, lng: 8.6512 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.position).toEqual({ lat: 49.8728, lng: 8.6512 });
    });

    it('sollte $transaction aufrufen (Transaktions-Pattern)', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute - Error Cases', () => {
    it('sollte fehlschlagen wenn Fahrzeugtyp nicht gefunden (AC3)', async () => {
      // Given (Arrange)
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(null));

      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND);
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Fahrzeugtyp inaktiv ist (AC3)', async () => {
      // Given (Arrange)
      // Erstelle einen inaktiven Fahrzeugtyp
      const inactiveFahrzeugtyp = Fahrzeugtyp.reconstitute({
        id: validFahrzeugtypId,
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'RETTUNGSDIENST',
        istAktiv: false, // WICHTIG: inaktiver Fahrzeugtyp
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: validCreatedBy,
      }).value!;

      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(inactiveFahrzeugtyp));

      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_INACTIVE);
      expect(result.error).toContain('inaktiv');
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen bei Duplikat-Funkrufname (AC2)', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.existsByEinsatzIdAndFunkrufname.mockResolvedValue(Result.ok(true));

      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE);
      expect(result.error).toContain('bereits im Einsatz');
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte fehlschlagen wenn Fahrzeugtyp Repository Fehler zurückgibt', async () => {
      // Given (Arrange)
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen ohne einsatzId', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: '',
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('einsatzId ist erforderlich');
    });

    it('sollte fehlschlagen ohne fahrzeugtypId', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: '',
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('fahrzeugtypId ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültiger fahrzeugtypId (kein CUID2)', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: 'invalid-cuid',
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen ohne funkrufname', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: '',
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('funkrufname ist erforderlich');
    });

    it('sollte fehlschlagen mit zu langem funkrufname', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'a'.repeat(101), // 101 Zeichen
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('maximal 100 Zeichen');
    });

    it('sollte fehlschlagen ohne createdBy', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('createdBy ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültigem createdBy (kein CUID2)', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: 'invalid-cuid',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen mit zu langem kennzeichen', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
        kennzeichen: 'a'.repeat(21), // 21 Zeichen
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('maximal 20 Zeichen');
    });

    it('sollte fehlschlagen mit ungültigem Breitengrad', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
        position: { lat: 91, lng: 0 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Breitengrad');
    });

    it('sollte fehlschlagen mit ungültigem Längengrad', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
        position: { lat: 0, lng: 181 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Längengrad');
    });

    it('sollte gültige Position akzeptieren', () => {
      // Given (Arrange)
      const commandResult = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
        position: { lat: 49.8728, lng: 8.6512 },
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value!.position).toEqual({ lat: 49.8728, lng: 8.6512 });
    });
  });

  describe('Transaction Behavior (AC4)', () => {
    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Outbox-Fehler simulieren
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte bei Repository-Exception die Transaktion rollen', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.save.mockRejectedValue(new Error('UNIQUE_CONSTRAINT_VIOLATION'));

      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
    });
  });

  describe('Temporary vs. StammFahrzeug Distinction (AC1)', () => {
    it('sollte KEINE stammId im EinsatzFahrzeug setzen', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stammId).toBeUndefined();

      const savedAggregate = mockEinsatzFahrzeugRepository.save.mock.calls[0][0];
      expect(savedAggregate.stammId).toBeUndefined();
    });

    it('sollte FahrzeugErfasstEvent mit undefined stammId emittieren', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0][0];
      const event = events[0];

      expect(event.einsatzId).toBe(validEinsatzId);
      expect(event.funkrufname).toBe('RTW 1');
      expect(event.stammId).toBeUndefined(); // KRITISCH für temporäre Fahrzeuge!
      expect(event.fmsStatus).toBe(2);
      expect(event.erfasstVon).toBe(validCreatedBy);
    });
  });

  describe('FMS-Status Initial Value (AC1)', () => {
    it('sollte FMS-Status 2 (Einsatzbereit) als Initialwert setzen', async () => {
      // Given (Arrange)
      const command = ErfasseTemporalesFahrzeugCommand.create({
        einsatzId: validEinsatzId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'RTW 1',
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.fmsStatus).toBe(2);

      const savedAggregate = mockEinsatzFahrzeugRepository.save.mock.calls[0][0];
      expect(savedAggregate.fmsStatus).toBe(2);
    });
  });
});
