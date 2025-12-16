import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { GetFahrzeugtypByIdHandler } from '../get-fahrzeugtyp-by-id.handler';
import { GetFahrzeugtypByIdQuery } from '../get-fahrzeugtyp-by-id.query';

describe('GetFahrzeugtypByIdHandler', () => {
  let handler: GetFahrzeugtypByIdHandler;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    findAll: jest.Mock;
    exists: jest.Mock;
  };

  // Factory function für frische Instanzen
  const existingId = createId();

  const createExistingFahrzeugtyp = () =>
    Fahrzeugtyp.reconstitute({
      id: existingId,
      code: 'HLF',
      bezeichnung: 'Hilfeleistungslöschfahrzeug',
      kategorie: 'EINSATZ',
      istAktiv: true,
      sortOrder: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      createdBy: 'user-123',
    }).value!;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn().mockImplementation(() => Result.ok(createExistingFahrzeugtyp())),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetFahrzeugtypByIdHandler, { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockRepository }],
    }).compile();

    handler = module.get<GetFahrzeugtypByIdHandler>(GetFahrzeugtypByIdHandler);
  });

  describe('execute', () => {
    it('sollte Fahrzeugtyp erfolgreich nach ID laden', async () => {
      // Given (Arrange)
      const query = new GetFahrzeugtypByIdQuery(existingId);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.id).toBe(existingId);
      expect(result.value!.code).toBe('HLF');
      expect(result.value!.bezeichnung).toBe('Hilfeleistungslöschfahrzeug');
      expect(mockRepository.findById).toHaveBeenCalledWith(expect.anything());
    });

    it('sollte null zurückgeben wenn Fahrzeugtyp nicht gefunden wurde', async () => {
      // Given (Arrange)
      const nonExistentId = createId(); // Valides CUID-Format
      mockRepository.findById.mockResolvedValue(Result.ok(null));
      const query = new GetFahrzeugtypByIdQuery(nonExistentId);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('sollte fehlschlagen mit ungültiger ID-Format', async () => {
      // Given (Arrange)
      // Ungültiges CUID-Format - Handler validiert dies und gibt Result.fail zurück
      const query = new GetFahrzeugtypByIdQuery('invalid-id-format');

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid CUID format');
    });

    it('sollte fehlschlagen wenn Repository-Fehler auftritt', async () => {
      // Given (Arrange)
      mockRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));
      const query = new GetFahrzeugtypByIdQuery(existingId);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });

    it('sollte DTO mit allen erforderlichen Feldern zurückgeben', async () => {
      // Given (Arrange)
      const query = new GetFahrzeugtypByIdQuery(existingId);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value!;
      expect(dto.id).toBeDefined();
      expect(dto.code).toBeDefined();
      expect(dto.bezeichnung).toBeDefined();
      expect(dto.kategorie).toBeDefined();
      expect(dto.istAktiv).toBeDefined();
      expect(dto.sortOrder).toBeDefined();
      expect(dto.createdAt).toBeDefined();
      expect(dto.updatedAt).toBeDefined();
      expect(dto.createdBy).toBeDefined();
    });

    it('sollte DTO mit optionalen Feldern zurückgeben', async () => {
      // Given (Arrange)
      const fahrzeugTypMitAllenFeldern = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'ELW',
        bezeichnung: 'Einsatzleitwagen',
        kategorie: 'SPEZIAL',
        beschreibung: 'Für Einsatzleitung',
        sollbesatzung: { fahrer: 1, funktrupp: 2 },
        istAktiv: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
        updatedBy: 'user-456',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypMitAllenFeldern));
      const query = new GetFahrzeugtypByIdQuery(fahrzeugTypMitAllenFeldern.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value!;
      expect(dto.beschreibung).toBe('Für Einsatzleitung');
      expect(dto.sollbesatzung).toEqual({ fahrer: 1, funktrupp: 2 });
      expect(dto.updatedBy).toBe('user-456');
    });
  });

  describe('Edge Cases', () => {
    it('sollte inaktiven Fahrzeugtyp zurückgeben', async () => {
      // Given (Arrange)
      const inactiveFahrzeugtyp = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        istAktiv: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(inactiveFahrzeugtyp));
      const query = new GetFahrzeugtypByIdQuery(inactiveFahrzeugtyp.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.istAktiv).toBe(false);
    });

    it('sollte Fahrzeugtyp ohne Beschreibung zurückgeben', async () => {
      // Given (Arrange)
      const fahrzeugTypOhneBeschreibung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'SPEZIAL',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypOhneBeschreibung));
      const query = new GetFahrzeugtypByIdQuery(fahrzeugTypOhneBeschreibung.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBeUndefined();
    });

    it('sollte Fahrzeugtyp ohne Sollbesatzung zurückgeben', async () => {
      // Given (Arrange)
      const fahrzeugTypOhneSollbesatzung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'SPEZIAL',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypOhneSollbesatzung));
      const query = new GetFahrzeugtypByIdQuery(fahrzeugTypOhneSollbesatzung.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.sollbesatzung).toBeUndefined();
    });

    it('sollte Fahrzeugtyp ohne updatedBy zurückgeben', async () => {
      // Given (Arrange)
      const fahrzeugTypOhneUpdatedBy = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'SPEZIAL',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypOhneUpdatedBy));
      const query = new GetFahrzeugtypByIdQuery(fahrzeugTypOhneUpdatedBy.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.updatedBy).toBeUndefined();
    });

    it('sollte mit verschiedenen CUID-Formaten umgehen', async () => {
      // Given (Arrange)
      const validCuid = createId();
      const fahrzeugtyp = Fahrzeugtyp.reconstitute({
        id: validCuid,
        code: 'TEST',
        bezeichnung: 'Test Fahrzeug',
        kategorie: 'SPEZIAL',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugtyp));
      const query = new GetFahrzeugtypByIdQuery(validCuid);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.id).toBe(validCuid);
    });
  });

  describe('Kategorie Coverage', () => {
    it('sollte Fahrzeugtyp mit Kategorie LOESCHFAHRZEUG zurückgeben', async () => {
      // Given (Arrange)
      const loeschfahrzeug = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'EINSATZ',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(loeschfahrzeug));
      const query = new GetFahrzeugtypByIdQuery(loeschfahrzeug.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.kategorie).toBe('EINSATZ');
    });

    it('sollte Fahrzeugtyp mit Kategorie RETTUNGSFAHRZEUG zurückgeben', async () => {
      // Given (Arrange)
      const rettungsfahrzeug = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(rettungsfahrzeug));
      const query = new GetFahrzeugtypByIdQuery(rettungsfahrzeug.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.kategorie).toBe('TRANSPORT');
    });

    it('sollte Fahrzeugtyp mit Kategorie SONDERFAHRZEUG zurückgeben', async () => {
      // Given (Arrange)
      const sonderfahrzeug = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'ELW',
        bezeichnung: 'Einsatzleitwagen',
        kategorie: 'SPEZIAL',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(sonderfahrzeug));
      const query = new GetFahrzeugtypByIdQuery(sonderfahrzeug.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.kategorie).toBe('SPEZIAL');
    });
  });

  describe('Sollbesatzung Variants', () => {
    it('sollte Fahrzeugtyp mit vollständiger Sollbesatzung zurückgeben', async () => {
      // Given (Arrange)
      const fahrzeugTypMitVollstaendigerSollbesatzung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        sollbesatzung: {
          fahrer: 1,
          sanitaeter: 2,
          notarzt: 0,
          funktrupp: 0,
          helfer: 0,
        },
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypMitVollstaendigerSollbesatzung));
      const query = new GetFahrzeugtypByIdQuery(fahrzeugTypMitVollstaendigerSollbesatzung.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.sollbesatzung).toEqual({
        fahrer: 1,
        sanitaeter: 2,
        notarzt: 0,
        funktrupp: 0,
        helfer: 0,
      });
    });

    it('sollte Fahrzeugtyp mit partieller Sollbesatzung zurückgeben', async () => {
      // Given (Arrange)
      const fahrzeugTypMitPartiellerSollbesatzung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'NEF',
        bezeichnung: 'Notarzteinsatzfahrzeug',
        kategorie: 'TRANSPORT',
        sollbesatzung: { fahrer: 1, notarzt: 1 },
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypMitPartiellerSollbesatzung));
      const query = new GetFahrzeugtypByIdQuery(fahrzeugTypMitPartiellerSollbesatzung.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.sollbesatzung).toEqual({ fahrer: 1, notarzt: 1 });
    });
  });

  describe('Repository Error Handling', () => {
    it('sollte spezifischen Fehler vom Repository durchreichen', async () => {
      // Given (Arrange)
      mockRepository.findById.mockResolvedValue(Result.fail('Connection timeout'));
      const query = new GetFahrzeugtypByIdQuery(existingId);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('Performance', () => {
    it('sollte keine redundanten Repository-Aufrufe machen', async () => {
      // Given (Arrange)
      const query = new GetFahrzeugtypByIdQuery(existingId);

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('sollte nur eine DTO-Instanz erstellen', async () => {
      // Given (Arrange)
      const query = new GetFahrzeugtypByIdQuery(existingId);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('object');
    });
  });

  describe('Date Handling', () => {
    it('sollte Datumsfelder korrekt zurückgeben', async () => {
      // Given (Arrange)
      const specificDate = new Date('2025-06-15T10:30:00Z');
      const fahrzeugTypMitSpezifischenDaten = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'TEST',
        bezeichnung: 'Test Fahrzeug',
        kategorie: 'SPEZIAL',
        istAktiv: true,
        sortOrder: 0,
        createdAt: specificDate,
        updatedAt: specificDate,
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypMitSpezifischenDaten));
      const query = new GetFahrzeugtypByIdQuery(fahrzeugTypMitSpezifischenDaten.id.value);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.createdAt).toEqual(specificDate);
      expect(result.value!.updatedAt).toEqual(specificDate);
    });
  });
});
