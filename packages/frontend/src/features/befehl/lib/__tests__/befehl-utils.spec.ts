/**
 * Unit Tests für befehl-utils
 *
 * Verifiziert:
 * - getEigenerEmpfaengerStatus Logik
 * - Korrekte Status-Ermittlung fuer alle Faelle
 * - EMPFAENGER_STATUS_FARBEN Mapping
 */

import { describe, it, expect } from 'vitest';
import {
  getEigenerEmpfaengerStatus,
  getOffeneRueckfragenCount,
  EMPFAENGER_STATUS_FARBEN,
  getQuittierungsfortschritt,
  getEmpfaengerQuittierungStatus,
  getZustellHaekchenFarbe,
  type EmpfaengerStatus,
} from '../befehl-utils';
import { createEmpfaenger } from '../../__fixtures__/befehl-test-utils';

describe('getEigenerEmpfaengerStatus', () => {
  const USER_ID = 'user-1';
  const OTHER_USER_ID = 'user-2';

  it('gibt NICHT_EMPFAENGER zurueck wenn currentUserId undefined', () => {
    const empfaenger = [createEmpfaenger({ empfaengerId: USER_ID })];
    const result = getEigenerEmpfaengerStatus(empfaenger, undefined);

    expect(result.status).toBe('NICHT_EMPFAENGER');
    expect(result.istEmpfaenger).toBe(false);
    expect(result.empfaengerInfo).toBeUndefined();
    expect(result.quittierungArt).toBeUndefined();
  });

  it('gibt NICHT_EMPFAENGER zurueck wenn User nicht in Empfaengerliste', () => {
    const empfaenger = [createEmpfaenger({ empfaengerId: OTHER_USER_ID })];
    const result = getEigenerEmpfaengerStatus(empfaenger, USER_ID);

    expect(result.status).toBe('NICHT_EMPFAENGER');
    expect(result.istEmpfaenger).toBe(false);
  });

  it('gibt AUSSTEHEND zurueck wenn Empfaenger ohne Zustellung', () => {
    const empfaenger = [createEmpfaenger({ empfaengerId: USER_ID })];
    const result = getEigenerEmpfaengerStatus(empfaenger, USER_ID);

    expect(result.status).toBe('AUSSTEHEND');
    expect(result.istEmpfaenger).toBe(true);
    expect(result.empfaengerInfo).toBeDefined();
    expect(result.quittierungArt).toBeUndefined();
  });

  it('gibt ZUGESTELLT zurueck wenn zugestellt aber nicht quittiert', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: USER_ID,
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
    ];
    const result = getEigenerEmpfaengerStatus(empfaenger, USER_ID);

    expect(result.status).toBe('ZUGESTELLT');
    expect(result.istEmpfaenger).toBe(true);
    expect(result.quittierungArt).toBeUndefined();
  });

  it('gibt QUITTIERT zurueck wenn quittiert', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: USER_ID,
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
    ];
    const result = getEigenerEmpfaengerStatus(empfaenger, USER_ID);

    expect(result.status).toBe('QUITTIERT');
    expect(result.istEmpfaenger).toBe(true);
    expect(result.quittierungArt).toBe('VERSTANDEN');
  });

  it('findet den richtigen Empfaenger bei mehreren', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: OTHER_USER_ID,
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: USER_ID,
        zugestelltAm: new Date('2026-01-15T10:01:00Z'),
      }),
    ];
    const result = getEigenerEmpfaengerStatus(empfaenger, USER_ID);

    expect(result.status).toBe('ZUGESTELLT');
    expect(result.empfaengerInfo?.empfaengerId).toBe(USER_ID);
  });

  it('gibt RUECKFRAGE zurueck wenn quittiert mit RUECKFRAGE', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: USER_ID,
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'RUECKFRAGE',
      }),
    ];
    const result = getEigenerEmpfaengerStatus(empfaenger, USER_ID);

    expect(result.status).toBe('RUECKFRAGE');
    expect(result.istEmpfaenger).toBe(true);
    expect(result.quittierungArt).toBe('RUECKFRAGE');
  });

  it('gibt leere Empfaengerliste korrekt zurueck', () => {
    const result = getEigenerEmpfaengerStatus([], USER_ID);

    expect(result.status).toBe('NICHT_EMPFAENGER');
    expect(result.istEmpfaenger).toBe(false);
  });
});

describe('getOffeneRueckfragenCount', () => {
  it('gibt 0 zurueck wenn keine Kommentare', () => {
    expect(getOffeneRueckfragenCount({ kommentare: [] })).toBe(0);
  });

  it('gibt 0 zurueck wenn undefined kommentare', () => {
    expect(getOffeneRueckfragenCount({})).toBe(0);
  });

  it('gibt 0 zurueck wenn keine Rueckfragen', () => {
    expect(
      getOffeneRueckfragenCount({
        kommentare: [{ id: '1', authorId: 'u1', text: 'test', isRueckfrage: false, createdAt: new Date().toISOString() }],
      }),
    ).toBe(0);
  });

  it('zaehlt offene Rueckfragen (ohne Antwort)', () => {
    expect(
      getOffeneRueckfragenCount({
        kommentare: [{ id: 'k1', authorId: 'u1', text: 'Frage?', isRueckfrage: true, createdAt: new Date().toISOString() }],
      }),
    ).toBe(1);
  });

  it('ignoriert beantwortete Rueckfragen', () => {
    expect(
      getOffeneRueckfragenCount({
        kommentare: [
          { id: 'k1', authorId: 'u1', text: 'Frage?', isRueckfrage: true, createdAt: new Date().toISOString() },
          { id: 'k2', authorId: 'u2', text: 'Antwort', isRueckfrage: false, parentId: 'k1', createdAt: new Date().toISOString() },
        ],
      }),
    ).toBe(0);
  });

  it('zaehlt Mix korrekt: 2 offene + 1 beantwortete', () => {
    expect(
      getOffeneRueckfragenCount({
        kommentare: [
          { id: 'k1', authorId: 'u1', text: 'Frage1?', isRueckfrage: true, createdAt: new Date().toISOString() },
          { id: 'k2', authorId: 'u2', text: 'Antwort1', isRueckfrage: false, parentId: 'k1', createdAt: new Date().toISOString() },
          { id: 'k3', authorId: 'u1', text: 'Frage2?', isRueckfrage: true, createdAt: new Date().toISOString() },
          { id: 'k4', authorId: 'u1', text: 'Frage3?', isRueckfrage: true, createdAt: new Date().toISOString() },
        ],
      }),
    ).toBe(2);
  });
});

describe('EMPFAENGER_STATUS_FARBEN', () => {
  const alleStatus: EmpfaengerStatus[] = ['NICHT_EMPFAENGER', 'AUSSTEHEND', 'ZUGESTELLT', 'QUITTIERT', 'RUECKFRAGE'];

  it('hat Eintraege fuer alle Status-Werte', () => {
    for (const status of alleStatus) {
      expect(EMPFAENGER_STATUS_FARBEN[status]).toBeDefined();
      expect(EMPFAENGER_STATUS_FARBEN[status].bg).toBeTruthy();
      expect(EMPFAENGER_STATUS_FARBEN[status].text).toBeTruthy();
      expect(EMPFAENGER_STATUS_FARBEN[status].border).toBeTruthy();
    }
  });
});

describe('getQuittierungsfortschritt', () => {
  it('gibt 0/0 zurueck bei leerer Liste', () => {
    const result = getQuittierungsfortschritt([]);

    expect(result.quittiert).toBe(0);
    expect(result.gesamt).toBe(0);
    expect(result.prozent).toBe(0);
  });

  it('gibt 0/5 zurueck wenn keiner quittiert hat', () => {
    const empfaenger = Array.from({ length: 5 }, (_, i) =>
      createEmpfaenger({
        empfaengerId: `user-${i}`,
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
    );
    const result = getQuittierungsfortschritt(empfaenger);

    expect(result.quittiert).toBe(0);
    expect(result.gesamt).toBe(5);
    expect(result.prozent).toBe(0);
  });

  it('gibt 3/5 zurueck bei teilweiser Quittierung', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:06:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-2',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:07:00Z'),
        quittierungArt: 'NICHT_VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-3',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
      createEmpfaenger({
        empfaengerId: 'user-4',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
    ];
    const result = getQuittierungsfortschritt(empfaenger);

    expect(result.quittiert).toBe(3);
    expect(result.gesamt).toBe(5);
  });

  it('gibt 5/5 zurueck wenn alle quittiert haben', () => {
    const empfaenger = Array.from({ length: 5 }, (_, i) =>
      createEmpfaenger({
        empfaengerId: `user-${i}`,
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
    );
    const result = getQuittierungsfortschritt(empfaenger);

    expect(result.quittiert).toBe(5);
    expect(result.gesamt).toBe(5);
    expect(result.prozent).toBe(100);
  });

  it('berechnet Prozent korrekt (60%)', () => {
    const empfaenger = Array.from({ length: 5 }, (_, i) =>
      createEmpfaenger({
        empfaengerId: `user-${i}`,
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        ...(i < 3 ? { quittiertAm: new Date('2026-01-15T10:05:00Z'), quittierungArt: 'VERSTANDEN' as const } : {}),
      }),
    );
    const result = getQuittierungsfortschritt(empfaenger);

    expect(result.prozent).toBe(60);
  });

  it('zaehlt RUECKFRAGE als quittiert', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'RUECKFRAGE',
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
    ];
    const result = getQuittierungsfortschritt(empfaenger);

    expect(result.quittiert).toBe(1);
    expect(result.gesamt).toBe(2);
    expect(result.prozent).toBe(50);
  });

  it('schluesselt Quittierungsarten korrekt auf', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:06:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-2',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:07:00Z'),
        quittierungArt: 'RUECKFRAGE',
      }),
      createEmpfaenger({
        empfaengerId: 'user-3',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:08:00Z'),
        quittierungArt: 'NICHT_VERSTANDEN',
      }),
    ];
    const result = getQuittierungsfortschritt(empfaenger);

    expect(result.art.VERSTANDEN).toBe(2);
    expect(result.art.RUECKFRAGE).toBe(1);
    expect(result.art.NICHT_VERSTANDEN).toBe(1);
  });
});

describe('getEmpfaengerQuittierungStatus', () => {
  it('gibt ZUGESTELLT zurueck fuer nicht-quittierten Empfaenger', () => {
    const empfaenger = createEmpfaenger({
      empfaengerId: 'user-1',
      zugestelltAm: new Date('2026-01-15T10:00:00Z'),
    });
    const result = getEmpfaengerQuittierungStatus(empfaenger);

    expect(result.status).toBe('ZUGESTELLT');
    expect(result.chipBg).toBe('bg-surface-raised');
    expect(result.chipText).toBe('text-text-muted');
  });

  it('gibt VERSTANDEN zurueck mit korrektem chipBg/chipText', () => {
    const empfaenger = createEmpfaenger({
      empfaengerId: 'user-1',
      zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      quittiertAm: new Date('2026-01-15T10:05:00Z'),
      quittierungArt: 'VERSTANDEN',
    });
    const result = getEmpfaengerQuittierungStatus(empfaenger);

    expect(result.status).toBe('VERSTANDEN');
    expect(result.chipBg).toBe('bg-status-success-surface');
    expect(result.chipText).toBe('text-status-success-text');
  });

  it('gibt RUECKFRAGE zurueck mit gelbem Chip', () => {
    const empfaenger = createEmpfaenger({
      empfaengerId: 'user-1',
      zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      quittiertAm: new Date('2026-01-15T10:05:00Z'),
      quittierungArt: 'RUECKFRAGE',
    });
    const result = getEmpfaengerQuittierungStatus(empfaenger);

    expect(result.status).toBe('RUECKFRAGE');
    expect(result.chipBg).toBe('bg-status-warning-surface');
    expect(result.chipText).toBe('text-status-warning-text');
  });

  it('gibt NICHT_VERSTANDEN zurueck mit rotem Chip', () => {
    const empfaenger = createEmpfaenger({
      empfaengerId: 'user-1',
      zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      quittiertAm: new Date('2026-01-15T10:05:00Z'),
      quittierungArt: 'NICHT_VERSTANDEN',
    });
    const result = getEmpfaengerQuittierungStatus(empfaenger);

    expect(result.status).toBe('NICHT_VERSTANDEN');
    expect(result.chipBg).toBe('bg-status-danger-surface');
    expect(result.chipText).toBe('text-status-danger-text');
  });

  it('setzt zeitpunkt korrekt bei Quittierung', () => {
    const quittierZeit = new Date('2026-01-15T10:05:00Z');
    const empfaenger = createEmpfaenger({
      empfaengerId: 'user-1',
      zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      quittiertAm: quittierZeit,
      quittierungArt: 'VERSTANDEN',
    });
    const result = getEmpfaengerQuittierungStatus(empfaenger);

    expect(result.zeitpunkt).toBe(quittierZeit);
  });

  it('setzt zeitpunkt undefined bei nicht-Quittierung', () => {
    const empfaenger = createEmpfaenger({
      empfaengerId: 'user-1',
      zugestelltAm: new Date('2026-01-15T10:00:00Z'),
    });
    const result = getEmpfaengerQuittierungStatus(empfaenger);

    expect(result.zeitpunkt).toBeUndefined();
  });

  it('gibt defensiv VERSTANDEN zurueck wenn quittiertAm gesetzt aber quittierungArt undefined', () => {
    const quittierZeit = new Date('2026-01-15T10:05:00Z');
    const empfaenger = createEmpfaenger({
      empfaengerId: 'user-1',
      zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      quittiertAm: quittierZeit,
      // quittierungArt bewusst weggelassen (Dateninkonsistenz)
    });
    const result = getEmpfaengerQuittierungStatus(empfaenger);

    expect(result.status).toBe('VERSTANDEN');
    expect(result.chipBg).toBe('bg-status-success-surface');
    expect(result.zeitpunkt).toBe(quittierZeit);
  });
});

describe('getZustellHaekchenFarbe', () => {
  it('gibt none zurueck bei leerer Liste', () => {
    expect(getZustellHaekchenFarbe([])).toBe('none');
  });

  it('gibt none zurueck wenn keiner quittiert hat', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
    ];

    expect(getZustellHaekchenFarbe(empfaenger)).toBe('none');
  });

  it('gibt partial zurueck bei teilweiser Quittierung', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
    ];

    expect(getZustellHaekchenFarbe(empfaenger)).toBe('partial');
  });

  it('gibt all_verstanden zurueck wenn alle VERSTANDEN', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:06:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
    ];

    expect(getZustellHaekchenFarbe(empfaenger)).toBe('all_verstanden');
  });

  it('gibt mixed zurueck bei VERSTANDEN + RUECKFRAGE', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:06:00Z'),
        quittierungArt: 'RUECKFRAGE',
      }),
    ];

    expect(getZustellHaekchenFarbe(empfaenger)).toBe('mixed');
  });

  it('gibt has_nicht_verstanden zurueck bei mind. 1 NICHT_VERSTANDEN', () => {
    const empfaenger = [
      createEmpfaenger({
        empfaengerId: 'user-0',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
        quittiertAm: new Date('2026-01-15T10:06:00Z'),
        quittierungArt: 'NICHT_VERSTANDEN',
      }),
      createEmpfaenger({
        empfaengerId: 'user-2',
        zugestelltAm: new Date('2026-01-15T10:00:00Z'),
      }),
    ];

    expect(getZustellHaekchenFarbe(empfaenger)).toBe('has_nicht_verstanden');
  });
});
