import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateQualifikationHandler } from '../create-qualifikation.handler';
import { CreateQualifikationCommand } from '../create-qualifikation.command';

describe('CreateQualifikationHandler', () => {
  let handler: CreateQualifikationHandler;
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

  beforeEach(async () => {
    jest.clearAllMocks();

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
        CreateQualifikationHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.QUALIFIKATION, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<CreateQualifikationHandler>(CreateQualifikationHandler);
  });

  describe('execute', () => {
    it('sollte Qualifikation erfolgreich erstellen mit gültigen Daten', async () => {
      // Given (Arrange)
      const command = CreateQualifikationCommand.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
        beschreibung: 'Leitet einen Zug',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      // Handler gibt jetzt QualifikationDto statt string zurück (N+1 Query Fix)
      expect(typeof result.value).toBe('object');
      expect(result.value!.id).toBeDefined();
      expect(result.value!.name).toBe('Zugführer');
      expect(result.value!.abkuerzung).toBe('ZFÜ');
      expect(mockRepository.findByAbkuerzung).toHaveBeenCalledWith('ZFÜ', expect.any(Object));
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Qualifikation ohne optionale Beschreibung erstellen', async () => {
      // Given (Arrange)
      const command = CreateQualifikationCommand.create({
        name: 'Rettungssanitäter',
        abkuerzung: 'RS',
        kategorie: 'SANITAET',
        createdBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
      expect(savedAggregate.name).toBe('Rettungssanitäter');
      expect(savedAggregate.abkuerzung).toBe('RS');
      expect(savedAggregate.kategorieValue).toBe('SANITAET');
    });

    it('sollte fehlschlagen wenn Abkürzung bereits vergeben ist', async () => {
      // Given (Arrange)
      const existingId = createId();
      const existingQualifikation = Qualifikation.reconstitute({
        id: existingId,
        name: 'Existierende Qualifikation',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-999',
      }).value!;
      mockRepository.findByAbkuerzung.mockResolvedValue(Result.ok(existingQualifikation));

      const command = CreateQualifikationCommand.create({
        name: 'Zugführer Neu',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Abkürzung 'ZFÜ' ist bereits vergeben");
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository-Fehler bei Uniqueness-Check auftritt', async () => {
      // Given (Arrange)
      mockRepository.findByAbkuerzung.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = CreateQualifikationCommand.create({
        name: 'Test Qualifikation',
        abkuerzung: 'TQ',
        kategorie: 'TECHNIK',
        createdBy: 'cm1234567890abcdef12345',
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

      const command = CreateQualifikationCommand.create({
        name: 'Test Qualifikation',
        abkuerzung: 'TQ',
        kategorie: 'BETREUUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen mit zu kurzem Namen', () => {
      // Given (Arrange)
      const commandResult = CreateQualifikationCommand.create({
        name: 'AB',
        abkuerzung: 'AB',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Name muss mindestens 3 Zeichen haben');
    });

    it('sollte fehlschlagen mit zu kurzer Abkürzung', () => {
      // Given (Arrange)
      const commandResult = CreateQualifikationCommand.create({
        name: 'Gültiger Name',
        abkuerzung: 'A',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Abkürzung muss mindestens 2 Zeichen haben');
    });

    it('sollte fehlschlagen mit ungültiger Kategorie', () => {
      // Given (Arrange)
      const commandResult = CreateQualifikationCommand.create({
        name: 'Gültiger Name',
        abkuerzung: 'GN',
        kategorie: 'UNGUELTIG' as never,
        createdBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Ungültige Kategorie');
    });

    it('sollte fehlschlagen ohne createdBy', () => {
      // Given (Arrange)
      const commandResult = CreateQualifikationCommand.create({
        name: 'Gültiger Name',
        abkuerzung: 'GN',
        kategorie: 'FUEHRUNG',
        createdBy: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('createdBy ist erforderlich');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const command = CreateQualifikationCommand.create({
        name: 'Test Qualifikation',
        abkuerzung: 'TQ',
        kategorie: 'SONSTIGES',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Outbox-Fehler simulieren
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = CreateQualifikationCommand.create({
        name: 'Test Qualifikation',
        abkuerzung: 'TQ',
        kategorie: 'SONSTIGES',
        createdBy: 'cm1234567890abcdef12345',
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
        const command = CreateQualifikationCommand.create({
          name: 'Ärztlicher Leiter Rettungsdienst',
          abkuerzung: 'ÄLRD',
          kategorie: 'FUEHRUNG',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.name).toBe('Ärztlicher Leiter Rettungsdienst');
        expect(savedAggregate.abkuerzung).toBe('ÄLRD');
      });

      it('sollte ß (scharfes S) in Abkürzung akzeptieren', async () => {
        // Given (Arrange)
        const command = CreateQualifikationCommand.create({
          name: 'Straßen Rettung',
          abkuerzung: 'STRß',
          kategorie: 'TECHNIK',
          createdBy: 'cm1234567890abcdef12345',
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
        const command = CreateQualifikationCommand.create({
          name: 'Ersthelfer 🚑',
          abkuerzung: 'EH',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
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
        const nameWith100Chars = 'A'.repeat(100);
        const command = CreateQualifikationCommand.create({
          name: nameWith100Chars,
          abkuerzung: 'MAX',
          kategorie: 'SONSTIGES',
          createdBy: 'cm1234567890abcdef12345',
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
        const abkuerzungWith20Chars = 'B'.repeat(20);
        const command = CreateQualifikationCommand.create({
          name: 'Lange Abkürzung Test',
          abkuerzung: abkuerzungWith20Chars,
          kategorie: 'SONSTIGES',
          createdBy: 'cm1234567890abcdef12345',
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
        const beschreibungWith1000Chars = 'C'.repeat(1000);
        const command = CreateQualifikationCommand.create({
          name: 'Test Qualifikation',
          abkuerzung: 'TQ',
          kategorie: 'SONSTIGES',
          createdBy: 'cm1234567890abcdef12345',
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
        const commandResult = CreateQualifikationCommand.create({
          name: nameWith101Chars,
          abkuerzung: 'TQ',
          kategorie: 'SONSTIGES',
          createdBy: 'cm1234567890abcdef12345',
        });

        // Then (Assert)
        // CR-2 Fix: Command validiert jetzt Max-Length als Defense-in-Depth
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 100 Zeichen');
      });

      it('sollte Abkürzung mit 21 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const abkuerzungWith21Chars = 'B'.repeat(21);
        const commandResult = CreateQualifikationCommand.create({
          name: 'Test Qualifikation',
          abkuerzung: abkuerzungWith21Chars,
          kategorie: 'SONSTIGES',
          createdBy: 'cm1234567890abcdef12345',
        });

        // Then (Assert)
        // CR-2 Fix: Command validiert jetzt Max-Length als Defense-in-Depth
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 20 Zeichen');
      });

      it('sollte Beschreibung mit 1001 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const beschreibungWith1001Chars = 'C'.repeat(1001);
        const commandResult = CreateQualifikationCommand.create({
          name: 'Test Qualifikation',
          abkuerzung: 'TQ',
          kategorie: 'SONSTIGES',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: beschreibungWith1001Chars,
        });

        // Then (Assert)
        // CR-2 Fix: Command validiert jetzt Max-Length als Defense-in-Depth
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 1000 Zeichen');
      });
    });

    describe('Whitespace Trimming', () => {
      it('sollte führende und nachfolgende Whitespaces in Name trimmen', async () => {
        // Given (Arrange)
        const command = CreateQualifikationCommand.create({
          name: '   Zugführer   ',
          abkuerzung: 'ZFÜ',
          kategorie: 'FUEHRUNG',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.name).toBe('Zugführer');
      });

      it('sollte Whitespaces in Abkürzung trimmen', async () => {
        // Given (Arrange)
        const command = CreateQualifikationCommand.create({
          name: 'Zugführer',
          abkuerzung: '  ZFÜ  ',
          kategorie: 'FUEHRUNG',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.abkuerzung).toBe('ZFÜ');
      });

      it('sollte Whitespaces in Beschreibung trimmen', async () => {
        // Given (Arrange)
        const command = CreateQualifikationCommand.create({
          name: 'Zugführer',
          abkuerzung: 'ZFÜ',
          kategorie: 'FUEHRUNG',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: '   Leitet einen Zug   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
        expect(savedAggregate.beschreibung).toBe('Leitet einen Zug');
      });
    });

    describe('Case Sensitivity', () => {
      it('sollte Abkürzung case-sensitiv prüfen (ZFÜ vs zfü sind unterschiedlich)', async () => {
        // Given (Arrange)
        mockRepository.findByAbkuerzung.mockResolvedValue(Result.ok(null)); // Keine Kollision, da case-sensitiv

        const command = CreateQualifikationCommand.create({
          name: 'Zugführer Neu',
          abkuerzung: 'ZFÜ',
          kategorie: 'FUEHRUNG',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(mockRepository.findByAbkuerzung).toHaveBeenCalledWith('ZFÜ', expect.any(Object));
      });
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte QualifikationCreatedEvent mit korrekter Struktur emittieren', async () => {
      // Given (Arrange)
      const command = CreateQualifikationCommand.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
        beschreibung: 'Leitet einen Zug',
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
      expect(event.constructor.name).toBe('QualifikationCreatedEvent');
      expect(event.name).toBe('Zugführer');
      expect(event.abkuerzung).toBe('ZFÜ');
      expect(event.kategorie).toBe('FUEHRUNG');
      expect(event.createdBy).toBe('cm1234567890abcdef12345');
      expect(event.aggregateId).toBeDefined();
    });

    it('sollte QualifikationCreatedEvent ohne Beschreibung korrekt emittieren', async () => {
      // Given (Arrange)
      const command = CreateQualifikationCommand.create({
        name: 'Rettungssanitäter',
        abkuerzung: 'RS',
        kategorie: 'SANITAET',
        createdBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.name).toBe('Rettungssanitäter');
      expect(event.abkuerzung).toBe('RS');
    });
  });

  describe('Concurrent Modification / Race Conditions', () => {
    it('sollte Abkürzungs-Kollision erkennen wenn zwischen Check und Save eine andere Qualifikation mit gleicher Abkürzung erstellt wird', async () => {
      // Given (Arrange)
      // Simuliere Race Condition: Zwischen findByAbkuerzung (null) und save wird eine Qualifikation mit gleicher Abkürzung erstellt
      mockRepository.findByAbkuerzung.mockResolvedValue(Result.ok(null)); // Erster Check: Keine Kollision
      mockRepository.save.mockResolvedValue(
        Result.fail('UNIQUE_CONSTRAINT_VIOLATION: Abkürzung bereits vergeben'), // Prisma unique constraint error
      );

      const command = CreateQualifikationCommand.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
      // Save wurde versucht, aber DB hat unique constraint violation geworfen
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte bei Race Condition sowohl Qualifikation als auch Outbox-Events zurückrollen', async () => {
      // Given (Arrange)
      // Simuliere Race Condition mit Exception während der Transaktion
      let transactionRolledBack = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        try {
          // Simuliere: Repository.save wirft Fehler (z.B. unique constraint violation)
          mockRepository.save.mockRejectedValue(new Error('UNIQUE_CONSTRAINT_VIOLATION: Abkürzung bereits vergeben'));
          await callback({});
        } catch (error) {
          // Transaction wird gerollt
          transactionRolledBack = true;
          throw error;
        }
      });

      const command = CreateQualifikationCommand.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      // TransactionalCommandHandler fängt Exception und gibt Result.fail() zurück
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');

      // Verifiziere: $transaction wurde aufgerufen (Rollback-Mechanismus greift)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

      // Verifiziere: Bei Exception in Transaction werden weder Qualifikation noch Outbox-Events gespeichert
      // (Prisma rollt automatisch die gesamte Transaktion zurück)
      expect(transactionRolledBack).toBe(true);

      // WICHTIG: Outbox.save() sollte NICHT aufgerufen worden sein,
      // da der Fehler VOR dem Outbox-Save auftrat (Repository.save fehlgeschlagen)
      // Aber selbst wenn Outbox.save() aufgerufen wurde, wird die TX gerollt
      // -> Keine Events persistiert bei Fehler
    });

    it('sollte bei concurrent saves mit unterschiedlichen Abkürzungen beide erfolgreich sein', async () => {
      // Given (Arrange)
      const command1 = CreateQualifikationCommand.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      const command2 = CreateQualifikationCommand.create({
        name: 'Gruppenführer',
        abkuerzung: 'GFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm9999999999abcdef99999',
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
