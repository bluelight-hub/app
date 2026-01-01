import { Logger } from '@nestjs/common';
import { GetEinsatzFahrzeugeHandler } from '../get-einsatz-fahrzeuge.handler';
import { GetEinsatzFahrzeugeQuery } from '../get-einsatz-fahrzeuge.query';
import { Result } from '@domain/common/result';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import type { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import type { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import type { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';

// Gültige CUID2 IDs für Tests (Generator: @paralleldrive/cuid2)
const VALID_EINSATZ_ID = 'z3h5idy36i9aqgkh7st81q57';
const VALID_FAHRZEUG_ID_1 = 'y0k4xvqhkidfhdhvtqey3lik';
const VALID_FAHRZEUG_ID_2 = 'xfohqq7skz5muyqialxel8ic';
const VALID_FAHRZEUG_ID_3 = 'wbgl9sk2h8z4f5jrmtne7opq';
const VALID_FAHRZEUGTYP_ID_1 = 'vjcm2lr8g7y3e4iqsnud6klp';
const VALID_FAHRZEUGTYP_ID_2 = 'uiad1kq7f6x2d3hprmtc5jko';
const VALID_PERSON_ID_1 = 'thas0jp6e5w1c2gorblb4ijn';
const VALID_PERSON_ID_2 = 'sgbr9io5d4v0b1fnqaka3him';
const VALID_USER_ID = 'rfaq8hn4c3u9a0empzjz2ghl';

describe('GetEinsatzFahrzeugeHandler', () => {
  let handler: GetEinsatzFahrzeugeHandler;
  let mockEinsatzFahrzeugRepository: jest.Mocked<IEinsatzFahrzeugRepository>;
  let mockFahrzeugtypRepository: jest.Mocked<IFahrzeugtypRepository>;
  let mockEinsatzPersonRepository: jest.Mocked<IEinsatzPersonRepository>;
  let loggerWarnSpy: jest.SpyInstance;

  // ============ Mock Factories (AC5) ============

  /**
   * Erstellt einen Mock für IEinsatzFahrzeugRepository.
   */
  const createMockEinsatzFahrzeugRepository = (): jest.Mocked<IEinsatzFahrzeugRepository> =>
    ({
      findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      existsByEinsatzIdAndFunkrufname: jest.fn().mockResolvedValue(Result.ok(false)),
    }) as unknown as jest.Mocked<IEinsatzFahrzeugRepository>;

  /**
   * Erstellt einen Mock für IFahrzeugtypRepository.
   */
  const createMockFahrzeugtypRepository = (): jest.Mocked<IFahrzeugtypRepository> =>
    ({
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      findByCode: jest.fn().mockResolvedValue(Result.ok(null)),
      findAll: jest.fn().mockResolvedValue(Result.ok([])),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      exists: jest.fn().mockResolvedValue(Result.ok(false)),
    }) as unknown as jest.Mocked<IFahrzeugtypRepository>;

  /**
   * Erstellt einen Mock für IEinsatzPersonRepository.
   */
  const createMockEinsatzPersonRepository = (): jest.Mocked<IEinsatzPersonRepository> =>
    ({
      findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      findByFahrzeugId: jest.fn().mockResolvedValue(Result.ok([])),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      existsByEinsatzIdAndStammId: jest.fn().mockResolvedValue(Result.ok(false)),
    }) as unknown as jest.Mocked<IEinsatzPersonRepository>;

  // ============ Test Data Factories ============

  /**
   * Erstellt einen Mock für EinsatzFahrzeug Aggregate.
   */
  const createMockEinsatzFahrzeug = (
    overrides: Partial<{
      id: string;
      einsatzId: string;
      stammId: string;
      fahrzeugtypId: string;
      funkrufname: string;
      kennzeichen: string;
      fmsStatus: number;
      position: { lat: number; lng: number };
      createdAt: Date;
      updatedAt: Date;
      createdBy: string;
      updatedBy: string;
    }> = {},
  ): EinsatzFahrzeug => {
    const now = new Date();
    return {
      id: { value: overrides.id ?? VALID_FAHRZEUG_ID_1 },
      einsatzId: overrides.einsatzId ?? VALID_EINSATZ_ID,
      stammId: overrides.stammId,
      fahrzeugtypId: overrides.fahrzeugtypId ?? VALID_FAHRZEUGTYP_ID_1,
      funkrufname: overrides.funkrufname ?? 'Florian Test 1',
      kennzeichen: overrides.kennzeichen ?? 'AB-CD 1234',
      fmsStatus: overrides.fmsStatus ?? 2,
      position: overrides.position ? { toJSON: () => overrides.position } : undefined,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
      createdBy: overrides.createdBy ?? VALID_USER_ID,
      updatedBy: overrides.updatedBy,
    } as unknown as EinsatzFahrzeug;
  };

  /**
   * Erstellt einen Mock für Fahrzeugtyp Aggregate.
   */
  const createMockFahrzeugtyp = (
    overrides: Partial<{
      id: string;
      code: string;
      bezeichnung: string;
      kategorie: string;
      kategorieValue: string;
      beschreibung: string;
      sollbesatzung: Record<string, number>;
      istAktiv: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      createdBy: string;
      updatedBy: string;
    }> = {},
  ): Fahrzeugtyp => {
    const now = new Date();
    return {
      id: { value: overrides.id ?? VALID_FAHRZEUGTYP_ID_1 },
      code: overrides.code ?? 'RTW',
      bezeichnung: overrides.bezeichnung ?? 'Rettungswagen',
      kategorie: { value: overrides.kategorieValue ?? overrides.kategorie ?? 'RETTUNGSDIENST' },
      kategorieValue: overrides.kategorieValue ?? overrides.kategorie ?? 'RETTUNGSDIENST',
      beschreibung: overrides.beschreibung,
      sollbesatzung: overrides.sollbesatzung,
      istAktiv: overrides.istAktiv ?? true,
      sortOrder: overrides.sortOrder ?? 0,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
      createdBy: overrides.createdBy ?? VALID_USER_ID,
      updatedBy: overrides.updatedBy,
    } as unknown as Fahrzeugtyp;
  };

  /**
   * Erstellt einen Mock für EinsatzPerson Aggregate.
   */
  const createMockEinsatzPerson = (
    overrides: Partial<{
      id: string;
      einsatzId: string;
      stammId: string;
      vorname: string;
      nachname: string;
      funktion: string;
      funkrufname: string;
      qualifikationIds: string[];
      fahrzeugId: string;
      createdBy: string;
    }> = {},
  ): EinsatzPerson => {
    return {
      id: { value: overrides.id ?? VALID_PERSON_ID_1 },
      einsatzId: overrides.einsatzId ?? VALID_EINSATZ_ID,
      stammId: overrides.stammId,
      vorname: overrides.vorname ?? 'Max',
      nachname: overrides.nachname ?? 'Mustermann',
      funktion: overrides.funktion ?? 'Helfer',
      funkrufname: overrides.funkrufname,
      qualifikationIds: overrides.qualifikationIds ?? [],
      fahrzeugId: overrides.fahrzeugId,
      createdBy: overrides.createdBy ?? VALID_USER_ID,
    } as unknown as EinsatzPerson;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Logger-Spy für AC2/AC3 Tests (warn-Verifizierung)
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    mockEinsatzFahrzeugRepository = createMockEinsatzFahrzeugRepository();
    mockFahrzeugtypRepository = createMockFahrzeugtypRepository();
    mockEinsatzPersonRepository = createMockEinsatzPersonRepository();

    handler = new GetEinsatzFahrzeugeHandler(mockEinsatzFahrzeugRepository, mockFahrzeugtypRepository, mockEinsatzPersonRepository);
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
  });

  // ============ AC1: Success Cases (4 Tests) ============

  describe('execute - Success Cases (AC1)', () => {
    it('should return mapped DTOs with fahrzeugtyp and besatzung', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug();
      const mockFahrzeugtyp = createMockFahrzeugtyp();
      const mockPerson = createMockEinsatzPerson();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([mockPerson]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);
      expect(queryResult.isSuccess).toBe(true);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].funkrufname).toBe('Florian Test 1');
      expect(result.value![0].fahrzeugtyp.bezeichnung).toBe('Rettungswagen');
      expect(result.value![0].besatzung).toHaveLength(1);
      expect(result.value![0].besatzung![0].vorname).toBe('Max');
    });

    it('should return Result.ok([]) NOT Result.ok(undefined) when no fahrzeuge exist', async () => {
      // Given
      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]); // NICHT undefined!
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).not.toBeUndefined();
    });

    it('should map fahrzeug with empty besatzung correctly', async () => {
      // Given: Fahrzeug ohne Besatzung
      const mockFahrzeug = createMockEinsatzFahrzeug();
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].besatzung).toBeUndefined(); // Mapper default: undefined wenn leer
    });

    it('should handle multiple fahrzeuge with same fahrzeugtyp', async () => {
      // Given: 2 Fahrzeuge mit gleichem Fahrzeugtyp
      const mockFahrzeug1 = createMockEinsatzFahrzeug({
        id: VALID_FAHRZEUG_ID_1,
        funkrufname: 'Florian Test 1',
        fahrzeugtypId: VALID_FAHRZEUGTYP_ID_1,
      });
      const mockFahrzeug2 = createMockEinsatzFahrzeug({
        id: VALID_FAHRZEUG_ID_2,
        funkrufname: 'Florian Test 2',
        fahrzeugtypId: VALID_FAHRZEUGTYP_ID_1, // Gleicher Typ!
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug1, mockFahrzeug2]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value![0].fahrzeugtyp.bezeichnung).toBe('Rettungswagen');
      expect(result.value![1].fahrzeugtyp.bezeichnung).toBe('Rettungswagen');
    });
  });

  // ============ AC2: Error Cases (3 Tests) ============

  describe('execute - Error Cases (AC2)', () => {
    it('should return Result.fail when einsatzFahrzeugRepository fails', async () => {
      // Given
      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.fail('Database connection failed'));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      // Handler gibt Repository-Fehler direkt durch (oder Fallback 'Fehler beim Laden der Fahrzeuge' bei null)
      expect(result.error).toBe('Database connection failed');
    });

    it('should return fallback error message when repository fails with null error', async () => {
      // Given: Repository-Fehler ohne Error-Message
      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.fail(null as unknown as string));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Fehler beim Laden der Fahrzeuge');
    });

    it('should skip fahrzeug and log warning when fahrzeugtyp not found', async () => {
      // Given: Fahrzeug mit nicht gefundenem Fahrzeugtyp
      const mockFahrzeug = createMockEinsatzFahrzeug();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(null)); // Fahrzeugtyp nicht gefunden!
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]); // Fahrzeug wurde übersprungen
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Fahrzeugtyp not found'));
    });

    it('should use empty besatzung when einsatzPersonRepository fails', async () => {
      // Given: Besatzungs-Lookup schlägt fehl
      const mockFahrzeug = createMockEinsatzFahrzeug();
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.fail('Person lookup failed'));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].besatzung).toBeUndefined(); // Leere Besatzung
    });

    it('should skip fahrzeug and log warning when fahrzeugtypRepository.findById fails', async () => {
      // Given: Fahrzeugtyp-Lookup schlägt mit Fehler fehl (DB-Timeout o.ä.)
      const mockFahrzeug = createMockEinsatzFahrzeug();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.fail('Database timeout'));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then: Fahrzeug wird übersprungen (kein Fahrzeugtyp im Cache)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Fahrzeugtyp not found'));
    });
  });

  // ============ AC3: N+1 Prevention Cases (3 Tests) ============

  describe('execute - N+1 Prevention Cases (AC3)', () => {
    it('should call fahrzeugtypRepository.findById only for unique fahrzeugtyp IDs', async () => {
      // Given: 3 Fahrzeuge mit 2 verschiedenen Fahrzeugtypen
      const mockFahrzeuge = [
        createMockEinsatzFahrzeug({
          id: VALID_FAHRZEUG_ID_1,
          fahrzeugtypId: VALID_FAHRZEUGTYP_ID_1,
        }),
        createMockEinsatzFahrzeug({
          id: VALID_FAHRZEUG_ID_2,
          fahrzeugtypId: VALID_FAHRZEUGTYP_ID_1, // Gleicher Typ wie Fahrzeug 1!
        }),
        createMockEinsatzFahrzeug({
          id: VALID_FAHRZEUG_ID_3,
          fahrzeugtypId: VALID_FAHRZEUGTYP_ID_2, // Anderer Typ
        }),
      ];

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok(mockFahrzeuge));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(createMockFahrzeugtyp()));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      await handler.execute(queryResult.value!);

      // Then: Nur 2 Calls (nicht 3!) - N+1 Prevention funktioniert
      expect(mockFahrzeugtypRepository.findById).toHaveBeenCalledTimes(2);
    });

    it('should call einsatzPersonRepository.findByFahrzeugId once per fahrzeug', async () => {
      // Given: 3 Fahrzeuge
      const mockFahrzeuge = [createMockEinsatzFahrzeug({ id: VALID_FAHRZEUG_ID_1 }), createMockEinsatzFahrzeug({ id: VALID_FAHRZEUG_ID_2 }), createMockEinsatzFahrzeug({ id: VALID_FAHRZEUG_ID_3 })];

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok(mockFahrzeuge));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(createMockFahrzeugtyp()));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      await handler.execute(queryResult.value!);

      // Then: Genau 3 Calls (1 pro Fahrzeug)
      expect(mockEinsatzPersonRepository.findByFahrzeugId).toHaveBeenCalledTimes(3);
      expect(mockEinsatzPersonRepository.findByFahrzeugId).toHaveBeenCalledWith(VALID_FAHRZEUG_ID_1);
      expect(mockEinsatzPersonRepository.findByFahrzeugId).toHaveBeenCalledWith(VALID_FAHRZEUG_ID_2);
      expect(mockEinsatzPersonRepository.findByFahrzeugId).toHaveBeenCalledWith(VALID_FAHRZEUG_ID_3);
    });

    it('should skip fahrzeug with invalid fahrzeugtypId and log warning', async () => {
      // Given: Fahrzeug mit ungültiger FahrzeugtypId (nicht CUID2)
      const mockFahrzeug = createMockEinsatzFahrzeug({
        fahrzeugtypId: 'invalid-not-cuid2', // Ungültige ID!
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]); // Fahrzeug wurde übersprungen
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid fahrzeugtypId'));
      expect(mockFahrzeugtypRepository.findById).not.toHaveBeenCalled(); // Kein Repository-Call
    });
  });

  // ============ AC4: DTO Mapping Cases (3 Tests) ============

  describe('execute - DTO Mapping Cases (AC4)', () => {
    it('should map all EinsatzFahrzeug fields correctly', async () => {
      // Given
      const mockFahrzeug = createMockEinsatzFahrzeug({
        id: VALID_FAHRZEUG_ID_1,
        einsatzId: VALID_EINSATZ_ID,
        stammId: 'stamm123abc456def789ghi',
        fahrzeugtypId: VALID_FAHRZEUGTYP_ID_1,
        funkrufname: 'Rotkreuz 83/1',
        kennzeichen: 'HD-DRK 123',
        fmsStatus: 4,
        createdBy: VALID_USER_ID,
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      const dto = result.value![0];
      expect(dto.id).toBe(VALID_FAHRZEUG_ID_1);
      expect(dto.einsatzId).toBe(VALID_EINSATZ_ID);
      expect(dto.funkrufname).toBe('Rotkreuz 83/1');
      expect(dto.kennzeichen).toBe('HD-DRK 123');
      expect(dto.fmsStatus).toBe(4);
      expect(dto.createdBy).toBe(VALID_USER_ID);
    });

    it('should include fahrzeugtyp details in DTO', async () => {
      // Given
      const mockFahrzeug = createMockEinsatzFahrzeug();
      const mockFahrzeugtyp = createMockFahrzeugtyp({
        id: VALID_FAHRZEUGTYP_ID_1,
        code: 'NEF',
        bezeichnung: 'Notarzteinsatzfahrzeug',
        kategorie: 'RETTUNGSDIENST',
        beschreibung: 'Fahrzeug für den Notarzt',
        istAktiv: true,
        sortOrder: 5,
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      const fahrzeugtyp = result.value![0].fahrzeugtyp;
      expect(fahrzeugtyp.id).toBe(VALID_FAHRZEUGTYP_ID_1);
      expect(fahrzeugtyp.code).toBe('NEF');
      expect(fahrzeugtyp.bezeichnung).toBe('Notarzteinsatzfahrzeug');
      expect(fahrzeugtyp.kategorie).toBe('RETTUNGSDIENST');
    });

    it('should map besatzung as array of PersonDto', async () => {
      // Given: Fahrzeug mit 2 Personen Besatzung
      const mockFahrzeug = createMockEinsatzFahrzeug();
      const mockFahrzeugtyp = createMockFahrzeugtyp();
      const mockPersonen = [
        createMockEinsatzPerson({
          id: VALID_PERSON_ID_1,
          vorname: 'Max',
          nachname: 'Mustermann',
        }),
        createMockEinsatzPerson({
          id: VALID_PERSON_ID_2,
          vorname: 'Anna',
          nachname: 'Schmidt',
        }),
      ];

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok(mockPersonen));

      const queryResult = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      const besatzung = result.value![0].besatzung;
      expect(besatzung).toHaveLength(2);
      expect(besatzung![0]).toEqual({
        id: VALID_PERSON_ID_1,
        vorname: 'Max',
        nachname: 'Mustermann',
      });
      expect(besatzung![1]).toEqual({
        id: VALID_PERSON_ID_2,
        vorname: 'Anna',
        nachname: 'Schmidt',
      });
    });
  });

  // ============ Query Validation Tests ============

  describe('GetEinsatzFahrzeugeQuery.create', () => {
    it('should create valid query with trimmed einsatzId', () => {
      // Given
      const einsatzIdWithSpaces = '  test-einsatz-123  ';

      // When
      const result = GetEinsatzFahrzeugeQuery.create(einsatzIdWithSpaces);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.einsatzId).toBe('test-einsatz-123');
    });

    it('should fail for empty einsatzId', () => {
      // When
      const result = GetEinsatzFahrzeugeQuery.create('');

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('should fail for whitespace-only einsatzId', () => {
      // When
      const result = GetEinsatzFahrzeugeQuery.create('   ');

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });
  });
});
