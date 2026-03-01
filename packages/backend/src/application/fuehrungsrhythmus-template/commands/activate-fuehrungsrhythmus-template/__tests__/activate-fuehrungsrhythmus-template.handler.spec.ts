import { Test, type TestingModule } from '@nestjs/testing';
import { ActivateFuehrungsrhythmusTemplateHandler } from '../activate-fuehrungsrhythmus-template.handler';
import { ActivateFuehrungsrhythmusTemplateCommand } from '../activate-fuehrungsrhythmus-template.command';
import { Result } from '@domain/common/result';
import { FuehrungsrhythmusAktiviertEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-aktiviert.event';
import { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { FuehrungsrhythmusTemplateName } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-name';
import { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNG_REPOSITORY, FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ErinnerungResponseFactory } from '@application/erinnerung/dto/erinnerung-response.factory';
import { Erinnerung } from '@domain/entities/erinnerung.entity';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../../errors/fuehrungsrhythmus-template-error.codes';

/**
 * Unit Tests fuer ActivateFuehrungsrhythmusTemplateHandler.
 *
 * Testet die Handler-Orchestrierung gemaess AAA Pattern mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - Happy Path: Template mit 3 Eintraegen → 3 Erinnerungen erstellt
 * - Error: Template nicht gefunden → NOT_FOUND
 * - Error: Template bereits geloescht → ALREADY_DELETED
 * - Sortierung: Eintraege werden nach sortOrder verarbeitet
 */
describe('ActivateFuehrungsrhythmusTemplateHandler', () => {
  let handler: ActivateFuehrungsrhythmusTemplateHandler;
  let mockTemplateRepository: jest.Mocked<IFuehrungsrhythmusTemplateRepository>;
  let mockErinnerungRepository: jest.Mocked<IErinnerungRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;
  let mockErinnerungResponseFactory: { create: jest.Mock };

  /** Test User ID */
  const testUserId = UserId.create().value!;
  const testUserIdString = testUserId.toString();

  /** Test Einsatz ID */
  const testEinsatzIdString = UserId.create().value?.toString(); // CUID2 Format reicht

  /**
   * Erstellt ein rekonstruiertes Template mit den gegebenen Eintraegen.
   */
  const createMockTemplate = (eintraege: FuehrungsrhythmusEintrag[], options?: { isDeleted?: boolean }) => {
    const templateId = FuehrungsrhythmusTemplateId.create().value!;
    const templateName = FuehrungsrhythmusTemplateName.create('Test-Fuehrungsrhythmus').value!;

    return FuehrungsrhythmusTemplate.reconstruct({
      id: templateId,
      name: templateName,
      beschreibung: 'Test Beschreibung',
      eintraege,
      scope: FuehrungsrhythmusTemplateScope.PERSOENLICH,
      createdBy: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: options?.isDeleted ?? false,
      deletedAt: options?.isDeleted ? new Date() : null,
      deletedBy: options?.isDeleted ? testUserId : null,
    });
  };

  /**
   * Erstellt FuehrungsrhythmusEintrag Value Objects.
   */
  const createEintraege = (count: number): FuehrungsrhythmusEintrag[] => {
    const configs = [
      { titel: 'Lagebeurteilung', intervallMinuten: 30, offsetMinuten: 0, sortOrder: 0 },
      { titel: 'Funkmeldecheck', intervallMinuten: 15, offsetMinuten: 5, sortOrder: 1 },
      { titel: 'Personalcheck', intervallMinuten: 60, offsetMinuten: 10, sortOrder: 2 },
    ];

    return configs.slice(0, count).map((cfg) => {
      const result = FuehrungsrhythmusEintrag.create(cfg);
      return result.value!;
    });
  };

  /**
   * Erstellt einen gueltigen ActivateFuehrungsrhythmusTemplateCommand.
   */
  const createValidCommand = (templateId: string) => {
    return ActivateFuehrungsrhythmusTemplateCommand.create({
      templateId,
      einsatzId: testEinsatzIdString,
      aktiviertVon: testUserIdString,
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository fuer FuehrungsrhythmusTemplates
    mockTemplateRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IFuehrungsrhythmusTemplateRepository>;

    // Mock Repository fuer Erinnerungen
    mockErinnerungRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      exists: jest.fn(),
      findOverdue: jest.fn(),
      getStatistik: jest.fn(),
      findActiveChildByParentId: jest.fn(),
    } as unknown as jest.Mocked<IErinnerungRepository>;

    // Mock Repository fuer Outbox Events
    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    } as unknown as jest.Mocked<IOutboxRepository>;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Mock ErinnerungResponseFactory
    let _erinnerungCounter = 0;
    mockErinnerungResponseFactory = {
      create: jest.fn().mockImplementation(async (erinnerung) => {
        _erinnerungCounter++;
        return {
          id: erinnerung.id.toString(),
          einsatzId: erinnerung.einsatzId.toString(),
          titel: erinnerung.titel.value,
          beschreibung: null,
          faelligAm: erinnerung.faelligAm.toISOString(),
          status: 'GEPLANT',
          ausgeloestAm: null,
          erstelltVon: erinnerung.erstelltVon.toString(),
          erstellerName: 'Test User',
          createdAt: erinnerung.createdAt.toISOString(),
          updatedAt: erinnerung.updatedAt.toISOString(),
          snoozeCount: 0,
          requiresNote: false,
          assignedToId: null,
          assignedToName: null,
          eskalationsPersonId: null,
          eskalationsPersonName: null,
          eskalationNurAnErsteller: false,
          erledigtAm: null,
          erledigtBy: null,
          erledigungsNotiz: null,
          escalatedAt: null,
          previousAssigneeId: null,
          previousAssigneeName: null,
          etbEntryId: null,
          isRecurring: true,
          recurringIntervalMinutes: erinnerung.recurringIntervalMinutes,
          recurringEndDate: null,
          recurringMaxCount: null,
          recurringCurrentCount: 0,
          parentErinnerungId: null,
          recurringSequenceNumber: null,
        };
      }),
    };

    // Mock PrismaService mit Transaction-Support
    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {}; // Minimaler TX Mock
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivateFuehrungsrhythmusTemplateHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, useValue: mockTemplateRepository },
        { provide: ERINNERUNG_REPOSITORY, useValue: mockErinnerungRepository },
        { provide: ErinnerungResponseFactory, useValue: mockErinnerungResponseFactory },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<ActivateFuehrungsrhythmusTemplateHandler>(ActivateFuehrungsrhythmusTemplateHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute - Erfolg', () => {
    it('should activate template with 3 eintraege and create 3 erinnerungen', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(3);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.templateId).toBe(template.id.toString());
      expect(result.value?.templateName).toBe('Test-Fuehrungsrhythmus');
      expect(result.value?.erstellteErinnerungen).toHaveLength(3);

      // Erinnerungen wurden gespeichert
      expect(mockErinnerungRepository.save).toHaveBeenCalledTimes(3);

      // Outbox Events: 3 ErinnerungErstellt + 1 FuehrungsrhythmusAktiviert
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents).toHaveLength(4); // 3 ErinnerungErstellt + 1 FuehrungsrhythmusAktiviert

      // Letztes Event ist FuehrungsrhythmusAktiviertEvent
      const aktiviertEvent = savedEvents[savedEvents.length - 1];
      expect(aktiviertEvent).toBeInstanceOf(FuehrungsrhythmusAktiviertEvent);
    });

    it('should create erinnerungen with correct recurring properties', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(1); // 1 Eintrag: Lagebeurteilung, intervall=30, offset=0
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.erstellteErinnerungen).toHaveLength(1);

      // ErinnerungResponseFactory.create wurde mit korrektem Erinnerung-Objekt aufgerufen
      expect(mockErinnerungResponseFactory.create).toHaveBeenCalledTimes(1);
      const erinnerungArg = mockErinnerungResponseFactory.create.mock.calls[0][0];
      expect(erinnerungArg.isRecurring).toBe(true);
      expect(erinnerungArg.recurringIntervalMinutes).toBe(30);
      expect(erinnerungArg.titel.value).toBe('Lagebeurteilung');
    });

    it('should emit FuehrungsrhythmusAktiviertEvent with correct erinnerung ids', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(2);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);

      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const aktiviertEvent = savedEvents[savedEvents.length - 1] as FuehrungsrhythmusAktiviertEvent;
      expect(aktiviertEvent).toBeInstanceOf(FuehrungsrhythmusAktiviertEvent);
      expect(aktiviertEvent.templateId.toString()).toBe(template.id.toString());
      expect(aktiviertEvent.templateName).toBe('Test-Fuehrungsrhythmus');
      expect(aktiviertEvent.einsatzId.toString()).toBe(testEinsatzIdString);
      expect(aktiviertEvent.erstellteErinnerungIds).toHaveLength(2);
      expect(aktiviertEvent.aktiviertVon.toString()).toBe(testUserIdString);
    });

    it('should pass transaction context to erinnerung repository save', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(1);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const txMarker = { txId: 'test-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      const commandResult = createValidCommand(template.id.toString());
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockErinnerungRepository.save).toHaveBeenCalledTimes(1);
      const txContext = mockErinnerungRepository.save.mock.calls[0][1];
      expect(txContext).toBe(txMarker);
    });

    it('should log successful activation', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(2);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalled();
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain('Fuehrungsrhythmus-Template aktiviert');
      expect(logMessage).toContain('erinnerungen: 2');
    });
  });

  describe('execute - Template nicht gefunden', () => {
    it('should return NOT_FOUND error when template does not exist', async () => {
      // Given (Arrange)
      mockTemplateRepository.findById.mockResolvedValue(null);

      const templateId = FuehrungsrhythmusTemplateId.create().value?.toString();
      const commandResult = createValidCommand(templateId);
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND);

      // Keine Erinnerungen erstellt
      expect(mockErinnerungRepository.save).not.toHaveBeenCalled();
      // Keine Events gespeichert
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute - Template bereits geloescht', () => {
    it('should return ALREADY_DELETED error when template is soft-deleted', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(1);
      const deletedTemplate = createMockTemplate(eintraege, { isDeleted: true });
      mockTemplateRepository.findById.mockResolvedValue(deletedTemplate);

      const commandResult = createValidCommand(deletedTemplate.id.toString());
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED);

      // Keine Erinnerungen erstellt
      expect(mockErinnerungRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute - Sortierung', () => {
    it('should process eintraege sorted by sortOrder', async () => {
      // Given (Arrange) - Eintraege in umgekehrter Reihenfolge
      const eintrag0 = FuehrungsrhythmusEintrag.create({
        titel: 'Dritter (sortOrder=2)',
        intervallMinuten: 60,
        offsetMinuten: 10,
        sortOrder: 2,
      }).value!;
      const eintrag1 = FuehrungsrhythmusEintrag.create({
        titel: 'Erster (sortOrder=0)',
        intervallMinuten: 30,
        offsetMinuten: 0,
        sortOrder: 0,
      }).value!;
      const eintrag2 = FuehrungsrhythmusEintrag.create({
        titel: 'Zweiter (sortOrder=1)',
        intervallMinuten: 15,
        offsetMinuten: 5,
        sortOrder: 1,
      }).value!;

      // Bewusst unsortiert uebergeben
      const template = createMockTemplate([eintrag0, eintrag1, eintrag2]);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockErinnerungRepository.save).toHaveBeenCalledTimes(3);

      // Pruefen: Erinnerungen wurden in sortOrder-Reihenfolge erstellt
      const firstCallErinnerung = mockErinnerungResponseFactory.create.mock.calls[0][0];
      const secondCallErinnerung = mockErinnerungResponseFactory.create.mock.calls[1][0];
      const thirdCallErinnerung = mockErinnerungResponseFactory.create.mock.calls[2][0];

      expect(firstCallErinnerung.titel.value).toBe('Erster (sortOrder=0)');
      expect(secondCallErinnerung.titel.value).toBe('Zweiter (sortOrder=1)');
      expect(thirdCallErinnerung.titel.value).toBe('Dritter (sortOrder=2)');
    });
  });

  describe('Transaction Behavior', () => {
    it('should execute within prisma transaction', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(1);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should save events within same transaction as erinnerungen', async () => {
      // Given (Arrange)
      const eintraege = createEintraege(1);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const txMarker = { txId: 'same-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));

      const commandResult = createValidCommand(template.id.toString());
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Outbox save bekommt TX-Kontext
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const outboxTxContext = mockOutboxRepository.save.mock.calls[0][1];
      expect(outboxTxContext).toBe(txMarker);
    });
  });

  describe('execute - Erinnerung Erstellung fehlschlaegt', () => {
    it('should return failure when Erinnerung.create() fails', async () => {
      // Given (Arrange) - Template mit gueltigem Eintrag, aber Erinnerung.create() schlaegt fehl
      const eintraege = createEintraege(2);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // Spy auf Erinnerung.create um beim ersten Aufruf fehlzuschlagen
      const createSpy = jest.spyOn(Erinnerung, 'create').mockReturnValueOnce(Result.fail('ERINNERUNG_TITEL_INVALID'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe('ERINNERUNG_TITEL_INVALID');

      // Keine Erinnerungen wurden gespeichert
      expect(mockErinnerungRepository.save).not.toHaveBeenCalled();

      // Keine Events wurden gespeichert (Transaction wird nicht committed)
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();

      // Spy aufräumen
      createSpy.mockRestore();
    });
  });

  describe('execute - Erinnerung Save fehlschlaegt', () => {
    it('should return failure when erinnerungRepository.save() fails', async () => {
      // Given (Arrange) - Template ist gueltig, aber save schlaegt fehl
      const eintraege = createEintraege(1);
      const template = createMockTemplate(eintraege);
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = createValidCommand(template.id.toString());
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // Mock: erinnerungRepository.save gibt Result.fail() zurueck
      mockErinnerungRepository.save.mockResolvedValue(Result.fail('DB_ERROR'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe('DB_ERROR');

      // Erinnerung.save wurde aufgerufen (der Fehler kam von dort)
      expect(mockErinnerungRepository.save).toHaveBeenCalledTimes(1);

      // Keine Events gespeichert (Transaction wird nicht committed)
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });
});
