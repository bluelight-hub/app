// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { GetNotizenByEinsatzHandler } from '../get-notizen-by-einsatz.handler';
import { GetNotizenByEinsatzQuery } from '../get-notizen-by-einsatz.query';
import { Notiz } from '@domain/notiz/entities/notiz.entity';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { NotizTitel } from '@domain/notiz/value-objects/notiz-titel';
import { UserId } from '@domain/value-objects/user-id';
import { KATEGORIE_REPOSITORY, NOTIZ_REPOSITORY } from '@infrastructure/di-tokens';
import type { INotizRepository } from '@domain/notiz/repositories/i-notiz.repository';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import { NotizResponseFactory } from '../../../dto/notiz-response.factory';

/**
 * Helper: Erstellt eine rekonstruierte Notiz fuer Tests.
 *
 * Nutzt reconstruct() da wir keine Domain-Events emittieren wollen.
 */
function createMockNotiz(overrides?: {
  titel?: string;
  inhalt?: string | null;
  kategorie?: string | null;
  kategorieId?: string | null;
  istTeamsichtbar?: boolean;
  erstelltVon?: ReturnType<typeof UserId.create>['value'];
  createdAt?: Date;
}): Notiz {
  const id = NotizId.create().value! as NotizId;
  const titel = NotizTitel.create(overrides?.titel ?? 'Test Notiz').value!;
  const erstelltVon = overrides?.erstelltVon ?? UserId.create().value!;
  const now = new Date();

  return Notiz.reconstruct({
    id,
    einsatzId: 'einsatz-123',
    titel,
    inhalt: overrides?.inhalt ?? null,
    kategorie: overrides?.kategorie ?? null,
    kategorieId: overrides?.kategorieId ?? null,
    istTeamsichtbar: overrides?.istTeamsichtbar ?? false,
    erstelltVon: erstelltVon!,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  });
}

/**
 * Unit Tests fuer GetNotizenByEinsatzHandler.
 *
 * Testet den Query Handler gemaess AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repository fuer Unit Test Isolation.
 *
 * **Test Coverage:**
 * - Query Validierung: einsatzId erforderlich
 * - Empty Result: Keine Notizen vorhanden
 * - Happy Path: Alle Notizen eines Einsatzes abrufen
 * - Repository Aufruf: einsatzId korrekt uebergeben
 * - ResponseFactory Nutzung: Mapping korrekt
 * - Read-Only Constraint: save() wird nicht aufgerufen
 * - Sortierung: Reihenfolge der Repository-Rueckgabe beibehalten
 */
describe('GetNotizenByEinsatzHandler', () => {
  let handler: GetNotizenByEinsatzHandler;
  let mockRepository: jest.Mocked<INotizRepository>;
  let mockKategorieRepository: jest.Mocked<IKategorieRepository>;
  let mockResponseFactory: jest.Mocked<NotizResponseFactory>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository fuer Notizen
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<INotizRepository>;

    // Mock Kategorie Repository fuer Story 8.2
    mockKategorieRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      existsByNameAndEinsatzId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IKategorieRepository>;

    // Mock ResponseFactory (async seit Story 7.7 - User-Name Aufloesung)
    // Story 8.2: Zweiter Parameter kategorieData hinzugefuegt
    mockResponseFactory = {
      create: jest.fn().mockImplementation((notiz, kategorieData) =>
        Promise.resolve({
          id: notiz.id.toString(),
          einsatzId: notiz.einsatzId,
          titel: notiz.titel.value,
          inhalt: notiz.inhalt,
          kategorie: notiz.kategorie,
          istTeamsichtbar: notiz.istTeamsichtbar,
          erstelltVon: notiz.erstelltVon.toString(),
          erstelltVonName: null,
          createdAt: notiz.createdAt.toISOString(),
          updatedAt: notiz.updatedAt.toISOString(),
          // Story 8.2: Kategorie-Daten
          kategorieId: notiz.kategorieId ?? null,
          kategorieName: kategorieData?.name ?? null,
          kategorieFarbe: kategorieData?.farbe ?? null,
        }),
      ),
    } as unknown as jest.Mocked<NotizResponseFactory>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetNotizenByEinsatzHandler,
        { provide: NOTIZ_REPOSITORY, useValue: mockRepository },
        { provide: KATEGORIE_REPOSITORY, useValue: mockKategorieRepository },
        { provide: NotizResponseFactory, useValue: mockResponseFactory },
      ],
    }).compile();

    handler = module.get<GetNotizenByEinsatzHandler>(GetNotizenByEinsatzHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Validierung', () => {
    it('should reject empty einsatzId', () => {
      // Given (Arrange)
      const queryResult = GetNotizenByEinsatzQuery.create({ einsatzId: '', userId: 'user-1' });

      // Then (Assert)
      expect(queryResult.isFailure).toBe(true);
      expect(queryResult.error).toBe('NOTIZ_EINSATZ_ID_REQUIRED');
    });

    it('should reject whitespace-only einsatzId', () => {
      // Given (Arrange)
      const queryResult = GetNotizenByEinsatzQuery.create({ einsatzId: '   ', userId: 'user-1' });

      // Then (Assert)
      expect(queryResult.isFailure).toBe(true);
    });

    it('should accept valid einsatzId', () => {
      // Given (Arrange)
      const queryResult = GetNotizenByEinsatzQuery.create({ einsatzId: 'clw3h8x9y0000qwerty', userId: 'user-1' });

      // Then (Assert)
      expect(queryResult.isSuccess).toBe(true);
      expect(queryResult.value).toBeDefined();
      expect(queryResult.value?.einsatzId).toBe('clw3h8x9y0000qwerty');
    });

    it('should reject empty userId', () => {
      // Given (Arrange)
      const queryResult = GetNotizenByEinsatzQuery.create({ einsatzId: 'einsatz-123', userId: '' });

      // Then (Assert)
      expect(queryResult.isFailure).toBe(true);
      expect(queryResult.error).toBe('NOTIZ_ERSTELLT_VON_REQUIRED');
    });

    it('should reject whitespace-only userId', () => {
      // Given (Arrange)
      const queryResult = GetNotizenByEinsatzQuery.create({ einsatzId: 'einsatz-123', userId: '   ' });

      // Then (Assert)
      expect(queryResult.isFailure).toBe(true);
      expect(queryResult.error).toBe('NOTIZ_ERSTELLT_VON_REQUIRED');
    });
  });

  describe('execute', () => {
    it('should return empty array when no notizen exist', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue([]);
      const query = GetNotizenByEinsatzQuery.create({ einsatzId: 'einsatz-123', userId: 'user-1' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(result.value?.length).toBe(0);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).not.toHaveBeenCalled();
    });

    it('should return all notizen preserving repository order (sorted by createdAt DESC)', async () => {
      // Given (Arrange) - Notizen absichtlich in DESC-Reihenfolge (wie Repository liefert)
      const notiz1 = createMockNotiz({
        titel: 'Lagebericht Abschnitt A',
        inhalt: 'Keine besonderen Vorkommnisse',
        kategorie: 'Lage',
        createdAt: new Date('2026-02-03T10:00:00Z'),
      });
      const notiz2 = createMockNotiz({
        titel: 'Einsatzmittel Status',
        inhalt: 'RTW 1 verfuegbar',
        kategorie: 'Einsatzmittel',
        createdAt: new Date('2026-02-03T11:00:00Z'),
      });
      const notiz3 = createMockNotiz({
        titel: 'Wetterlage',
        inhalt: null,
        kategorie: null,
        createdAt: new Date('2026-02-03T12:00:00Z'),
      });

      // Repository liefert DESC: neueste zuerst
      mockRepository.findByEinsatzId.mockResolvedValue([notiz3, notiz2, notiz1]);
      const query = GetNotizenByEinsatzQuery.create({ einsatzId: 'einsatz-123', userId: 'user-1' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert) - Reihenfolge des Repositories bleibt erhalten
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(3);

      // Reihenfolge pruefen: neueste zuerst
      expect(result.value?.[0]?.titel).toBe('Wetterlage');
      expect(result.value?.[1]?.titel).toBe('Einsatzmittel Status');
      expect(result.value?.[2]?.titel).toBe('Lagebericht Abschnitt A');

      // Chronologisch korrekt: createdAt DESC
      expect(new Date(result.value?.[0]?.createdAt).getTime()).toBeGreaterThan(new Date(result.value?.[1]?.createdAt).getTime());
      expect(new Date(result.value?.[1]?.createdAt).getTime()).toBeGreaterThan(new Date(result.value?.[2]?.createdAt).getTime());
    });

    it('should pass einsatzId to repository', async () => {
      // Given (Arrange)
      const einsatzId = 'clw3h8x9y0000qwertyuiopas';
      mockRepository.findByEinsatzId.mockResolvedValue([]);
      const query = GetNotizenByEinsatzQuery.create({ einsatzId, userId: 'user-1' }).value!;

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith(einsatzId, 'user-1');
    });

    it('should use ResponseFactory correctly for mapping', async () => {
      // Given (Arrange)
      const notiz = createMockNotiz({
        titel: 'Lagebericht',
        inhalt: '3 Verletzte, RTW angefordert',
        kategorie: 'Lage',
      });

      mockRepository.findByEinsatzId.mockResolvedValue([notiz]);
      const query = GetNotizenByEinsatzQuery.create({ einsatzId: 'einsatz-123', userId: 'user-1' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(1);
      // Story 8.2: Factory wird mit notiz und kategorieData (null wenn keine) aufgerufen
      expect(mockResponseFactory.create).toHaveBeenCalledWith(notiz, null);

      const dto = result.value?.[0];
      expect(dto.id).toBe(notiz.id.toString());
      expect(dto.einsatzId).toBe('einsatz-123');
      expect(dto.titel).toBe('Lagebericht');
      expect(dto.inhalt).toBe('3 Verletzte, RTW angefordert');
      expect(dto.kategorie).toBe('Lage');
      expect(dto.erstelltVon).toBe(notiz.erstelltVon.toString());
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });

    it('should NOT call save() method (Read-Only Query)', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue([]);
      const query = GetNotizenByEinsatzQuery.create({ einsatzId: 'einsatz-123', userId: 'user-1' }).value!;

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Team-Sichtbarkeit Filterung', () => {
    it('should pass userId to repository findByEinsatzId', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-456';
      const userId = 'user-42';
      mockRepository.findByEinsatzId.mockResolvedValue([]);
      const query = GetNotizenByEinsatzQuery.create({ einsatzId, userId }).value!;

      // When (Act)
      await handler.execute(query);

      // Then (Assert) - userId muss an Repository uebergeben werden fuer Sichtbarkeitsfilter
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith(einsatzId, userId);
    });

    it('should return all notes from repository (filtering done by repository)', async () => {
      // Given (Arrange) - Repository liefert bereits gefilterte Notizen
      // (eigene + team-sichtbare, keine geloeschten)
      const eigeneNotiz = createMockNotiz({
        titel: 'Meine private Notiz',
        istTeamsichtbar: false,
      });
      const teamsichtbareNotiz = createMockNotiz({
        titel: 'Geteilte Lageinfo',
        istTeamsichtbar: true,
      });
      mockRepository.findByEinsatzId.mockResolvedValue([teamsichtbareNotiz, eigeneNotiz]);
      const query = GetNotizenByEinsatzQuery.create({ einsatzId: 'einsatz-123', userId: 'user-1' }).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert) - Handler gibt alle Repository-Ergebnisse zurueck ohne eigene Filterung
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value?.[0]?.titel).toBe('Geteilte Lageinfo');
      expect(result.value?.[1]?.titel).toBe('Meine private Notiz');
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(2);
    });
  });
});
