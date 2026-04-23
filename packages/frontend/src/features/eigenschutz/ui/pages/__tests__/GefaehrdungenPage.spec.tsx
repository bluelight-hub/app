/**
 * Spec für `GefaehrdungenPage` (Story 2.1 Task 8, AC5 Permission-Gate).
 *
 * Die eigentliche Drawer-Logik wird separat getestet; hier fokussieren
 * wir uns auf das Permission-Gating des Primary-Buttons sowie den
 * Empty-State-Platzhalter.
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { permissionState, mockNavigate } = vi.hoisted(() => ({
  permissionState: {
    canCreateGefaehrdungsbeurteilung: true,
    isLoading: false,
    requiredPermission: 'eigenschutz:gefaehrdungsbeurteilung:write' as const,
  },
  mockNavigate: vi.fn(),
}));

vi.mock('@/features/eigenschutz/hooks/useEigenschutzPermissions', () => ({
  useEigenschutzPermissions: () => permissionState,
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
  beforeEach(() => {
    permissionState.canCreateGefaehrdungsbeurteilung = true;
    permissionState.isLoading = false;
    mockNavigate.mockReset();
  });

  it('rendert Heading, Subtext und Empty-State-Platzhalter', () => {
    renderWithProviders(<GefaehrdungenPage einsatzId="einsatz-1" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Gefährdungsbeurteilungen' })).toBeInTheDocument();
    expect(screen.getByText(/Pro Einheit eine Beurteilung/)).toBeInTheDocument();
    expect(screen.getByText('Noch keine Beurteilungen')).toBeInTheDocument();
  });

  it('disabled den Primary-Button bei fehlender Berechtigung inkl. aria-disabled und Tooltip', () => {
    permissionState.canCreateGefaehrdungsbeurteilung = false;
    renderWithProviders(<GefaehrdungenPage einsatzId="einsatz-1" />);

    const button = screen.getByTestId('gefaehrdungen-neue-beurteilung');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Fehlende Berechtigung: eigenschutz:gefaehrdungsbeurteilung:write');
  });

  it('öffnet den Drawer bei Klick, wenn Berechtigung vorhanden', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('drawer-stub')).toBeNull();
    await user.click(screen.getByTestId('gefaehrdungen-neue-beurteilung'));
    expect(screen.getByTestId('drawer-stub')).toBeInTheDocument();
  });

  it('öffnet den Drawer nicht, wenn Permission-Check noch lädt', async () => {
    const user = userEvent.setup();
    permissionState.isLoading = true;
    renderWithProviders(<GefaehrdungenPage einsatzId="einsatz-1" />);

    const button = screen.getByTestId('gefaehrdungen-neue-beurteilung');
    await user.click(button);
    expect(screen.queryByTestId('drawer-stub')).toBeNull();
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
