import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { StammFahrzeug } from '@domain/kraefte/aggregates/stamm-fahrzeug.aggregate';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EINSATZ_FAHRZEUG_ERROR_CODES } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { ErfasseFahrzeugAusStammdatenHandler } from '../erfasse-fahrzeug-aus-stammdaten.handler';
import { ErfasseFahrzeugAusStammdatenCommand } from '../erfasse-fahrzeug-aus-stammdaten.command';

describe('ErfasseFahrzeugAusStammdatenHandler', () => {
  let handler: ErfasseFahrzeugAusStammdatenHandler;

  // Mock Repositories
  let mockEinsatzFahrzeugRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
    existsByEinsatzIdAndFunkrufname: jest.Mock;
  };
  let mockStammFahrzeugRepository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    save: jest.Mock;
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
  const validStammId = createId();
  const validCreatedBy = createId();
  const validFahrzeugtypId = createId();

  /**
   * Erstellt ein mock StammFahrzeug Aggregate
   */
  function createMockStammFahrzeug(overrides?: { id?: string; funkrufname?: string; kennzeichen?: string; fahrzeugtypId?: string; archivedAt?: Date }): StammFahrzeug {
    const id = overrides?.id ?? validStammId;
    const result = StammFahrzeug.reconstitute({
      id,
      rufname: 'RTW 1',
      funkrufname: overrides?.funkrufname ?? 'Rotkreuz 83/1',
      fahrzeugtypId: overrides?.fahrzeugtypId ?? validFahrzeugtypId,
      kennzeichen: overrides?.kennzeichen ?? 'DA-RK 101',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validCreatedBy,
      archivedAt: overrides?.archivedAt,
    });
    return result.value!;
  }

  /**
   * Erstellt ein mock Fahrzeugtyp Aggregate
   * Verwendet immer validFahrzeugtypId um konsistent zu sein
   */
  function createMockFahrzeugtyp(): Fahrzeugtyp {
    const result = Fahrzeugtyp.reconstitute({
      id: validFahrzeugtypId,
      code: 'RTW',
      bezeichnung: 'Rettungswagen',
      kategorie: 'RETTUNGSDIENST', // Gültige Kategorie: RETTUNGSDIENST, FUEHRUNG, TRANSPORT, SONSTIGES
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

    mockStammFahrzeugRepository = {
      findById: jest.fn().mockResolvedValue(Result.ok(createMockStammFahrzeug())),
      findAll: jest.fn(),
      save: jest.fn(),
    };

    mockFahrzeugtypRepository = {
      // Gibt immer den Mock-Fahrzeugtyp zurück, unabhängig von der ID
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
        ErfasseFahrzeugAusStammdatenHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockEinsatzFahrzeugRepository },
        { provide: KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG, useValue: mockStammFahrzeugRepository },
        { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockFahrzeugtypRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<ErfasseFahrzeugAusStammdatenHandler>(ErfasseFahrzeugAusStammdatenHandler);
  });

  describe('execute - Success Cases', () => {
    it('sollte EinsatzFahrzeug erfolgreich aus Stammdaten erfassen (AC2)', async () => {
      // Given (Arrange)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.funkrufname).toBe('Rotkreuz 83/1');
      expect(result.value?.kennzeichen).toBe('DA-RK 101');
      expect(result.value?.fmsStatus).toBe(2); // Initial: Einsatzbereit
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(mockEinsatzFahrzeugRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte FahrzeugErfasstEvent in Outbox speichern (AC3)', async () => {
      // Given (Arrange)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
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
    });

    it('sollte EinsatzFahrzeug mit optionaler Position erfassen', async () => {
      // Given (Arrange)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
        position: { lat: 49.8728, lng: 8.6512 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toEqual({ lat: 49.8728, lng: 8.6512 });
    });

    it('sollte $transaction aufrufen (Transaktions-Pattern)', async () => {
      // Given (Arrange)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute - Error Cases', () => {
    it('sollte fehlschlagen wenn StammFahrzeug nicht gefunden (AC1)', async () => {
      // Given (Arrange)
      mockStammFahrzeugRepository.findById.mockResolvedValue(Result.ok(null));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.STAMM_NOT_FOUND);
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn StammFahrzeug archiviert ist (AC1)', async () => {
      // Given (Arrange)
      const archivedStamm = createMockStammFahrzeug({ archivedAt: new Date() });
      mockStammFahrzeugRepository.findById.mockResolvedValue(Result.ok(archivedStamm));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.STAMM_NOT_FOUND);
      expect(result.error).toContain('archiviert');
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen bei Duplikat-Funkrufname (AC4)', async () => {
      // Given (Arrange)
      // Duplikat-Check wird NACH Fahrzeugtyp-Lookup durchgeführt
      mockEinsatzFahrzeugRepository.existsByEinsatzIdAndFunkrufname.mockResolvedValue(Result.ok(true));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
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

    it('sollte fehlschlagen wenn Fahrzeugtyp nicht gefunden', async () => {
      // Given (Arrange)
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(null));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND);
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte fehlschlagen wenn StammFahrzeug Repository Fehler zurückgibt', async () => {
      // Given (Arrange)
      mockStammFahrzeugRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
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
      const commandResult = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: '',
        stammId: validStammId,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('einsatzId ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültiger stammId (kein CUID2)', () => {
      // Given (Arrange)
      const commandResult = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: 'invalid-cuid',
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('stammId muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen ohne createdBy', () => {
      // Given (Arrange)
      const commandResult = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('createdBy ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültigem Breitengrad', () => {
      // Given (Arrange)
      const commandResult = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
        position: { lat: 91, lng: 0 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Breitengrad');
    });

    it('sollte fehlschlagen mit ungültigem Längengrad', () => {
      // Given (Arrange)
      const commandResult = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
        position: { lat: 0, lng: 181 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Längengrad');
    });

    it('sollte gültige Position akzeptieren', () => {
      // Given (Arrange)
      const commandResult = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
        position: { lat: 49.8728, lng: 8.6512 },
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value?.position).toEqual({ lat: 49.8728, lng: 8.6512 });
    });
  });

  describe('Transaction Behavior (AC3)', () => {
    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Outbox-Fehler simulieren
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
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

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
    });
  });

  describe('Snapshot Pattern (AC2)', () => {
    it('sollte Funkrufname vom StammFahrzeug KOPIEREN', async () => {
      // Given (Arrange)
      const stammFahrzeug = createMockStammFahrzeug({ funkrufname: 'Florian 12/83' });
      mockStammFahrzeugRepository.findById.mockResolvedValue(Result.ok(stammFahrzeug));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.funkrufname).toBe('Florian 12/83');

      // Verifiziere, dass save mit dem kopierten Funkrufnamen aufgerufen wurde
      const savedAggregate = mockEinsatzFahrzeugRepository.save.mock.calls[0][0];
      expect(savedAggregate.funkrufname).toBe('Florian 12/83');
    });

    it('sollte Kennzeichen vom StammFahrzeug KOPIEREN (optional)', async () => {
      // Given (Arrange)
      const stammFahrzeug = createMockStammFahrzeug({ kennzeichen: 'F-RK 4711' });
      mockStammFahrzeugRepository.findById.mockResolvedValue(Result.ok(stammFahrzeug));

      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kennzeichen).toBe('F-RK 4711');
    });

    it('sollte fahrzeugtypId vom StammFahrzeug KOPIEREN', async () => {
      // Given (Arrange)
      // StammFahrzeug verwendet validFahrzeugtypId (konsistent mit createMockFahrzeugtyp)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // EinsatzFahrzeug sollte die fahrzeugtypId vom StammFahrzeug haben
      expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
    });

    it('sollte stammId im EinsatzFahrzeug referenzieren', async () => {
      // Given (Arrange)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.stammId).toBe(validStammId);
    });
  });

  describe('FMS-Status Initial Value (AC2)', () => {
    it('sollte FMS-Status 2 (Einsatzbereit) als Initialwert setzen', async () => {
      // Given (Arrange)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        createdBy: validCreatedBy,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fmsStatus).toBe(2);

      const savedAggregate = mockEinsatzFahrzeugRepository.save.mock.calls[0][0];
      expect(savedAggregate.fmsStatus).toBe(2);
    });
  });

  describe('Domain Event (AC2/AC3)', () => {
    it('sollte FahrzeugErfasstEvent mit korrekten Daten emittieren', async () => {
      // Given (Arrange)
      const command = ErfasseFahrzeugAusStammdatenCommand.create({
        einsatzId: validEinsatzId,
        stammId: validStammId,
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
      expect(event.funkrufname).toBe('Rotkreuz 83/1');
      expect(event.stammId).toBe(validStammId);
      expect(event.fmsStatus).toBe(2);
      expect(event.erfasstVon).toBe(validCreatedBy);
    });
  });
});
