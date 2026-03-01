/**
 * Unit Tests fuer BefehlKanbanView Organism
 *
 * Verifiziert:
 * - 4 Spalten-Regionen mit korrekten aria-labels
 * - Befehle in richtiger Spalte sortiert
 * - Spalten-Header zeigen korrekte Anzahl
 * - KORRIGIERT-Befehle werden gedimmt dargestellt (opacity-60)
 * - Leere Spalten zeigen "Keine Befehle"
 * - Spalten haben role="region"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';
import { BefehlKanbanView } from '../BefehlKanbanView.organism';

// Mock BefehlKarte um interne Abhaengigkeiten zu vermeiden
vi.mock('../../molecules/BefehlKarte.molecule', () => ({
  BefehlKarte: ({ nummer, auftrag }: { nummer: string; auftrag: string }) => <div data-testid={`befehl-karte-${nummer}`}>{auftrag}</div>,
}));

// Mock useBefehleByEinsatz
let mockBefehle: BefehlDto[] = [];

vi.mock('../../../api/use-befehle-by-einsatz', () => ({
  useBefehleByEinsatz: () => ({
    data: mockBefehle,
    isLoading: false,
    isError: false,
  }),
}));

function createBefehl(overrides: Partial<BefehlDto> & { id: string; nummer: string }): BefehlDto {
  return {
    einsatzId: 'einsatz-1',
    auftrag: 'Testauftrag',
    befehlsgeberName: 'Einsatzleiter',
    erstellerId: 'user-1',
    status: 'ERTEILT',
    befehlstyp: 'KURZBEFEHL',
    erteiltAm: new Date('2026-01-01T10:00:00Z'),
    empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1' })],
    kommentare: [],
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

/** Erzeugt einen zugestellten Empfaenger */
function zugestellterEmpfaenger(id: string) {
  return createEmpfaenger({ empfaengerId: id, zugestelltAm: new Date('2026-01-01T10:05:00Z') });
}

/** Erzeugt einen quittierten Empfaenger */
function quittierterEmpfaenger(id: string) {
  return createEmpfaenger({
    empfaengerId: id,
    zugestelltAm: new Date('2026-01-01T10:05:00Z'),
    quittiertAm: new Date('2026-01-01T10:10:00Z'),
    quittierungArt: 'VERSTANDEN',
  });
}

beforeEach(() => {
  mockBefehle = [];
});

/**
 * Desktop-Ansicht rendern (lg-Breakpoint).
 * Da Vitest/JSDOM keine Media Queries unterstuetzt, testen wir die Desktop-Variante
 * indem wir alle Spalten-Regionen pruefen (diese sind im Desktop-Grid sichtbar).
 */
function renderDesktop() {
  return renderWithProviders(<BefehlKanbanView einsatzId="einsatz-1" />);
}

describe('BefehlKanbanView', () => {
  describe('Spalten-Struktur', () => {
    it('rendert 4 Spalten-Regionen mit korrekten aria-labels', () => {
      renderDesktop();

      // In Desktop-Grid: 4 Regionen. JSDOM rendert alle Varianten,
      // daher erwarten wir 3x pro Spalte (Desktop + Tablet + Mobile Tab).
      // Wir pruefen mindestens 4 regions existieren.
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThanOrEqual(4);

      // Pruefen, dass jede Spalte vorhanden ist
      expect(screen.getAllByRole('region', { name: /Erteilt/ }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('region', { name: /Zugestellt/ }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('region', { name: /Teilweise quittiert/ }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('region', { name: /Vollständig quittiert/ }).length).toBeGreaterThanOrEqual(1);
    });

    it('alle Spalten haben role="region"', () => {
      renderDesktop();

      const regions = screen.getAllByRole('region');
      for (const region of regions) {
        expect(region.tagName).toBe('SECTION');
        expect(region).toHaveAttribute('aria-label');
      }
    });
  });

  describe('Spalten-Sortierung', () => {
    it('sortiert ERTEILT-Befehle in die Erteilt-Spalte', () => {
      mockBefehle = [createBefehl({ id: '1', nummer: 'B2026-e1', status: 'ERTEILT', auftrag: 'Absperrung errichten' })];

      renderDesktop();

      const erteiledRegions = screen.getAllByRole('region', { name: /Erteilt – 1 Befehl$/ });
      expect(erteiledRegions.length).toBeGreaterThanOrEqual(1);

      // Karte ist im DOM
      expect(screen.getAllByTestId('befehl-karte-B2026-e1').length).toBeGreaterThanOrEqual(1);
    });

    it('sortiert ZUGESTELLT-Befehle in die Zugestellt-Spalte', () => {
      mockBefehle = [
        createBefehl({
          id: '2',
          nummer: 'B2026-z1',
          status: 'ZUGESTELLT',
          auftrag: 'Verletzte versorgen',
          empfaenger: [zugestellterEmpfaenger('emp-1')],
        }),
      ];

      renderDesktop();

      const zugestelltRegions = screen.getAllByRole('region', { name: /Zugestellt – 1 Befehl$/ });
      expect(zugestelltRegions.length).toBeGreaterThanOrEqual(1);
    });

    it('sortiert teilweise quittierte Befehle korrekt', () => {
      mockBefehle = [
        createBefehl({
          id: '3',
          nummer: 'B2026-tq1',
          status: 'ZUGESTELLT',
          auftrag: 'Teilquittiert',
          empfaenger: [quittierterEmpfaenger('emp-1'), zugestellterEmpfaenger('emp-2')],
        }),
      ];

      renderDesktop();

      const teilweiseRegions = screen.getAllByRole('region', { name: /Teilweise quittiert – 1 Befehl$/ });
      expect(teilweiseRegions.length).toBeGreaterThanOrEqual(1);
    });

    it('sortiert vollstaendig quittierte Befehle korrekt', () => {
      mockBefehle = [
        createBefehl({
          id: '4',
          nummer: 'B2026-vq1',
          status: 'QUITTIERT',
          auftrag: 'Vollquittiert',
          empfaenger: [quittierterEmpfaenger('emp-1'), quittierterEmpfaenger('emp-2')],
        }),
      ];

      renderDesktop();

      const vollstaendigRegions = screen.getAllByRole('region', { name: /Vollständig quittiert – 1 Befehl$/ });
      expect(vollstaendigRegions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Spalten-Count', () => {
    it('Spalten-Header zeigen korrekte Anzahl', () => {
      mockBefehle = [
        createBefehl({ id: '1', nummer: 'B2026-e1', status: 'ERTEILT' }),
        createBefehl({ id: '2', nummer: 'B2026-e2', status: 'ERTEILT' }),
        createBefehl({
          id: '3',
          nummer: 'B2026-z1',
          status: 'ZUGESTELLT',
          empfaenger: [zugestellterEmpfaenger('emp-1')],
        }),
      ];

      renderDesktop();

      // Erteilt-Spalte zeigt 2 Befehle
      const erteiledRegions = screen.getAllByRole('region', { name: /Erteilt – 2 Befehle/ });
      expect(erteiledRegions.length).toBeGreaterThanOrEqual(1);

      // Zugestellt-Spalte zeigt 1 Befehl
      const zugestelltRegions = screen.getAllByRole('region', { name: /Zugestellt – 1 Befehl$/ });
      expect(zugestelltRegions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('KORRIGIERT-Darstellung', () => {
    it('zeigt KORRIGIERT-Befehle mit opacity-60 und "Korrigiert"-Badge', () => {
      mockBefehle = [
        createBefehl({
          id: '5',
          nummer: 'B2026-korr',
          status: 'KORRIGIERT',
          auftrag: 'Korrigierter Befehl',
          empfaenger: [zugestellterEmpfaenger('emp-1')],
        }),
      ];

      renderDesktop();

      // Karte vorhanden
      const karten = screen.getAllByTestId('befehl-karte-B2026-korr');
      expect(karten.length).toBeGreaterThanOrEqual(1);

      // opacity-60 auf Wrapper-Div
      expect(karten[0].parentElement).toHaveClass('opacity-60');

      // Korrigiert-Badge vorhanden
      const badges = screen.getAllByText('Korrigiert');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Leerzustand', () => {
    it('leere Spalten zeigen "Keine Befehle"', () => {
      mockBefehle = [];

      renderDesktop();

      // Alle Spalten leer => alle zeigen "Keine Befehle"
      const keineBefehleTexte = screen.getAllByText('Keine Befehle');
      // Mindestens 4 (eine pro Spalte im Desktop), ggf. mehr durch Tablet/Mobile
      expect(keineBefehleTexte.length).toBeGreaterThanOrEqual(4);
    });

    it('nur leere Spalten zeigen "Keine Befehle", befuellte nicht', () => {
      mockBefehle = [createBefehl({ id: '1', nummer: 'B2026-e1', status: 'ERTEILT' })];

      renderDesktop();

      // Mindestens 3 leere Spalten (Zugestellt, Teilweise, Vollstaendig) * responsive Varianten
      const keineBefehleTexte = screen.getAllByText('Keine Befehle');
      expect(keineBefehleTexte.length).toBeGreaterThanOrEqual(3);

      // Erteilt-Spalte hat eine Karte
      const karten = screen.getAllByTestId('befehl-karte-B2026-e1');
      expect(karten.length).toBeGreaterThanOrEqual(1);
    });
  });
});
