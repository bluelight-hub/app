import { BefehlCsvService } from '../befehl-csv.service';
import { Befehl } from '@/domain/aggregates/befehl.aggregate';
import { BefehlEmpfaenger } from '@/domain/entities/befehl-empfaenger.entity';
import { BefehlId } from '@/domain/value-objects/befehl-id';
import { BefehlStatus } from '@/domain/value-objects/befehl-status';
import { EinsatzId } from '@/domain/value-objects/einsatz-id';
import { UserId } from '@/domain/value-objects/user-id';

/**
 * Unit Tests fuer BefehlCsvService (Story 4.4).
 *
 * **Test Strategy:**
 * - Direct Instantiation (kein TestingModule)
 * - Fokus: CSV-Formatierung, Sonderzeichen-Escaping, BOM, Datum-Format
 */
describe('BefehlCsvService', () => {
  let service: BefehlCsvService;

  const createMockBefehl = (overrides?: {
    nummer?: string;
    auftrag?: string;
    befehlsgeberName?: string;
    status?: string;
    erteiltAm?: Date;
    empfaenger?: Array<{
      name: string;
      zugestelltAm?: Date;
      quittiertAm?: Date;
      quittierungArt?: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN';
    }>;
  }): Befehl => {
    const empfaenger = (overrides?.empfaenger ?? [{ name: 'ZF Meier' }]).map((e) =>
      BefehlEmpfaenger.reconstitute(`emp-${Math.random().toString(36).slice(2, 10)}`, e.name, undefined, e.zugestelltAm, e.quittiertAm, e.quittierungArt),
    );

    return Befehl.reconstitute({
      id: BefehlId.create().value as BefehlId,
      nummer: overrides?.nummer ?? 'B-001',
      einsatzId: EinsatzId.create('cm5einsatzid123').value as EinsatzId,
      auftrag: overrides?.auftrag ?? 'Patientenablage einrichten',
      befehlsgeberName: overrides?.befehlsgeberName ?? 'EL Mueller',
      befehlsgeberId: undefined,
      erstellerId: UserId.create('ersteller1').value as UserId,
      status: BefehlStatus.create(overrides?.status ?? 'ERTEILT').value!,
      erteiltAm: overrides?.erteiltAm ?? new Date('2026-02-20T10:00:00.000Z'),
      empfaenger,
      kommentare: [],
      createdAt: new Date('2026-02-20T10:00:00.000Z'),
      updatedAt: new Date('2026-02-20T10:00:00.000Z'),
    });
  };

  beforeEach(() => {
    service = new BefehlCsvService();
  });

  describe('Header', () => {
    it('sollte korrekten CSV-Header generieren', () => {
      const csv = service.generateCsv([]);

      expect(csv).toContain('Nummer;Zeitstempel;Befehlsgeber;Auftrag;Empfaenger;Status;Quittierungszeitpunkte;Quittierungsart');
    });

    it('sollte BOM am Anfang enthalten', () => {
      const csv = service.generateCsv([]);

      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('sollte mit CRLF enden', () => {
      const csv = service.generateCsv([]);

      expect(csv.endsWith('\r\n')).toBe(true);
    });
  });

  describe('Datenzeilen', () => {
    it('sollte Befehl-Daten korrekt in CSV-Zeilen formatieren', () => {
      const befehl = createMockBefehl({
        nummer: 'B-002',
        auftrag: 'Wasser marsch',
        befehlsgeberName: 'EL Schmidt',
        status: 'ERTEILT',
        empfaenger: [{ name: 'ZF Nord' }],
      });

      const csv = service.generateCsv([befehl]);
      const lines = csv.split('\r\n');

      // Zeile 0 = BOM+Header, Zeile 1 = Daten, Zeile 2 = Leer (nach letztem CRLF)
      expect(lines.length).toBeGreaterThanOrEqual(2);
      const dataLine = lines[1];
      expect(dataLine).toContain('B-002');
      expect(dataLine).toContain('EL Schmidt');
      expect(dataLine).toContain('Wasser marsch');
      expect(dataLine).toContain('ZF Nord');
      expect(dataLine).toContain('ERTEILT');
    });

    it('sollte mehrere Empfaenger komma-separiert aggregieren', () => {
      const befehl = createMockBefehl({
        empfaenger: [{ name: 'ZF Nord' }, { name: 'GF Sued' }, { name: 'TF West' }],
      });

      const csv = service.generateCsv([befehl]);
      const lines = csv.split('\r\n');
      const dataLine = lines[1];

      // Empfaenger in Anfuehrungszeichen weil Komma enthalten
      expect(dataLine).toContain('ZF Nord, GF Sued, TF West');
    });
  });

  describe('Datum-Format', () => {
    it('sollte Datum im Format DD.MM.YYYY HH:mm in Europe/Berlin formatieren', () => {
      // 10:00 UTC = 11:00 CET (Berlin, Winter)
      const befehl = createMockBefehl({
        erteiltAm: new Date('2026-02-20T10:00:00.000Z'),
      });

      const csv = service.generateCsv([befehl]);

      // Europe/Berlin ist UTC+1 im Winter → 11:00
      expect(csv).toContain('20.02.2026 11:00');
    });
  });

  describe('Quittierungszeitpunkte und -art', () => {
    it('sollte Quittierungszeitpunkte pro Empfaenger anzeigen', () => {
      const befehl = createMockBefehl({
        empfaenger: [
          {
            name: 'ZF Meier',
            zugestelltAm: new Date('2026-02-20T10:05:00.000Z'),
            quittiertAm: new Date('2026-02-20T10:10:00.000Z'),
            quittierungArt: 'VERSTANDEN',
          },
        ],
      });

      const csv = service.generateCsv([befehl]);

      expect(csv).toContain('ZF Meier: 20.02.2026 11:10');
      expect(csv).toContain('ZF Meier: Verstanden');
    });

    it('sollte leere Quittierungsfelder bei unquittierten Befehlen setzen', () => {
      const befehl = createMockBefehl({
        empfaenger: [{ name: 'ZF Meier' }],
      });

      const csv = service.generateCsv([befehl]);
      const lines = csv.split('\r\n');
      const dataLine = lines[1];
      const fields = dataLine.split(';');

      // Quittierungszeitpunkte und Quittierungsart sollten leer sein
      expect(fields[6]).toBe('');
      expect(fields[7]).toBe('');
    });

    it('sollte mehrere Quittierungen komma-separiert aggregieren', () => {
      const befehl = createMockBefehl({
        empfaenger: [
          {
            name: 'ZF Meier',
            zugestelltAm: new Date('2026-02-20T10:05:00.000Z'),
            quittiertAm: new Date('2026-02-20T10:10:00.000Z'),
            quittierungArt: 'VERSTANDEN',
          },
          {
            name: 'GF Schmidt',
            zugestelltAm: new Date('2026-02-20T10:06:00.000Z'),
            quittiertAm: new Date('2026-02-20T10:12:00.000Z'),
            quittierungArt: 'RUECKFRAGE',
          },
        ],
      });

      const csv = service.generateCsv([befehl]);

      expect(csv).toContain('ZF Meier: Verstanden');
      expect(csv).toContain('GF Schmidt: Rueckfrage');
    });
  });

  describe('Sonderzeichen-Escaping', () => {
    it('sollte Felder mit Semikolon in Anfuehrungszeichen wrappen', () => {
      const befehl = createMockBefehl({
        auftrag: 'Auftrag; mit Semikolon',
      });

      const csv = service.generateCsv([befehl]);

      expect(csv).toContain('"Auftrag; mit Semikolon"');
    });

    it('sollte Anfuehrungszeichen in Feldern verdoppeln', () => {
      const befehl = createMockBefehl({
        auftrag: 'Auftrag mit "Anführungszeichen"',
      });

      const csv = service.generateCsv([befehl]);

      expect(csv).toContain('"Auftrag mit ""Anführungszeichen"""');
    });

    it('sollte Felder mit Zeilenumbruch in Anfuehrungszeichen wrappen', () => {
      const befehl = createMockBefehl({
        auftrag: 'Zeile 1\nZeile 2',
      });

      const csv = service.generateCsv([befehl]);

      expect(csv).toContain('"Zeile 1\nZeile 2"');
    });
  });

  describe('Leerzustand', () => {
    it('sollte nur Header zurueckgeben wenn keine Befehle', () => {
      const csv = service.generateCsv([]);

      const lines = csv.split('\r\n');
      // BOM+Header + abschliessendes Leerzeichen nach CRLF
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('Nummer;Zeitstempel');
      expect(lines[1]).toBe('');
    });
  });
});
