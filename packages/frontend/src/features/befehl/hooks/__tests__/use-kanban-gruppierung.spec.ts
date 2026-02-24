/**
 * Unit Tests fuer useKanbanGruppierung Hook
 *
 * Verifiziert:
 * - Korrekte Gruppierung in 4 Kanban-Spalten
 * - KORRIGIERT-Befehle erhalten istKorrigiert=true
 * - Leere Liste gibt leere Spalten
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKanbanGruppierung } from '../use-kanban-gruppierung';
import { createEmpfaenger } from '../../__fixtures__/befehl-test-utils';

describe('useKanbanGruppierung', () => {
  it('gruppiert Befehle korrekt in 4 Spalten', () => {
    const befehle = [
      {
        id: '1',
        status: 'ERTEILT',
        empfaenger: [createEmpfaenger({ empfaengerId: 'user-1' })],
      },
      {
        id: '2',
        status: 'ZUGESTELLT',
        empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: new Date() })],
      },
      {
        id: '3',
        status: 'ZUGESTELLT',
        empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }), createEmpfaenger({ empfaengerId: 'user-2', zugestelltAm: new Date() })],
      },
      {
        id: '4',
        status: 'ZUGESTELLT',
        empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' })],
      },
    ];

    const { result } = renderHook(() => useKanbanGruppierung(befehle));

    expect(result.current.ERTEILT).toHaveLength(1);
    expect(result.current.ERTEILT[0].befehl.id).toBe('1');

    expect(result.current.ZUGESTELLT).toHaveLength(1);
    expect(result.current.ZUGESTELLT[0].befehl.id).toBe('2');

    expect(result.current.TEILWEISE_QUITTIERT).toHaveLength(1);
    expect(result.current.TEILWEISE_QUITTIERT[0].befehl.id).toBe('3');

    expect(result.current.VOLLSTAENDIG_QUITTIERT).toHaveLength(1);
    expect(result.current.VOLLSTAENDIG_QUITTIERT[0].befehl.id).toBe('4');
  });

  it('KORRIGIERT-Befehle haben istKorrigiert=true', () => {
    const befehle = [
      {
        id: '1',
        status: 'KORRIGIERT',
        empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: new Date() })],
      },
      {
        id: '2',
        status: 'ZUGESTELLT',
        empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', zugestelltAm: new Date() })],
      },
    ];

    const { result } = renderHook(() => useKanbanGruppierung(befehle));

    // KORRIGIERT-Befehl in ZUGESTELLT mit istKorrigiert=true
    const korrigiert = result.current.ZUGESTELLT.find((kb) => kb.befehl.id === '1');
    expect(korrigiert).toBeDefined();
    expect(korrigiert!.istKorrigiert).toBe(true);

    // Normaler Befehl hat istKorrigiert=false
    const normal = result.current.ZUGESTELLT.find((kb) => kb.befehl.id === '2');
    expect(normal).toBeDefined();
    expect(normal!.istKorrigiert).toBe(false);
  });

  it('leere Liste gibt leere Spalten', () => {
    const { result } = renderHook(() => useKanbanGruppierung([]));

    expect(result.current.ERTEILT).toHaveLength(0);
    expect(result.current.ZUGESTELLT).toHaveLength(0);
    expect(result.current.TEILWEISE_QUITTIERT).toHaveLength(0);
    expect(result.current.VOLLSTAENDIG_QUITTIERT).toHaveLength(0);
  });
});
