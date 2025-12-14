import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { GetAllQualifikationenHandler } from '../get-all-qualifikationen.handler';
import { GetAllQualifikationenQuery } from '../get-all-qualifikationen.query';

describe('GetAllQualifikationenHandler', () => {
  let handler: GetAllQualifikationenHandler;
  let mockRepository: jest.Mocked<IQualifikationRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByAbkuerzung: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IQualifikationRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetAllQualifikationenHandler, { provide: KRAEFTE_REPOSITORIES.QUALIFIKATION, useValue: mockRepository }],
    }).compile();

    handler = module.get<GetAllQualifikationenHandler>(GetAllQualifikationenHandler);
  });

  describe('execute', () => {
    it('sollte alle Qualifikationen ohne Filter zurückgeben', async () => {
      // Given (Arrange)
      const qualifikation1 = Qualifikation.reconstitute({
        id: createId(),
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      const qualifikation2 = Qualifikation.reconstitute({
        id: createId(),
        name: 'Rettungssanitäter',
        abkuerzung: 'RS',
        kategorie: 'SANITAET',
        istAktiv: false,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-456',
      }).value!;

      mockRepository.findAll.mockResolvedValue(Result.ok([qualifikation1, qualifikation2]));

      const query = new GetAllQualifikationenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value![0].name).toBe('Zugführer');
      expect(result.value![0].abkuerzung).toBe('ZFÜ');
      expect(result.value![0].kategorie).toBe('FUEHRUNG');
      expect(result.value![0].istAktiv).toBe(true);
      expect(result.value![1].name).toBe('Rettungssanitäter');
      expect(result.value![1].istAktiv).toBe(false);
      expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('sollte nur aktive Qualifikationen zurückgeben wenn istAktiv=true', async () => {
      // Given (Arrange)
      const qualifikation1 = Qualifikation.reconstitute({
        id: createId(),
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      const qualifikation2 = Qualifikation.reconstitute({
        id: createId(),
        name: 'Gruppenführer',
        abkuerzung: 'GFÜ',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-456',
      }).value!;

      mockRepository.findAll.mockResolvedValue(Result.ok([qualifikation1, qualifikation2]));

      const query = new GetAllQualifikationenQuery(true);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value![0].istAktiv).toBe(true);
      expect(result.value![1].istAktiv).toBe(true);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ istAktiv: true });
    });

    it('sollte nur inaktive Qualifikationen zurückgeben wenn istAktiv=false', async () => {
      // Given (Arrange)
      const qualifikation1 = Qualifikation.reconstitute({
        id: createId(),
        name: 'Alte Qualifikation',
        abkuerzung: 'AQ',
        kategorie: 'SONSTIGES',
        istAktiv: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      mockRepository.findAll.mockResolvedValue(Result.ok([qualifikation1]));

      const query = new GetAllQualifikationenQuery(false);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].istAktiv).toBe(false);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ istAktiv: false });
    });

    it('sollte leere Liste zurückgeben wenn keine Qualifikationen existieren', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.ok([]));

      const query = new GetAllQualifikationenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
      expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('sollte fehlschlagen wenn Repository-Fehler auftritt', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.fail('Datenbankverbindung fehlgeschlagen'));

      const query = new GetAllQualifikationenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Datenbankverbindung fehlgeschlagen');
    });

    it('sollte leere Liste zurückgeben wenn Repository null zurückgibt', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.ok(null as never));

      const query = new GetAllQualifikationenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });

    it('sollte fehlschlagen mit spezifischer Fehlermeldung bei unerwarteter Exception', async () => {
      // Given (Arrange)
      const error = new Error('Netzwerkfehler');
      mockRepository.findAll.mockRejectedValue(error);

      const query = new GetAllQualifikationenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Fehler beim Laden der Qualifikationen');
      expect(result.error).toContain('Netzwerkfehler');
    });

    it('sollte korrekte DTOs mit allen Feldern zurückgeben', async () => {
      // Given (Arrange)
      const now = new Date();
      const id = createId();
      const qualifikation = Qualifikation.reconstitute({
        id,
        name: 'Notfallsanitäter',
        abkuerzung: 'NFS',
        kategorie: 'SANITAET',
        beschreibung: 'Höchste nichtärztliche Qualifikation',
        istAktiv: true,
        sortOrder: 5,
        createdAt: now,
        updatedAt: now,
        createdBy: 'user-creator',
        updatedBy: 'user-updater',
      }).value!;

      mockRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));

      const query = new GetAllQualifikationenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      const dto = result.value![0];
      expect(dto.id).toBe(id);
      expect(dto.name).toBe('Notfallsanitäter');
      expect(dto.abkuerzung).toBe('NFS');
      expect(dto.kategorie).toBe('SANITAET');
      expect(dto.beschreibung).toBe('Höchste nichtärztliche Qualifikation');
      expect(dto.istAktiv).toBe(true);
      expect(dto.sortOrder).toBe(5);
      expect(dto.createdAt).toBe(now);
      expect(dto.updatedAt).toBe(now);
      expect(dto.createdBy).toBe('user-creator');
      expect(dto.updatedBy).toBe('user-updater');
    });
  });
});
