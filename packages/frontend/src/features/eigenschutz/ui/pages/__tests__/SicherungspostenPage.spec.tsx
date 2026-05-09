/**
 * Spec für `SicherungspostenPage` (Story 4.1, T6).
 *
 * Komposition (Page → Liste + Drawer + Auflöse-Dialog) wird strukturell
 * geprüft. Repo-Pattern: kein vitest-axe — wir verifizieren A11y-relevante
 * Struktur (Heading-Hierarchie + zusammengebauten Subtree).
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

vi.mock('../../organisms/SicherungspostenList', () => ({
  SicherungspostenList: (props: { einsatzId: string; onCreate: () => void }) => (
    <div data-testid="sicherungsposten-list-stub" data-einsatz-id={props.einsatzId}>
      <button type="button" onClick={props.onCreate} data-testid="sicherungsposten-create-stub">
        anlegen
      </button>
    </div>
  ),
}));

vi.mock('../../organisms/SicherungspostenDrawer', () => ({
  SicherungspostenDrawer: (props: { einsatzId: string; mode: string; open: boolean }) => (
    <div data-testid="sicherungsposten-drawer-stub" data-einsatz-id={props.einsatzId} data-mode={props.mode} data-open={String(props.open)} />
  ),
}));

vi.mock('../../organisms/AufloeseSicherungspostenDialog', () => ({
  AufloeseSicherungspostenDialog: (props: { einsatzId: string; posten: unknown }) => (
    <div data-testid="aufloese-dialog-stub" data-einsatz-id={props.einsatzId} data-open={String(props.posten !== null)} />
  ),
}));

import { SicherungspostenPage } from '../SicherungspostenPage';

describe('SicherungspostenPage', () => {
  it('rendert Heading, Liste, Drawer und Auflöse-Dialog für die einsatzId (A11y-Struktur)', () => {
    renderWithProviders(<SicherungspostenPage einsatzId="einsatz-42" />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Sicherungsposten' });
    expect(heading).toBeInTheDocument();

    const list = screen.getByTestId('sicherungsposten-list-stub');
    expect(list.dataset.einsatzId).toBe('einsatz-42');

    const drawer = screen.getByTestId('sicherungsposten-drawer-stub');
    expect(drawer.dataset.einsatzId).toBe('einsatz-42');
    expect(drawer.dataset.open).toBe('false');

    const dialog = screen.getByTestId('aufloese-dialog-stub');
    expect(dialog.dataset.einsatzId).toBe('einsatz-42');
    expect(dialog.dataset.open).toBe('false');
  });

  it('öffnet den Create-Drawer per Action-Param', () => {
    renderWithProviders(<SicherungspostenPage einsatzId="einsatz-42" initialAction="new-sicherungsposten" />);

    const drawer = screen.getByTestId('sicherungsposten-drawer-stub');
    expect(drawer.dataset.mode).toBe('create');
    expect(drawer.dataset.open).toBe('true');
  });

  it('öffnet den Create-Drawer, wenn der Action-Param auf derselben Route nachträglich gesetzt wird', () => {
    const { rerender } = renderWithProviders(<SicherungspostenPage einsatzId="einsatz-42" />);

    expect(screen.getByTestId('sicherungsposten-drawer-stub').dataset.open).toBe('false');

    rerender(<SicherungspostenPage einsatzId="einsatz-42" initialAction="new-sicherungsposten" />);

    const drawer = screen.getByTestId('sicherungsposten-drawer-stub');
    expect(drawer.dataset.mode).toBe('create');
    expect(drawer.dataset.open).toBe('true');
  });

  it('öffnet den bestehenden Create-Flow weiterhin über die Liste', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SicherungspostenPage einsatzId="einsatz-42" />);

    await user.click(screen.getByTestId('sicherungsposten-create-stub'));

    expect(screen.getByTestId('sicherungsposten-drawer-stub').dataset.open).toBe('true');
  });
});
