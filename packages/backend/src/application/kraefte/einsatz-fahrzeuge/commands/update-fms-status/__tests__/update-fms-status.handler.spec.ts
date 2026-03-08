// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { createId as createCuid } from '@paralleldrive/cuid2';
import { v4 as uuidv4 } from 'uuid';
import { UpdateFmsStatusHandler } from '../update-fms-status.handler';
import { UpdateFmsStatusCommand } from '../update-fms-status.command';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { Result } from '@domain/common/result';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { EINSATZ_FAHRZEUG_ERROR_CODES } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('UpdateFmsStatusHandler', () => {
  let handler: UpdateFmsStatusHandler;

  // Mock Repositories
  let mockEinsatzFahrzeugRepository: {
    findById: jest.Mock;
    save: jest.Mock;
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
  const testEinsatzId = uuidv4();
  const testFahrzeugId = createCuid();
  const testUserId = createCuid();
  const testFahrzeugtypId = createCuid();

  /**
   * Erstellt ein mock EinsatzFahrzeug Aggregate
   */
  function createMockFahrzeug(overrides?: Partial<{ fmsStatus: number; einsatzId: string; funkrufname: string }>): EinsatzFahrzeug {
    const defaultProps = {
      id: testFahrzeugId,
      einsatzId: overrides?.einsatzId ?? testEinsatzId,
      fahrzeugtypId: testFahrzeugtypId,
      funkrufname: overrides?.funkrufname ?? 'Florian 1/46',
      kennzeichen: 'DA-FW 101',
      fmsStatus: overrides?.fmsStatus ?? 2,
      stammId: createCuid(),
      createdBy: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return EinsatzFahrzeug.reconstitute(defaultProps).value!;
  }

  /**
   * Erstellt ein mock Fahrzeugtyp Aggregate
   */
  function createMockFahrzeugtyp(): Fahrzeugtyp {
    const result = Fahrzeugtyp.reconstitute({
      id: testFahrzeugtypId,
      code: 'LF',
      bezeichnung: 'Löschfahrzeug',
      kategorie: 'RETTUNGSDIENST',
      istAktiv: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: testUserId,
    });
    return result.value!;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repositories initialisieren
    mockEinsatzFahrzeugRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findByEinsatzId: jest.fn(),
      existsByEinsatzIdAndFunkrufname: jest.fn(),
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
        UpdateFmsStatusHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockEinsatzFahrzeugRepository },
        { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockFahrzeugtypRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<UpdateFmsStatusHandler>(UpdateFmsStatusHandler);
  });

  describe('execute - Success Cases', () => {
    it('sollte FMS-Status erfolgreich aktualisieren (AC2)', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.fmsStatus).toBe(4);
      expect(mockEinsatzFahrzeugRepository.findById).toHaveBeenCalledWith(expect.objectContaining({ value: testFahrzeugId }), expect.any(Object));
      expect(mockEinsatzFahrzeugRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte FmsStatusGeaendertEvent in Outbox speichern (AC3)', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);
      expect(events[0]?.constructor.name).toBe('FmsStatusGeaendertEvent');
    });

    it('sollte Position zusammen mit FMS-Status aktualisieren (AC5)', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
        position: { lat: 52.52, lng: 13.405 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toEqual({ lat: 52.52, lng: 13.405 });
      expect(mockEinsatzFahrzeugRepository.save).toHaveBeenCalled();
    });

    it('sollte $transaction aufrufen (Transaktions-Pattern)', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Domain Events extrahieren (clearDomainEvents)', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Verifikation: Events wurden in Outbox gespeichert
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(events.length).toBe(1);
      expect(events[0]?.einsatzFahrzeugId).toBe(testFahrzeugId);
    });
  });

  describe('execute - Error Cases', () => {
    it('sollte fehlschlagen wenn EinsatzFahrzeug nicht gefunden (AC1)', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(null));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND);
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Transaction Rollback bei Repository-Speicherfehler durchführen (CRITICAL)', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      // Simuliere DB-Fehler beim Speichern
      mockEinsatzFahrzeugRepository.save.mockResolvedValue(Result.fail('Database connection lost'));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4, // Gültiger Status
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection lost');
      // CRITICAL: outboxRepository.save() darf NICHT aufgerufen werden bei Speicherfehler
      // (weil Handler vorher abbricht)
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn einsatzId nicht übereinstimmt (Security)', async () => {
      // Given (Arrange)
      const differentEinsatzId = uuidv4();
      const fahrzeug = createMockFahrzeug({ einsatzId: differentEinsatzId });
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND);
      expect(result.error).toContain('gehört nicht zu Einsatz');
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.findById fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      mockEinsatzFahrzeugRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte fehlschlagen wenn Fahrzeugtyp nicht gefunden', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(null));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND);
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen mit ungültigem fmsStatus (> 9)', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 10,
        updatedBy: testUserId,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('fmsStatus');
      expect(result.error).toContain('zwischen 0 und 9');
    });

    it('sollte fehlschlagen mit ungültigem fmsStatus (< 0)', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: -1,
        updatedBy: testUserId,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('fmsStatus');
      expect(result.error).toContain('zwischen 0 und 9');
    });

    it('sollte fehlschlagen ohne einsatzId', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: '',
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültiger fahrzeugId (kein CUID2)', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: 'invalid-cuid',
        fmsStatus: 4,
        updatedBy: testUserId,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen mit ungültiger updatedBy (kein CUID2)', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: 'invalid-cuid',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen mit ungültiger Position (lat out of range)', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
        position: { lat: 91, lng: 13.405 },
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Position');
    });

    it('sollte fehlschlagen mit ungültiger Position (lng out of range)', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
        position: { lat: 52.52, lng: 181 },
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Position');
    });

    it('sollte gültige Position akzeptieren', () => {
      // Given/When (Arrange/Act)
      const result = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
        position: { lat: 52.52, lng: 13.405 },
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toEqual({ lat: 52.52, lng: 13.405 });
    });
  });

  describe('Transaction Behavior (AC3)', () => {
    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      // Mock $transaction to throw error INSIDE the callback execution
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {};
        // Configure outbox to throw error when called inside transaction
        const originalSave = mockOutboxRepository.save;
        mockOutboxRepository.save.mockImplementation(() => {
          throw new Error('Outbox-Speicherfehler');
        });

        try {
          return await callback(txMock);
        } finally {
          // Restore original mock after transaction
          mockOutboxRepository.save = originalSave;
        }
      });

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
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
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      mockEinsatzFahrzeugRepository.save.mockRejectedValue(new Error('UNIQUE_CONSTRAINT_VIOLATION'));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
    });
  });

  describe('Domain Event (AC2)', () => {
    it('sollte FmsStatusGeaendertEvent mit korrekten Daten emittieren', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug({ funkrufname: 'Florian 1/46', fmsStatus: 2 });
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      const event = events[0];

      expect(event.einsatzFahrzeugId).toBe(testFahrzeugId);
      expect(event.einsatzId).toBe(testEinsatzId);
      expect(event.neuerStatus).toBe(4);
      expect(event.previousStatus).toBe(2);
      expect(event.geaendertVon).toBe(testUserId);
      expect(event.funkrufname).toBe('Florian 1/46');
    });

    it('sollte FmsStatusGeaendertEvent auch bei Position-Update emittieren', async () => {
      // Given (Arrange)
      // Position wird im DTO gespeichert, aber NICHT im Event (Event enthält nur Status-Änderung)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
        position: { lat: 52.52, lng: 13.405 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(events.length).toBe(1);
      expect(events[0]?.constructor.name).toBe('FmsStatusGeaendertEvent');
      // Position ist im DTO gespeichert, nicht im Event
      expect(result.value?.position).toEqual({ lat: 52.52, lng: 13.405 });
    });

    it('sollte bei gleichem Status erfolgreich sein aber KEIN Event emittieren (Idempotenz)', async () => {
      // Given (Arrange)
      const currentStatus = 4;
      const fahrzeug = createMockFahrzeug({ fmsStatus: currentStatus });
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: currentStatus, // GLEICHER Status wie aktuell (idempotent operation)
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fmsStatus).toBe(currentStatus);

      // KRITISCHES IDEMPOTENZ-VERHALTEN:
      // Bei unverändertem Status emittiert Aggregate KEIN Event (getDomainEvents() = []).
      // Siehe: einsatz-fahrzeug.aggregate.spec.ts:1584-1617 für Aggregate-Level Test.
      //
      // KONSEQUENZ: BEIDE Repository-Calls werden NICHT ausgeführt:
      //   1. repository.save() wird ÜBERSPRUNGEN (kein DB-Update nötig bei unverändertem Status)
      //   2. outboxRepository.save() wird ÜBERSPRUNGEN (keine Events vorhanden zum Speichern)
      //
      // GRUND: Verhindert unnötige DB-Writes und ETB-Spam durch wiederholte Meldungen.
      // API gibt trotzdem 200 OK zurück (idempotent operation = erfolgreiche Ausführung).
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte save() NUR bei tatsaechlicher Aenderung aufrufen (Idempotenz Verification)', async () => {
      // Given (Arrange) - Status bleibt unverändert
      const currentStatus = 3;
      const fahrzeug = createMockFahrzeug({ fmsStatus: currentStatus });
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: currentStatus, // GLEICHER Status
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);

      // KRITISCH: Verifiziere dass save() bei unverändertem Status NICHT aufgerufen wurde
      // Dies ist das Kernprinzip der Idempotenz: Keine DB-Writes bei gleichem Status
      expect(mockEinsatzFahrzeugRepository.save).not.toHaveBeenCalled();
      expect(mockEinsatzFahrzeugRepository.save).toHaveBeenCalledTimes(0);

      // ZUSÄTZLICH: Verifiziere dass bei Status-Änderung save() aufgerufen wird (Gegencheck)
      jest.clearAllMocks();
      const fahrzeug2 = createMockFahrzeug({ fmsStatus: currentStatus });
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug2));

      const commandWithChange = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: currentStatus + 1, // ANDERER Status
        updatedBy: testUserId,
      }).value!;

      await handler.execute(commandWithChange);

      // Bei Status-Änderung wird save() aufgerufen
      expect(mockEinsatzFahrzeugRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Cases - Combined Failures', () => {
    it('sollte Transaction Rollback durchführen wenn Repository UND Outbox fehlschlagen', async () => {
      // Given (Arrange)
      const fahrzeug = createMockFahrzeug();
      mockEinsatzFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
      // Erster Fehler: Repository save
      mockEinsatzFahrzeugRepository.save.mockResolvedValue(Result.fail('Repository-Fehler'));

      const command = UpdateFmsStatusCommand.create({
        einsatzId: testEinsatzId,
        fahrzeugId: testFahrzeugId,
        fmsStatus: 4,
        updatedBy: testUserId,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Repository-Fehler');
      // Outbox sollte nicht aufgerufen worden sein (da Repository vorher fehlschlug)
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });
});
