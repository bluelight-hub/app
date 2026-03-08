// @ts-nocheck
import { CsvExportService } from '../csv-export.service';
import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { RohdatenExportItem } from '@domain/repositories/rohdaten-export';

describe('CsvExportService', () => {
  let service: CsvExportService;

  /** Helper: Erstellt ein valides ErinnerungExportItem */
  function createMockItem(overrides: Partial<ErinnerungExportItem> = {}): ErinnerungExportItem {
    return {
      id: 'clw3h8x9y000108l6daaaaaaa',
      titel: 'Lagebesprechung',
      beschreibung: 'Taktische Lagebesprechung durchfuehren',
      status: 'AUSGELOEST',
      erstelltVonName: 'Max Mueller',
      assignedToName: 'Anna Schmidt',
      kategorieName: 'Fuehrung',
      faelligAm: new Date('2026-02-08T14:00:00Z'),
      ausgeloestAm: new Date('2026-02-08T14:00:00Z'),
      acknowledgedAm: new Date('2026-02-08T14:02:00Z'),
      erledigtAm: null,
      eskaliertAm: null,
      wurdeEskaliert: false,
      snoozeCount: 0,
      createdAt: new Date('2026-02-08T13:30:00Z'),
      ...overrides,
    };
  }

  beforeEach(() => {
    service = new CsvExportService();
  });

  it('should generate CSV with correct headers', () => {
    // Given
    const items = [createMockItem()];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - BOM entfernen, erste Zeile pruefen
    const csvWithoutBom = csv.replace(/^\uFEFF/, '');
    const headerLine = csvWithoutBom.split('\r\n')[0];
    const expectedHeaders = ['ID', 'Titel', 'Status', 'Ersteller', 'Zugewiesener', 'FaelligAm', 'AusgeloestAm', 'AcknowledgedAm', 'ErledigtAm', 'Kategorie', 'Eskaliert', 'Snooze-Anzahl'];
    const actualHeaders = headerLine.split(';');
    expect(actualHeaders).toEqual(expectedHeaders);
    expect(actualHeaders).toHaveLength(12);
  });

  it('should format dates in German format (dd.MM.yyyy HH:mm)', () => {
    // Given
    const items = [
      createMockItem({
        faelligAm: new Date('2026-06-15T10:30:00Z'),
        ausgeloestAm: new Date('2026-06-15T10:30:00Z'),
      }),
    ];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - Datumsformat dd.MM.yyyy HH:mm pruefen
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    const dataLine = lines[1];
    // Das Datum muss im Format dd.MM.yyyy HH:mm vorliegen
    expect(dataLine).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
  });

  it('should handle null dates as empty strings', () => {
    // Given
    const items = [
      createMockItem({
        ausgeloestAm: null,
        acknowledgedAm: null,
        erledigtAm: null,
        eskaliertAm: null,
      }),
    ];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - Null-Dates ergeben leere Felder (aufeinander folgende Separatoren)
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    const dataLine = lines[1];
    const fields = dataLine.split(';');

    // AusgeloestAm (Index 6), AcknowledgedAm (Index 7), ErledigtAm (Index 8) sollten leer sein
    expect(fields[6]).toBe('');
    expect(fields[7]).toBe('');
    expect(fields[8]).toBe('');
  });

  it('should escape fields containing semicolons', () => {
    // Given
    const items = [
      createMockItem({
        titel: 'Wasser; Strom pruefen',
      }),
    ];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - Feld mit Semikolon muss in Anfuehrungszeichen stehen
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    const dataLine = lines[1];
    expect(dataLine).toContain('"Wasser; Strom pruefen"');
  });

  it('should escape fields containing newlines', () => {
    // Given
    const items = [
      createMockItem({
        titel: 'Zeile1\nZeile2',
      }),
    ];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - Feld mit Newline muss in Anfuehrungszeichen stehen
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    const dataLine = lines[1];
    expect(dataLine).toContain('"Zeile1\nZeile2"');
  });

  it('should escape fields containing double quotes', () => {
    // Given
    const items = [
      createMockItem({
        titel: 'Sogenannte "Lage"',
      }),
    ];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - Anfuehrungszeichen muessen als "" escaped und Feld in Anfuehrungszeichen gewrappt werden
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    const dataLine = lines[1];
    expect(dataLine).toContain('"Sogenannte ""Lage"""');
  });

  it('should render eskaliert as Ja/Nein', () => {
    // Given
    const escalated = createMockItem({ wurdeEskaliert: true });
    const notEscalated = createMockItem({ wurdeEskaliert: false, id: 'clw3h8x9y000108l6dbbbbbbbb' });

    // When
    const buffer = service.generateExport([escalated, notEscalated]);
    const csv = buffer.toString('utf-8');

    // Then
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    const firstDataLine = lines[1];
    const secondDataLine = lines[2];

    // Eskaliert ist Index 10 (0-basiert)
    const firstFields = firstDataLine.split(';');
    const secondFields = secondDataLine.split(';');
    expect(firstFields[10]).toBe('Ja');
    expect(secondFields[10]).toBe('Nein');
  });

  it('should handle empty erinnerungen list', () => {
    // Given
    const items: ErinnerungExportItem[] = [];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - Nur Header-Zeile (+ BOM + trailing CRLF)
    const csvWithoutBom = csv.replace(/^\uFEFF/, '');
    const lines = csvWithoutBom.split('\r\n').filter((line) => line.length > 0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('ID');
  });

  it('should include BOM for Excel compatibility', () => {
    // Given
    const items = [createMockItem()];

    // When
    const buffer = service.generateExport(items);
    const csv = buffer.toString('utf-8');

    // Then - UTF-8 BOM (Byte Order Mark) am Anfang
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  describe('generateRawExport (Story 9.10)', () => {
    function createRawMockItem(overrides: Partial<RohdatenExportItem> = {}): RohdatenExportItem {
      return {
        id: 'clw3h8x9y000108l6daaaaaaa',
        titel: 'Lagebesprechung',
        beschreibung: 'Taktische Lagebesprechung durchfuehren',
        status: 'ERLEDIGT',
        kategorieName: 'Fuehrung',
        erstelltVonName: 'Max Mueller',
        createdAt: new Date('2026-02-08T13:30:00Z'),
        faelligAm: new Date('2026-02-08T14:00:00Z'),
        ausgeloestAm: new Date('2026-02-08T14:00:00Z'),
        acknowledgedAm: new Date('2026-02-08T14:02:00Z'),
        acknowledgedByName: 'Max Mueller',
        snoozedAt: null,
        snoozedByName: null,
        snoozedUntil: null,
        snoozeCount: 0,
        erledigtAm: new Date('2026-02-08T14:10:00Z'),
        erledigtByName: 'Max Mueller',
        erledigungsNotiz: 'Erledigt',
        assignedToName: 'Anna Schmidt',
        assignedByName: 'Max Mueller',
        assignedAt: new Date('2026-02-08T13:35:00Z'),
        wurdeEskaliert: false,
        eskaliertAm: null,
        eskalationsPersonName: null,
        previousAssigneeName: null,
        ...overrides,
      };
    }

    it('should have 25 header columns', () => {
      const buffer = service.generateRawExport([createRawMockItem()]);
      const csv = buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const headers = csv.split('\r\n')[0]?.split(';');
      expect(headers).toHaveLength(25);
    });

    it('should have correct header names', () => {
      const buffer = service.generateRawExport([]);
      const csv = buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const headerLine = csv.split('\r\n')[0];
      expect(headerLine).toBe(
        'ID;Titel;Beschreibung;Status;Kategorie;Ersteller;Erstellt-Am;Faellig-Am;Ausgeloest-Am;' +
          'Acknowledged-Am;Acknowledged-Von;Snoozed-Am;Snoozed-Von;Snoozed-Bis;Snooze-Anzahl;' +
          'Erledigt-Am;Erledigt-Von;Erledigungs-Notiz;Zugewiesener;Zugewiesen-Von;Zugewiesen-Am;' +
          'Eskaliert;Eskaliert-Am;Eskalationsperson;Vorheriger-Zugewiesener',
      );
    });

    it('should include all 25 data fields', () => {
      const buffer = service.generateRawExport([createRawMockItem()]);
      const csv = buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const fields = csv.split('\r\n')[1]?.split(';');
      expect(fields).toHaveLength(25);
    });

    it('should handle null values as empty strings', () => {
      const item = createRawMockItem({
        snoozedAt: null,
        snoozedByName: null,
        snoozedUntil: null,
        eskaliertAm: null,
        eskalationsPersonName: null,
        previousAssigneeName: null,
      });
      const buffer = service.generateRawExport([item]);
      const csv = buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const fields = csv.split('\r\n')[1]?.split(';');

      // Snoozed-Am (11), Snoozed-Von (12), Snoozed-Bis (13)
      expect(fields[11]).toBe('');
      expect(fields[12]).toBe('');
      expect(fields[13]).toBe('');
    });

    it('should escape beschreibung with semicolons', () => {
      const item = createRawMockItem({ beschreibung: 'A; B; C' });
      const buffer = service.generateRawExport([item]);
      const csv = buffer.toString('utf-8');
      expect(csv).toContain('"A; B; C"');
    });

    it('should include BOM', () => {
      const buffer = service.generateRawExport([createRawMockItem()]);
      const csv = buffer.toString('utf-8');
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });
  });
});
