// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { GetKategorienByEinsatzHandler } from '@application/kategorie/queries';
import { GetKategorienByEinsatzQuery } from '@application/kategorie/queries';
import { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { KategorieName } from '@domain/kategorie/value-objects/kategorie-name';
import { KategorieFarbe } from '@domain/kategorie/value-objects/kategorie-farbe';
import { UserId } from '@domain/value-objects/user-id';
import { KATEGORIE_REPOSITORY } from '@infrastructure/di-tokens';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import { KategorieResponseFactory } from '@application/kategorie/dto';

/**
 * Helper: Erstellt eine rekonstruierte Kategorie fuer Tests.
 *
 * Nutzt reconstruct() da wir keine Domain-Events emittieren wollen.
 */
function createMockKategorie(overrides?: {
  name?: string;
  farbe?: string;
  einsatzId?: string;
  erstelltVon?: ReturnType<typeof UserId.create>['value'];
  createdAt?: Date;
  geloeschtAm?: Date | null;
}): Kategorie {
  const id = KategorieId.create().value! as KategorieId;
  const name = KategorieName.create(overrides?.name ?? 'Test Kategorie').value!;
  const farbe = KategorieFarbe.create(overrides?.farbe ?? '#FF5733').value!;
  const erstelltVon = overrides?.erstelltVon ?? UserId.create().value!;
  const now = new Date();

  return Kategorie.reconstruct({
    id,
    einsatzId: overrides?.einsatzId ?? 'einsatz-123',
    name,
    farbe,
    erstelltVon: erstelltVon!,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: now,
    geloeschtAm: overrides?.geloeschtAm ?? null,
  });
}

/**
 * Unit Tests fuer GetKategorienByEinsatzHandler.
 *
 * Testet den Query Handler gemaess AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repository fuer Unit Test Isolation.
 *
 * **Test Coverage:**
 * - Query Validierung: einsatzId erforderlich
 * - Empty Result: Keine Kategorien vorhanden
 * - Happy Path: Alle Kategorien eines Einsatzes abrufen
 * - Repository Aufruf: einsatzId korrekt uebergeben
 * - ResponseFactory Nutzung: Mapping korrekt
 * - Read-Only Constraint: save() wird nicht aufgerufen
 */
describe('GetKategorienByEinsatzHandler', () => {
  let handler: GetKategorienByEinsatzHandler;
  let mockRepository: jest.Mocked<IKategorieRepository>;
  let mockResponseFactory: jest.Mocked<KategorieResponseFactory>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository fuer Kategorien
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      existsByNameAndEinsatzId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IKategorieRepository>;

    // Mock ResponseFactory (async - User-Name Aufloesung)
    mockResponseFactory = {
      create: jest.fn().mockImplementation((kategorie) =>
        Promise.resolve({
          id: kategorie.id.toString(),
          einsatzId: kategorie.einsatzId,
          name: kategorie.name.value,
          farbe: kategorie.farbe.value,
          erstelltVon: kategorie.erstelltVon.toString(),
          erstelltVonName: null,
          createdAt: kategorie.createdAt.toISOString(),
          updatedAt: kategorie.updatedAt.toISOString(),
        }),
      ),
    } as unknown as jest.Mocked<KategorieResponseFactory>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetKategorienByEinsatzHandler, { provide: KATEGORIE_REPOSITORY, useValue: mockRepository }, { provide: KategorieResponseFactory, useValue: mockResponseFactory }],
    }).compile();

    handler = module.get<GetKategorienByEinsatzHandler>(GetKategorienByEinsatzHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GetKategorienByEinsatzQuery.create()', () => {
    it('should fail when einsatzId is empty', () => {
      // Given (Arrange)
      const queryResult = GetKategorienByEinsatzQuery.create({ einsatzId: '' });

      // Then (Assert)
      expect(queryResult.isFailure).toBe(true);
      expect(queryResult.error).toBe('KATEGORIE_EINSATZ_ID_REQUIRED');
    });

    it('should fail when einsatzId is whitespace', () => {
      // Given (Arrange)
      const queryResult = GetKategorienByEinsatzQuery.create({ einsatzId: '   ' });

      // Then (Assert)
      expect(queryResult.isFailure).toBe(true);
      expect(queryResult.error).toBe('KATEGORIE_EINSATZ_ID_REQUIRED');
    });

    it('should create query successfully with valid einsatzId', () => {
      // Given (Arrange)
      const queryResult = GetKategorienByEinsatzQuery.create({ einsatzId: 'clw3h8x9y0000qwerty' });

      // Then (Assert)
      expect(queryResult.isSuccess).toBe(true);
      expect(queryResult.value).toBeDefined();
      expect(queryResult.value?.einsatzId).toBe('clw3h8x9y0000qwerty');
    });
  });

  describe('execute', () => {
    it('should return array of KategorieResponseDto for valid einsatzId', async () => {
      // Given (Arrange)
      const kategorie1 = createMockKategorie({
        name: 'Lage',
        farbe: '#FF5733',
        createdAt: new Date('2026-02-03T10:00:00Z'),
      });
      const kategorie2 = createMockKategorie({
        name: 'Einsatzmittel',
        farbe: '#33FF57',
        createdAt: new Date('2026-02-03T11:00:00Z'),
      });

      mockRepository.findByEinsatzId.mockResolvedValue([kategorie1, kategorie2]);
      const query = GetKategorienByEinsatzQuery.create({ einsatzId: 'einsatz-123' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith('einsatz-123');
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(2);

      // Pruefen der DTO-Struktur
      expect(result.value?.[0]?.name).toBe('Lage');
      expect(result.value?.[0]?.farbe).toBe('#FF5733');
      expect(result.value?.[1]?.name).toBe('Einsatzmittel');
      expect(result.value?.[1]?.farbe).toBe('#33FF57');
    });

    it('should return empty array when no categories exist', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue([]);
      const query = GetKategorienByEinsatzQuery.create({ einsatzId: 'einsatz-123' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(result.value?.length).toBe(0);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).not.toHaveBeenCalled();
    });

    it('should call factory.create for each kategorie', async () => {
      // Given (Arrange)
      const kategorie1 = createMockKategorie({ name: 'Kategorie A' });
      const kategorie2 = createMockKategorie({ name: 'Kategorie B' });
      const kategorie3 = createMockKategorie({ name: 'Kategorie C' });

      mockRepository.findByEinsatzId.mockResolvedValue([kategorie1, kategorie2, kategorie3]);
      const query = GetKategorienByEinsatzQuery.create({ einsatzId: 'einsatz-456' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(3);
      expect(mockResponseFactory.create).toHaveBeenNthCalledWith(1, kategorie1);
      expect(mockResponseFactory.create).toHaveBeenNthCalledWith(2, kategorie2);
      expect(mockResponseFactory.create).toHaveBeenNthCalledWith(3, kategorie3);
    });

    it('should pass einsatzId to repository', async () => {
      // Given (Arrange)
      const einsatzId = 'clw3h8x9y0000qwertyuiopas';
      mockRepository.findByEinsatzId.mockResolvedValue([]);
      const query = GetKategorienByEinsatzQuery.create({ einsatzId }).value!;

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith(einsatzId);
    });

    it('should NOT call save() method (Read-Only Query)', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue([]);
      const query = GetKategorienByEinsatzQuery.create({ einsatzId: 'einsatz-123' }).value!;

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should use ResponseFactory correctly for mapping', async () => {
      // Given (Arrange)
      const kategorie = createMockKategorie({
        name: 'Wetterlage',
        farbe: '#0066FF',
      });

      mockRepository.findByEinsatzId.mockResolvedValue([kategorie]);
      const query = GetKategorienByEinsatzQuery.create({ einsatzId: 'einsatz-123' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).toHaveBeenCalledWith(kategorie);

      const dto = result.value?.[0];
      expect(dto.id).toBe(kategorie.id.toString());
      expect(dto.einsatzId).toBe('einsatz-123');
      expect(dto.name).toBe('Wetterlage');
      expect(dto.farbe).toBe('#0066FF');
      expect(dto.erstelltVon).toBe(kategorie.erstelltVon.toString());
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });
  });
});
