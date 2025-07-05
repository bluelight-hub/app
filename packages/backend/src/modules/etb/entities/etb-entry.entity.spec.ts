import { EtbKategorie } from '../dto/etb-kategorie.enum';
import { EtbAttachment } from './etb-attachment.entity';
import { EtbEntry, EtbEntryStatus } from './etb-entry.entity';

describe('EtbEntry Entity', () => {
  // Testdaten für ETB-Eintrag
  const mockDate = new Date();
  const testEtbEntry = {
    id: 'test-id-123',
    laufendeNummer: 1,
    timestampErstellung: mockDate,
    timestampEreignis: mockDate,
    autorId: 'user-123',
    autorName: 'Test User',
    autorRolle: 'Admin',
    kategorie: EtbKategorie.MELDUNG,
    inhalt: 'Dies ist ein Testeintrag',
    referenzEinsatzId: 'einsatz-123',
    referenzPatientId: 'patient-123',
    referenzEinsatzmittelId: 'einsatzmittel-123',
    systemQuelle: 'System A',
    version: 1,
    status: EtbEntryStatus.AKTIV,
    istAbgeschlossen: false,
    timestampAbschluss: null,
    abgeschlossenVon: null,
    ueberschriebenDurch: null,
    ueberschriebenDurchId: null,
    ueberschriebeneEintraege: [],
    timestampUeberschrieben: null,
    ueberschriebenVon: null,
    anlagen: [],
    sender: 'Sender A',
    receiver: 'Receiver B',
  };

  // Mock für Prisma-Objekt (simuliertes Prisma-Ergebnis)
  const mockPrismaObject = {
    id: 'test-id-123',
    laufendeNummer: 1,
    timestampErstellung: mockDate,
    timestampEreignis: mockDate,
    autorId: 'user-123',
    autorName: 'Test User',
    autorRolle: 'Admin',
    kategorie: 'MELDUNG',
    inhalt: 'Dies ist ein Testeintrag',
    referenzEinsatzId: 'einsatz-123',
    referenzPatientId: 'patient-123',
    referenzEinsatzmittelId: 'einsatzmittel-123',
    systemQuelle: 'System A',
    version: 1,
    status: 'AKTIV',
    istAbgeschlossen: false,
    timestampAbschluss: null,
    abgeschlossenVon: null,
    ueberschriebenDurchId: null,
    timestampUeberschrieben: null,
    ueberschriebenVon: null,
    sender: 'Sender A',
    receiver: 'Receiver B',
    ueberschriebenDurch: null,
    ueberschriebeneEintraege: [],
    anlagen: [],
  };

  describe('constructor', () => {
    it('sollte eine EtbEntry-Instanz mit den angegebenen Eigenschaften erstellen', () => {
      const entry = new EtbEntry(testEtbEntry);

      // Überprüfe, ob alle Eigenschaften korrekt gesetzt wurden
      expect(entry.id).toBe(testEtbEntry.id);
      expect(entry.laufendeNummer).toBe(testEtbEntry.laufendeNummer);
      expect(entry.timestampErstellung).toBe(testEtbEntry.timestampErstellung);
      expect(entry.kategorie).toBe(testEtbEntry.kategorie);
      expect(entry.inhalt).toBe(testEtbEntry.inhalt);
      expect(entry.status).toBe(testEtbEntry.status);
      expect(entry.anlagen).toEqual([]);
    });

    it('sollte eine EtbEntry-Instanz mit Teilinformationen erstellen', () => {
      const partialEntry = new EtbEntry({
        id: 'test-id-456',
        laufendeNummer: 2,
        timestampErstellung: mockDate,
        timestampEreignis: mockDate,
        autorId: 'user-456',
        kategorie: EtbKategorie.MELDUNG,
        inhalt: 'Minimaler Eintrag',
        version: 1,
        status: EtbEntryStatus.AKTIV,
        istAbgeschlossen: false,
      });

      expect(partialEntry.id).toBe('test-id-456');
      expect(partialEntry.autorName).toBeUndefined();
      expect(partialEntry.kategorie).toBe(EtbKategorie.MELDUNG);
      expect(partialEntry.status).toBe(EtbEntryStatus.AKTIV);
    });
  });

  describe('toPrisma', () => {
    it('sollte ein Prisma-kompatibles Objekt korrekt zurückgeben', () => {
      const entry = new EtbEntry(testEtbEntry);
      const prismaObject = entry.toPrisma();

      // Überprüfe Konvertierung in Prisma-Format
      expect(prismaObject.id).toBe(entry.id);
      expect(prismaObject.laufendeNummer).toBe(entry.laufendeNummer);
      expect(prismaObject.kategorie).toBe(entry.kategorie);
      expect(prismaObject.status).toBe(entry.status);
      expect(prismaObject.timestampErstellung).toBe(entry.timestampErstellung);

      // Spezielle Prüfung: Kategorie und Status wurden als unknown gecastet
      expect(typeof prismaObject.kategorie).toBe('string');
      expect(typeof prismaObject.status).toBe('string');
    });

    it('sollte null-Werte korrekt in das Prisma-Objekt übertragen', () => {
      const entry = new EtbEntry({
        ...testEtbEntry,
        autorName: null,
        referenzEinsatzId: null,
        ueberschriebenDurchId: null,
      });

      const prismaObject = entry.toPrisma();

      expect(prismaObject.autorName).toBeNull();
      expect(prismaObject.referenzEinsatzId).toBeNull();
      expect(prismaObject.ueberschriebenDurchId).toBeNull();
    });
  });

  describe('fromPrisma', () => {
    it('sollte eine korrekte EtbEntry-Instanz aus einem Prisma-Objekt erstellen', () => {
      const entry = EtbEntry.fromPrisma(mockPrismaObject);

      expect(entry).toBeInstanceOf(EtbEntry);
      expect(entry.id).toBe(mockPrismaObject.id);
      expect(entry.laufendeNummer).toBe(mockPrismaObject.laufendeNummer);
      expect(entry.kategorie).toBe(EtbKategorie.MELDUNG);
      expect(entry.status).toBe(EtbEntryStatus.AKTIV);
      expect(entry.ueberschriebenDurch).toBeNull();
      expect(entry.ueberschriebeneEintraege).toEqual([]);
      expect(entry.anlagen).toEqual([]);
    });

    it('sollte verschachtelte Beziehungen korrekt verarbeiten', () => {
      // Mock für verschachtelte Objekte
      const nestedMockPrismaObject = {
        ...mockPrismaObject,
        ueberschriebenDurch: {
          ...mockPrismaObject,
          id: 'nested-id',
          inhalt: 'Nested entry',
        },
        ueberschriebeneEintraege: [
          { ...mockPrismaObject, id: 'overwritten-1', inhalt: 'Overwritten entry 1' },
        ],
        anlagen: [
          {
            id: 'attachment-1',
            etbEntryId: 'test-id-123',
            dateiname: 'test.pdf',
            dateityp: 'application/pdf',
            speicherOrt: '/storage/test.pdf',
            beschreibung: 'Test PDF',
          },
        ],
      };

      const entry = EtbEntry.fromPrisma(nestedMockPrismaObject);

      // Prüfe verschachtelte Objekte
      expect(entry.ueberschriebenDurch).toBeInstanceOf(EtbEntry);
      expect(entry.ueberschriebenDurch?.id).toBe('nested-id');
      expect(entry.ueberschriebenDurch?.inhalt).toBe('Nested entry');

      expect(entry.ueberschriebeneEintraege.length).toBe(1);
      expect(entry.ueberschriebeneEintraege[0]).toBeInstanceOf(EtbEntry);
      expect(entry.ueberschriebeneEintraege[0].id).toBe('overwritten-1');

      expect(entry.anlagen.length).toBe(1);
      expect(entry.anlagen[0]).toBeInstanceOf(EtbAttachment);
      expect(entry.anlagen[0].id).toBe('attachment-1');
      expect(entry.anlagen[0].dateiname).toBe('test.pdf');
    });

    it('sollte mit undefined/null-Werten umgehen können', () => {
      const mockWithNulls = {
        ...mockPrismaObject,
        ueberschriebenDurch: null,
        ueberschriebeneEintraege: null,
        anlagen: null,
      };

      const entry = EtbEntry.fromPrisma(mockWithNulls);

      expect(entry.ueberschriebenDurch).toBeNull();
      expect(entry.ueberschriebeneEintraege).toEqual([]);
      expect(entry.anlagen).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('sollte mit unterschiedlichen Status-Enum-Werten umgehen können', () => {
      const entryAktiv = new EtbEntry({ ...testEtbEntry, status: EtbEntryStatus.AKTIV });
      const entryUeberschrieben = new EtbEntry({
        ...testEtbEntry,
        status: EtbEntryStatus.UEBERSCHRIEBEN,
      });

      expect(entryAktiv.status).toBe(EtbEntryStatus.AKTIV);
      expect(entryUeberschrieben.status).toBe(EtbEntryStatus.UEBERSCHRIEBEN);

      // Prüfung der Konvertierung
      expect(entryAktiv.toPrisma().status).toBe(EtbEntryStatus.AKTIV);
      expect(entryUeberschrieben.toPrisma().status).toBe(EtbEntryStatus.UEBERSCHRIEBEN);
    });

    it('sollte mit unterschiedlichen Kategorie-Enum-Werten umgehen können', () => {
      // Teste alle Enum-Werte
      const kategorien = Object.values(EtbKategorie);

      kategorien.forEach((kategorie) => {
        const entry = new EtbEntry({ ...testEtbEntry, kategorie });
        expect(entry.kategorie).toBe(kategorie);

        // Prüfung der Konvertierung
        expect(entry.toPrisma().kategorie).toBe(kategorie);
      });
    });

    it('sollte rekursive Strukturen korrekt verarbeiten', () => {
      // Erstelle verschachtelte Struktur (ein Eintrag, der auf einen anderen verweist)
      const entryA = new EtbEntry({
        ...testEtbEntry,
        id: 'entry-A',
        inhalt: 'Entry A',
      });

      const entryB = new EtbEntry({
        ...testEtbEntry,
        id: 'entry-B',
        inhalt: 'Entry B',
        ueberschriebenDurch: entryA,
        ueberschriebenDurchId: 'entry-A',
      });

      // Füge rekursiven Verweis hinzu
      entryA.ueberschriebeneEintraege = [entryB];

      // Teste Konvertierung zu Prisma
      const prismaA = entryA.toPrisma();
      expect(prismaA.id).toBe('entry-A');
      expect(prismaA.ueberschriebenDurchId).toBeNull(); // Sollte null sein, nicht rekursiv

      // Teste fromPrisma mit rekursiven Mock-Daten
      const recursiveMock = {
        ...mockPrismaObject,
        id: 'parent',
        ueberschriebeneEintraege: [
          {
            ...mockPrismaObject,
            id: 'child',
            ueberschriebenDurch: { id: 'parent' }, // Zirkulärer Verweis
          },
        ],
      };

      // Dieser Test sollte keine Endlosschleife verursachen
      const result = EtbEntry.fromPrisma(recursiveMock);
      expect(result.id).toBe('parent');
      expect(result.ueberschriebeneEintraege.length).toBe(1);
      expect(result.ueberschriebeneEintraege[0].id).toBe('child');
      expect(result.ueberschriebeneEintraege[0].ueberschriebenDurch).toBeDefined();
    });
  });
});
