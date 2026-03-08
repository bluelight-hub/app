// @ts-nocheck
import { GetKraeftePoisHandler } from '../get-kraefte-pois.handler';
import { GetKraeftePoisQuery } from '../get-kraefte-pois.query';
import { Result } from '@domain/common/result';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IFunkStatusConfigRepository } from '@domain/kraefte/repositories/i-funk-status-config.repository';
import type { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import type { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import type { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import type { GeoPosition } from '@domain/kraefte/value-objects/geo-position.vo';

// Gueltige CUID2 IDs fuer Tests (Generator: @paralleldrive/cuid2)
const VALID_EINSATZ_ID = 'z3h5idy36i9aqgkh7st81q57';
const VALID_FAHRZEUG_ID_1 = 'y0k4xvqhkidfhdhvtqey3lik';
const VALID_FAHRZEUG_ID_2 = 'xfohqq7skz5muyqialxel8ic';
const VALID_FAHRZEUGTYP_ID_1 = 'vjcm2lr8g7y3e4iqsnud6klp';

describe('GetKraeftePoisHandler', () => {
  let handler: GetKraeftePoisHandler;
  let mockEinsatzFahrzeugRepository: jest.Mocked<IEinsatzFahrzeugRepository>;
  let mockFunkStatusRepository: jest.Mocked<IFunkStatusConfigRepository>;
  let mockFahrzeugtypRepository: jest.Mocked<IFahrzeugtypRepository>;

  // ============ Mock Factories ============

  /**
   * Erstellt einen Mock fuer IEinsatzFahrzeugRepository.
   */
  const createMockEinsatzFahrzeugRepository = (): jest.Mocked<IEinsatzFahrzeugRepository> =>
    ({
      findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      existsByEinsatzIdAndFunkrufname: jest.fn().mockResolvedValue(Result.ok(false)),
    }) as unknown as jest.Mocked<IEinsatzFahrzeugRepository>;

  /**
   * Erstellt einen Mock fuer IFunkStatusConfigRepository.
   */
  const createMockFunkStatusRepository = (): jest.Mocked<IFunkStatusConfigRepository> =>
    ({
      findAll: jest.fn().mockResolvedValue(Result.ok([])),
      findByCode: jest.fn().mockResolvedValue(Result.ok(null)),
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      update: jest.fn().mockResolvedValue(Result.ok(undefined)),
    }) as unknown as jest.Mocked<IFunkStatusConfigRepository>;

  /**
   * Erstellt einen Mock fuer IFahrzeugtypRepository.
   */
  const createMockFahrzeugtypRepository = (): jest.Mocked<IFahrzeugtypRepository> =>
    ({
      findById: jest.fn().mockResolvedValue(Result.ok(null)),
      findByCode: jest.fn().mockResolvedValue(Result.ok(null)),
      findAll: jest.fn().mockResolvedValue(Result.ok([])),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      exists: jest.fn().mockResolvedValue(Result.ok(false)),
    }) as unknown as jest.Mocked<IFahrzeugtypRepository>;

  // ============ Test Data Factories ============

  /**
   * Erstellt einen Mock fuer GeoPosition Value Object.
   */
  const createMockGeoPosition = (lat: number, lng: number): GeoPosition =>
    ({
      lat,
      lng,
      toJSON: () => ({ lat, lng }),
    }) as unknown as GeoPosition;

  /**
   * Erstellt einen Mock fuer EinsatzFahrzeug Aggregate.
   */
  const createMockEinsatzFahrzeug = (
    overrides: Partial<{
      id: string;
      einsatzId: string;
      fahrzeugtypId: string;
      funkrufname: string;
      fmsStatus: number;
      position: { lat: number; lng: number } | undefined;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ): EinsatzFahrzeug => {
    const now = new Date();
    const position = overrides.position ? createMockGeoPosition(overrides.position.lat, overrides.position.lng) : undefined;

    return {
      id: { value: overrides.id ?? VALID_FAHRZEUG_ID_1 },
      einsatzId: overrides.einsatzId ?? VALID_EINSATZ_ID,
      fahrzeugtypId: overrides.fahrzeugtypId ?? VALID_FAHRZEUGTYP_ID_1,
      funkrufname: overrides.funkrufname ?? 'Florian Heidelberg 1/46',
      fmsStatus: overrides.fmsStatus ?? 3,
      position,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    } as unknown as EinsatzFahrzeug;
  };

  /**
   * Erstellt einen Mock fuer FunkStatusConfig Aggregate.
   */
  const createMockFunkStatusConfig = (
    overrides: Partial<{
      code: number;
      standardLabel: string;
      customLabel: string;
      farbe: string;
    }> = {},
  ): FunkStatusConfig =>
    ({
      code: overrides.code ?? 3,
      standardLabel: overrides.standardLabel ?? 'Einsatz uebernommen',
      customLabel: overrides.customLabel,
      displayLabel: overrides.customLabel ?? overrides.standardLabel ?? 'Einsatz uebernommen',
      farbe: overrides.farbe ?? '#FFA500',
    }) as unknown as FunkStatusConfig;

  /**
   * Erstellt einen Mock fuer Fahrzeugtyp Aggregate.
   */
  const createMockFahrzeugtyp = (
    overrides: Partial<{
      id: string;
      code: string;
      bezeichnung: string;
      sollbesatzung: Record<string, number>;
    }> = {},
  ): Fahrzeugtyp =>
    ({
      id: { value: overrides.id ?? VALID_FAHRZEUGTYP_ID_1 },
      code: overrides.code ?? 'HLF',
      bezeichnung: overrides.bezeichnung ?? 'Hilfeleistungsloeschgruppenfahrzeug',
      sollbesatzung: overrides.sollbesatzung,
    }) as unknown as Fahrzeugtyp;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEinsatzFahrzeugRepository = createMockEinsatzFahrzeugRepository();
    mockFunkStatusRepository = createMockFunkStatusRepository();
    mockFahrzeugtypRepository = createMockFahrzeugtypRepository();

    handler = new GetKraeftePoisHandler(mockEinsatzFahrzeugRepository, mockFunkStatusRepository, mockFahrzeugtypRepository);
  });

  // ============ GeoJSON RFC 7946 Compliance (AC1) ============

  describe('execute - GeoJSON RFC 7946 Compliance (AC1)', () => {
    it('should return coordinates as [longitude, latitude] following RFC 7946', async () => {
      // Given (Arrange)
      const lat = 51.456789;
      const lng = 7.123456;
      const mockFahrzeug = createMockEinsatzFahrzeug({ position: { lat, lng } });
      const mockFahrzeugtyp = createMockFahrzeugtyp();
      const mockStatusConfig = createMockFunkStatusConfig();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([mockStatusConfig]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);
      expect(queryResult.isSuccess).toBe(true);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features).toHaveLength(1);

      const feature = result.value?.features[0];
      // RFC 7946: Koordinaten sind [longitude, latitude]!
      expect(feature.geometry.coordinates).toEqual([lng, lat]);
      expect(feature.geometry.coordinates[0]).toBe(lng); // longitude first!
      expect(feature.geometry.coordinates[1]).toBe(lat); // latitude second!
    });

    it('should have Feature ID on Feature level (not in properties)', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({
        id: VALID_FAHRZEUG_ID_1,
        position: { lat: 51.0, lng: 7.0 },
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();
      const mockStatusConfig = createMockFunkStatusConfig();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([mockStatusConfig]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const feature = result.value?.features[0];
      // ID auf Feature-Ebene (RFC 7946 Best Practice)
      expect(feature.id).toBe(VALID_FAHRZEUG_ID_1);
      // ID sollte NICHT in properties sein
      expect((feature.properties as unknown as Record<string, unknown>).id).toBeUndefined();
    });

    it('should return correct GeoJSON structure with type "FeatureCollection"', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({ position: { lat: 51.0, lng: 7.0 } });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.type).toBe('FeatureCollection');
      expect(result.value?.features[0]?.type).toBe('Feature');
      expect(result.value?.features[0]?.geometry.type).toBe('Point');
    });

    it('should handle coordinates at boundary values (RFC 7946)', async () => {
      // Given (Arrange)
      // RFC 7946: Lat -90 bis 90, Lng -180 bis 180
      const lat = -90;
      const lng = 180;
      const mockFahrzeug = createMockEinsatzFahrzeug({ position: { lat, lng } });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features).toHaveLength(1);

      const feature = result.value?.features[0];
      // RFC 7946: Koordinaten sind [longitude, latitude]
      expect(feature.geometry.coordinates).toEqual([lng, lat]);
      expect(feature.geometry.coordinates[0]).toBe(180); // longitude
      expect(feature.geometry.coordinates[1]).toBe(-90); // latitude
    });
  });

  // ============ Position Filtering (AC2) ============

  describe('execute - Position Filtering (AC2)', () => {
    it('should filter out Fahrzeuge without position', async () => {
      // Given (Arrange): 2 Fahrzeuge - eines mit Position, eines ohne
      const fahrzeugMitPosition = createMockEinsatzFahrzeug({
        id: VALID_FAHRZEUG_ID_1,
        funkrufname: 'Florian 1',
        position: { lat: 51.0, lng: 7.0 },
      });
      const fahrzeugOhnePosition = createMockEinsatzFahrzeug({
        id: VALID_FAHRZEUG_ID_2,
        funkrufname: 'Florian 2',
        position: undefined, // Keine Position!
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([fahrzeugMitPosition, fahrzeugOhnePosition]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert): Nur das Fahrzeug MIT Position wird zurueckgegeben
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features).toHaveLength(1);
      expect(result.value?.features[0]?.properties.name).toBe('Florian 1');
    });

    it('should return empty FeatureCollection when no Fahrzeuge have position', async () => {
      // Given (Arrange): Alle Fahrzeuge ohne Position
      const fahrzeuge = [createMockEinsatzFahrzeug({ id: VALID_FAHRZEUG_ID_1, position: undefined }), createMockEinsatzFahrzeug({ id: VALID_FAHRZEUG_ID_2, position: undefined })];

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok(fahrzeuge));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.type).toBe('FeatureCollection');
      expect(result.value?.features).toHaveLength(0);
    });

    it('should return empty FeatureCollection when no Fahrzeuge exist', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.type).toBe('FeatureCollection');
      expect(result.value?.features).toEqual([]);
    });
  });

  // ============ Status Config Fallback (AC3) ============

  describe('execute - Status Config Fallback (AC3)', () => {
    it('should use configured statusFarbe and statusLabel when FunkStatusConfig exists', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({
        fmsStatus: 3,
        position: { lat: 51.0, lng: 7.0 },
      });
      const mockStatusConfig = createMockFunkStatusConfig({
        code: 3,
        standardLabel: 'Einsatz uebernommen',
        farbe: '#00FF00', // Gruen
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([mockStatusConfig]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const properties = result.value?.features[0]?.properties;
      expect(properties.statusFarbe).toBe('#00FF00');
      expect(properties.statusLabel).toBe('Einsatz uebernommen');
    });

    it('should use fallback statusFarbe and statusLabel when FunkStatusConfig is missing', async () => {
      // Given (Arrange): Fahrzeug mit Status 9, aber keine Config fuer Status 9
      const mockFahrzeug = createMockEinsatzFahrzeug({
        fmsStatus: 9, // Kein Config vorhanden!
        position: { lat: 51.0, lng: 7.0 },
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([])); // Keine Configs!
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert): Fallback-Werte werden verwendet
      expect(result.isSuccess).toBe(true);
      const properties = result.value?.features[0]?.properties;
      expect(properties.statusFarbe).toBe('#808080'); // Default Grau (AC5 Fallback)
      expect(properties.statusLabel).toBe('Status unbekannt'); // Default Label
    });

    it('should use fallback values when FunkStatusRepository fails', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({
        fmsStatus: 3,
        position: { lat: 51.0, lng: 7.0 },
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.fail('Database error')); // Repository Fehler!
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert): Fallback-Werte werden verwendet
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features).toHaveLength(1);
      const properties = result.value?.features[0]?.properties;
      expect(properties.statusFarbe).toBe('#808080'); // Fallback Grau
      expect(properties.statusLabel).toBe('Status unbekannt'); // Fallback Label
    });

    it('should use customLabel over standardLabel when available', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({
        fmsStatus: 7,
        position: { lat: 51.0, lng: 7.0 },
      });
      const mockStatusConfig = createMockFunkStatusConfig({
        code: 7,
        standardLabel: 'Standard Label',
        customLabel: 'Mein Custom Label',
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([mockStatusConfig]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert): customLabel wird verwendet (displayLabel)
      expect(result.isSuccess).toBe(true);
      const properties = result.value?.features[0]?.properties;
      expect(properties.statusLabel).toBe('Mein Custom Label');
    });
  });

  // ============ Staerke Formatting (AC4) ============

  describe('execute - Staerke Formatting (AC4)', () => {
    it('should format Sollbesatzung as Staerke string (Fuehrung/Tech/Mannschaft)', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({ position: { lat: 51.0, lng: 7.0 } });
      const mockFahrzeugtyp = createMockFahrzeugtyp({
        sollbesatzung: {
          fahrer: 1, // Fuehrung: 1
          sanitaeter: 2, // Tech: 2
          notarzt: 0, // Tech: +0 = 2
          funktrupp: 3, // Mannschaft: 3
          helfer: 2, // Mannschaft: +2 = 5
        },
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert): Staerke = "1/2/5" (Fuehrung/Tech/Mannschaft)
      expect(result.isSuccess).toBe(true);
      const properties = result.value?.features[0]?.properties;
      expect(properties.staerke).toBe('1/2/5');
    });

    it('should return null for staerke when no Sollbesatzung is defined', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({ position: { lat: 51.0, lng: 7.0 } });
      const mockFahrzeugtyp = createMockFahrzeugtyp({
        sollbesatzung: undefined, // Keine Sollbesatzung!
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features[0]?.properties.staerke).toBeNull();
    });

    it('should return null for staerke when all Sollbesatzung values are 0', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({ position: { lat: 51.0, lng: 7.0 } });
      const mockFahrzeugtyp = createMockFahrzeugtyp({
        sollbesatzung: {
          fahrer: 0,
          sanitaeter: 0,
          notarzt: 0,
          funktrupp: 0,
          helfer: 0,
        },
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features[0]?.properties.staerke).toBeNull();
    });
  });

  // ============ Error Cases (AC5) ============

  describe('execute - Error Cases (AC5)', () => {
    it('should return Result.fail when EinsatzFahrzeugRepository fails', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.fail('Database connection failed'));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection failed');
    });

    it('should return fallback error message when repository fails with null error', async () => {
      // Given (Arrange)
      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.fail(null as unknown as string));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Fehler beim Laden der Fahrzeuge');
    });

    it('should use UNKNOWN fahrzeugtypCode when Fahrzeugtyp not found', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({
        fahrzeugtypId: 'invalid-not-found',
        position: { lat: 51.0, lng: 7.0 },
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(null)); // Nicht gefunden!

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert): Feature wird erstellt mit UNKNOWN Code
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features).toHaveLength(1);
      expect(result.value?.features[0]?.properties.fahrzeugtypCode).toBe('UNKNOWN');
    });

    it('should use UNKNOWN fahrzeugtypCode when FahrzeugtypRepository fails', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug({
        position: { lat: 51.0, lng: 7.0 },
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.fail('Database error')); // Repository Fehler!

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert): Feature wird erstellt mit UNKNOWN Code
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features).toHaveLength(1);
      expect(result.value?.features[0]?.properties.fahrzeugtypCode).toBe('UNKNOWN');
    });
  });

  // ============ Query Validation Tests ============

  describe('GetKraeftePoisQuery.create', () => {
    it('should create valid query with trimmed einsatzId', () => {
      // Given (Arrange)
      const einsatzIdWithSpaces = '  test-einsatz-123  ';

      // When (Act)
      const result = GetKraeftePoisQuery.create(einsatzIdWithSpaces);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe('test-einsatz-123');
    });

    it('should fail for empty einsatzId', () => {
      // Given (Arrange) - keine Vorbereitung noetig

      // When (Act)
      const result = GetKraeftePoisQuery.create('');

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('should fail for whitespace-only einsatzId', () => {
      // Given (Arrange) - keine Vorbereitung noetig

      // When (Act)
      const result = GetKraeftePoisQuery.create('   ');

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });
  });

  // ============ Properties Mapping (AC6) ============

  describe('execute - Properties Mapping (AC6)', () => {
    it('should map all required properties correctly', async () => {
      // Given (Arrange)
      const updatedAt = new Date('2026-01-04T10:30:00.000Z');
      const mockFahrzeug = createMockEinsatzFahrzeug({
        id: VALID_FAHRZEUG_ID_1,
        funkrufname: 'Florian Heidelberg 1/46',
        fmsStatus: 3,
        position: { lat: 51.456, lng: 7.123 },
        updatedAt,
      });
      const mockStatusConfig = createMockFunkStatusConfig({
        code: 3,
        standardLabel: 'Einsatz uebernommen',
        farbe: '#FFA500',
      });
      const mockFahrzeugtyp = createMockFahrzeugtyp({
        code: 'HLF',
        sollbesatzung: { fahrer: 1, sanitaeter: 2, helfer: 6 },
      });

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([mockFahrzeug]));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok([mockStatusConfig]));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const feature = result.value?.features[0];

      expect(feature.id).toBe(VALID_FAHRZEUG_ID_1);
      expect(feature.geometry.coordinates).toEqual([7.123, 51.456]);
      expect(feature.properties.name).toBe('Florian Heidelberg 1/46');
      expect(feature.properties.status).toBe(3);
      expect(feature.properties.statusLabel).toBe('Einsatz uebernommen');
      expect(feature.properties.statusFarbe).toBe('#FFA500');
      expect(feature.properties.staerke).toBe('1/2/6');
      expect(feature.properties.fahrzeugtypCode).toBe('HLF');
      expect(feature.properties.positionTimestamp).toBe('2026-01-04T10:30:00.000Z');
    });

    it('should handle multiple Fahrzeuge with different status codes', async () => {
      // Given (Arrange)
      const fahrzeuge = [
        createMockEinsatzFahrzeug({
          id: VALID_FAHRZEUG_ID_1,
          fmsStatus: 1,
          position: { lat: 51.0, lng: 7.0 },
        }),
        createMockEinsatzFahrzeug({
          id: VALID_FAHRZEUG_ID_2,
          fmsStatus: 4,
          position: { lat: 52.0, lng: 8.0 },
        }),
      ];
      const statusConfigs = [
        createMockFunkStatusConfig({ code: 1, standardLabel: 'Auf Wache', farbe: '#00FF00' }),
        createMockFunkStatusConfig({ code: 4, standardLabel: 'Sprechwunsch', farbe: '#FFFF00' }),
      ];
      const mockFahrzeugtyp = createMockFahrzeugtyp();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok(fahrzeuge));
      mockFunkStatusRepository.findAll.mockResolvedValue(Result.ok(statusConfigs));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(mockFahrzeugtyp));

      const queryResult = GetKraeftePoisQuery.create(VALID_EINSATZ_ID);

      // When (Act)
      const result = await handler.execute(queryResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.features).toHaveLength(2);

      const feature1 = result.value?.features.find((f) => f.id === VALID_FAHRZEUG_ID_1)!;
      const feature2 = result.value?.features.find((f) => f.id === VALID_FAHRZEUG_ID_2)!;

      expect(feature1.properties.statusLabel).toBe('Auf Wache');
      expect(feature1.properties.statusFarbe).toBe('#00FF00');

      expect(feature2.properties.statusLabel).toBe('Sprechwunsch');
      expect(feature2.properties.statusFarbe).toBe('#FFFF00');
    });
  });
});
