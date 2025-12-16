import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateFahrzeugtypHandler } from '../create-fahrzeugtyp.handler';
import { CreateFahrzeugtypCommand } from '../create-fahrzeugtyp.command';

describe('CreateFahrzeugtypHandler', () => {
  let handler: CreateFahrzeugtypHandler;
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

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFahrzeugtypHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockRepository },
      ],
    }).compile();

    handler = module.get<CreateFahrzeugtypHandler>(CreateFahrzeugtypHandler);
  });

  describe('execute', () => {
    it('sollte Fahrzeugtyp erfolgreich erstellen mit gültigen Daten', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
        beschreibung: 'Standard Feuerwehrfahrzeug',
        sollbesatzung: { fahrer: 1, funktrupp: 8 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('object');
      expect(result.value!.id).toBeDefined();
      expect(result.value!.code).toBe('HLF');
      expect(result.value!.bezeichnung).toBe('Hilfeleistungslöschfahrzeug');
      expect(result.value!.kategorie).toBe('EINSATZ');
      expect(mockRepository.findByCode).toHaveBeenCalledWith('HLF', expect.any(Object));
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Fahrzeugtyp ohne optionale Felder erstellen', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        createdBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
      expect(savedAggregate.code).toBe('RTW');
      expect(savedAggregate.bezeichnung).toBe('Rettungswagen');
      expect(savedAggregate.kategorieValue).toBe('TRANSPORT');
    });

    it('sollte Code automatisch auf UPPERCASE normalisieren', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'nef',
        bezeichnung: 'Notarzteinsatzfahrzeug',
        kategorie: 'TRANSPORT',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.code).toBe('NEF');
      expect(mockRepository.findByCode).toHaveBeenCalledWith('NEF', expect.any(Object));
    });

    it('sollte fehlschlagen wenn Code bereits vergeben ist', async () => {
      // Given (Arrange)
      const existingId = createId();
      const existingFahrzeugtyp = Fahrzeugtyp.reconstitute({
        id: existingId,
        code: 'HLF',
        bezeichnung: 'Existierendes Fahrzeug',
        kategorie: 'EINSATZ',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-999',
      }).value!;
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingFahrzeugtyp));

      const command = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Neues HLF',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Code 'HLF' ist bereits vergeben");
      expect(result.error).toContain('FAHRZEUGTYP_CODE_DUPLICATE');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository-Fehler bei Uniqueness-Check auftritt', async () => {
      // Given (Arrange)
      mockRepository.findByCode.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = CreateFahrzeugtypCommand.create({
        code: 'ELW',
        bezeichnung: 'Einsatzleitwagen',
        kategorie: 'SPEZIAL',
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

      const command = CreateFahrzeugtypCommand.create({
        code: 'GW',
        bezeichnung: 'Gerätewagen',
        kategorie: 'SPEZIAL',
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
    it('sollte fehlschlagen mit zu kurzem Code', () => {
      // Given (Arrange)
      const commandResult = CreateFahrzeugtypCommand.create({
        code: 'A',
        bezeichnung: 'Test Fahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Code muss mindestens 2 Zeichen haben');
    });

    it('sollte fehlschlagen mit zu kurzer Bezeichnung', () => {
      // Given (Arrange)
      const commandResult = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'AB',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Bezeichnung muss mindestens 3 Zeichen haben');
    });

    it('sollte fehlschlagen mit ungültiger Kategorie', () => {
      // Given (Arrange)
      const commandResult = CreateFahrzeugtypCommand.create({
        code: 'TEST',
        bezeichnung: 'Test Fahrzeug',
        kategorie: 'UNGUELTIG' as never,
        createdBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Ungültige Kategorie');
    });

    it('sollte fehlschlagen ohne createdBy', () => {
      // Given (Arrange)
      const commandResult = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Test Fahrzeug',
        kategorie: 'EINSATZ',
        createdBy: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('createdBy ist erforderlich');
    });

    it('sollte fehlschlagen mit negativer Sollbesatzung', () => {
      // Given (Arrange)
      const commandResult = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Test Fahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
        sollbesatzung: { fahrer: -1 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('fahrer muss >= 0 sein');
    });

    it('sollte fehlschlagen mit nicht-ganzzahliger Sollbesatzung', () => {
      // Given (Arrange)
      const commandResult = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Test Fahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
        sollbesatzung: { fahrer: 1.5 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('fahrer muss eine Ganzzahl sein');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'SPEZIAL',
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
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = CreateFahrzeugtypCommand.create({
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'SPEZIAL',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    describe('Special Characters', () => {
      it('sollte Umlaute in Bezeichnung akzeptieren', async () => {
        // Given (Arrange)
        const command = CreateFahrzeugtypCommand.create({
          code: 'DLKÄ',
          bezeichnung: 'Drehleiter Änderung',
          kategorie: 'EINSATZ',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.bezeichnung).toBe('Drehleiter Änderung');
        expect(savedAggregate.code).toBe('DLKÄ');
      });

      it('sollte ß (scharfes S) in Code zu SS konvertieren (Unicode-Standard)', async () => {
        // Given (Arrange)
        // HINWEIS: JavaScript's toUpperCase() konvertiert ß zu SS gemäß Unicode-Standard
        const command = CreateFahrzeugtypCommand.create({
          code: 'Groß',
          bezeichnung: 'Großfahrzeug',
          kategorie: 'EINSATZ',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.code).toBe('GROSS'); // ß → SS (Unicode toUpperCase)
      });
    });

    describe('Maximum Length Validation', () => {
      it('sollte Code mit exakt 10 Zeichen akzeptieren', async () => {
        // Given (Arrange)
        const codeWith10Chars = 'A'.repeat(10);
        const command = CreateFahrzeugtypCommand.create({
          code: codeWith10Chars,
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'SPEZIAL',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.code.length).toBe(10);
      });

      it('sollte Bezeichnung mit exakt 100 Zeichen akzeptieren', async () => {
        // Given (Arrange)
        const bezeichnungWith100Chars = 'B'.repeat(100);
        const command = CreateFahrzeugtypCommand.create({
          code: 'MAX',
          bezeichnung: bezeichnungWith100Chars,
          kategorie: 'SPEZIAL',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.bezeichnung.length).toBe(100);
      });

      it('sollte Beschreibung mit exakt 1000 Zeichen akzeptieren', async () => {
        // Given (Arrange)
        const beschreibungWith1000Chars = 'C'.repeat(1000);
        const command = CreateFahrzeugtypCommand.create({
          code: 'TEST',
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'SPEZIAL',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: beschreibungWith1000Chars,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.beschreibung?.length).toBe(1000);
      });

      it('sollte Code mit 11 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const codeWith11Chars = 'A'.repeat(11);
        const commandResult = CreateFahrzeugtypCommand.create({
          code: codeWith11Chars,
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'SPEZIAL',
          createdBy: 'cm1234567890abcdef12345',
        });

        // Then (Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 10 Zeichen');
      });

      it('sollte Bezeichnung mit 101 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const bezeichnungWith101Chars = 'B'.repeat(101);
        const commandResult = CreateFahrzeugtypCommand.create({
          code: 'TEST',
          bezeichnung: bezeichnungWith101Chars,
          kategorie: 'SPEZIAL',
          createdBy: 'cm1234567890abcdef12345',
        });

        // Then (Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 100 Zeichen');
      });

      it('sollte Beschreibung mit 1001 Zeichen ablehnen (Max-Length Defense-in-Depth)', async () => {
        // Given (Arrange)
        const beschreibungWith1001Chars = 'C'.repeat(1001);
        const commandResult = CreateFahrzeugtypCommand.create({
          code: 'TEST',
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'SPEZIAL',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: beschreibungWith1001Chars,
        });

        // Then (Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('maximal 1000 Zeichen');
      });
    });

    describe('Whitespace Trimming', () => {
      it('sollte führende und nachfolgende Whitespaces in Code trimmen und auf UPPERCASE normalisieren', async () => {
        // Given (Arrange)
        const command = CreateFahrzeugtypCommand.create({
          code: '   hlf   ',
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'EINSATZ',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.code).toBe('HLF');
      });

      it('sollte Whitespaces in Bezeichnung trimmen', async () => {
        // Given (Arrange)
        const command = CreateFahrzeugtypCommand.create({
          code: 'HLF',
          bezeichnung: '   Hilfeleistungslöschfahrzeug   ',
          kategorie: 'EINSATZ',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.bezeichnung).toBe('Hilfeleistungslöschfahrzeug');
      });

      it('sollte Whitespaces in Beschreibung trimmen', async () => {
        // Given (Arrange)
        const command = CreateFahrzeugtypCommand.create({
          code: 'HLF',
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'EINSATZ',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: '   Standard Feuerwehrfahrzeug   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
        expect(savedAggregate.beschreibung).toBe('Standard Feuerwehrfahrzeug');
      });
    });

    describe('Case Sensitivity', () => {
      it('sollte Code auf UPPERCASE normalisieren vor Uniqueness-Check', async () => {
        // Given (Arrange)
        mockRepository.findByCode.mockResolvedValue(Result.ok(null));

        const command = CreateFahrzeugtypCommand.create({
          code: 'hlf',
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'EINSATZ',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(mockRepository.findByCode).toHaveBeenCalledWith('HLF', expect.any(Object));
      });
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte FahrzeugtypCreatedEvent mit korrekter Struktur emittieren', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
        beschreibung: 'Standard Feuerwehrfahrzeug',
        sollbesatzung: { fahrer: 1, funktrupp: 8 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.constructor.name).toBe('FahrzeugtypCreatedEvent');
      expect(event.code).toBe('HLF');
      expect(event.bezeichnung).toBe('Hilfeleistungslöschfahrzeug');
      expect(event.kategorie).toBe('EINSATZ');
      expect(event.createdBy).toBe('cm1234567890abcdef12345');
      expect(event.aggregateId).toBeDefined();
    });

    it('sollte FahrzeugtypCreatedEvent ohne optionale Felder korrekt emittieren', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        createdBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.code).toBe('RTW');
      expect(event.bezeichnung).toBe('Rettungswagen');
    });
  });

  describe('Concurrent Modification / Race Conditions', () => {
    it('sollte Code-Kollision erkennen wenn zwischen Check und Save ein anderer Fahrzeugtyp mit gleichem Code erstellt wird', async () => {
      // Given (Arrange)
      mockRepository.findByCode.mockResolvedValue(Result.ok(null));
      mockRepository.save.mockResolvedValue(Result.fail('UNIQUE_CONSTRAINT_VIOLATION: Code bereits vergeben'));

      const command = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte bei Race Condition sowohl Fahrzeugtyp als auch Outbox-Events zurückrollen', async () => {
      // Given (Arrange)
      let transactionRolledBack = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        try {
          mockRepository.save.mockRejectedValue(new Error('UNIQUE_CONSTRAINT_VIOLATION: Code bereits vergeben'));
          await callback({});
        } catch (error) {
          transactionRolledBack = true;
          throw error;
        }
      });

      const command = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(transactionRolledBack).toBe(true);
    });

    it('sollte bei concurrent saves mit unterschiedlichen Codes beide erfolgreich sein', async () => {
      // Given (Arrange)
      const command1 = CreateFahrzeugtypCommand.create({
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'EINSATZ',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      const command2 = CreateFahrzeugtypCommand.create({
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
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

  describe('Sollbesatzung Validation', () => {
    it('sollte Fahrzeugtyp mit vollständiger Sollbesatzung erstellen', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        createdBy: 'cm1234567890abcdef12345',
        sollbesatzung: {
          fahrer: 1,
          sanitaeter: 2,
          notarzt: 0,
          funktrupp: 0,
          helfer: 0,
        },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
      expect(savedAggregate.sollbesatzung).toEqual({
        fahrer: 1,
        sanitaeter: 2,
        notarzt: 0,
        funktrupp: 0,
        helfer: 0,
      });
    });

    it('sollte Fahrzeugtyp mit partieller Sollbesatzung erstellen', async () => {
      // Given (Arrange)
      const command = CreateFahrzeugtypCommand.create({
        code: 'NEF',
        bezeichnung: 'Notarzteinsatzfahrzeug',
        kategorie: 'TRANSPORT',
        createdBy: 'cm1234567890abcdef12345',
        sollbesatzung: { fahrer: 1, notarzt: 1 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
      expect(savedAggregate.sollbesatzung).toEqual({ fahrer: 1, notarzt: 1 });
    });
  });
});
