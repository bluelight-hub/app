import { EtbEntry, EtbEntryStatus } from './etb-entry.entity';

describe('EtbEntry Entity', () => {
    let etbEntry: EtbEntry;

    beforeEach(() => {
        etbEntry = new EtbEntry();
    });

    it('should have default values when created', () => {
        // Überprüfe die Standardwerte
        expect(etbEntry.version).toBeUndefined(); // Standardwert wird von TypeORM gesetzt
        expect(etbEntry.status).toBeUndefined(); // Standardwert wird von TypeORM gesetzt 
        expect(etbEntry.istAbgeschlossen).toBeUndefined(); // Standardwert wird von TypeORM gesetzt
    });

    it('should allow setting and getting all properties', () => {
        // Alle Eigenschaften setzen
        const now = new Date();
        const ueberEntry = new EtbEntry();

        etbEntry.id = 'test-id-123';
        etbEntry.laufendeNummer = 42;
        etbEntry.timestampErstellung = now;
        etbEntry.timestampEreignis = now;
        etbEntry.autorId = 'author-id-123';
        etbEntry.autorName = 'Max Mustermann';
        etbEntry.autorRolle = 'Einsatzleiter';
        etbEntry.kategorie = 'Meldung';
        etbEntry.titel = 'Wichtiger Eintrag';
        etbEntry.beschreibung = 'Detaillierte Beschreibung des Ereignisses';
        etbEntry.referenzEinsatzId = 'einsatz-id-123';
        etbEntry.referenzPatientId = 'patient-id-123';
        etbEntry.referenzEinsatzmittelId = 'einsatzmittel-id-123';
        etbEntry.systemQuelle = 'Test-System';
        etbEntry.version = 2;
        etbEntry.status = EtbEntryStatus.UEBERSCHRIEBEN;
        etbEntry.istAbgeschlossen = true;
        etbEntry.timestampAbschluss = now;
        etbEntry.abgeschlossenVon = 'abschluss-id-123';
        etbEntry.ueberschriebenDurch = ueberEntry;
        etbEntry.ueberschriebeneEintraege = [new EtbEntry()];
        etbEntry.timestampUeberschrieben = now;
        etbEntry.ueberschriebenVon = 'ueberschrieben-id-123';
        etbEntry.anlagen = [];

        // Alle Eigenschaften überprüfen
        expect(etbEntry.id).toBe('test-id-123');
        expect(etbEntry.laufendeNummer).toBe(42);
        expect(etbEntry.timestampErstellung).toBe(now);
        expect(etbEntry.timestampEreignis).toBe(now);
        expect(etbEntry.autorId).toBe('author-id-123');
        expect(etbEntry.autorName).toBe('Max Mustermann');
        expect(etbEntry.autorRolle).toBe('Einsatzleiter');
        expect(etbEntry.kategorie).toBe('Meldung');
        expect(etbEntry.titel).toBe('Wichtiger Eintrag');
        expect(etbEntry.beschreibung).toBe('Detaillierte Beschreibung des Ereignisses');
        expect(etbEntry.referenzEinsatzId).toBe('einsatz-id-123');
        expect(etbEntry.referenzPatientId).toBe('patient-id-123');
        expect(etbEntry.referenzEinsatzmittelId).toBe('einsatzmittel-id-123');
        expect(etbEntry.systemQuelle).toBe('Test-System');
        expect(etbEntry.version).toBe(2);
        expect(etbEntry.status).toBe(EtbEntryStatus.UEBERSCHRIEBEN);
        expect(etbEntry.istAbgeschlossen).toBe(true);
        expect(etbEntry.timestampAbschluss).toBe(now);
        expect(etbEntry.abgeschlossenVon).toBe('abschluss-id-123');
        expect(etbEntry.ueberschriebenDurch).toBe(ueberEntry);
        expect(etbEntry.ueberschriebeneEintraege.length).toBe(1);
        expect(etbEntry.timestampUeberschrieben).toBe(now);
        expect(etbEntry.ueberschriebenVon).toBe('ueberschrieben-id-123');
        expect(etbEntry.anlagen).toEqual([]);
    });

    it('should correctly check EtbEntryStatus enum values', () => {
        expect(EtbEntryStatus.AKTIV).toBe('aktiv');
        expect(EtbEntryStatus.UEBERSCHRIEBEN).toBe('ueberschrieben');

        // Teste die Zuweisung von Status
        etbEntry.status = EtbEntryStatus.AKTIV;
        expect(etbEntry.status).toBe(EtbEntryStatus.AKTIV);

        etbEntry.status = EtbEntryStatus.UEBERSCHRIEBEN;
        expect(etbEntry.status).toBe(EtbEntryStatus.UEBERSCHRIEBEN);
    });
}); 