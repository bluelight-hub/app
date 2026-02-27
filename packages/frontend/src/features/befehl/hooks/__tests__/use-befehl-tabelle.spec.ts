/**
 * Unit Tests fuer useBefehlTabelle Hook
 *
 * Verifiziert:
 * - Sortierung: Default (Nummer DESC), alle sortierbaren Spalten (asc/desc)
 * - Filter: Status (Multi-Select), Freitext (auftrag), Kombination
 * - Pagination: pageSize=20, Seitenwechsel, Reset bei Sortier-/Filter-Aenderung
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBefehl, createEmpfaenger } from '../../__fixtures__/befehl-test-utils';
import { useBefehlTabelle } from '../use-befehl-tabelle';

/** Hilfsfunktion: Gibt die Nummern der aktuell sichtbaren Zeilen zurueck */
function getVisibleNummern(result: ReturnType<typeof renderHook<ReturnType<typeof useBefehlTabelle>, unknown>>['result']) {
  return result.current.table.getRowModel().rows.map((r) => r.original.nummer);
}

describe('useBefehlTabelle', () => {
  // ============================================
  // Test-Daten
  // ============================================

  const testBefehle = [
    createBefehl({
      id: '1',
      nummer: 'B2026-001',
      befehlsgeberName: 'Alpha',
      auftrag: 'Absperrung errichten',
      status: 'ERTEILT',
      erteiltAm: new Date('2026-01-01T08:00:00Z'),
      empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1' })],
    }),
    createBefehl({
      id: '2',
      nummer: 'B2026-002',
      befehlsgeberName: 'Charlie',
      auftrag: 'Verletzte versorgen',
      status: 'ZUGESTELLT',
      erteiltAm: new Date('2026-01-01T10:00:00Z'),
      empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1' }), createEmpfaenger({ empfaengerId: 'emp-2' }), createEmpfaenger({ empfaengerId: 'emp-3' })],
    }),
    createBefehl({
      id: '3',
      nummer: 'B2026-003',
      befehlsgeberName: 'Bravo',
      auftrag: 'Einsatzleitung aufbauen',
      status: 'QUITTIERT',
      erteiltAm: new Date('2026-01-01T09:00:00Z'),
      empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1' }), createEmpfaenger({ empfaengerId: 'emp-2' })],
    }),
    createBefehl({
      id: '4',
      nummer: 'B2026-004',
      befehlsgeberName: 'Delta',
      auftrag: 'Sammelplatz einrichten',
      status: 'KORRIGIERT',
      erteiltAm: new Date('2026-01-01T11:00:00Z'),
      empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1' }), createEmpfaenger({ empfaengerId: 'emp-2' }), createEmpfaenger({ empfaengerId: 'emp-3' }), createEmpfaenger({ empfaengerId: 'emp-4' })],
    }),
    createBefehl({
      id: '5',
      nummer: 'B2026-005',
      befehlsgeberName: 'Echo',
      auftrag: 'Absperrung verstärken',
      status: 'ERTEILT',
      erteiltAm: new Date('2026-01-01T12:00:00Z'),
      empfaenger: [],
    }),
  ];

  // ============================================
  // Sortierung
  // ============================================

  describe('Sortierung', () => {
    it('sortiert default nach Prioritaet DESC (alle gleich → Original-Reihenfolge)', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      const nummern = getVisibleNummern(result);
      // Alle Befehle haben gleiche Prioritaet (NORMAL), stabile Sortierung → Original-Reihenfolge
      expect(nummern).toEqual(['B2026-001', 'B2026-002', 'B2026-003', 'B2026-004', 'B2026-005']);
    });

    it('sortiert nach Nummer ASC', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.table.getColumn('nummer')?.toggleSorting(false);
      });

      const nummern = getVisibleNummern(result);
      expect(nummern).toEqual(['B2026-001', 'B2026-002', 'B2026-003', 'B2026-004', 'B2026-005']);
    });

    it('sortiert nach Befehlsgeber ASC', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.table.getColumn('befehlsgeberName')?.toggleSorting(false);
      });

      const nummern = getVisibleNummern(result);
      // Alpha, Bravo, Charlie, Delta, Echo
      expect(nummern).toEqual(['B2026-001', 'B2026-003', 'B2026-002', 'B2026-004', 'B2026-005']);
    });

    it('sortiert nach Befehlsgeber DESC', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.table.getColumn('befehlsgeberName')?.toggleSorting(true);
      });

      const nummern = getVisibleNummern(result);
      // Echo, Delta, Charlie, Bravo, Alpha
      expect(nummern).toEqual(['B2026-005', 'B2026-004', 'B2026-002', 'B2026-003', 'B2026-001']);
    });

    it('sortiert nach Empfaenger-Count ASC', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.table.getColumn('empfaengerCount')?.toggleSorting(false);
      });

      const nummern = getVisibleNummern(result);
      // 0, 1, 2, 3, 4 Empfaenger
      expect(nummern).toEqual(['B2026-005', 'B2026-001', 'B2026-003', 'B2026-002', 'B2026-004']);
    });

    it('sortiert nach Empfaenger-Count DESC', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.table.getColumn('empfaengerCount')?.toggleSorting(true);
      });

      const nummern = getVisibleNummern(result);
      // 4, 3, 2, 1, 0 Empfaenger
      expect(nummern).toEqual(['B2026-004', 'B2026-002', 'B2026-003', 'B2026-001', 'B2026-005']);
    });

    it('Status-Spalte ist nicht sortierbar (durch Row-Tinting ersetzt)', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      const canSort = result.current.table.getColumn('status')?.getCanSort();
      expect(canSort).toBe(false);
    });

    it('sortiert nach Zeitpunkt ASC (aelteste zuerst)', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.table.getColumn('erteiltAm')?.toggleSorting(false);
      });

      const nummern = getVisibleNummern(result);
      // 08:00, 09:00, 10:00, 11:00, 12:00
      expect(nummern).toEqual(['B2026-001', 'B2026-003', 'B2026-002', 'B2026-004', 'B2026-005']);
    });

    it('sortiert nach Zeitpunkt DESC (neueste zuerst)', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.table.getColumn('erteiltAm')?.toggleSorting(true);
      });

      const nummern = getVisibleNummern(result);
      // 12:00, 11:00, 10:00, 09:00, 08:00
      expect(nummern).toEqual(['B2026-005', 'B2026-004', 'B2026-002', 'B2026-003', 'B2026-001']);
    });

    it('Auftrag ist nicht sortierbar', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      const canSort = result.current.table.getColumn('auftrag')?.getCanSort();
      expect(canSort).toBe(false);
    });

    it('Fortschritt ist nicht sortierbar', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      const canSort = result.current.table.getColumn('fortschritt')?.getCanSort();
      expect(canSort).toBe(false);
    });
  });

  // ============================================
  // Filter
  // ============================================

  describe('Filter', () => {
    it('filtert nach einzelnem Status', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.setStatusFilter(['ERTEILT']);
      });

      const statuses = result.current.table.getRowModel().rows.map((r) => r.original.status);
      expect(statuses).toEqual(['ERTEILT', 'ERTEILT']);
    });

    it('filtert nach mehreren Status', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.setStatusFilter(['ERTEILT', 'ZUGESTELLT']);
      });

      const rows = result.current.table.getRowModel().rows;
      expect(rows).toHaveLength(3);
      expect(rows.every((r) => ['ERTEILT', 'ZUGESTELLT'].includes(r.original.status))).toBe(true);
    });

    it('leerer Status-Filter zeigt alle Befehle', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.setStatusFilter(['ERTEILT']);
      });
      expect(result.current.table.getRowModel().rows).toHaveLength(2);

      act(() => {
        result.current.setStatusFilter([]);
      });
      expect(result.current.table.getRowModel().rows).toHaveLength(5);
    });

    it('Freitext-Filter durchsucht auftrag Feld', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.setFreitextFilter('Absperrung');
      });

      const nummern = getVisibleNummern(result);
      // B2026-001 "Absperrung errichten" und B2026-005 "Absperrung verstärken"
      expect(nummern).toHaveLength(2);
      expect(nummern).toContain('B2026-001');
      expect(nummern).toContain('B2026-005');
    });

    it('Freitext-Filter ist case-insensitive', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.setFreitextFilter('absperrung');
      });

      expect(result.current.table.getRowModel().rows).toHaveLength(2);
    });

    it('kombiniert Status- und Freitext-Filter', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      act(() => {
        result.current.setStatusFilter(['ERTEILT']);
        result.current.setFreitextFilter('verstärken');
      });

      const rows = result.current.table.getRowModel().rows;
      expect(rows).toHaveLength(1);
      expect(rows[0].original.nummer).toBe('B2026-005');
    });
  });

  // ============================================
  // Pagination
  // ============================================

  describe('Pagination', () => {
    /** Erzeugt N Befehle fuer Pagination-Tests */
    function createManyBefehle(count: number) {
      return Array.from({ length: count }, (_, i) =>
        createBefehl({
          id: `p-${i + 1}`,
          nummer: `B2026-${String(i + 1).padStart(3, '0')}`,
          auftrag: `Auftrag ${i + 1}`,
          erteiltAm: new Date(`2026-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
        }),
      );
    }

    it('zeigt maximal 20 Eintraege pro Seite', () => {
      const befehle = createManyBefehle(25);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      expect(result.current.table.getRowModel().rows).toHaveLength(20);
      expect(result.current.pagination.pageSize).toBe(20);
    });

    it('Seitenwechsel zeigt restliche Eintraege', () => {
      const befehle = createManyBefehle(25);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      act(() => {
        result.current.table.setPageIndex(1);
      });

      expect(result.current.table.getRowModel().rows).toHaveLength(5);
    });

    it('reset auf Seite 1 bei Status-Filter-Aenderung', () => {
      const befehle = createManyBefehle(25);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      // Auf Seite 2 wechseln
      act(() => {
        result.current.table.setPageIndex(1);
      });
      expect(result.current.pagination.pageIndex).toBe(1);

      // Filter aendern -> Seite zurueck auf 0
      act(() => {
        result.current.setStatusFilter(['ERTEILT']);
      });
      expect(result.current.pagination.pageIndex).toBe(0);
    });

    it('reset auf Seite 1 bei Freitext-Filter-Aenderung', () => {
      const befehle = createManyBefehle(25);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      act(() => {
        result.current.table.setPageIndex(1);
      });
      expect(result.current.pagination.pageIndex).toBe(1);

      act(() => {
        result.current.setFreitextFilter('Auftrag');
      });
      expect(result.current.pagination.pageIndex).toBe(0);
    });

    it('reset auf Seite 1 bei Sortier-Aenderung', () => {
      const befehle = createManyBefehle(25);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      act(() => {
        result.current.table.setPageIndex(1);
      });
      expect(result.current.pagination.pageIndex).toBe(1);

      act(() => {
        result.current.table.getColumn('nummer')?.toggleSorting(false);
      });
      expect(result.current.pagination.pageIndex).toBe(0);
    });

    it('getPageCount gibt korrekte Seitenzahl zurueck', () => {
      const befehle = createManyBefehle(45);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      expect(result.current.table.getPageCount()).toBe(3);
    });

    it('pageCount ist 1 bei exakt 20 Eintraegen (Grenzfall)', () => {
      const befehle = createManyBefehle(20);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      expect(result.current.table.getRowModel().rows).toHaveLength(20);
      expect(result.current.table.getPageCount()).toBe(1);
    });

    it('pageCount ist 2 bei exakt 21 Eintraegen (Grenzfall)', () => {
      const befehle = createManyBefehle(21);
      const { result } = renderHook(() => useBefehlTabelle(befehle));

      expect(result.current.table.getPageCount()).toBe(2);
      expect(result.current.table.getRowModel().rows).toHaveLength(20);
    });
  });

  // ============================================
  // Return-Werte
  // ============================================

  describe('Return-Werte', () => {
    it('gibt alle erwarteten Werte zurueck', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      expect(result.current.table).toBeDefined();
      expect(result.current.sorting).toEqual([{ id: 'prioritaet', desc: true }]);
      expect(result.current.statusFilter).toEqual([]);
      expect(result.current.setStatusFilter).toBeInstanceOf(Function);
      expect(result.current.freitextFilter).toBe('');
      expect(result.current.setFreitextFilter).toBeInstanceOf(Function);
      expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 20 });
    });

    it('hat 8 Spalten definiert (inkl. Prioritaet)', () => {
      const { result } = renderHook(() => useBefehlTabelle(testBefehle));

      const headers = result.current.table.getAllColumns();
      expect(headers).toHaveLength(8);
    });
  });
});
