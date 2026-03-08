// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UpdateFahrzeugtypHandler } from '../update-fahrzeugtyp.handler';
import { UpdateFahrzeugtypCommand } from '../update-fahrzeugtyp.command';

describe('UpdateFahrzeugtypHandler', () => {
  let handler: UpdateFahrzeugtypHandler;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    findAll: jest.Mock;
    exists: jest.Mock;
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

  // Factory function für frische Instanzen (Aggregate werden durch Handler mutiert)
  const existingId = createId();

  const createExistingFahrzeugtyp = () =>
    Fahrzeugtyp.reconstitute({
      id: existingId,
      code: 'HLF',
      bezeichnung: 'Hilfeleistungslöschfahrzeug',
      kategorie: 'RETTUNGSDIENST',
      istAktiv: true,
      sortOrder: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      createdBy: 'user-123',
    }).value!;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn().mockImplementation(() => Result.ok(createExistingFahrzeugtyp())),
      findByCode: jest.fn().mockResolvedValue(Result.ok(null)),
      findAll: jest.fn(),
      exists: jest.fn(),
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
        UpdateFahrzeugtypHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<UpdateFahrzeugtypHandler>(UpdateFahrzeugtypHandler);
  });

  describe('execute', () => {
    it('sollte Fahrzeugtyp erfolgreich aktualisieren mit gültigen Daten', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'HLF 20',
        beschreibung: 'Aktualisierte Beschreibung',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.bezeichnung).toBe('HLF 20');
      expect(mockRepository.findById).toHaveBeenCalledWith(expect.anything(), expect.any(Object));
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte nur geänderte Felder aktualisieren', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        beschreibung: 'Neue Beschreibung',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = mockRepository.save.mock.calls[0]?.[0]! as Fahrzeugtyp;
      expect(savedAggregate.code).toBe('HLF'); // Unchanged
      expect(savedAggregate.bezeichnung).toBe('Hilfeleistungslöschfahrzeug'); // Unchanged
    });

    it('sollte Code automatisch auf UPPERCASE normalisieren bei Update', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        code: 'hlf20',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.code).toBe('HLF20');
    });

    it('sollte Sollbesatzung aktualisieren', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        sollbesatzung: { fahrer: 1, funktrupp: 9 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0]?.[0]! as Fahrzeugtyp;
      expect(savedAggregate.sollbesatzung).toEqual({ fahrer: 1, funktrupp: 9 });
    });

    it('sollte istAktiv-Status aktualisieren', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        istAktiv: false,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte fehlschlagen wenn Fahrzeugtyp nicht gefunden wurde', async () => {
      // Given (Arrange)
      const nonExistentId = createId(); // Valides CUID-Format
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = UpdateFahrzeugtypCommand.create({
        id: nonExistentId,
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'Test',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(result.error).toContain('FAHRZEUGTYP_NOT_FOUND');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn neuer Code bereits vergeben ist', async () => {
      // Given (Arrange)
      const otherFahrzeugtyp = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-999',
      }).value!;
      mockRepository.findByCode.mockResolvedValue(Result.ok(otherFahrzeugtyp));

      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        code: 'RTW',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Code 'RTW' ist bereits vergeben");
      expect(result.error).toContain('FAHRZEUGTYP_CODE_DUPLICATE');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Code-Änderung erlauben wenn gleicher Code beibehalten wird', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        code: 'HLF', // Same code
        bezeichnung: 'HLF 20',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.findByCode).not.toHaveBeenCalled(); // Skip uniqueness check
    });

    it('sollte fehlschlagen wenn Repository-Fehler bei Uniqueness-Check auftritt', async () => {
      // Given (Arrange)
      mockRepository.findByCode.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        code: 'NEW',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      mockRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'Neue Bezeichnung',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte erfolgreich sein wenn nur updatedBy geändert wird (minimales Update)', async () => {
      // Given (Arrange)
      // HINWEIS: updatedBy alleine zählt als valide Änderung (Audit-Trail)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen ohne ID', () => {
      // Given (Arrange)
      const commandResult = UpdateFahrzeugtypCommand.create({
        id: '',
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'Test',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('ID ist erforderlich');
    });

    it('sollte fehlschlagen ohne updatedBy', () => {
      // Given (Arrange)
      const commandResult = UpdateFahrzeugtypCommand.create({
        id: 'valid-id',
        updatedBy: '',
        bezeichnung: 'Test',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('updatedBy ist erforderlich');
    });

    it('sollte fehlschlagen mit zu kurzem Code', () => {
      // Given (Arrange)
      const commandResult = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        code: 'A',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Code muss mindestens 2 Zeichen haben');
    });

    it('sollte fehlschlagen mit zu kurzer Bezeichnung', () => {
      // Given (Arrange)
      const commandResult = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'AB',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Bezeichnung muss mindestens 3 Zeichen haben');
    });

    it('sollte fehlschlagen mit ungültiger Kategorie', () => {
      // Given (Arrange)
      const commandResult = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        kategorie: 'UNGUELTIG' as never,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Ungültige Kategorie');
    });

    it('sollte fehlschlagen mit negativer Sollbesatzung', () => {
      // Given (Arrange)
      const commandResult = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        sollbesatzung: { fahrer: -1 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('fahrer muss >= 0 sein');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'Neue Bezeichnung',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'Neue Bezeichnung',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    describe('Whitespace Trimming', () => {
      it('sollte Whitespaces in Code trimmen und auf UPPERCASE normalisieren', async () => {
        // Given (Arrange)
        const command = UpdateFahrzeugtypCommand.create({
          id: existingId,
          updatedBy: 'cm1234567890abcdef12345',
          code: '   rtw   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.code).toBe('RTW');
      });

      it('sollte Whitespaces in Bezeichnung trimmen', async () => {
        // Given (Arrange)
        const command = UpdateFahrzeugtypCommand.create({
          id: existingId,
          updatedBy: 'cm1234567890abcdef12345',
          bezeichnung: '   HLF 20   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0]?.[0]! as Fahrzeugtyp;
        expect(savedAggregate.bezeichnung).toBe('HLF 20');
      });
    });

    describe('Maximum Length Validation', () => {
      it('sollte Code mit 11 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const codeWith11Chars = 'A'.repeat(11);
        const commandResult = UpdateFahrzeugtypCommand.create({
          id: existingId,
          updatedBy: 'cm1234567890abcdef12345',
          code: codeWith11Chars,
        });

        // Then (Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 10 Zeichen');
      });

      it('sollte Bezeichnung mit 101 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const bezeichnungWith101Chars = 'B'.repeat(101);
        const commandResult = UpdateFahrzeugtypCommand.create({
          id: existingId,
          updatedBy: 'cm1234567890abcdef12345',
          bezeichnung: bezeichnungWith101Chars,
        });

        // Then (Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 100 Zeichen');
      });
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte FahrzeugtypUpdatedEvent mit korrekter Struktur emittieren', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'HLF 20',
        beschreibung: 'Aktualisierte Beschreibung',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.constructor.name).toBe('FahrzeugtypUpdatedEvent');
      expect(event.updatedBy).toBe('cm1234567890abcdef12345');
      expect(event.aggregateId).toBeDefined();
    });
  });

  describe('Concurrent Modification / Race Conditions', () => {
    it('sollte Code-Kollision erkennen wenn zwischen Check und Save ein anderer Fahrzeugtyp mit gleichem Code erstellt wird', async () => {
      // Given (Arrange)
      mockRepository.findByCode.mockResolvedValue(Result.ok(null));
      mockRepository.save.mockResolvedValue(Result.fail('UNIQUE_CONSTRAINT_VIOLATION: Code bereits vergeben'));

      const command = UpdateFahrzeugtypCommand.create({
        id: existingId,
        updatedBy: 'cm1234567890abcdef12345',
        code: 'NEW',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Invalid ID Handling', () => {
    it('sollte fehlschlagen mit ungültiger ID-Format', async () => {
      // Given (Arrange)
      const command = UpdateFahrzeugtypCommand.create({
        id: 'invalid-id-format',
        updatedBy: 'cm1234567890abcdef12345',
        bezeichnung: 'Test',
      }).value!;

      // Mock FahrzeugtypId.create to fail
      mockRepository.findById.mockResolvedValue(Result.fail('Ungültige ID-Format'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
