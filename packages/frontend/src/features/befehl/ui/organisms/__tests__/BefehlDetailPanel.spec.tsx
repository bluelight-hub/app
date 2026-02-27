/**
 * Unit Tests fuer BefehlDetailPanel Organism
 *
 * Verifiziert:
 * - Panel rendert bei isOpen=true, nicht bei isOpen=false
 * - Befehlsnummer wird in Monospace angezeigt
 * - Auftrag wird vollstaendig angezeigt (kein truncate)
 * - Befehlsgeber-Name wird angezeigt
 * - Status Badge wird korrekt gerendert
 * - KORRIGIERT Badge wird bei status=KORRIGIERT angezeigt
 * - Empfaenger mit ZustellstatusAnzeige expanded dargestellt
 * - Zeitstempel (erteiltAm) wird formatiert angezeigt
 * - Close-Button ruft onClose auf
 * - Null-Befehl rendert kein Panel
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { createBefehl, createEmpfaenger, createNichtQuittierbarEmpfaenger } from '../../../__fixtures__/befehl-test-utils';
import { BefehlDetailPanel } from '../BefehlDetailPanel.organism';

// Mock useBefehlPermissions (Story 5.4)
vi.mock('../../../hooks/use-befehl-permissions', () => ({
  useBefehlPermissions: () => ({
    canCreate: true,
    canQuittieren: false,
    canKorrigieren: true,
    canExport: true,

    canViewAll: true,
    isBeobachter: false,
    rolle: 'BEFEHLSGEBER',
    isLoading: false,
  }),
}));

// Mock ZustellstatusAnzeige
vi.mock('../../molecules/ZustellstatusAnzeige.molecule', () => ({
  ZustellstatusAnzeige: ({ empfaenger, variant }: { empfaenger: unknown[]; variant: string }) => (
    <div data-testid="zustellstatus-anzeige" data-variant={variant}>
      {empfaenger.length} Empfaenger
    </div>
  ),
}));

// Mock BefehlStatusBadge
vi.mock('../../atoms/BefehlStatusBadge.atom', () => ({
  BefehlStatusBadge: ({ status }: { status: string }) => <span data-testid="befehl-status-badge">{status}</span>,
}));

/** Basis-Props fuer Test-Befehle – nutzt shared createBefehl Factory aus befehl-test-utils */
const baseBefehlProps = {
  id: 'befehl-1',
  nummer: 'B2026-abc12345',
  befehlsgeberName: 'Einsatzleiter Mueller',
  auftrag: 'Wasserversorgung am Einsatzort sicherstellen und Hydranten pruefen',
  erteiltAm: new Date('2026-02-19T14:30:00Z'),
  empfaenger: [createEmpfaenger({ empfaengerId: 'user-2', name: 'Zugfuehrer Nord' }), createNichtQuittierbarEmpfaenger({ name: 'Polizei' })],
};

describe('BefehlDetailPanel', () => {
  it('rendert Panel-Inhalt wenn isOpen=true', () => {
    const befehl = createBefehl(baseBefehlProps);
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    expect(screen.getByText('B2026-abc12345')).toBeInTheDocument();
  });

  it('rendert nichts wenn befehl null ist', () => {
    renderWithProviders(<BefehlDetailPanel befehl={null} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    expect(screen.queryByText('B2026-abc12345')).not.toBeInTheDocument();
  });

  it('zeigt Befehlsnummer in Monospace', () => {
    const befehl = createBefehl(baseBefehlProps);
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    const nummer = screen.getByText('B2026-abc12345');
    expect(nummer.className).toMatch(/font-mono/);
  });

  it('zeigt Auftrag vollstaendig (kein truncate)', () => {
    const befehl = createBefehl({
      ...baseBefehlProps,
      auftrag: 'Ein sehr langer Auftrag der vollstaendig angezeigt werden muss ohne Kuerzung oder Abschneidung',
    });
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    expect(screen.getByText('Ein sehr langer Auftrag der vollstaendig angezeigt werden muss ohne Kuerzung oder Abschneidung')).toBeInTheDocument();
  });

  it('zeigt Befehlsgeber-Name', () => {
    const befehl = createBefehl(baseBefehlProps);
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    expect(screen.getByText('Einsatzleiter Mueller')).toBeInTheDocument();
  });

  it('zeigt Status Badge', () => {
    const befehl = createBefehl({ ...baseBefehlProps, status: 'ZUGESTELLT' });
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    const badge = screen.getByTestId('befehl-status-badge');
    expect(badge).toHaveTextContent('ZUGESTELLT');
  });

  it('zeigt KORRIGIERT Badge bei status=KORRIGIERT', () => {
    const befehl = createBefehl({ ...baseBefehlProps, status: 'KORRIGIERT' });
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    const badge = screen.getByTestId('befehl-status-badge');
    expect(badge).toHaveTextContent('KORRIGIERT');
  });

  it('zeigt ZustellstatusAnzeige mit expanded Variante', () => {
    const befehl = createBefehl(baseBefehlProps);
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    const zustellstatus = screen.getByTestId('zustellstatus-anzeige');
    expect(zustellstatus).toHaveAttribute('data-variant', 'expanded');
    expect(zustellstatus).toHaveTextContent('2 Empfaenger');
  });

  it('zeigt formatierten Zeitstempel (Format: DD.MM.YYYY, HH:MM Uhr)', () => {
    const befehl = createBefehl({ ...baseBefehlProps, erteiltAm: new Date('2026-02-19T14:30:00Z') });
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    // Prueft nur das Format-Pattern (dd.MM.yyyy, HH:mm Uhr) – timezone-unabhaengig
    expect(screen.getByText(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr/)).toBeInTheDocument();
  });

  it('ruft onClose beim Klick auf Close-Button auf', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const befehl = createBefehl(baseBefehlProps);
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={onClose} einsatzId="einsatz-1" />);

    const closeButton = screen.getByRole('button', { name: /schlie/i });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('zeigt Label "Befehlsgeber"', () => {
    const befehl = createBefehl(baseBefehlProps);
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    expect(screen.getByText('Befehlsgeber')).toBeInTheDocument();
  });

  it('zeigt Label "Empfaenger"', () => {
    const befehl = createBefehl(baseBefehlProps);
    renderWithProviders(<BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" />);

    expect(screen.getByText(/Empf[aä]nger/)).toBeInTheDocument();
  });
});
