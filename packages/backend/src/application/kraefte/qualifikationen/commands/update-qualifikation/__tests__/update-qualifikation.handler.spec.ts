import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UpdateQualifikationHandler } from '../update-qualifikation.handler';
import { UpdateQualifikationCommand } from '../update-qualifikation.command';

describe('UpdateQualifikationHandler', () => {
  let handler: UpdateQualifikationHandler;
  let testId: string;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByAbkuerzung: jest.Mock;
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

  const createMockQualifikation = (
    overrides: Partial<{
      id: string;
      name: string;
      abkuerzung: string;
      kategorie: 'FUEHRUNG' | 'SANITAET' | 'BETREUUNG' | 'TECHNIK' | 'SONSTIGES';
      istAktiv: boolean;
    }> = {},
  ) => {
    return Qualifikation.reconstitute({
      id: overrides.id ?? testId,
      name: overrides.name ?? 'Zugführer',
      abkuerzung: overrides.abkuerzung ?? 'ZFÜ',
      kategorie: overrides.kategorie ?? 'FUEHRUNG',
      istAktiv: overrides.istAktiv ?? true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'cm1111111111abcdef11111',
    }).value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    testId = createId();

    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByAbkuerzung: jest.fn().mockResolvedValue(Result.ok(null)),
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
        UpdateQualifikationHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.QUALIFIKATION, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<UpdateQualifikationHandler>(UpdateQualifikationHandler);
  });

  describe('execute', () => {
    it('sollte Qualifikation erfolgreich aktualisieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Zugführer aktualisiert',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Handler gibt jetzt QualifikationDto statt string zurück (N+1 Query Fix)
      expect(result.value).toBeDefined();
      expect(result.value!.id).toBe(testId);
      expect(result.value!.name).toBe('Zugführer aktualisiert');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte mehrere Felder gleichzeitig aktualisieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
        kategorie: 'SANITAET',
        beschreibung: 'Neue Beschreibung',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
      expect(savedAggregate.name).toBe('Neuer Name');
      expect(savedAggregate.kategorieValue).toBe('SANITAET');
      expect(savedAggregate.beschreibung).toBe('Neue Beschreibung');
    });

    it('sollte fehlschlagen wenn Qualifikation nicht gefunden wird', async () => {
      // Given (Arrange)
      const nonExistentId = createId();
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = UpdateQualifikationCommand.create({
        id: nonExistentId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn neue Abkürzung bereits vergeben ist', async () => {
      // Given (Arrange)
      const conflictingId = createId();
      const existingQualifikation = createMockQualifikation({ abkuerzung: 'ALT' });
      const conflictingQualifikation = createMockQualifikation({
        id: conflictingId,
        abkuerzung: 'NEU',
      });

      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));
      mockRepository.findByAbkuerzung.mockResolvedValue(Result.ok(conflictingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        abkuerzung: 'NEU',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Abkürzung 'NEU' ist bereits vergeben");
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte gleiche Abkürzung erlauben (keine Änderung)', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ abkuerzung: 'ZFÜ' });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        abkuerzung: 'ZFÜ', // Gleiche Abkürzung
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // findByAbkuerzung sollte NICHT aufgerufen werden bei gleicher Abkürzung
      expect(mockRepository.findByAbkuerzung).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository-Fehler bei findById auftritt', async () => {
      // Given (Arrange)
      mockRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));
      mockRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte istAktiv von true auf false aktualisieren können (Deaktivierung)', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        istAktiv: false,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
      expect(savedAggregate.istAktiv).toBe(false);
    });

    it('sollte istAktiv von false auf true aktualisieren können (Reaktivierung)', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: false });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        istAktiv: true,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.istAktiv).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
      expect(savedAggregate.istAktiv).toBe(true);
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen ohne ID', () => {
      // Given (Arrange)
      const commandResult = UpdateQualifikationCommand.create({
        id: '',
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('ID ist erforderlich');
    });

    it('sollte fehlschlagen ohne updatedBy', () => {
      // Given (Arrange)
      const commandResult = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: '',
        name: 'Neuer Name',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('updatedBy ist erforderlich');
    });

    it('sollte fehlschlagen mit zu kurzem Namen', () => {
      // Given (Arrange)
      const commandResult = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'AB',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Name muss mindestens 3 Zeichen haben');
    });

    it('sollte fehlschlagen mit ungültiger Kategorie', () => {
      // Given (Arrange)
      const commandResult = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        kategorie: 'UNGUELTIG' as never,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Ungültige Kategorie');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Outbox-Fehler simulieren
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      // TransactionalCommandHandler fängt Exception und gibt Result.fail() zurück
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      // Repository.save sollte zwar aufgerufen worden sein, aber die Transaction sollte gerollt sein
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    describe('Special Characters', () => {
      it('sollte Umlaute in Name akzeptieren', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          name: 'Ärztlicher Leiter Rettungsdienst',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.name).toBe('Ärztlicher Leiter Rettungsdienst');
      });

      it('sollte ß (scharfes S) in Abkürzung akzeptieren', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          abkuerzung: 'STRß',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.abkuerzung).toBe('STRß');
      });

      it('sollte Emojis in Name akzeptieren', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          name: 'Ersthelfer 🚑',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.name).toBe('Ersthelfer 🚑');
      });
    });

    describe('Maximum Length Validation', () => {
      it('sollte Namen mit exakt 100 Zeichen akzeptieren', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const nameWith100Chars = 'A'.repeat(100);
        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          name: nameWith100Chars,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.name.length).toBe(100);
      });

      it('sollte Abkürzung mit exakt 20 Zeichen akzeptieren', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const abkuerzungWith20Chars = 'B'.repeat(20);
        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          abkuerzung: abkuerzungWith20Chars,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.abkuerzung.length).toBe(20);
      });

      it('sollte Beschreibung mit exakt 1000 Zeichen akzeptieren', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const beschreibungWith1000Chars = 'C'.repeat(1000);
        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          beschreibung: beschreibungWith1000Chars,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.beschreibung?.length).toBe(1000);
      });

      it('sollte Namen mit 101 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const nameWith101Chars = 'A'.repeat(101);
        const commandResult = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          name: nameWith101Chars,
        });

        // Then (Assert)
        // CR-3 Fix: Command validiert jetzt Max-Length als Defense-in-Depth
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 100 Zeichen');
      });

      it('sollte Abkürzung mit 21 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const abkuerzungWith21Chars = 'B'.repeat(21);
        const commandResult = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          abkuerzung: abkuerzungWith21Chars,
        });

        // Then (Assert)
        // CR-3 Fix: Command validiert jetzt Max-Length als Defense-in-Depth
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 20 Zeichen');
      });

      it('sollte Beschreibung mit 1001 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const beschreibungWith1001Chars = 'C'.repeat(1001);
        const commandResult = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          beschreibung: beschreibungWith1001Chars,
        });

        // Then (Assert)
        // CR-3 Fix: Command validiert jetzt Max-Length als Defense-in-Depth
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 1000 Zeichen');
      });
    });

    describe('Whitespace Trimming', () => {
      it('sollte führende und nachfolgende Whitespaces in Name trimmen', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          name: '   Zugführer Neu   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.name).toBe('Zugführer Neu');
      });

      it('sollte Whitespaces in Abkürzung trimmen', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          abkuerzung: '  ZFNEU  ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.abkuerzung).toBe('ZFNEU');
      });

      it('sollte Whitespaces in Beschreibung trimmen', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          beschreibung: '   Neue Beschreibung   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.beschreibung).toBe('Neue Beschreibung');
      });

      it('sollte leere Beschreibung nach Trim als undefined speichern', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation({
          id: testId,
          name: 'Test',
          abkuerzung: 'TEST',
        });
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          beschreibung: '   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.beschreibung).toBeUndefined();
      });
    });

    describe('Empty-After-Trim Handling', () => {
      it('sollte Namen mit nur Whitespace ablehnen', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const commandResult = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          name: '   ',
        });

        // Then (Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte Abkürzung mit nur Whitespace ablehnen', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const commandResult = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          abkuerzung: '  ',
        });

        // Then (Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('mindestens 2 Zeichen');
      });
    });

    describe('No-Op Updates', () => {
      it('sollte Update ohne Änderungen akzeptieren', async () => {
        // Given (Arrange)
        const existingQualifikation = createMockQualifikation();
        mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

        const command = UpdateQualifikationCommand.create({
          id: testId,
          updatedBy: 'cm9999999999abcdef99999',
          // Keine Felder geändert
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        // Aggregate.update() sollte KEINE Events emittieren bei keinen Änderungen
        // Aber save() wird trotzdem aufgerufen
        expect(mockRepository.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('null vs undefined Handling', () => {
    it('sollte undefined für nicht-gesetzte Beschreibung verwenden', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
        // beschreibung ist nicht gesetzt (undefined)
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(command.beschreibung).toBeUndefined();
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte QualifikationUpdatedEvent mit korrekter Struktur emittieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
        kategorie: 'SANITAET',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      // outboxRepository.save() wird mit DomainEvent[] aufgerufen
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.constructor.name).toBe('QualifikationUpdatedEvent');
      expect(event.changes).toMatchObject({
        name: 'Neuer Name',
        kategorie: 'SANITAET',
      });
      expect(event.updatedBy).toBe('cm9999999999abcdef99999');
      expect(event.aggregateId).toBeDefined();
    });

    it('sollte QualifikationUpdatedEvent nur mit geänderten Feldern emittieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        istAktiv: false, // Nur dieses Feld ändern
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.changes).toEqual({ istAktiv: false });
      // Sicherstellen dass name/abkuerzung NICHT im changes-Objekt sind
      expect(event.changes.name).toBeUndefined();
      expect(event.changes.abkuerzung).toBeUndefined();
    });

    it('sollte QualifikationUpdatedEvent bei Reaktivierung (istAktiv: false → true) emittieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: false });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        istAktiv: true,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.constructor.name).toBe('QualifikationUpdatedEvent');
      expect(event.changes).toEqual({ istAktiv: true });
      expect(event.updatedBy).toBe('cm9999999999abcdef99999');
    });
  });

  describe('Concurrent Modification / Race Conditions', () => {
    it('sollte Abkürzungs-Kollision erkennen wenn zwischen Check und Save eine andere Qualifikation mit gleicher Abkürzung erstellt wird', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ abkuerzung: 'ALT' });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));
      mockRepository.findByAbkuerzung.mockResolvedValue(Result.ok(null)); // Erster Check: Keine Kollision
      mockRepository.save.mockResolvedValue(
        Result.fail('UNIQUE_CONSTRAINT_VIOLATION: Abkürzung bereits vergeben'), // Prisma unique constraint error
      );

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        abkuerzung: 'NEU',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
      // Save wurde versucht, aber DB hat unique constraint violation geworfen
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte P2025 (Record Not Found) von Prisma korrekt behandeln', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation();
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));
      // Simuliere P2025 Error von Prisma (Record not found during upsert)
      mockRepository.save.mockResolvedValue(Result.fail(`Fehler beim Speichern: Datensatz nicht gefunden (ID: ${testId}).`));

      const command = UpdateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Neuer Name',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte bei concurrent updates auf verschiedene Qualifikationen beide erfolgreich sein', async () => {
      // Given (Arrange)
      const id1 = createId();
      const id2 = createId();
      const qualifikation1 = createMockQualifikation({ id: id1, abkuerzung: 'Q1' });
      const qualifikation2 = createMockQualifikation({ id: id2, abkuerzung: 'Q2' });

      // Mock reset für sequentielle Calls
      mockRepository.findById.mockReset();
      mockRepository.findById
        .mockResolvedValueOnce(Result.ok(qualifikation1)) // First call for command1
        .mockResolvedValueOnce(Result.ok(qualifikation2)); // Second call for command2

      const command1 = UpdateQualifikationCommand.create({
        id: id1,
        updatedBy: 'cm1234567890abcdef12345',
        name: 'Qualifikation 1 Updated',
      }).value!;

      const command2 = UpdateQualifikationCommand.create({
        id: id2,
        updatedBy: 'cm9999999999abcdef99999',
        name: 'Qualifikation 2 Updated',
      }).value!;

      // When (Act)
      const result1 = await handler.execute(command1);
      const result2 = await handler.execute(command2);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
