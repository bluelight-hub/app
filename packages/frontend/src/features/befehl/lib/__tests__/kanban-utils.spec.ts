/**
 * Unit Tests fuer getKanbanSpalte
 *
 * Verifiziert die Kanban-Spalten-Zuordnung basierend auf Befehl-Status und Empfaenger-Quittierungen.
 * KORRIGIERT ist kein separater Spaltentyp - wird anhand der Empfaenger-Daten einsortiert.
 */

import { describe, it, expect } from 'vitest';
import { getKanbanSpalte } from '../befehl-utils';
import { createEmpfaenger, createNichtQuittierbarEmpfaenger } from '../../__fixtures__/befehl-test-utils';

describe('getKanbanSpalte', () => {
  it('ERTEILT-Status → ERTEILT Spalte', () => {
    const result = getKanbanSpalte({
      status: 'ERTEILT',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1' })],
    });

    expect(result).toBe('ERTEILT');
  });

  it('ZUGESTELLT mit 0 Quittierungen → ZUGESTELLT Spalte', () => {
    const result = getKanbanSpalte({
      status: 'ZUGESTELLT',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: new Date() }), createEmpfaenger({ empfaengerId: 'user-2', zugestelltAm: new Date() })],
    });

    expect(result).toBe('ZUGESTELLT');
  });

  it('ZUGESTELLT mit teilweiser Quittierung (1/3) → TEILWEISE_QUITTIERT', () => {
    const result = getKanbanSpalte({
      status: 'ZUGESTELLT',
      empfaenger: [
        createEmpfaenger({ empfaengerId: 'user-1', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
        createEmpfaenger({ empfaengerId: 'user-2', zugestelltAm: new Date() }),
        createEmpfaenger({ empfaengerId: 'user-3', zugestelltAm: new Date() }),
      ],
    });

    expect(result).toBe('TEILWEISE_QUITTIERT');
  });

  it('ZUGESTELLT mit allen quittiert (3/3) → VOLLSTAENDIG_QUITTIERT', () => {
    const result = getKanbanSpalte({
      status: 'ZUGESTELLT',
      empfaenger: [
        createEmpfaenger({ empfaengerId: 'user-1', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
        createEmpfaenger({ empfaengerId: 'user-2', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
        createEmpfaenger({ empfaengerId: 'user-3', quittiertAm: new Date(), quittierungArt: 'RUECKFRAGE' }),
      ],
    });

    expect(result).toBe('VOLLSTAENDIG_QUITTIERT');
  });

  it('QUITTIERT (Backend-Status) mit allen quittiert → VOLLSTAENDIG_QUITTIERT', () => {
    const result = getKanbanSpalte({
      status: 'QUITTIERT',
      empfaenger: [
        createEmpfaenger({ empfaengerId: 'user-1', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
        createEmpfaenger({ empfaengerId: 'user-2', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
      ],
    });

    expect(result).toBe('VOLLSTAENDIG_QUITTIERT');
  });

  it('QUITTIERT (Backend-Status) mit 0 Quittierungen → VOLLSTAENDIG_QUITTIERT (AC1: Status hat Vorrang)', () => {
    // Edge Case: Backend hat Status QUITTIERT gesetzt, aber Empfaenger-Daten sind inkonsistent
    const result = getKanbanSpalte({
      status: 'QUITTIERT',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: new Date() }), createEmpfaenger({ empfaengerId: 'user-2', zugestelltAm: new Date() })],
    });

    expect(result).toBe('VOLLSTAENDIG_QUITTIERT');
  });

  it('QUITTIERT (Backend-Status) mit nur nicht-quittierbaren Empfaengern → VOLLSTAENDIG_QUITTIERT', () => {
    const result = getKanbanSpalte({
      status: 'QUITTIERT',
      empfaenger: [createNichtQuittierbarEmpfaenger({ name: 'Polizei' }), createNichtQuittierbarEmpfaenger({ name: 'Leitstelle' })],
    });

    expect(result).toBe('VOLLSTAENDIG_QUITTIERT');
  });

  it('KORRIGIERT mit 0 Quittierungen → ZUGESTELLT', () => {
    const result = getKanbanSpalte({
      status: 'KORRIGIERT',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: new Date() }), createEmpfaenger({ empfaengerId: 'user-2', zugestelltAm: new Date() })],
    });

    expect(result).toBe('ZUGESTELLT');
  });

  it('KORRIGIERT mit teilweiser Quittierung → TEILWEISE_QUITTIERT', () => {
    const result = getKanbanSpalte({
      status: 'KORRIGIERT',
      empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }), createEmpfaenger({ empfaengerId: 'user-2', zugestelltAm: new Date() })],
    });

    expect(result).toBe('TEILWEISE_QUITTIERT');
  });

  it('leere Empfaenger-Liste → ZUGESTELLT (0/0 = kein quittiert)', () => {
    const result = getKanbanSpalte({
      status: 'ZUGESTELLT',
      empfaenger: [],
    });

    expect(result).toBe('ZUGESTELLT');
  });

  it('nicht-quittierbare Empfaenger werden NICHT mitgezaehlt', () => {
    const result = getKanbanSpalte({
      status: 'ZUGESTELLT',
      empfaenger: [
        createEmpfaenger({ empfaengerId: 'user-1', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
        createNichtQuittierbarEmpfaenger({ name: 'Polizei', zugestelltAm: new Date() }),
        createNichtQuittierbarEmpfaenger({ name: 'Leitstelle', zugestelltAm: new Date() }),
      ],
    });

    // 1/1 quittierbar quittiert → VOLLSTAENDIG, nicht 1/3
    expect(result).toBe('VOLLSTAENDIG_QUITTIERT');
  });

  it('nur nicht-quittierbare Empfaenger → ZUGESTELLT (0/0)', () => {
    const result = getKanbanSpalte({
      status: 'ZUGESTELLT',
      empfaenger: [createNichtQuittierbarEmpfaenger({ name: 'Polizei' }), createNichtQuittierbarEmpfaenger({ name: 'Leitstelle' })],
    });

    expect(result).toBe('ZUGESTELLT');
  });
});
