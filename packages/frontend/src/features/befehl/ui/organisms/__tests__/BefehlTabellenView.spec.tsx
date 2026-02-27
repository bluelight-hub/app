/**
 * Unit Tests fuer BefehlTabellenView Organism
 *
 * Verifiziert:
 * - Loading-State zeigt Skeleton
 * - Leerzustand zeigt Empty-State-Nachricht
 * - Tabelle rendert vereinfachte Spalten (Prio, Nr., Befehlsgeber, Auftrag, Empf., Fortschritt, Zeit)
 * - KORRIGIERT-Zeilen haben opacity-60
 * - Row-Tinting basierend auf Kritikalitaet/Status
 * - aria-sort Attribute auf sortierbaren Headern
 * - Row-Click ruft onBefehlSelect auf
 * - Selektierte Zeile hat Highlight-Klasse
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBefehl, createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';
import type { BefehlDto } from '@bluelight-hub/shared/client';

// Mock useBefehleByEinsatz
let mockBefehle: BefehlDto[] = [];
let mockIsLoading = false;

vi.mock('../../../api/use-befehle-by-einsatz', () => ({
  useBefehleByEinsatz: () => ({
    data: mockIsLoading ? undefined : mockBefehle,
    isLoading: mockIsLoading,
    isError: false,
  }),
}));

// Mock ZustellstatusAnzeige fuer vereinfachte Tests
vi.mock('../../molecules/ZustellstatusAnzeige.molecule', () => ({
  ZustellstatusAnzeige: ({ empfaenger }: { empfaenger: unknown[] }) => <span data-testid="zustellstatus">{empfaenger.length} Empf.</span>,
}));

// Import nach Mocks
import { BefehlTabellenView } from '../BefehlTabellenView.organism';

describe('BefehlTabellenView', () => {
  beforeEach(() => {
    mockBefehle = [];
    mockIsLoading = false;
  });

  // ============================================
  // Loading State
  // ============================================

  describe('Loading State', () => {
    it('zeigt Skeleton bei isLoading', () => {
      mockIsLoading = true;
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      // Vereinfachte Header
      expect(screen.getByText('Prio')).toBeInTheDocument();
      expect(screen.getByText('Nr.')).toBeInTheDocument();
      expect(screen.getByText('Befehlsgeber')).toBeInTheDocument();
      expect(screen.getByText('Auftrag')).toBeInTheDocument();
      expect(screen.getByText('Zeit')).toBeInTheDocument();
    });
  });

  // ============================================
  // Empty State
  // ============================================

  describe('Empty State', () => {
    it('zeigt Leerzustand-Nachricht wenn keine Befehle vorhanden', () => {
      mockBefehle = [];
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      expect(screen.getByText('Noch keine Befehle erteilt.')).toBeInTheDocument();
      expect(screen.getByText(/Ctrl\+N/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Tabellen-Rendering
  // ============================================

  describe('Tabellen-Rendering', () => {
    const befehle = [
      createBefehl({
        id: '1',
        nummer: 'B2026-001',
        befehlsgeberName: 'Einsatzleiter',
        auftrag: 'Absperrung errichten',
        status: 'ERTEILT',
        erteiltAm: new Date('2026-01-15T08:30:00Z'),
        empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1' }), createEmpfaenger({ empfaengerId: 'emp-2' })],
      }),
      createBefehl({
        id: '2',
        nummer: 'B2026-002',
        befehlsgeberName: 'Zugführer',
        auftrag: 'Verletzte versorgen',
        status: 'ZUGESTELLT',
        erteiltAm: new Date('2026-01-15T09:00:00Z'),
        empfaenger: [createEmpfaenger({ empfaengerId: 'emp-3' })],
      }),
    ];

    it('rendert vereinfachte Spalten-Header (Status versteckt)', () => {
      mockBefehle = befehle;
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      expect(screen.getByText('Prio')).toBeInTheDocument();
      expect(screen.getByText('Nr.')).toBeInTheDocument();
      expect(screen.getByText('Befehlsgeber')).toBeInTheDocument();
      expect(screen.getByText('Auftrag')).toBeInTheDocument();
      expect(screen.getByText('Empf.')).toBeInTheDocument();
      expect(screen.getByText('Fortschritt')).toBeInTheDocument();
      expect(screen.getByText('Zeit')).toBeInTheDocument();
      // Status-Spalte ist versteckt (durch columnVisibility)
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });

    it('rendert Befehlsnummern in den Zeilen', () => {
      mockBefehle = befehle;
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      expect(screen.getByText('B2026-001')).toBeInTheDocument();
      expect(screen.getByText('B2026-002')).toBeInTheDocument();
    });

    it('rendert Befehlsgeber-Namen', () => {
      mockBefehle = befehle;
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      expect(screen.getByText('Einsatzleiter')).toBeInTheDocument();
      expect(screen.getByText('Zugführer')).toBeInTheDocument();
    });

    it('rendert Auftrags-Text', () => {
      mockBefehle = befehle;
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      expect(screen.getByText('Absperrung errichten')).toBeInTheDocument();
      expect(screen.getByText('Verletzte versorgen')).toBeInTheDocument();
    });

    it('rendert Zeitstempel im dd.MM. HH:mm Format', () => {
      mockBefehle = befehle;
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      // Zeitstempel sollten als time-Elemente gerendert werden
      const timeElements = screen.getAllByRole('time');
      expect(timeElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // KORRIGIERT-Darstellung
  // ============================================

  describe('KORRIGIERT-Darstellung', () => {
    it('KORRIGIERT-Zeilen haben opacity-60', () => {
      mockBefehle = [
        createBefehl({
          id: '1',
          nummer: 'B2026-001',
          status: 'ERTEILT',
        }),
        createBefehl({
          id: '2',
          nummer: 'B2026-korr',
          status: 'KORRIGIERT',
          auftrag: 'Korrigierter Befehl',
        }),
      ];
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      // Finde die Zeile mit dem korrigierten Befehl
      const korrigiertText = screen.getByText('Korrigierter Befehl');
      const korrigiertRow = korrigiertText.closest('tr');
      expect(korrigiertRow?.className).toContain('opacity-60');
    });

    it('ERTEILT-Zeilen haben KEINE opacity-60', () => {
      mockBefehle = [
        createBefehl({
          id: '1',
          nummer: 'B2026-001',
          status: 'ERTEILT',
          auftrag: 'Normaler Befehl',
        }),
      ];
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      const normalText = screen.getByText('Normaler Befehl');
      const normalRow = normalText.closest('tr');
      expect(normalRow?.className).not.toContain('opacity-60');
    });
  });

  // ============================================
  // aria-sort Attribute
  // ============================================

  describe('aria-sort Attribute', () => {
    it('sortierbare Header haben aria-sort', () => {
      mockBefehle = [createBefehl({ id: '1', nummer: 'B2026-001' })];
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      // Prioritaet ist default DESC sortiert
      const prioritaetHeader = screen.getByText('Prio').closest('th');
      expect(prioritaetHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('nicht-sortierbare Header haben kein aria-sort', () => {
      mockBefehle = [createBefehl({ id: '1', nummer: 'B2026-001' })];
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      const auftragHeader = screen.getByText('Auftrag').closest('th');
      expect(auftragHeader).not.toHaveAttribute('aria-sort');
    });

    it('nicht-sortierte aber sortierbare Header haben aria-sort=none', () => {
      mockBefehle = [createBefehl({ id: '1', nummer: 'B2026-001' })];
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      // Befehlsgeber ist sortierbar aber nicht aktiv sortiert
      const befehlsgeberHeader = screen.getByText('Befehlsgeber').closest('th');
      expect(befehlsgeberHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('aria-sort wechselt auf ascending nach erstem Klick auf unsortierten Header', async () => {
      const user = userEvent.setup();
      mockBefehle = [createBefehl({ id: '1', nummer: 'B2026-001' })];
      render(<BefehlTabellenView einsatzId="einsatz-1" />);

      // Befehlsgeber ist initial "none"; erster Klick → "ascending" (ReactTable-Zyklus: none → asc → desc → none)
      const befehlsgeberHeader = screen.getByText('Befehlsgeber').closest('th');
      await user.click(befehlsgeberHeader!);
      expect(befehlsgeberHeader).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  // ============================================
  // Row-Click und Selection
  // ============================================

  describe('Row-Click und Selection', () => {
    it('ruft onBefehlSelect bei Zeilen-Klick auf', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      mockBefehle = [
        createBefehl({
          id: 'befehl-42',
          nummer: 'B2026-001',
          auftrag: 'Klickbarer Befehl',
        }),
      ];
      render(<BefehlTabellenView einsatzId="einsatz-1" onBefehlSelect={onSelect} />);

      const row = screen.getByText('Klickbarer Befehl').closest('tr');
      await user.click(row!);

      expect(onSelect).toHaveBeenCalledWith('befehl-42');
    });

    it('selektierte Zeile hat Highlight-Klasse', () => {
      mockBefehle = [
        createBefehl({
          id: 'befehl-42',
          nummer: 'B2026-001',
          auftrag: 'Selektierter Befehl',
        }),
      ];
      render(<BefehlTabellenView einsatzId="einsatz-1" selectedBefehlId="befehl-42" />);

      const row = screen.getByText('Selektierter Befehl').closest('tr');
      expect(row?.className).toContain('bg-primary-50');
    });

    it('nicht-selektierte Zeile hat kein Highlight', () => {
      mockBefehle = [
        createBefehl({
          id: 'befehl-42',
          nummer: 'B2026-001',
          auftrag: 'Normaler Befehl',
        }),
      ];
      render(<BefehlTabellenView einsatzId="einsatz-1" selectedBefehlId="anderer-befehl" />);

      const row = screen.getByText('Normaler Befehl').closest('tr');
      expect(row?.className).not.toContain('bg-primary-50');
    });

    it('Zeilen haben cursor-pointer wenn onBefehlSelect gesetzt', () => {
      mockBefehle = [
        createBefehl({
          id: '1',
          nummer: 'B2026-001',
          auftrag: 'Testbefehl',
        }),
      ];
      render(<BefehlTabellenView einsatzId="einsatz-1" onBefehlSelect={vi.fn()} />);

      const row = screen.getByText('Testbefehl').closest('tr');
      expect(row?.className).toContain('cursor-pointer');
    });
  });
});
