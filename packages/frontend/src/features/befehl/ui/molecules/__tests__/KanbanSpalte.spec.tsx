/**
 * Unit Tests fuer KanbanSpalte Molecule
 *
 * Verifiziert:
 * - Header mit Label und Count-Badge
 * - BefehlKarten werden gerendert
 * - "Keine Befehle" bei leerer Liste
 * - role="region" mit korrektem aria-label
 * - KORRIGIERT-Befehle mit "Korrigiert"-Badge und opacity-60
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import type { KanbanBefehl } from '../../../hooks/use-kanban-gruppierung';
import { KanbanSpalte, type KanbanSpalteConfig } from '../KanbanSpalte.molecule';
import { createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';

// Mock BefehlKarte um interne Abhaengigkeiten zu vermeiden
vi.mock('../BefehlKarte.molecule', () => ({
  BefehlKarte: ({ nummer, auftrag }: { nummer: string; auftrag: string }) => <div data-testid={`befehl-karte-${nummer}`}>{auftrag}</div>,
}));

const DEFAULT_CONFIG: KanbanSpalteConfig = {
  label: 'Erteilt',
  headerBg: 'bg-blue-100 dark:bg-blue-900/40',
  headerText: 'text-blue-800 dark:text-blue-200',
};

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

function createKanbanBefehl(befehl: BefehlDto, opts: { istKorrigiert?: boolean } = {}): KanbanBefehl<BefehlDto> {
  return {
    befehl,
    spalte: 'ERTEILT',
    istKorrigiert: opts.istKorrigiert ?? false,
  };
}

describe('KanbanSpalte', () => {
  it('rendert Header mit Label und Count-Badge', () => {
    const befehle = [createKanbanBefehl(createBefehl({ id: '1', nummer: 'B2026-abc1' })), createKanbanBefehl(createBefehl({ id: '2', nummer: 'B2026-abc2' }))];

    renderWithProviders(<KanbanSpalte config={DEFAULT_CONFIG} befehle={befehle} einsatzId="einsatz-1" />);

    expect(screen.getByText('Erteilt')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('rendert BefehlKarten fuer jeden Befehl', () => {
    const befehle = [
      createKanbanBefehl(createBefehl({ id: '1', nummer: 'B2026-abc1', auftrag: 'Absperrung errichten' })),
      createKanbanBefehl(createBefehl({ id: '2', nummer: 'B2026-abc2', auftrag: 'Evakuierung starten' })),
    ];

    renderWithProviders(<KanbanSpalte config={DEFAULT_CONFIG} befehle={befehle} einsatzId="einsatz-1" />);

    expect(screen.getByTestId('befehl-karte-B2026-abc1')).toBeInTheDocument();
    expect(screen.getByTestId('befehl-karte-B2026-abc2')).toBeInTheDocument();
    expect(screen.getByText('Absperrung errichten')).toBeInTheDocument();
    expect(screen.getByText('Evakuierung starten')).toBeInTheDocument();
  });

  it('zeigt "Keine Befehle" bei leerer Liste', () => {
    renderWithProviders(<KanbanSpalte config={DEFAULT_CONFIG} befehle={[]} einsatzId="einsatz-1" />);

    expect(screen.getByText('Keine Befehle')).toBeInTheDocument();
  });

  it('hat role="region" mit korrektem aria-label (Plural)', () => {
    const befehle = [
      createKanbanBefehl(createBefehl({ id: '1', nummer: 'B2026-abc1' })),
      createKanbanBefehl(createBefehl({ id: '2', nummer: 'B2026-abc2' })),
      createKanbanBefehl(createBefehl({ id: '3', nummer: 'B2026-abc3' })),
    ];

    renderWithProviders(<KanbanSpalte config={DEFAULT_CONFIG} befehle={befehle} einsatzId="einsatz-1" />);

    const region = screen.getByRole('region', { name: /Erteilt – 3 Befehle/ });
    expect(region).toBeInTheDocument();
  });

  it('hat role="region" mit korrektem aria-label (Singular)', () => {
    const befehle = [createKanbanBefehl(createBefehl({ id: '1', nummer: 'B2026-abc1' }))];

    renderWithProviders(<KanbanSpalte config={DEFAULT_CONFIG} befehle={befehle} einsatzId="einsatz-1" />);

    const region = screen.getByRole('region', { name: /Erteilt – 1 Befehl$/ });
    expect(region).toBeInTheDocument();
  });

  it('zeigt KORRIGIERT-Befehle mit opacity-60 und "Korrigiert"-Badge', () => {
    const befehle = [createKanbanBefehl(createBefehl({ id: '1', nummer: 'B2026-korr', status: 'KORRIGIERT', auftrag: 'Korrigierter Befehl' }), { istKorrigiert: true })];

    renderWithProviders(<KanbanSpalte config={DEFAULT_CONFIG} befehle={befehle} einsatzId="einsatz-1" />);

    // Karte vorhanden
    expect(screen.getByTestId('befehl-karte-B2026-korr')).toBeInTheDocument();

    // Korrigiert-Badge vorhanden
    expect(screen.getByText('Korrigiert')).toBeInTheDocument();

    // opacity-60 auf Wrapper-Div
    const karteEl = screen.getByTestId('befehl-karte-B2026-korr');
    expect(karteEl.parentElement).toHaveClass('opacity-60');
  });

  it('zeigt keinen "Korrigiert"-Badge fuer normale Befehle', () => {
    const befehle = [createKanbanBefehl(createBefehl({ id: '1', nummer: 'B2026-abc1' }))];

    renderWithProviders(<KanbanSpalte config={DEFAULT_CONFIG} befehle={befehle} einsatzId="einsatz-1" />);

    expect(screen.queryByText('Korrigiert')).not.toBeInTheDocument();
  });
});
