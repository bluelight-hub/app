/**
 * Spec für die `EigenschutzEntryPage`.
 *
 * Die EntryPage ist seit der Wayfinding-Überarbeitung schlank: sie rendert
 * Header + Shortcut-Help-Popover + `AmpelDashboard`. Die bisherige
 * Sub-Bereich-Nav-Liste lebt nun als `EigenschutzSubNav` in der Layout-
 * Route und wird hier nicht mehr erwartet.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

vi.mock('../../organisms/AmpelDashboard', () => ({
  AmpelDashboard: ({ einsatzId }: { readonly einsatzId: string }) => <section data-testid="ampel-dashboard">Dashboard {einsatzId}</section>,
}));

import { EigenschutzEntryPage } from '../EigenschutzEntryPage';

afterEach(() => {
  vi.clearAllMocks();
});

describe('EigenschutzEntryPage', () => {
  it('rendert Überschrift und Subtext', () => {
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Eigenschutz' })).toBeInTheDocument();
    expect(screen.getByText(/Arbeitsschutz und Sicherheitsmaßnahmen/)).toBeInTheDocument();
  });

  it('rendert das AmpelDashboard als zentrale Arbeitsfläche', () => {
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    expect(screen.getByTestId('ampel-dashboard')).toHaveTextContent('Dashboard einsatz-1');
  });

  it('blendet Dashboard und Shortcut-Help-Popover ohne einsatzId aus', () => {
    renderWithProviders(<EigenschutzEntryPage />);

    expect(screen.queryByTestId('ampel-dashboard')).toBeNull();
    expect(screen.queryByTestId('eigenschutz-shortcut-help-trigger')).toBeNull();
  });

  it('rendert keine inline Sicherungsposten-Übersichts-Section mehr (eigener Tab in EigenschutzSubNav)', () => {
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('sicherungsposten-overview-section')).toBeNull();
  });

  it('rendert keinen eigenen Sub-Bereich-Nav-Block mehr (Wayfinding lebt in der Layout-Route)', () => {
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('eigenschutz-gefaehrdungen-link')).toBeNull();
    expect(screen.queryByTestId('eigenschutz-sicherheitsregeln-link')).toBeNull();
    expect(screen.queryByTestId('eigenschutz-psa-profile-link')).toBeNull();
    expect(screen.queryByTestId('eigenschutz-sicherungsposten-link')).toBeNull();
    expect(screen.queryByTestId('eigenschutz-vorfaelle-link')).toBeNull();
    expect(screen.queryByTestId('eigenschutz-sync-konflikte-link')).toBeNull();
  });

  it('zeigt im Dashboard nur tatsächlich aktive Shortcut-Hilfe-Einträge', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    await user.click(screen.getByTestId('eigenschutz-shortcut-help-trigger'));

    const help = screen.getByTestId('eigenschutz-shortcut-help');
    expect(help).toHaveTextContent('Tastaturhilfe');
    expect(help).not.toHaveTextContent('Neue Gefährdungsbeurteilung');
    expect(help).not.toHaveTextContent('Vorfall melden');
  });
});
