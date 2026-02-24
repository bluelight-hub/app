import { computeBefehlPriority, parseZeitvorgabe } from '../befehl-kritikalitaet.util';
import { BefehlEmpfaenger } from '@/domain/entities/befehl-empfaenger.entity';
import { BefehlKommentar } from '@/domain/entities/befehl-kommentar.entity';
import { UserId } from '@/domain/value-objects/user-id';

describe('befehl-kritikalitaet.util', () => {
  describe('parseZeitvorgabe()', () => {
    it('sollte null zurueckgeben bei null/undefined/leerem String', () => {
      expect(parseZeitvorgabe(null)).toBeNull();
      expect(parseZeitvorgabe(undefined)).toBeNull();
      expect(parseZeitvorgabe('')).toBeNull();
      expect(parseZeitvorgabe('   ')).toBeNull();
    });

    it('sollte Minuten-Formate korrekt parsen', () => {
      expect(parseZeitvorgabe('15 min')).toBe(15);
      expect(parseZeitvorgabe('15min')).toBe(15);
      expect(parseZeitvorgabe('15 Minuten')).toBe(15);
      expect(parseZeitvorgabe('30 minuten')).toBe(30);
    });

    it('sollte Stunden-Formate korrekt parsen', () => {
      expect(parseZeitvorgabe('1h')).toBe(60);
      expect(parseZeitvorgabe('1 h')).toBe(60);
      expect(parseZeitvorgabe('2 Stunden')).toBe(120);
      expect(parseZeitvorgabe('1 Stunde')).toBe(60);
    });

    it('sollte Dezimal-Stunden korrekt parsen', () => {
      expect(parseZeitvorgabe('1.5h')).toBe(90);
      expect(parseZeitvorgabe('0.5h')).toBe(30);
    });

    it('sollte reine Zahlen als Minuten interpretieren', () => {
      expect(parseZeitvorgabe('30')).toBe(30);
      expect(parseZeitvorgabe('45')).toBe(45);
    });

    it('sollte Edge-Cases korrekt parsen', () => {
      expect(parseZeitvorgabe('0 min')).toBe(0);
      expect(parseZeitvorgabe('05 min')).toBe(5);
      expect(parseZeitvorgabe('99999 min')).toBe(99999);
    });

    it('sollte null zurueckgeben bei nicht-parseablen Strings', () => {
      expect(parseZeitvorgabe('sofort')).toBeNull();
      expect(parseZeitvorgabe('abc')).toBeNull();
    });
  });

  describe('computeBefehlPriority()', () => {
    const authorId = UserId.create('author1').value as UserId;

    const createEmpfaenger = (opts?: { quittiertAm?: Date; quittierungArt?: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN' }): BefehlEmpfaenger =>
      BefehlEmpfaenger.reconstitute(`emp-${Math.random().toString(36).slice(2, 10)}`, 'ZF Nord', undefined, new Date(), opts?.quittiertAm, opts?.quittierungArt, new Date());

    it('sollte NORMAL fuer KORRIGIERT-Status zurueckgeben unabhaengig von anderen Feldern', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const empfaenger = [createEmpfaenger()]; // Nicht quittiert
      const kommentare = [BefehlKommentar.reconstitute('rf-1', authorId, 'Frage?', true, undefined, new Date())];

      const result = computeBefehlPriority('KORRIGIERT', '15 min', twoHoursAgo, empfaenger, kommentare);

      expect(result).toEqual({
        isUeberfaellig: false,
        hatNichtVerstanden: false,
        hatOffeneRueckfrage: false,
        kritikalitaet: 'NORMAL',
      });
    });

    it('sollte isUeberfaellig=true bei abgelaufener Zeitvorgabe und nicht-quittierten Empfaengern', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const empfaenger = [createEmpfaenger()];

      const result = computeBefehlPriority('ERTEILT', '15 min', twoHoursAgo, empfaenger, []);

      expect(result.isUeberfaellig).toBe(true);
      expect(result.kritikalitaet).toBe('KRITISCH');
    });

    it('sollte isUeberfaellig=false bei leerer Empfaenger-Liste', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const result = computeBefehlPriority('ERTEILT', '15 min', twoHoursAgo, [], []);

      expect(result.isUeberfaellig).toBe(false);
    });

    it('sollte hatNichtVerstanden=true bei NICHT_VERSTANDEN Quittierung', () => {
      const empfaenger = [createEmpfaenger({ quittiertAm: new Date(), quittierungArt: 'NICHT_VERSTANDEN' })];

      const result = computeBefehlPriority('ZUGESTELLT', undefined, new Date(), empfaenger, []);

      expect(result.hatNichtVerstanden).toBe(true);
      expect(result.kritikalitaet).toBe('KRITISCH');
    });

    it('sollte hatOffeneRueckfrage=true bei unbeantworteter Rueckfrage', () => {
      const kommentare = [BefehlKommentar.reconstitute('rf-1', authorId, 'Frage?', true, undefined, new Date())];
      const empfaenger = [createEmpfaenger({ quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' })];

      const result = computeBefehlPriority('QUITTIERT', undefined, new Date(), empfaenger, kommentare);

      expect(result.hatOffeneRueckfrage).toBe(true);
      expect(result.kritikalitaet).toBe('WARNUNG');
    });

    it('sollte hatOffeneRueckfrage=false bei beantworteter Rueckfrage', () => {
      const kommentare = [
        BefehlKommentar.reconstitute('rf-1', authorId, 'Frage?', true, undefined, new Date()),
        BefehlKommentar.reconstitute('antwort-1', authorId, 'Antwort.', false, 'rf-1', new Date()),
      ];

      const result = computeBefehlPriority('ERTEILT', undefined, new Date(), [], kommentare);

      expect(result.hatOffeneRueckfrage).toBe(false);
    });

    it('sollte NORMAL bei keinen Problemen zurueckgeben', () => {
      const empfaenger = [createEmpfaenger({ quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' })];

      const result = computeBefehlPriority('QUITTIERT', '60 min', new Date(), empfaenger, []);

      expect(result).toEqual({
        isUeberfaellig: false,
        hatNichtVerstanden: false,
        hatOffeneRueckfrage: false,
        kritikalitaet: 'NORMAL',
      });
    });
  });
});
