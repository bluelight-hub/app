// @ts-nocheck
import { JsonExportService } from '../json-export.service';
import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { RohdatenExportItem } from '@domain/repositories/rohdaten-export';

describe('JsonExportService', () => {
  let service: JsonExportService;

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
    service = new JsonExportService();
  });

  it('should return empty array for no items', () => {
    // Given
    const items: ErinnerungExportItem[] = [];

    // When
    const buffer = service.generateExport(items);
    const json = buffer.toString('utf-8');

    // Then
    expect(json).toBe('[]');
  });

  it('should return pretty-printed JSON', () => {
    // Given
    const items = [createMockItem()];

    // When
    const buffer = service.generateExport(items);
    const json = buffer.toString('utf-8');

    // Then — Indentation mit 2 Spaces
    const lines = json.split('\n');
    // Zweite Zeile sollte mit 2 Spaces eingerueckt sein (Beginn des ersten Objekts)
    expect(lines[1]).toMatch(/^ {2}\{/);
    // Dritte Zeile sollte mit 4 Spaces eingerueckt sein (erstes Feld)
    expect(lines[2]).toMatch(/^ {4}"/);
  });

  it('should format dates in German format', () => {
    // Given
    const items = [
      createMockItem({
        faelligAm: new Date('2026-06-15T10:30:00Z'),
        ausgeloestAm: new Date('2026-06-15T10:30:00Z'),
      }),
    ];

    // When
    const buffer = service.generateExport(items);
    const json = buffer.toString('utf-8');
    const parsed = JSON.parse(json);

    // Then — Datum im Format DD.MM.YYYY HH:mm
    expect(parsed[0]?.FaelligAm).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    expect(parsed[0]?.AusgeloestAm).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  });

  it('should include null values for optional fields', () => {
    // Given
    const items = [
      createMockItem({
        assignedToName: null,
        kategorieName: null,
        erledigtAm: null,
        eskaliertAm: null,
      }),
    ];

    // When
    const buffer = service.generateExport(items);
    const json = buffer.toString('utf-8');
    const parsed = JSON.parse(json);

    // Then — null-Werte muessen als JSON null vorhanden sein
    expect(parsed[0]?.Zugewiesener).toBeNull();
    expect(parsed[0]?.Kategorie).toBeNull();
    expect(parsed[0]?.ErledigtAm).toBeNull();
  });

  it('should include all required fields', () => {
    // Given
    const items = [createMockItem()];

    // When
    const buffer = service.generateExport(items);
    const json = buffer.toString('utf-8');
    const parsed = JSON.parse(json);

    // Then — Alle ErinnerungExportItem Felder muessen vorhanden sein
    const expectedKeys = ['ID', 'Titel', 'Status', 'Ersteller', 'Zugewiesener', 'FaelligAm', 'AusgeloestAm', 'AcknowledgedAm', 'ErledigtAm', 'Kategorie', 'Eskaliert', 'Snooze-Anzahl'];
    const actualKeys = Object.keys(parsed[0]);
    expect(actualKeys).toEqual(expectedKeys);
  });

  describe('generateRawExport (Story 9.10)', () => {
    function createRawMockItem(overrides: Partial<RohdatenExportItem> = {}): RohdatenExportItem {
      return {
        id: 'clw3h8x9y000108l6daaaaaaa',
        titel: 'Lagebesprechung',
        beschreibung: 'Taktische Lagebesprechung',
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

    it('should include all 25 fields', () => {
      const buffer = service.generateRawExport([createRawMockItem()]);
      const parsed = JSON.parse(buffer.toString('utf-8'));
      const keys = Object.keys(parsed[0]);
      expect(keys).toHaveLength(25);
    });

    it('should have correct field names', () => {
      const buffer = service.generateRawExport([createRawMockItem()]);
      const parsed = JSON.parse(buffer.toString('utf-8'));
      const expectedKeys = [
        'ID',
        'Titel',
        'Beschreibung',
        'Status',
        'Kategorie',
        'Ersteller',
        'Erstellt-Am',
        'Faellig-Am',
        'Ausgeloest-Am',
        'Acknowledged-Am',
        'Acknowledged-Von',
        'Snoozed-Am',
        'Snoozed-Von',
        'Snoozed-Bis',
        'Snooze-Anzahl',
        'Erledigt-Am',
        'Erledigt-Von',
        'Erledigungs-Notiz',
        'Zugewiesener',
        'Zugewiesen-Von',
        'Zugewiesen-Am',
        'Eskaliert',
        'Eskaliert-Am',
        'Eskalationsperson',
        'Vorheriger-Zugewiesener',
      ];
      expect(Object.keys(parsed[0])).toEqual(expectedKeys);
    });

    it('should include explicit null values', () => {
      const item = createRawMockItem({
        snoozedAt: null,
        snoozedByName: null,
        eskaliertAm: null,
        eskalationsPersonName: null,
        previousAssigneeName: null,
      });
      const buffer = service.generateRawExport([item]);
      const parsed = JSON.parse(buffer.toString('utf-8'));

      expect(parsed[0]['Snoozed-Am']).toBeNull();
      expect(parsed[0]['Snoozed-Von']).toBeNull();
      expect(parsed[0]['Eskaliert-Am']).toBeNull();
      expect(parsed[0]?.Eskalationsperson).toBeNull();
      expect(parsed[0]['Vorheriger-Zugewiesener']).toBeNull();
    });

    it('should format dates in German format', () => {
      const buffer = service.generateRawExport([createRawMockItem()]);
      const parsed = JSON.parse(buffer.toString('utf-8'));

      expect(parsed[0]['Erstellt-Am']).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
      expect(parsed[0]['Faellig-Am']).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    });

    it('should be pretty-printed with 2 spaces', () => {
      const buffer = service.generateRawExport([createRawMockItem()]);
      const json = buffer.toString('utf-8');
      const lines = json.split('\n');
      expect(lines[1]).toMatch(/^ {2}\{/);
      expect(lines[2]).toMatch(/^ {4}"/);
    });

    it('should return empty array for no items', () => {
      const buffer = service.generateRawExport([]);
      expect(buffer.toString('utf-8')).toBe('[]');
    });
  });
});
