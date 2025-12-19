import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { StammPerson } from '@domain/kraefte/aggregates/stamm-person.aggregate';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EINSATZ_PERSON_ERROR_CODES } from '@domain/kraefte/common/einsatz-person-error-codes';
import { RegistrierePersonViaQrCodeHandler } from '../registriere-person-qr.handler';
import { RegistrierePersonViaQrCodeCommand } from '../registriere-person-qr.command';

describe('RegistrierePersonViaQrCodeHandler', () => {
  let handler: RegistrierePersonViaQrCodeHandler;

  // Mock Repositories - Using jest.Mocked<T> for type safety (AC6)
  let mockEinsatzPersonRepository: jest.Mocked<{
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
    existsByEinsatzIdAndStammId: jest.Mock;
  }>;
  let mockStammPersonRepository: jest.Mocked<{
    findById: jest.Mock;
    findAll: jest.Mock;
    findByPersonalnummer: jest.Mock;
    exists: jest.Mock;
    search: jest.Mock;
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

  // Test Data - Deterministic test fixtures (AC6)
  const validEinsatzId = '123e4567-e89b-12d3-a456-426614174000';
  const validStammPersonId = createId();
  const validRegistriertVon = createId();
  const validQualifikationId = createId();
  const validPersonalnummer = '12345678';

  /**
   * Erstellt ein mock StammPerson Aggregate mit Personalnummer
   */
  function createMockStammPerson(overrides?: {
    id?: string;
    vorname?: string;
    nachname?: string;
    funkkenungBOS?: string;
    qualifikationIds?: string[];
    personalnummer?: string;
    archivedAt?: Date;
  }): StammPerson {
    const id = overrides?.id ?? validStammPersonId;
    const result = StammPerson.reconstitute({
      id,
      vorname: overrides?.vorname ?? 'Max',
      nachname: overrides?.nachname ?? 'Mustermann',
      personalnummer: overrides?.personalnummer ?? validPersonalnummer,
      funkkenungBOS: overrides?.funkkenungBOS ?? 'Florian 12/83-1',
      qualifikationIds: overrides?.qualifikationIds ?? [validQualifikationId],
      archivedAt: overrides?.archivedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validRegistriertVon,
    });
    return result.value!;
  }

  beforeEach(async () => {
    // Mock Repositories initialisieren
    mockEinsatzPersonRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByEinsatzIdAndStammId: jest.fn().mockResolvedValue(Result.ok(false)),
    } as jest.Mocked<typeof mockEinsatzPersonRepository>;

    mockStammPersonRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByPersonalnummer: jest.fn().mockResolvedValue(Result.ok(null)),
      exists: jest.fn(),
      search: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<typeof mockStammPersonRepository>;

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

    // AC6: Clear mocks AFTER mock creation
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrierePersonViaQrCodeHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockEinsatzPersonRepository },
        { provide: KRAEFTE_REPOSITORIES.STAMM_PERSON, useValue: mockStammPersonRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<RegistrierePersonViaQrCodeHandler>(RegistrierePersonViaQrCodeHandler);
  });

  describe('execute - Success Cases', () => {
    describe('AC3: StammPerson gefunden via Personalnummer', () => {
      it('sollte EinsatzPerson aus Stammdaten erstellen wenn Personalnummer gefunden', async () => {
        // Given (Arrange)
        const stammPerson = createMockStammPerson();
        mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(stammPerson));
        mockEinsatzPersonRepository.existsByEinsatzIdAndStammId.mockResolvedValue(Result.ok(false));

        const command = RegistrierePersonViaQrCodeCommand.create({
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: 'Max',
          nachname: 'Mustermann',
          registriertVon: validRegistriertVon,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(mockStammPersonRepository.findByPersonalnummer).toHaveBeenCalledWith(validPersonalnummer, expect.any(Object));
        expect(mockEinsatzPersonRepository.existsByEinsatzIdAndStammId).toHaveBeenCalledWith(validEinsatzId, stammPerson.id.value, expect.any(Object));
        expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
        expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalled();
      });

      it('sollte Qualifikationen aus StammPerson uebernehmen', async () => {
        // Given (Arrange)
        const qualifikationIds = [createId(), createId()];
        const stammPerson = createMockStammPerson({ qualifikationIds });
        mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(stammPerson));

        const command = RegistrierePersonViaQrCodeCommand.create({
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: 'Max',
          nachname: 'Mustermann',
          registriertVon: validRegistriertVon,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(mockEinsatzPersonRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            _qualifikationIds: qualifikationIds,
          }),
          expect.any(Object),
        );
      });

      it('sollte Funkrufname aus StammPerson uebernehmen', async () => {
        // Given (Arrange)
        const stammPerson = createMockStammPerson({ funkkenungBOS: '4711' });
        mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(stammPerson));

        const command = RegistrierePersonViaQrCodeCommand.create({
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: 'Max',
          nachname: 'Mustermann',
          funkkennung: '9999', // Wird ignoriert zugunsten StammPerson
          registriertVon: validRegistriertVon,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        // Die Funkkennung kommt aus der StammPerson, nicht aus dem QR-Code
        expect(mockEinsatzPersonRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            _funkrufname: '4711',
          }),
          expect.any(Object),
        );
      });
    });

    describe('AC3: Keine StammPerson gefunden - temporaere Person', () => {
      it('sollte temporaere EinsatzPerson erstellen wenn keine StammPerson gefunden', async () => {
        // Given (Arrange)
        mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(null));

        const command = RegistrierePersonViaQrCodeCommand.create({
          einsatzId: validEinsatzId,
          personalnummer: 'UNBEKANNT-123',
          vorname: 'Erika',
          nachname: 'Musterfrau',
          funkkennung: '4711',
          registriertVon: validRegistriertVon,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(mockStammPersonRepository.findByPersonalnummer).toHaveBeenCalledWith('UNBEKANNT-123', expect.any(Object));
        expect(mockEinsatzPersonRepository.existsByEinsatzIdAndStammId).not.toHaveBeenCalled();
        expect(mockEinsatzPersonRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            _vorname: 'Erika',
            _nachname: 'Musterfrau',
            _funkrufname: '4711',
            _funktion: 'Helfer', // Default Funktion
            _stammId: undefined,
          }),
          expect.any(Object),
        );
        expect(mockLogger.log).toHaveBeenCalled();
      });

      it('sollte temporaere Person ohne Funkkennung erstellen', async () => {
        // Given (Arrange)
        mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(null));

        const command = RegistrierePersonViaQrCodeCommand.create({
          einsatzId: validEinsatzId,
          personalnummer: 'UNBEKANNT-456',
          vorname: 'Hans',
          nachname: 'Mueller',
          registriertVon: validRegistriertVon,
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(mockEinsatzPersonRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            _vorname: 'Hans',
            _nachname: 'Mueller',
            _funkrufname: undefined,
          }),
          expect.any(Object),
        );
      });
    });
  });

  describe('execute - Duplikat-Fehler (AC4)', () => {
    it('sollte DUPLICATE_PERSON Fehler zurueckgeben wenn StammPerson bereits registriert', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson();
      mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(stammPerson));
      mockEinsatzPersonRepository.existsByEinsatzIdAndStammId.mockResolvedValue(Result.ok(true));

      const command = RegistrierePersonViaQrCodeCommand.create({
        einsatzId: validEinsatzId,
        personalnummer: validPersonalnummer,
        vorname: 'Max',
        nachname: 'Mustermann',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON);
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('execute - Archivierte StammPerson', () => {
    it('sollte Fehler zurueckgeben wenn StammPerson archiviert ist', async () => {
      // Given (Arrange)
      const archivedStammPerson = createMockStammPerson({ archivedAt: new Date() });
      mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(archivedStammPerson));

      const command = RegistrierePersonViaQrCodeCommand.create({
        einsatzId: validEinsatzId,
        personalnummer: validPersonalnummer,
        vorname: 'Max',
        nachname: 'Mustermann',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND);
      expect(result.error).toContain('archiviert');
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute - Repository Fehler', () => {
    it('sollte Fehler zurueckgeben wenn findByPersonalnummer fehlschlaegt', async () => {
      // Given (Arrange)
      mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.fail('DB Fehler'));

      const command = RegistrierePersonViaQrCodeCommand.create({
        einsatzId: validEinsatzId,
        personalnummer: validPersonalnummer,
        vorname: 'Max',
        nachname: 'Mustermann',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Fehler zurueckgeben wenn existsByEinsatzIdAndStammId fehlschlaegt', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson();
      mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(stammPerson));
      mockEinsatzPersonRepository.existsByEinsatzIdAndStammId.mockResolvedValue(Result.fail('DB Fehler'));

      const command = RegistrierePersonViaQrCodeCommand.create({
        einsatzId: validEinsatzId,
        personalnummer: validPersonalnummer,
        vorname: 'Max',
        nachname: 'Mustermann',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Fehler zurueckgeben wenn save fehlschlaegt', async () => {
      // Given (Arrange)
      mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(null));
      mockEinsatzPersonRepository.save.mockResolvedValue(Result.fail('Save Fehler'));

      const command = RegistrierePersonViaQrCodeCommand.create({
        einsatzId: validEinsatzId,
        personalnummer: 'UNBEKANNT',
        vorname: 'Max',
        nachname: 'Mustermann',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('sollte Fehler zurueckgeben wenn existsByEinsatzIdAndStammId undefined zurueckgibt', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson();
      mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(stammPerson));
      // @ts-expect-error Testing edge case with undefined
      mockEinsatzPersonRepository.existsByEinsatzIdAndStammId.mockResolvedValue(Result.ok(undefined));

      const command = RegistrierePersonViaQrCodeCommand.create({
        einsatzId: validEinsatzId,
        personalnummer: validPersonalnummer,
        vorname: 'Max',
        nachname: 'Mustermann',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Interner Fehler');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('execute - Domain Event Emission', () => {
    it('sollte EinsatzPersonHinzugefuegtEvent im Outbox speichern', async () => {
      // Given (Arrange)
      mockStammPersonRepository.findByPersonalnummer.mockResolvedValue(Result.ok(null));

      const command = RegistrierePersonViaQrCodeCommand.create({
        einsatzId: validEinsatzId,
        personalnummer: 'QR-123',
        vorname: 'Test',
        nachname: 'Person',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            einsatzId: validEinsatzId,
            vorname: 'Test',
            nachname: 'Person',
            funktion: 'Helfer',
          }),
        ]),
        expect.any(Object),
      );
    });
  });
});
