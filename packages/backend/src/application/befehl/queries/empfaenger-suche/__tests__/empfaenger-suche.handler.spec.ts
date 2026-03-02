import { EmpfaengerSucheQueryHandler } from '../empfaenger-suche.handler';
import { EmpfaengerSucheQuery } from '../empfaenger-suche.query';
import { EmpfaengerQuelle } from '@/application/befehl/dto/empfaenger-suche-result.dto';

/**
 * Unit Tests fuer EmpfaengerSucheQueryHandler (Story 5.1).
 *
 * **Test Strategy:**
 * - Direct Instantiation Pattern mit PrismaService Mock
 * - Focus: Suchlogik, Prioritaet, Deduplizierung, Limit, quelle-Feld
 */
describe('EmpfaengerSucheQueryHandler', () => {
  let handler: EmpfaengerSucheQueryHandler;

  const mockPrisma = {
    einsatzPerson: { findMany: jest.fn() },
    einsatzFahrzeug: { findMany: jest.fn() },
    stammPerson: { findMany: jest.fn() },
    einsatzTeilnehmer: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: keine Teilnehmer-Verknuepfung (wird in spezifischen Tests ueberschrieben)
    mockPrisma.einsatzTeilnehmer.findMany.mockResolvedValue([]);
    // Default: keine Fahrzeuge
    mockPrisma.einsatzFahrzeug.findMany.mockResolvedValue([]);
    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    handler = new EmpfaengerSucheQueryHandler(mockPrisma as any);
  });

  describe('Happy Path', () => {
    it('sollte EinsatzPerson-Treffer zurueckgeben', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: 'ZF Meier', funktion: 'Zugführer', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0]).toMatchObject({
        id: 'ep-1',
        name: 'ZF Meier',
        rolle: 'Zugführer',
        quelle: EmpfaengerQuelle.EINSATZ,
      });
    });

    it('sollte name aus nachname und vorname bilden wenn funkrufname fehlt', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-2', vorname: 'Anna', nachname: 'Schmidt', funkrufname: null, funktion: 'Helferin', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Schmidt', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value![0].name).toBe('Schmidt, Anna');
    });

    it('sollte funktion als rolle mappen', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-3', vorname: 'Karl', nachname: 'Weber', funkrufname: null, funktion: 'Gruppenführer', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Weber', 'einsatz-1'));

      expect(result.value![0].rolle).toBe('Gruppenführer');
    });

    it('sollte EinsatzPerson-Qualifikation korrekt mappen (F2)', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([
        {
          id: 'ep-4',
          vorname: 'Lisa',
          nachname: 'Braun',
          funkrufname: null,
          funktion: 'Helferin',
          stammId: null,
          qualifikationen: [{ qualifikation: { name: 'Rettungssanitäter' } }],
        },
      ]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Braun', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].qualifikation).toBe('Rettungssanitäter');
      expect(result.value![0].quelle).toBe(EmpfaengerQuelle.EINSATZ);
    });
  });

  describe('StammPerson-Fallback', () => {
    it('sollte StammPerson als Fallback laden wenn wenige EinsatzPerson-Treffer', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: 'ZF Meier', funktion: 'Zugführer', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([
        {
          id: 'sp-1',
          vorname: 'Hans',
          nachname: 'Meier',
          qualifikationen: [{ qualifikation: { name: 'Notfallsanitäter' } }],
        },
      ]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value![0].quelle).toBe(EmpfaengerQuelle.EINSATZ);
      expect(result.value![1].quelle).toBe(EmpfaengerQuelle.STAMMDATEN);
      expect(result.value![1]).toEqual({
        id: 'sp-1',
        name: 'Meier, Hans',
        qualifikation: 'Notfallsanitäter',
        quelle: EmpfaengerQuelle.STAMMDATEN,
      });
    });

    it('sollte StammPerson ohne Qualifikation korrekt mappen', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([
        {
          id: 'sp-2',
          vorname: 'Lisa',
          nachname: 'Fischer',
          qualifikationen: [],
        },
      ]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Fischer', 'einsatz-1'));

      expect(result.value![0].qualifikation).toBeUndefined();
    });
  });

  describe('EinsatzFahrzeug-Suche', () => {
    it('sollte EinsatzFahrzeug-Treffer nach EinsatzPersonen liefern', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([]);
      mockPrisma.einsatzFahrzeug.findMany.mockResolvedValue([{ id: 'ef-1', funkrufname: 'Rotkreuz 83/1' }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('83/1', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0]).toEqual({
        id: 'ef-1',
        name: 'Rotkreuz 83/1',
        rolle: 'Fahrzeug',
        quelle: EmpfaengerQuelle.EINSATZ_FAHRZEUG,
      });
      expect(result.value![0].userId).toBeUndefined();
    });

    it('sollte Reihenfolge EINSATZ -> EINSATZ_FAHRZEUG -> STAMMDATEN einhalten', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: 'ZF Meier', funktion: 'Zugführer', stammId: null, qualifikationen: [] }]);
      mockPrisma.einsatzFahrzeug.findMany.mockResolvedValue([{ id: 'ef-1', funkrufname: 'Rotkreuz 83/1' }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([{ id: 'sp-1', vorname: 'Hans', nachname: 'Meier', qualifikationen: [] }]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.value![0].quelle).toBe(EmpfaengerQuelle.EINSATZ);
      expect(result.value![1].quelle).toBe(EmpfaengerQuelle.EINSATZ_FAHRZEUG);
      expect(result.value![2].quelle).toBe(EmpfaengerQuelle.STAMMDATEN);
    });

    it('sollte Fahrzeug-Suche mit einsatzId und funkrufname-contains ausfuehren', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([]);
      mockPrisma.einsatzFahrzeug.findMany.mockResolvedValue([]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      await handler.execute(new EmpfaengerSucheQuery('  RK 83  ', 'einsatz-1'));

      const fahrzeugCall = mockPrisma.einsatzFahrzeug.findMany.mock.calls[0][0];
      expect(fahrzeugCall.where.einsatzId).toBe('einsatz-1');
      expect(fahrzeugCall.where.funkrufname.contains).toBe('RK 83');
      expect(fahrzeugCall.where.funkrufname.mode).toBe('insensitive');
    });
  });

  describe('Deduplizierung', () => {
    it('sollte Person in beiden Quellen nur als EinsatzPerson zurueckgeben', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: null, funktion: 'Helfer', stammId: 'sp-1', qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.value).toHaveLength(1);
      expect(result.value![0].quelle).toBe(EmpfaengerQuelle.EINSATZ);

      // Verify stammPerson was queried with notIn filter
      const stammCall = mockPrisma.stammPerson.findMany.mock.calls[0][0];
      expect(stammCall.where.id).toEqual({ notIn: ['sp-1'] });
    });
  });

  describe('Leerzustand', () => {
    it('sollte leeres Array zurueckgeben wenn keine Treffer', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('xyz', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });
  });

  describe('Min-Laenge', () => {
    it('sollte leeres Array zurueckgeben bei zu kurzem Suchbegriff', async () => {
      const result = await handler.execute(new EmpfaengerSucheQuery('M', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(mockPrisma.einsatzPerson.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Max 20 Limit', () => {
    it('sollte maximal 20 Ergebnisse zurueckgeben', async () => {
      // 20 EinsatzPersonen -> keine StammPerson-Suche
      const twentyPersons = Array.from({ length: 20 }, (_, i) => ({
        id: `ep-${i}`,
        vorname: `Vorname${i}`,
        nachname: 'Meier',
        funkrufname: null,
        funktion: 'Helfer',
        stammId: null,
        qualifikationen: [],
      }));
      mockPrisma.einsatzPerson.findMany.mockResolvedValue(twentyPersons);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.value).toHaveLength(20);
      expect(mockPrisma.einsatzFahrzeug.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.stammPerson.findMany).not.toHaveBeenCalled();
    });

    it('sollte remaining-Slots korrekt auf Fahrzeug- und StammPerson-Query verteilen', async () => {
      // 17 EinsatzPersonen -> Fahrzeuge.take = 3; bei 1 Fahrzeug -> StammPerson.take = 2
      const seventeenPersons = Array.from({ length: 17 }, (_, i) => ({
        id: `ep-${i}`,
        vorname: `Vorname${i}`,
        nachname: 'Meier',
        funkrufname: null,
        funktion: 'Helfer',
        stammId: null,
        qualifikationen: [],
      }));
      mockPrisma.einsatzPerson.findMany.mockResolvedValue(seventeenPersons);
      mockPrisma.einsatzFahrzeug.findMany.mockResolvedValue([{ id: 'ef-1', funkrufname: 'Rotkreuz 83/1' }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      const fahrzeugCall = mockPrisma.einsatzFahrzeug.findMany.mock.calls[0][0];
      expect(fahrzeugCall.take).toBe(3);

      const stammCall = mockPrisma.stammPerson.findMany.mock.calls[0][0];
      expect(stammCall.take).toBe(2);
    });
  });

  describe('quelle-Feld', () => {
    it('sollte quelle EINSATZ fuer EinsatzPerson setzen', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: null, funktion: 'Helfer', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.value![0].quelle).toBe(EmpfaengerQuelle.EINSATZ);
    });

    it('sollte quelle STAMMDATEN fuer StammPerson setzen', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([{ id: 'sp-1', vorname: 'Hans', nachname: 'Meier', qualifikationen: [] }]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.value![0].quelle).toBe(EmpfaengerQuelle.STAMMDATEN);
    });
  });

  describe('EinsatzPerson-Prioritaet', () => {
    it('sollte EinsatzPerson-Treffer vor StammPerson-Treffer auflisten', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: 'ZF Meier', funktion: 'Zugführer', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([{ id: 'sp-1', vorname: 'Hans', nachname: 'Meier', qualifikationen: [] }]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.value![0].quelle).toBe(EmpfaengerQuelle.EINSATZ);
      expect(result.value![1].quelle).toBe(EmpfaengerQuelle.STAMMDATEN);
    });
  });

  describe('userId via EinsatzTeilnehmer', () => {
    it('sollte userId setzen wenn EinsatzTeilnehmer-Verknuepfung existiert', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: null, funktion: 'Helfer', stammId: null, qualifikationen: [] }]);
      mockPrisma.einsatzTeilnehmer.findMany.mockResolvedValue([{ einsatzPersonId: 'ep-1', userId: 'user-123' }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.value![0].userId).toBe('user-123');
    });

    it('sollte userId undefined lassen wenn kein EinsatzTeilnehmer existiert', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: null, funktion: 'Helfer', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.value![0].userId).toBeUndefined();
    });

    it('sollte nur aktive Teilnehmer abfragen (leftAt null)', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([{ id: 'ep-1', vorname: 'Max', nachname: 'Meier', funkrufname: null, funktion: 'Helfer', stammId: null, qualifikationen: [] }]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      const teilnehmerCall = mockPrisma.einsatzTeilnehmer.findMany.mock.calls[0][0];
      expect(teilnehmerCall.where.leftAt).toBeNull();
      expect(teilnehmerCall.where.einsatzId).toBe('einsatz-1');
    });
  });

  describe('Whitespace-Handling', () => {
    it('sollte leeres Array zurueckgeben bei nur-Whitespace Suchbegriff', async () => {
      const result = await handler.execute(new EmpfaengerSucheQuery('  ', 'einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(mockPrisma.einsatzPerson.findMany).not.toHaveBeenCalled();
    });

    it('sollte Suchbegriff trimmen vor Suche', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([]);
      mockPrisma.stammPerson.findMany.mockResolvedValue([]);

      await handler.execute(new EmpfaengerSucheQuery('  Meier  ', 'einsatz-1'));

      const epCall = mockPrisma.einsatzPerson.findMany.mock.calls[0][0];
      expect(epCall.where.OR[0].vorname.contains).toBe('Meier');
    });
  });

  describe('Prisma-Fehler', () => {
    it('sollte Result.fail zurueckgeben bei EinsatzPerson DB-Fehler', async () => {
      mockPrisma.einsatzPerson.findMany.mockRejectedValue(new Error('DB connection lost'));

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB connection lost');
    });

    it('sollte Result.fail zurueckgeben bei StammPerson DB-Fehler', async () => {
      mockPrisma.einsatzPerson.findMany.mockResolvedValue([]);
      mockPrisma.stammPerson.findMany.mockRejectedValue(new Error('timeout'));

      const result = await handler.execute(new EmpfaengerSucheQuery('Meier', 'einsatz-1'));

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('timeout');
    });
  });
});
