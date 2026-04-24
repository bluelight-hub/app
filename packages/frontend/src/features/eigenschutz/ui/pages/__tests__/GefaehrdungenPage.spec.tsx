/**
 * Spec für `GefaehrdungenPage` (Story 2.1 Task 8).
 *
 * Die eigentliche Drawer-Logik wird separat getestet; hier fokussieren
 * wir uns auf den Primary-Button sowie den Empty-State.
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Drawer wird isoliert gerendert — die Unit-Tests des Drawers decken die
// Interna ab, hier reicht ein einfacher Stub mit Öffnen/Schließen + Fake-
// Success-Knopf (AC3-Navigation-Test).
vi.mock('../../organisms/GefaehrdungseditorDrawer.organism', () => ({
  GefaehrdungseditorDrawer: ({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) =>
    open ? (
      <div data-testid="drawer-stub">
        <button type="button" onClick={onClose} data-testid="drawer-stub-close">
          close
        </button>
        <button type="button" onClick={() => onCreated('beurteilung-1234')} data-testid="drawer-stub-success">
          success
        </button>
      </div>
    ) : null,
}));

import { GefaehrdungenPage } from '../GefaehrdungenPage';

describe('GefaehrdungenPage (Story 2.1 Task 8)', () => {
  const emptyStateDescription = 'Vorhandene Beurteilungen werden in dieser Ansicht nicht aufgeführt. Beim Anlegen prüft das System, ob die gewählte Einheit bereits eine Beurteilung hat.';

  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('rendert Heading, Subtext und Empty-State-Platzhalter', () => {
    renderWithProviders(<GefaehrdungenPage einsatzId="einsatz-1" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Gefährdungsbeurteilungen' })).toBeInTheDocument();
    expect(screen.getByText(/Pro Einheit eine Beurteilung/)).toBeInTheDocument();
    expect(screen.getByText('Beurteilung anlegen')).toBeInTheDocument();
    expect(screen.getByText(emptyStateDescription)).toBeInTheDocument();
    expect(screen.queryByText('Noch keine Beurteilungen')).not.toBeInTheDocument();
    expect(screen.queryByText(/Story 2\.4/)).not.toBeInTheDocument();
  });

  it('öffnet den Drawer bei Klick', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('drawer-stub')).toBeNull();
    await user.click(screen.getByTestId('gefaehrdungen-neue-beurteilung'));
    expect(screen.getByTestId('drawer-stub')).toBeInTheDocument();
  });

  it('navigiert nach erfolgreichem Anlegen in die Detail-Route (AC3)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="einsatz-42" />);

    await user.click(screen.getByTestId('gefaehrdungen-neue-beurteilung'));
    await user.click(screen.getByTestId('drawer-stub-success'));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id',
      params: { einsatzId: 'einsatz-42', id: 'beurteilung-1234' },
    });
    // Drawer schließt nach Erfolg — DOM-Element verschwindet.
    expect(screen.queryByTestId('drawer-stub')).toBeNull();
  });
});
