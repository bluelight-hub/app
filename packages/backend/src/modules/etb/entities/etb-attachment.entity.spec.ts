import { EtbAttachment } from './etb-attachment.entity';
import { EtbEntry } from './etb-entry.entity';

describe('EtbAttachment Entity', () => {
    let etbAttachment: EtbAttachment;

    beforeEach(() => {
        etbAttachment = new EtbAttachment();
    });

    it('should be defined', () => {
        expect(etbAttachment).toBeDefined();
    });

    it('should allow setting and getting all properties', () => {
        // Erstelle einen zugehörigen ETB-Eintrag
        const etbEntry = new EtbEntry();
        etbEntry.id = 'entry-test-id-123';

        // Setze alle Eigenschaften
        etbAttachment.id = 'attachment-test-id-123';
        etbAttachment.etbEntryId = 'entry-test-id-123';
        etbAttachment.etbEntry = etbEntry;
        etbAttachment.dateiname = 'testdatei.pdf';
        etbAttachment.dateityp = 'application/pdf';
        etbAttachment.speicherOrt = '/storage/uploads/testdatei.pdf';
        etbAttachment.beschreibung = 'Eine Testdatei für die Einheit';

        // Überprüfe alle Eigenschaften
        expect(etbAttachment.id).toBe('attachment-test-id-123');
        expect(etbAttachment.etbEntryId).toBe('entry-test-id-123');
        expect(etbAttachment.etbEntry).toBe(etbEntry);
        expect(etbAttachment.dateiname).toBe('testdatei.pdf');
        expect(etbAttachment.dateityp).toBe('application/pdf');
        expect(etbAttachment.speicherOrt).toBe('/storage/uploads/testdatei.pdf');
        expect(etbAttachment.beschreibung).toBe('Eine Testdatei für die Einheit');
    });

    it('should handle optional properties correctly', () => {
        // Setze nur die erforderlichen Eigenschaften
        etbAttachment.id = 'attachment-test-id-123';
        etbAttachment.etbEntryId = 'entry-test-id-123';
        etbAttachment.dateiname = 'testdatei.pdf';
        etbAttachment.dateityp = 'application/pdf';
        etbAttachment.speicherOrt = '/storage/uploads/testdatei.pdf';

        // Überprüfe, dass optionale Eigenschaften undefined sind
        expect(etbAttachment.etbEntry).toBeUndefined();
        expect(etbAttachment.beschreibung).toBeUndefined();

        // Setze optionale Eigenschaften
        etbAttachment.beschreibung = 'Optionale Beschreibung';
        expect(etbAttachment.beschreibung).toBe('Optionale Beschreibung');
    });

    it('should maintain relationship with EtbEntry', () => {
        // Erstelle einen ETB-Eintrag mit Anlagen
        const etbEntry = new EtbEntry();
        etbEntry.id = 'entry-test-id-123';
        etbEntry.anlagen = [];

        // Verknüpfe die Anlage mit dem Eintrag
        etbAttachment.etbEntryId = etbEntry.id;
        etbAttachment.etbEntry = etbEntry;
        etbEntry.anlagen.push(etbAttachment);

        // Überprüfe die Beziehung in beide Richtungen
        expect(etbAttachment.etbEntry).toBe(etbEntry);
        expect(etbEntry.anlagen).toContain(etbAttachment);
        expect(etbEntry.anlagen.length).toBe(1);
    });
}); 