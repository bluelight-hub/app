/**
 * Unit Tests fuer useMeineBefehle Hook und sortMeineBefehle Funktion
 *
 * Verifiziert:
 * - sortMeineBefehle: Unquittierte zuerst, dann erteiltAm DESC
 * - useMeineBefehle: Query-Key und enabled-Logik
 */

import { describe, it, expect } from 'vitest';
import { sortMeineBefehle } from '../use-meine-befehle';
import { BEFEHL_QUERY_KEYS } from '../queries';
import type { BefehlDto, BefehlEmpfaengerDto } from '@bluelight-hub/shared/client';

/** Hilfsfunktion: Erstellt ein minimales BefehlDto fuer Tests */
function createBefehl(overrides: Partial<BefehlDto> & { id: string; erteiltAm: Date; empfaenger: BefehlEmpfaengerDto[] }): BefehlDto {
  return {
    nummer: `B2026-${overrides.id}`,
    einsatzId: 'einsatz-1',
    auftrag: 'Testauftrag',
    befehlsgeberName: 'Befehlsgeber-1',
    erstellerId: 'ersteller-1',
    status: 'ERTEILT',
    befehlstyp: 'KURZBEFEHL',
    kommentare: [],
    createdAt: overrides.erteiltAm,
    updatedAt: overrides.erteiltAm,
    ...overrides,
  } as BefehlDto;
}

/** Hilfsfunktion: Erstellt einen Empfaenger-Eintrag */
function createEmpfaenger(userId: string, quittiertAm?: Date): BefehlEmpfaengerDto {
  return {
    id: `emp-${userId}`,
    empfaengerId: userId,
    zugestelltAm: new Date('2026-01-15T10:00:00Z'),
    quittiertAm: quittiertAm,
  } as BefehlEmpfaengerDto;
}

const USER_ID = 'user-1';

describe('sortMeineBefehle', () => {
  it('sortiert unquittierte vor quittierten', () => {
    const befehle = [
      createBefehl({
        id: 'quittiert',
        erteiltAm: new Date('2026-01-15T12:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID, new Date('2026-01-15T12:05:00Z'))],
      }),
      createBefehl({
        id: 'unquittiert',
        erteiltAm: new Date('2026-01-15T10:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID)],
      }),
    ];

    const sorted = sortMeineBefehle(befehle, USER_ID);

    expect(sorted[0].id).toBe('unquittiert');
    expect(sorted[1].id).toBe('quittiert');
  });

  it('sortiert innerhalb gleicher Quittierungs-Gruppe nach erteiltAm DESC', () => {
    const befehle = [
      createBefehl({
        id: 'aelter',
        erteiltAm: new Date('2026-01-15T08:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID)],
      }),
      createBefehl({
        id: 'neuer',
        erteiltAm: new Date('2026-01-15T12:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID)],
      }),
    ];

    const sorted = sortMeineBefehle(befehle, USER_ID);

    expect(sorted[0].id).toBe('neuer');
    expect(sorted[1].id).toBe('aelter');
  });

  it('sortiert gemischte Liste korrekt (unquittierte zuerst, dann erteiltAm DESC)', () => {
    const befehle = [
      createBefehl({
        id: 'q-alt',
        erteiltAm: new Date('2026-01-14T10:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID, new Date('2026-01-14T10:05:00Z'))],
      }),
      createBefehl({
        id: 'uq-alt',
        erteiltAm: new Date('2026-01-14T08:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID)],
      }),
      createBefehl({
        id: 'q-neu',
        erteiltAm: new Date('2026-01-15T12:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID, new Date('2026-01-15T12:05:00Z'))],
      }),
      createBefehl({
        id: 'uq-neu',
        erteiltAm: new Date('2026-01-15T14:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID)],
      }),
    ];

    const sorted = sortMeineBefehle(befehle, USER_ID);

    // Unquittierte zuerst (neueste zuerst)
    expect(sorted[0].id).toBe('uq-neu');
    expect(sorted[1].id).toBe('uq-alt');
    // Dann quittierte (neueste zuerst)
    expect(sorted[2].id).toBe('q-neu');
    expect(sorted[3].id).toBe('q-alt');
  });

  it('gibt leeres Array unveraendert zurueck', () => {
    const sorted = sortMeineBefehle([], USER_ID);
    expect(sorted).toEqual([]);
  });

  it('sortiert nur quittierte nach erteiltAm DESC', () => {
    const befehle = [
      createBefehl({
        id: 'q1',
        erteiltAm: new Date('2026-01-14T10:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID, new Date('2026-01-14T10:05:00Z'))],
      }),
      createBefehl({
        id: 'q2',
        erteiltAm: new Date('2026-01-15T12:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID, new Date('2026-01-15T12:05:00Z'))],
      }),
    ];

    const sorted = sortMeineBefehle(befehle, USER_ID);

    expect(sorted[0].id).toBe('q2');
    expect(sorted[1].id).toBe('q1');
  });

  it('veraendert das Original-Array nicht (Immutabilitaet)', () => {
    const befehle = [
      createBefehl({
        id: 'b1',
        erteiltAm: new Date('2026-01-15T12:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID)],
      }),
      createBefehl({
        id: 'b2',
        erteiltAm: new Date('2026-01-15T14:00:00Z'),
        empfaenger: [createEmpfaenger(USER_ID)],
      }),
    ];

    const originalOrder = befehle.map((b) => b.id);
    sortMeineBefehle(befehle, USER_ID);

    expect(befehle.map((b) => b.id)).toEqual(originalOrder);
  });
});

describe('useMeineBefehle query configuration', () => {
  it('verwendet den korrekten Query-Key via BEFEHL_QUERY_KEYS.meineBefehle', () => {
    const key = BEFEHL_QUERY_KEYS.meineBefehle('einsatz-1', 'user-1');
    expect(key).toEqual(['befehl', 'list', 'einsatz-1', 'meine', 'user-1']);
  });

  it('Query-Key aendert sich bei anderem userId', () => {
    const key1 = BEFEHL_QUERY_KEYS.meineBefehle('einsatz-1', 'user-1');
    const key2 = BEFEHL_QUERY_KEYS.meineBefehle('einsatz-1', 'user-2');
    expect(key1).not.toEqual(key2);
  });
});
