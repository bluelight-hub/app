import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { GetQualifikationByIdHandler } from '../get-qualifikation-by-id.handler';
import { GetQualifikationByIdQuery } from '../get-qualifikation-by-id.query';

describe('GetQualifikationByIdHandler', () => {
  let handler: GetQualifikationByIdHandler;
  let mockRepository: jest.Mocked<IQualifikationRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByAbkuerzung: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IQualifikationRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetQualifikationByIdHandler, { provide: KRAEFTE_REPOSITORIES.QUALIFIKATION, useValue: mockRepository }],
    }).compile();

    handler = module.get<GetQualifikationByIdHandler>(GetQualifikationByIdHandler);
  });

  describe('execute', () => {
    it('sollte Qualifikation erfolgreich nach ID zurückgeben', async () => {
      // Given (Arrange)
      const id = createId();
      const qualifikation = Qualifikation.reconstitute({
        id,
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(qualifikation));

      const query = new GetQualifikationByIdQuery(id);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).not.toBeNull();
      expect(result.value!.id).toBe(id);
      expect(result.value!.name).toBe('Zugführer');
      expect(result.value!.abkuerzung).toBe('ZFÜ');
      expect(result.value!.kategorie).toBe('FUEHRUNG');
      expect(mockRepository.findById).toHaveBeenCalledWith(expect.objectContaining({ value: id }));
    });

    it('sollte null zurückgeben wenn Qualifikation nicht gefunden wurde', async () => {
      // Given (Arrange)
      const id = createId();
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const query = new GetQualifikationByIdQuery(id);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
      expect(mockRepository.findById).toHaveBeenCalledWith(expect.objectContaining({ value: id }));
    });

    it('sollte fehlschlagen mit ungültiger ID', async () => {
      // Given (Arrange)
      const invalidId = 'invalid-id-format';
      jest.spyOn(QualifikationId, 'create').mockReturnValue(Result.fail('Ungültige ID'));

      const query = new GetQualifikationByIdQuery(invalidId);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Ungültige ID');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository-Fehler auftritt', async () => {
      // Given (Arrange)
      const id = createId();
      mockRepository.findById.mockResolvedValue(Result.fail('Datenbankverbindung fehlgeschlagen'));

      const query = new GetQualifikationByIdQuery(id);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Datenbankverbindung fehlgeschlagen');
    });

    it('sollte fehlschlagen mit spezifischer Fehlermeldung bei unerwarteter Exception', async () => {
      // Given (Arrange)
      const id = createId();
      const error = new Error('Netzwerkfehler');
      mockRepository.findById.mockRejectedValue(error);

      const query = new GetQualifikationByIdQuery(id);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Fehler beim Laden der Qualifikation');
      expect(result.error).toContain('Netzwerkfehler');
    });

    it('sollte korrektes DTO mit allen Feldern zurückgeben', async () => {
      // Given (Arrange)
      const id = createId();
      const now = new Date();
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

      mockRepository.findById.mockResolvedValue(Result.ok(qualifikation));

      const query = new GetQualifikationByIdQuery(id);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).not.toBeNull();
      const dto = result.value!;
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

    it('sollte DTO mit optionalen Feldern als undefined zurückgeben wenn nicht gesetzt', async () => {
      // Given (Arrange)
      const id = createId();
      const qualifikation = Qualifikation.reconstitute({
        id,
        name: 'Helfer',
        abkuerzung: 'HEL',
        kategorie: 'SONSTIGES',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(qualifikation));

      const query = new GetQualifikationByIdQuery(id);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).not.toBeNull();
      const dto = result.value!;
      expect(dto.beschreibung).toBeUndefined();
      expect(dto.updatedBy).toBeUndefined();
    });

    it('sollte verschiedene Kategorien korrekt zurückgeben', async () => {
      // Given (Arrange)
      const kategorien: Array<'FUEHRUNG' | 'SANITAET' | 'BETREUUNG' | 'TECHNIK' | 'SONSTIGES'> = ['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES'];

      for (const kategorie of kategorien) {
        const id = createId();
        const qualifikation = Qualifikation.reconstitute({
          id,
          name: `Test ${kategorie}`,
          abkuerzung: kategorie.substring(0, 3),
          kategorie,
          istAktiv: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-123',
        }).value!;

        mockRepository.findById.mockResolvedValue(Result.ok(qualifikation));

        const query = new GetQualifikationByIdQuery(id);

        // When (Act)
        const result = await handler.execute(query);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value!.kategorie).toBe(kategorie);
      }
    });
  });
});
