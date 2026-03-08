// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { StammPerson } from '@domain/kraefte/aggregates/stamm-person.aggregate';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EINSATZ_PERSON_ERROR_CODES } from '@domain/kraefte/common/einsatz-person-error-codes';
import { RegistrierePersonHandler } from '../registriere-person.handler';
import { RegistrierePersonCommand } from '../registriere-person.command';

describe('RegistrierePersonHandler', () => {
  let handler: RegistrierePersonHandler;

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

  /**
   * Erstellt ein mock StammPerson Aggregate
   */
  function createMockStammPerson(overrides?: { id?: string; vorname?: string; nachname?: string; funkkenungBOS?: string; qualifikationIds?: string[]; archivedAt?: Date }): StammPerson {
    const id = overrides?.id ?? validStammPersonId;
    const result = StammPerson.reconstitute({
      id,
      vorname: overrides?.vorname ?? 'Max',
      nachname: overrides?.nachname ?? 'Mustermann',
      personalnummer: 'PN-001',
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
    // Mock Repositories initialisieren (AC6: Initialize BEFORE clearAllMocks)
    mockEinsatzPersonRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByEinsatzIdAndStammId: jest.fn().mockResolvedValue(Result.ok(false)),
    } as jest.Mocked<typeof mockEinsatzPersonRepository>;

    mockStammPersonRepository = {
      findById: jest.fn().mockResolvedValue(Result.ok(createMockStammPerson())),
      findAll: jest.fn(),
      findByPersonalnummer: jest.fn(),
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

    // AC6: Clear mocks AFTER mock creation (not before)
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrierePersonHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockEinsatzPersonRepository },
        { provide: KRAEFTE_REPOSITORIES.STAMM_PERSON, useValue: mockStammPersonRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<RegistrierePersonHandler>(RegistrierePersonHandler);
  });

  describe('execute - Success Cases (AC1: Aus Stammdaten)', () => {
    it('sollte EinsatzPerson aus Stammdaten erfolgreich registrieren (Snapshot Pattern)', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max', // Wird überschrieben von StammPerson
        nachname: 'Mustermann',
        funktion: 'Rettungshelfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(mockStammPersonRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Daten von StammPerson KOPIEREN (Snapshot Pattern - AC1)', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson({
        vorname: 'Anna',
        nachname: 'Schmidt',
        funkkenungBOS: 'Florian 99/1',
        qualifikationIds: [validQualifikationId],
      });
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(stammPerson));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Ignoriert', // Wird ignoriert - Stammdaten werden verwendet
        nachname: 'Ignoriert',
        funktion: 'Gruppenführer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.vorname).toBe('Anna'); // KOPIERT von StammPerson
      expect(savedAggregate.nachname).toBe('Schmidt'); // KOPIERT von StammPerson
      expect(savedAggregate.funkrufname).toBe('Florian 99/1'); // KOPIERT als funkrufname
      expect(savedAggregate.stammId).toBe(validStammPersonId); // Referenz gesetzt
    });

    it('sollte EinsatzPersonHinzugefuegtEvent in Outbox speichern (AC3)', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);
      expect(events[0]?.constructor.name).toBe('EinsatzPersonHinzugefuegtEvent');
    });

    it('sollte EinsatzPerson mit optionaler Position registrieren', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 49.8728, lng: 8.6512 },
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      // Position ist ein GeoPosition Value Object mit props
      expect(savedAggregate.position?.lat).toBe(49.8728);
      expect(savedAggregate.position?.lng).toBe(8.6512);
    });

    it('sollte Funktion aus Command verwenden (nicht aus StammPerson)', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Zugführer', // Spezifische Funktion im Einsatz
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.funktion).toBe('Zugführer'); // Aus Command
    });
  });

  describe('execute - Success Cases (AC2: Manuelle Erfassung)', () => {
    it('sollte temporäre EinsatzPerson ohne StammPerson erfolgreich registrieren', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        // stammPersonId: undefined → Manuelle Erfassung
        vorname: 'Externe',
        nachname: 'Hilfskraft',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(mockStammPersonRepository.findById).not.toHaveBeenCalled(); // Kein StammPerson Lookup
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledTimes(1);

      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.vorname).toBe('Externe');
      expect(savedAggregate.nachname).toBe('Hilfskraft');
      expect(savedAggregate.stammId).toBeUndefined(); // Keine StammPerson-Referenz
    });

    it('sollte temporäre EinsatzPerson mit Qualifikationen registrieren', async () => {
      // Given (Arrange)
      const qualifikationIds = [createId(), createId()];
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Gasthelfer',
        nachname: 'Extern',
        funktion: 'Rettungshelfer',
        qualifikationIds,
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.qualifikationIds).toEqual(qualifikationIds);
    });

    it('sollte Event auch für temporäre Person in Outbox speichern (AC3)', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Temp',
        nachname: 'Person',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(events[0]?.vorname).toBe('Temp');
      expect(events[0]?.nachname).toBe('Person');
    });
  });

  describe('execute - Error Cases', () => {
    it('sollte fehlschlagen wenn StammPerson nicht gefunden (AC1)', async () => {
      // Given (Arrange)
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(null));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND);
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn StammPerson archiviert ist (AC1)', async () => {
      // Given (Arrange)
      const archivedStamm = createMockStammPerson({ archivedAt: new Date() });
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(archivedStamm));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
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

    it('sollte fehlschlagen bei Duplikat-StammPerson im Einsatz (AC4)', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.existsByEinsatzIdAndStammId.mockResolvedValue(Result.ok(true));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON);
      expect(result.error).toContain('bereits im Einsatz');
      expect(mockEinsatzPersonRepository.save).not.toHaveBeenCalled();
      expect(mockStammPersonRepository.findById).not.toHaveBeenCalled(); // Früher Abbruch
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte fehlschlagen wenn StammPersonRepository Fehler zurückgibt', async () => {
      // Given (Arrange)
      mockStammPersonRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });

    it('sollte fehlschlagen wenn Duplikat-Check Fehler zurückgibt', async () => {
      // Given (Arrange)
      mockEinsatzPersonRepository.existsByEinsatzIdAndStammId.mockResolvedValue(Result.fail('DB-Verbindungsfehler'));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      // Handler gibt den originalen Fehler weiter oder einen Fallback-Text
      expect(result.error).toBeDefined();
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen ohne einsatzId', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: '',
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('einsatzId ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültiger stammPersonId (kein CUID2)', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: 'invalid-cuid',
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('stammPersonId muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen ohne vorname', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: '',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Vorname ist erforderlich');
    });

    it('sollte fehlschlagen ohne nachname', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: '',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Nachname ist erforderlich');
    });

    it('sollte fehlschlagen ohne funktion', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: '',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Funktion ist erforderlich');
    });

    it('sollte fehlschlagen ohne registriertVon', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('registriertVon ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültigem registriertVon (kein CUID2)', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: 'not-a-cuid',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('registriertVon muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen mit zu langem Vornamen', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'A'.repeat(101), // > 100 Zeichen
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('maximal 100 Zeichen');
    });

    it('sollte fehlschlagen mit zu langem Nachnamen', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'N'.repeat(101), // > 100 Zeichen
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('maximal 100 Zeichen');
    });

    it('sollte fehlschlagen mit zu langer Funktion', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'F'.repeat(51), // > 50 Zeichen
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('maximal 50 Zeichen');
    });

    it('sollte fehlschlagen mit ungültiger Qualifikation-ID', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: ['invalid-id'],
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('ungültig');
    });

    it('sollte fehlschlagen mit ungültigem Breitengrad (> 90)', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 91, lng: 0 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Breitengrad');
    });

    it('sollte fehlschlagen mit ungültigem Breitengrad (< -90) (R2-TEST-M1)', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: -91, lng: 0 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Breitengrad');
    });

    it('sollte fehlschlagen mit ungültigem Längengrad (> 180)', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 0, lng: 181 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Längengrad');
    });

    it('sollte fehlschlagen mit ungültigem Längengrad (< -180) (R2-TEST-M1)', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 0, lng: -181 },
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Längengrad');
    });

    it('sollte gültige Position akzeptieren', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 49.8728, lng: 8.6512 },
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value?.position).toEqual({ lat: 49.8728, lng: 8.6512 });
    });

    it('sollte leere stammPersonId als undefined behandeln', () => {
      // Given (Arrange)
      const commandResult = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: '  ', // Whitespace only
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value?.stammPersonId).toBeUndefined();
    });
  });

  describe('Transaction Behavior (AC3)', () => {
    it('sollte $transaction aufrufen', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Repositories mit Transaction Context aufrufen (R2-TEST2)', async () => {
      // Given (Arrange)
      let capturedTxContext: unknown;
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = { _type: 'TransactionContext' }; // Identifiable mock TX
        capturedTxContext = txMock;
        return callback(txMock);
      });

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert) - Verify repositories received the TX context
      expect(mockEinsatzPersonRepository.existsByEinsatzIdAndStammId).toHaveBeenCalledWith(validEinsatzId, validStammPersonId, capturedTxContext);
      expect(mockStammPersonRepository.findById).toHaveBeenCalledWith(expect.anything(), capturedTxContext);
      expect(mockEinsatzPersonRepository.save).toHaveBeenCalledWith(expect.anything(), capturedTxContext);
      expect(mockOutboxRepository.save).toHaveBeenCalledWith(expect.anything(), capturedTxContext);
    });

    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Outbox-Fehler simulieren
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
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
      mockEinsatzPersonRepository.save.mockRejectedValue(new Error('UNIQUE_CONSTRAINT_VIOLATION'));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UNIQUE_CONSTRAINT_VIOLATION');
    });
  });

  describe('Snapshot Pattern (AC1)', () => {
    it('sollte Vorname von StammPerson KOPIEREN', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson({ vorname: 'Sophie' });
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(stammPerson));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Wird ignoriert',
        nachname: 'Ignoriert',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.vorname).toBe('Sophie');
    });

    it('sollte Nachname von StammPerson KOPIEREN', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson({ nachname: 'Müller' });
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(stammPerson));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Wird ignoriert',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.nachname).toBe('Müller');
    });

    it('sollte funkkenungBOS als funkrufname KOPIEREN', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson({ funkkenungBOS: 'Rotkreuz 83-1' });
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(stammPerson));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.funkrufname).toBe('Rotkreuz 83-1');
    });

    it('sollte qualifikationIds von StammPerson KOPIEREN', async () => {
      // Given (Arrange)
      const qualIds = [createId(), createId()];
      const stammPerson = createMockStammPerson({ qualifikationIds: qualIds });
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(stammPerson));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.qualifikationIds).toEqual(qualIds);
    });

    it('sollte stammId im EinsatzPerson referenzieren', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockEinsatzPersonRepository.save.mock.calls[0]?.[0]!;
      expect(savedAggregate.stammId).toBe(validStammPersonId);
    });
  });

  describe('Domain Event (AC1/AC3)', () => {
    it('sollte EinsatzPersonHinzugefuegtEvent mit korrekten Daten emittieren (Stammdaten)', async () => {
      // Given (Arrange)
      const stammPerson = createMockStammPerson({
        vorname: 'Anna',
        nachname: 'Schmidt',
      });
      mockStammPersonRepository.findById.mockResolvedValue(Result.ok(stammPerson));

      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Ignoriert',
        nachname: 'Ignoriert',
        funktion: 'Gruppenführer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      const event = events[0];

      expect(event.einsatzId).toBe(validEinsatzId);
      expect(event.vorname).toBe('Anna');
      expect(event.nachname).toBe('Schmidt');
      expect(event.funktion).toBe('Gruppenführer');
      expect(event.registriertVon).toBe(validRegistriertVon);
    });

    it('sollte EinsatzPersonHinzugefuegtEvent mit korrekten Daten emittieren (temporär)', async () => {
      // Given (Arrange)
      const command = RegistrierePersonCommand.create({
        einsatzId: validEinsatzId,
        vorname: 'Extern',
        nachname: 'Helfer',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      const event = events[0];

      expect(event.einsatzId).toBe(validEinsatzId);
      expect(event.vorname).toBe('Extern');
      expect(event.nachname).toBe('Helfer');
      expect(event.stammId).toBeUndefined();
    });
  });
});
