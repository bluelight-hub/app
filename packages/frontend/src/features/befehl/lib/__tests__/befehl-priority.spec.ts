/**
 * Unit Tests fuer befehl-priority
 *
 * Verifiziert:
 * - parseZeitvorgabe: alle Formate, Grenzfaelle, ungueltige Eingaben
 * - isBefehlUeberfaellig: verschiedene Szenarien
 * - getBefehlKritikalitaet: alle Kritikalitaetsstufen
 * - sortByPriority: korrekte Reihenfolge
 */

import { describe, it, expect } from 'vitest';
import { parseZeitvorgabe, isBefehlUeberfaellig, getBefehlKritikalitaet, sortByPriority } from '../befehl-priority';
import { createBefehl, createEmpfaenger } from '../../__fixtures__/befehl-test-utils';

// ============================================
// parseZeitvorgabe
// ============================================

describe('parseZeitvorgabe', () => {
  describe('Minuten-Formate', () => {
    it('parsed "15 min" als 15', () => {
      expect(parseZeitvorgabe('15 min')).toBe(15);
    });

    it('parsed "15min" ohne Leerzeichen als 15', () => {
      expect(parseZeitvorgabe('15min')).toBe(15);
    });

    it('parsed "15 Minuten" als 15', () => {
      expect(parseZeitvorgabe('15 Minuten')).toBe(15);
    });

    it('parsed "1 Minute" als 1', () => {
      expect(parseZeitvorgabe('1 Minute')).toBe(1);
    });

    it('parsed "0 min" als 0', () => {
      expect(parseZeitvorgabe('0 min')).toBe(0);
    });
  });

  describe('Stunden-Formate', () => {
    it('parsed "1h" als 60', () => {
      expect(parseZeitvorgabe('1h')).toBe(60);
    });

    it('parsed "1 h" mit Leerzeichen als 60', () => {
      expect(parseZeitvorgabe('1 h')).toBe(60);
    });

    it('parsed "1 Stunde" als 60', () => {
      expect(parseZeitvorgabe('1 Stunde')).toBe(60);
    });

    it('parsed "2 Stunden" als 120', () => {
      expect(parseZeitvorgabe('2 Stunden')).toBe(120);
    });

    it('parsed "1.5h" als 90', () => {
      expect(parseZeitvorgabe('1.5h')).toBe(90);
    });

    it('parsed Komma-Dezimalformat "1,5h" als 90', () => {
      expect(parseZeitvorgabe('1,5h')).toBe(90);
    });
  });

  describe('Nur Zahl (Default: Minuten)', () => {
    it('parsed "30" als 30', () => {
      expect(parseZeitvorgabe('30')).toBe(30);
    });

    it('parsed "0" als 0', () => {
      expect(parseZeitvorgabe('0')).toBe(0);
    });

    it('parsed "120" als 120', () => {
      expect(parseZeitvorgabe('120')).toBe(120);
    });
  });

  describe('Ungueltige Eingaben', () => {
    it('gibt null zurueck fuer null', () => {
      expect(parseZeitvorgabe(null)).toBeNull();
    });

    it('gibt null zurueck fuer undefined', () => {
      expect(parseZeitvorgabe(undefined)).toBeNull();
    });

    it('gibt null zurueck fuer leeren String', () => {
      expect(parseZeitvorgabe('')).toBeNull();
    });

    it('gibt null zurueck fuer nur Leerzeichen', () => {
      expect(parseZeitvorgabe('   ')).toBeNull();
    });

    it('gibt null zurueck fuer Text ohne Zahl', () => {
      expect(parseZeitvorgabe('sofort')).toBeNull();
    });

    it('gibt null zurueck fuer unbekannte Einheiten', () => {
      expect(parseZeitvorgabe('5 Tage')).toBeNull();
    });
  });

  describe('Whitespace-Handling', () => {
    it('trimmt fuehrende und nachfolgende Leerzeichen', () => {
      expect(parseZeitvorgabe('  15 min  ')).toBe(15);
    });

    it('ist case-insensitive', () => {
      expect(parseZeitvorgabe('15 MIN')).toBe(15);
      expect(parseZeitvorgabe('1H')).toBe(60);
      expect(parseZeitvorgabe('15 MINUTEN')).toBe(15);
    });
  });
});

// ============================================
// isBefehlUeberfaellig
// ============================================

describe('isBefehlUeberfaellig', () => {
  const BASE_TIME = new Date('2026-01-01T10:00:00Z');

  it('gibt false zurueck wenn keine Zeitvorgabe', () => {
    const befehl = createBefehl({ id: '1', nummer: 'B2026-001', erteiltAm: BASE_TIME });
    expect(isBefehlUeberfaellig(befehl)).toBe(false);
  });

  it('gibt false zurueck wenn Zeitvorgabe nicht parsebar', () => {
    const befehl = createBefehl({ id: '1', nummer: 'B2026-001', erteiltAm: BASE_TIME, zeitvorgabe: 'sofort' });
    expect(isBefehlUeberfaellig(befehl)).toBe(false);
  });

  it('gibt false zurueck wenn Deadline noch nicht abgelaufen', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '30 min',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: BASE_TIME })],
    });
    const now = new Date('2026-01-01T10:20:00Z'); // 20 Min nach Erteilung
    expect(isBefehlUeberfaellig(befehl, now)).toBe(false);
  });

  it('gibt true zurueck wenn Deadline abgelaufen und nicht alle quittiert', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '15 min',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: BASE_TIME })],
    });
    const now = new Date('2026-01-01T10:30:00Z'); // 30 Min nach Erteilung
    expect(isBefehlUeberfaellig(befehl, now)).toBe(true);
  });

  it('gibt false zurueck wenn Deadline abgelaufen aber alle quittiert', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '15 min',
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:10:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
    });
    const now = new Date('2026-01-01T10:30:00Z');
    expect(isBefehlUeberfaellig(befehl, now)).toBe(false);
  });

  it('gibt true zurueck wenn nur teilweise quittiert und ueberfaellig', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '15 min',
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:10:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({ empfaengerId: 'user-2', zugestelltAm: BASE_TIME }),
      ],
    });
    const now = new Date('2026-01-01T10:30:00Z');
    expect(isBefehlUeberfaellig(befehl, now)).toBe(true);
  });

  it('behandelt Stunden-Zeitvorgabe korrekt', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '1h',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: BASE_TIME })],
    });
    // 50 Minuten spaeter → nicht ueberfaellig
    expect(isBefehlUeberfaellig(befehl, new Date('2026-01-01T10:50:00Z'))).toBe(false);
    // 70 Minuten spaeter → ueberfaellig
    expect(isBefehlUeberfaellig(befehl, new Date('2026-01-01T11:10:00Z'))).toBe(true);
  });
});

// ============================================
// getBefehlKritikalitaet
// ============================================

describe('getBefehlKritikalitaet', () => {
  const BASE_TIME = new Date('2026-01-01T10:00:00Z');
  const NOW = new Date('2026-01-01T11:00:00Z'); // 60 min nach BASE_TIME

  it('gibt NORMAL zurueck fuer Befehl ohne Probleme', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
    });
    expect(getBefehlKritikalitaet(befehl, NOW)).toBe('NORMAL');
  });

  it('gibt KRITISCH zurueck wenn ueberfaellig', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '15 min',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: BASE_TIME })],
    });
    expect(getBefehlKritikalitaet(befehl, NOW)).toBe('KRITISCH');
  });

  it('gibt KRITISCH zurueck wenn NICHT_VERSTANDEN', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ],
    });
    expect(getBefehlKritikalitaet(befehl, NOW)).toBe('KRITISCH');
  });

  it('gibt WARNUNG zurueck wenn offene Rueckfrage', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
      kommentare: [{ id: 'k1', authorId: 'user-1', text: 'Frage?', isRueckfrage: true, createdAt: new Date('2026-01-01T10:06:00Z').toISOString() }],
    });
    expect(getBefehlKritikalitaet(befehl, NOW)).toBe('WARNUNG');
  });

  it('KRITISCH hat Vorrang vor WARNUNG', () => {
    const befehl = createBefehl({
      id: '1',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '15 min',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: BASE_TIME })],
      kommentare: [{ id: 'k1', authorId: 'user-1', text: 'Frage?', isRueckfrage: true, createdAt: new Date('2026-01-01T10:06:00Z').toISOString() }],
    });
    expect(getBefehlKritikalitaet(befehl, NOW)).toBe('KRITISCH');
  });
});

// ============================================
// sortByPriority
// ============================================

describe('sortByPriority', () => {
  const BASE_TIME = new Date('2026-01-01T10:00:00Z');
  const NOW = new Date('2026-01-01T11:00:00Z');

  it('sortiert ueberfaellige Befehle an erste Stelle', () => {
    const ueberfaellig = createBefehl({
      id: 'ueberfaellig',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '15 min',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: BASE_TIME })],
    });
    const normal = createBefehl({
      id: 'normal',
      nummer: 'B2026-002',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
    });

    const sorted = sortByPriority([normal, ueberfaellig], NOW);
    expect(sorted[0]?.id).toBe('ueberfaellig');
    expect(sorted[1]?.id).toBe('normal');
  });

  it('sortiert Nicht-Verstanden vor Rueckfrage', () => {
    const nichtVerstanden = createBefehl({
      id: 'nicht-verstanden',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ],
    });
    const rueckfrage = createBefehl({
      id: 'rueckfrage',
      nummer: 'B2026-002',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
      kommentare: [{ id: 'k1', authorId: 'user-1', text: 'Frage?', isRueckfrage: true, createdAt: new Date('2026-01-01T10:06:00Z').toISOString() }],
    });

    const sorted = sortByPriority([rueckfrage, nichtVerstanden], NOW);
    expect(sorted[0]?.id).toBe('nicht-verstanden');
    expect(sorted[1]?.id).toBe('rueckfrage');
  });

  it('sortiert Rueckfrage vor Normal', () => {
    const rueckfrage = createBefehl({
      id: 'rueckfrage',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
      kommentare: [{ id: 'k1', authorId: 'user-1', text: 'Frage?', isRueckfrage: true, createdAt: new Date('2026-01-01T10:06:00Z').toISOString() }],
    });
    const normal = createBefehl({
      id: 'normal',
      nummer: 'B2026-002',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
    });

    const sorted = sortByPriority([normal, rueckfrage], NOW);
    expect(sorted[0]?.id).toBe('rueckfrage');
    expect(sorted[1]?.id).toBe('normal');
  });

  it('sortiert bei gleicher Prioritaet neuere zuerst', () => {
    const aelter = createBefehl({
      id: 'aelter',
      nummer: 'B2026-001',
      erteiltAm: new Date('2026-01-01T09:00:00Z'),
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
    });
    const neuer = createBefehl({
      id: 'neuer',
      nummer: 'B2026-002',
      erteiltAm: new Date('2026-01-01T10:30:00Z'),
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:35:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
    });

    const sorted = sortByPriority([aelter, neuer], NOW);
    expect(sorted[0]?.id).toBe('neuer');
    expect(sorted[1]?.id).toBe('aelter');
  });

  it('veraendert das Original-Array nicht', () => {
    const befehle = [createBefehl({ id: '1', nummer: 'B2026-001', erteiltAm: BASE_TIME }), createBefehl({ id: '2', nummer: 'B2026-002', erteiltAm: new Date('2026-01-01T10:30:00Z') })];
    const original = [...befehle];
    sortByPriority(befehle, NOW);
    expect(befehle).toEqual(original);
  });

  it('behandelt leeres Array korrekt', () => {
    expect(sortByPriority([], NOW)).toEqual([]);
  });

  it('sortiert vollstaendig: ueberfaellig > nicht-verstanden > rueckfrage > normal', () => {
    const normal = createBefehl({
      id: 'normal',
      nummer: 'B2026-001',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
    });
    const rueckfrage = createBefehl({
      id: 'rueckfrage',
      nummer: 'B2026-002',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'VERSTANDEN',
        }),
      ],
      kommentare: [{ id: 'k1', authorId: 'user-1', text: 'Frage?', isRueckfrage: true, createdAt: new Date('2026-01-01T10:06:00Z').toISOString() }],
    });
    const nichtVerstanden = createBefehl({
      id: 'nicht-verstanden',
      nummer: 'B2026-003',
      erteiltAm: BASE_TIME,
      empfaenger: [
        createEmpfaenger({
          empfaengerId: 'user-1',
          zugestelltAm: BASE_TIME,
          quittiertAm: new Date('2026-01-01T10:05:00Z'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ],
    });
    const ueberfaellig = createBefehl({
      id: 'ueberfaellig',
      nummer: 'B2026-004',
      erteiltAm: BASE_TIME,
      zeitvorgabe: '15 min',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: BASE_TIME })],
    });

    // Bewusst durcheinander eingeben
    const sorted = sortByPriority([normal, rueckfrage, nichtVerstanden, ueberfaellig], NOW);
    expect(sorted.map((b) => b.id)).toEqual(['ueberfaellig', 'nicht-verstanden', 'rueckfrage', 'normal']);
  });
});
