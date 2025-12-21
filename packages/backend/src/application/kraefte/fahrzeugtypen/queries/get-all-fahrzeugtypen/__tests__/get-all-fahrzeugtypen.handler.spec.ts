import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { GetAllFahrzeugtypenHandler } from '../get-all-fahrzeugtypen.handler';
import { GetAllFahrzeugtypenQuery } from '../get-all-fahrzeugtypen.query';

describe('GetAllFahrzeugtypenHandler', () => {
  let handler: GetAllFahrzeugtypenHandler;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    findAll: jest.Mock;
    exists: jest.Mock;
  };

  const fahrzeugtyp1 = Fahrzeugtyp.reconstitute({
    id: createId(),
    code: 'HLF',
    bezeichnung: 'Hilfeleistungslöschfahrzeug',
    kategorie: 'RETTUNGSDIENST',
    istAktiv: true,
    sortOrder: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'user-123',
  }).value!;

  const fahrzeugtyp2 = Fahrzeugtyp.reconstitute({
    id: createId(),
    code: 'RTW',
    bezeichnung: 'Rettungswagen',
    kategorie: 'TRANSPORT',
    istAktiv: true,
    sortOrder: 1,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
    createdBy: 'user-123',
  }).value!;

  const fahrzeugtyp3 = Fahrzeugtyp.reconstitute({
    id: createId(),
    code: 'NEF',
    bezeichnung: 'Notarzteinsatzfahrzeug',
    kategorie: 'TRANSPORT',
    istAktiv: false,
    sortOrder: 2,
    createdAt: new Date('2025-01-03'),
    updatedAt: new Date('2025-01-03'),
    createdBy: 'user-123',
  }).value!;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn().mockResolvedValue(Result.ok([fahrzeugtyp1, fahrzeugtyp2, fahrzeugtyp3])),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetAllFahrzeugtypenHandler, { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockRepository }],
    }).compile();

    handler = module.get<GetAllFahrzeugtypenHandler>(GetAllFahrzeugtypenHandler);
  });

  describe('execute', () => {
    it('sollte alle Fahrzeugtypen zurückgeben ohne Filter', async () => {
      // Given (Arrange)
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value!.length).toBe(3);
      expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('sollte nur aktive Fahrzeugtypen zurückgeben mit istAktiv=true Filter', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.ok([fahrzeugtyp1, fahrzeugtyp2]));
      const query = new GetAllFahrzeugtypenQuery(true);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.length).toBe(2);
      expect(result.value![0].istAktiv).toBe(true);
      expect(result.value![1].istAktiv).toBe(true);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ istAktiv: true });
    });

    it('sollte nur inaktive Fahrzeugtypen zurückgeben mit istAktiv=false Filter', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.ok([fahrzeugtyp3]));
      const query = new GetAllFahrzeugtypenQuery(false);

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.length).toBe(1);
      expect(result.value![0].istAktiv).toBe(false);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ istAktiv: false });
    });

    it('sollte leeres Array zurückgeben wenn keine Fahrzeugtypen existieren', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.ok([]));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value!.length).toBe(0);
    });

    it('sollte fehlschlagen wenn Repository-Fehler auftritt', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.fail('Datenbankfehler'));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });

    it('sollte DTOs mit allen erforderlichen Feldern zurückgeben', async () => {
      // Given (Arrange)
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();

      const dto = result.value![0];
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

    it('sollte DTOs mit optionalen Feldern zurückgeben', async () => {
      // Given (Arrange)
      const fahrzeugTypMitAllenFeldern = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'ELW',
        bezeichnung: 'Einsatzleitwagen',
        kategorie: 'FUEHRUNG',
        beschreibung: 'Für Einsatzleitung',
        sollbesatzung: { fahrer: 1, funktrupp: 2 },
        istAktiv: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
        updatedBy: 'user-456',
      }).value!;
      mockRepository.findAll.mockResolvedValue(Result.ok([fahrzeugTypMitAllenFeldern]));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value![0];
      expect(dto.beschreibung).toBe('Für Einsatzleitung');
      expect(dto.sollbesatzung).toEqual({ fahrer: 1, funktrupp: 2 });
      expect(dto.updatedBy).toBe('user-456');
    });
  });

  describe('Sorting', () => {
    it('sollte Fahrzeugtypen sortiert nach sortOrder und code zurückgeben', async () => {
      // Given (Arrange)
      // Repository gibt bereits sortierte Daten zurück (wie in der Implementierung)
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value![0].code).toBe('HLF');
      expect(result.value![1].code).toBe('RTW');
      expect(result.value![2].code).toBe('NEF');
      expect(result.value![0].sortOrder).toBe(0);
      expect(result.value![1].sortOrder).toBe(1);
      expect(result.value![2].sortOrder).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit Fahrzeugtypen ohne Beschreibung umgehen', async () => {
      // Given (Arrange)
      const fahrzeugTypOhneBeschreibung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findAll.mockResolvedValue(Result.ok([fahrzeugTypOhneBeschreibung]));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value![0].beschreibung).toBeUndefined();
    });

    it('sollte mit Fahrzeugtypen ohne Sollbesatzung umgehen', async () => {
      // Given (Arrange)
      const fahrzeugTypOhneSollbesatzung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findAll.mockResolvedValue(Result.ok([fahrzeugTypOhneSollbesatzung]));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value![0].sollbesatzung).toBeUndefined();
    });

    it('sollte mit Fahrzeugtypen ohne updatedBy umgehen', async () => {
      // Given (Arrange)
      const fahrzeugTypOhneUpdatedBy = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'MTW',
        bezeichnung: 'Mannschaftstransportwagen',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findAll.mockResolvedValue(Result.ok([fahrzeugTypOhneUpdatedBy]));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value![0].updatedBy).toBeUndefined();
    });

    it('sollte mit großer Anzahl von Fahrzeugtypen umgehen', async () => {
      // Given (Arrange)
      const largeFahrzeugtypList = Array.from(
        { length: 100 },
        (_, i) =>
          Fahrzeugtyp.reconstitute({
            id: createId(),
            code: `FZ${i}`,
            bezeichnung: `Fahrzeug ${i}`,
            kategorie: 'FUEHRUNG',
            istAktiv: true,
            sortOrder: i,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'user-123',
          }).value!,
      );
      mockRepository.findAll.mockResolvedValue(Result.ok(largeFahrzeugtypList));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.length).toBe(100);
    });
  });

  describe('Kategorie Coverage', () => {
    it('sollte Fahrzeugtypen aller Kategorien zurückgeben', async () => {
      // Given (Arrange)
      const loeschfahrzeug = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'RETTUNGSDIENST',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      const rettungsfahrzeug = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        istAktiv: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      const sonderfahrzeug = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'ELW',
        bezeichnung: 'Einsatzleitwagen',
        kategorie: 'FUEHRUNG',
        istAktiv: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;

      mockRepository.findAll.mockResolvedValue(Result.ok([loeschfahrzeug, rettungsfahrzeug, sonderfahrzeug]));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.length).toBe(3);
      expect(result.value![0].kategorie).toBe('RETTUNGSDIENST');
      expect(result.value![1].kategorie).toBe('TRANSPORT');
      expect(result.value![2].kategorie).toBe('FUEHRUNG');
    });
  });

  describe('Repository Error Handling', () => {
    it('sollte spezifischen Fehler vom Repository durchreichen', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.fail('Connection timeout'));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Connection timeout');
    });

    it('sollte mit null-Wert vom Repository umgehen', async () => {
      // Given (Arrange)
      mockRepository.findAll.mockResolvedValue(Result.ok(null));
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('sollte keine redundanten Repository-Aufrufe machen', async () => {
      // Given (Arrange)
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('sollte DTO-Mapping für jedes Fahrzeugtyp ausführen', async () => {
      // Given (Arrange)
      const query = new GetAllFahrzeugtypenQuery();

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.length).toBe(3);
      // Alle DTOs sollten mapped sein
      for (const dto of result.value!) {
        expect(dto.id).toBeDefined();
        expect(dto.code).toBeDefined();
        expect(dto.bezeichnung).toBeDefined();
      }
    });
  });
});
