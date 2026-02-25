/**
 * Unit Tests fuer extract-filter-options
 *
 * Verifiziert:
 * - Eindeutige Empfaenger-Namen extrahiert und sortiert
 * - Eindeutige Befehlsgeber-Namen extrahiert und sortiert
 * - Leere Arrays korrekt behandelt
 * - Duplikate gefiltert
 */

import { describe, it, expect } from 'vitest';
import { extractEmpfaengerNames, extractBefehlsgeberNames } from '../extract-filter-options';
import { createBefehl, createEmpfaenger } from '../../__fixtures__/befehl-test-utils';

describe('extractEmpfaengerNames', () => {
  it('gibt leeres Array fuer leere Eingabe', () => {
    expect(extractEmpfaengerNames([])).toEqual([]);
  });

  it('extrahiert eindeutige Namen aus Empfaengern', () => {
    const befehle = [
      createBefehl({
        id: '1',
        nummer: 'B-001',
        empfaenger: [createEmpfaenger({ empfaengerId: 'e1', name: 'THW' }), createEmpfaenger({ empfaengerId: 'e2', name: 'Feuerwehr' })],
      }),
      createBefehl({
        id: '2',
        nummer: 'B-002',
        empfaenger: [createEmpfaenger({ empfaengerId: 'e3', name: 'DRK' })],
      }),
    ];

    expect(extractEmpfaengerNames(befehle)).toEqual(['DRK', 'Feuerwehr', 'THW']);
  });

  it('filtert Duplikate', () => {
    const befehle = [
      createBefehl({
        id: '1',
        nummer: 'B-001',
        empfaenger: [createEmpfaenger({ empfaengerId: 'e1', name: 'THW' })],
      }),
      createBefehl({
        id: '2',
        nummer: 'B-002',
        empfaenger: [createEmpfaenger({ empfaengerId: 'e2', name: 'THW' })],
      }),
    ];

    expect(extractEmpfaengerNames(befehle)).toEqual(['THW']);
  });

  it('sortiert alphabetisch', () => {
    const befehle = [
      createBefehl({
        id: '1',
        nummer: 'B-001',
        empfaenger: [createEmpfaenger({ empfaengerId: 'e1', name: 'Zoll' }), createEmpfaenger({ empfaengerId: 'e2', name: 'ASB' }), createEmpfaenger({ empfaengerId: 'e3', name: 'Malteser' })],
      }),
    ];

    expect(extractEmpfaengerNames(befehle)).toEqual(['ASB', 'Malteser', 'Zoll']);
  });

  it('behandelt Befehle ohne Empfaenger', () => {
    const befehle = [createBefehl({ id: '1', nummer: 'B-001', empfaenger: [] })];

    expect(extractEmpfaengerNames(befehle)).toEqual([]);
  });
});

describe('extractBefehlsgeberNames', () => {
  it('gibt leeres Array fuer leere Eingabe', () => {
    expect(extractBefehlsgeberNames([])).toEqual([]);
  });

  it('extrahiert eindeutige Befehlsgeber-Namen', () => {
    const befehle = [createBefehl({ id: '1', nummer: 'B-001', befehlsgeberName: 'Einsatzleiter Müller' }), createBefehl({ id: '2', nummer: 'B-002', befehlsgeberName: 'Zugführer Schmidt' })];

    expect(extractBefehlsgeberNames(befehle)).toEqual(['Einsatzleiter Müller', 'Zugführer Schmidt']);
  });

  it('filtert Duplikate', () => {
    const befehle = [
      createBefehl({ id: '1', nummer: 'B-001', befehlsgeberName: 'Einsatzleiter' }),
      createBefehl({ id: '2', nummer: 'B-002', befehlsgeberName: 'Einsatzleiter' }),
      createBefehl({ id: '3', nummer: 'B-003', befehlsgeberName: 'Zugführer' }),
    ];

    expect(extractBefehlsgeberNames(befehle)).toEqual(['Einsatzleiter', 'Zugführer']);
  });

  it('sortiert alphabetisch', () => {
    const befehle = [
      createBefehl({ id: '1', nummer: 'B-001', befehlsgeberName: 'Zugführer' }),
      createBefehl({ id: '2', nummer: 'B-002', befehlsgeberName: 'Abschnittsleiter' }),
      createBefehl({ id: '3', nummer: 'B-003', befehlsgeberName: 'Einsatzleiter' }),
    ];

    expect(extractBefehlsgeberNames(befehle)).toEqual(['Abschnittsleiter', 'Einsatzleiter', 'Zugführer']);
  });
});
