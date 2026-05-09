/**
 * Spec für `GefaehrdungenPage`.
 *
 * Fokus: echte Listen-Ansicht inkl. Loading/Error/Empty sowie Navigation in
 * die Detail-Erfassung.
 */

import { renderWithProviders } from '@/test/utils';
import { WorkspaceBlockingOverlayProvider } from '@/features/workspace/hooks/use-workspace-blocking-overlay';
import type { Gefaehrdungsbeurteilung } from '@bluelight-hub/shared/schemas';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockNavigate, mocks } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mocks: {
    beurteilungenQuery: {
      data: [] as Gefaehrdungsbeurteilung[],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    },
    einheitenQuery: {
      data: [] as Array<{ id: string; name: string }>,
    },
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/eigenschutz/api/queries', () => ({
  useGefaehrdungsbeurteilungen: () => mocks.beurteilungenQuery,
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheitenQuery,
}));

// Drawer wird isoliert gerendert — die Unit-Tests des Drawers decken die
// Interna ab, hier reicht ein einfacher Stub mit Öffnen/Schließen + Fake-
// Success-Knopf.
vi.mock('../../organisms/GefaehrdungseditorDrawer.organism', () => ({
  GefaehrdungseditorDrawer: ({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) =>
    open ? (
      <div data-testid="drawer-stub">
        <button type="button" onClick={onClose} data-testid="drawer-stub-close">
          close
        </button>
        <button type="button" onClick={() => onCreated('cbeurteilung0000000000001')} data-testid="drawer-stub-success">
          success
        </button>
      </div>
    ) : null,
}));

import { GefaehrdungenPage } from '../GefaehrdungenPage';

function buildBeurteilung(overrides: Partial<Gefaehrdungsbeurteilung> = {}): Gefaehrdungsbeurteilung {
  return {
    id: 'cbeurteilung0000000000001',
    einsatzId: 'ceinsatz000000000000001',
    einheitId: 'ceinheit000000000000001',
    vorlageId: null,
    gefahrenzoneId: null,
    items: [],
    version: 1,
    erstelltAm: '2026-04-24T08:00:00.000Z',
    erstelltVonUserId: 'user-create',
    aktualisiertAm: '2026-04-24T09:30:00.000Z',
    aktualisiertVonUserId: 'user-update',
    ...overrides,
  };
}

describe('GefaehrdungenPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mocks.beurteilungenQuery = {
      data: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };
    mocks.einheitenQuery = {
      data: [{ id: 'ceinheit000000000000001', name: 'RTW 1' }],
    };
  });

  it('rendert Heading, Subtext und echten leeren Listen-Zustand', () => {
    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Gefährdungsbeurteilungen' })).toBeInTheDocument();
    expect(screen.getByText(/Pro Einheit eine Beurteilung/)).toBeInTheDocument();
    expect(screen.getByText('Noch keine Gefährdungsbeurteilungen')).toBeInTheDocument();
    expect(screen.getByText('Lege die erste Beurteilung für eine Einheit an. Danach erscheint sie hier in der Übersicht.')).toBeInTheDocument();
    expect(screen.queryByText(/Story 2\.4/)).not.toBeInTheDocument();
  });

  it('zeigt den Loading-State der Liste', () => {
    mocks.beurteilungenQuery = {
      data: [],
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    };

    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    expect(screen.getByTestId('gefaehrdungen-list-loading')).toHaveTextContent('Lade Gefährdungsbeurteilungen');
  });

  it('zeigt den Error-State mit Retry', async () => {
    const refetch = vi.fn();
    const user = userEvent.setup();
    mocks.beurteilungenQuery = {
      data: [],
      isPending: false,
      isError: true,
      refetch,
    };

    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Gefährdungsbeurteilungen konnten nicht geladen werden.');
    await user.click(screen.getByTestId('gefaehrdungen-list-retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('öffnet den Drawer über Header-Button und Empty-State-Aktion', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    expect(screen.queryByTestId('drawer-stub')).toBeNull();
    await user.click(screen.getByTestId('gefaehrdungen-neue-beurteilung'));
    expect(screen.getByTestId('drawer-stub')).toBeInTheDocument();

    await user.click(screen.getByTestId('drawer-stub-close'));
    await user.click(screen.getByRole('button', { name: 'Erste Beurteilung anlegen' }));
    expect(screen.getByTestId('drawer-stub')).toBeInTheDocument();
  });

  it('öffnet den bestehenden Drawer per Action-Param und entfernt den Param beim Schließen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" initialAction="new-gefaehrdung" />);

    expect(screen.getByTestId('drawer-stub')).toBeInTheDocument();

    await user.click(screen.getByTestId('drawer-stub-close'));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/',
      params: { einsatzId: 'ceinsatz000000000000001' },
      search: expect.any(Function),
      replace: true,
    });
  });

  it('öffnet den bestehenden Drawer per N-Shortcut und zeigt die Shortcut-Hilfe per ?', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    await user.keyboard('n');
    expect(screen.getByTestId('drawer-stub')).toBeInTheDocument();

    await user.click(screen.getByTestId('drawer-stub-close'));
    await user.keyboard('?');
    expect(screen.getByTestId('eigenschutz-shortcut-help')).toHaveTextContent('Neue Gefährdungsbeurteilung');
  });

  it('blockiert N-Shortcut, wenn die Workspace-Shell ein Overlay offen hat', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkspaceBlockingOverlayProvider isBlocking>
        <GefaehrdungenPage einsatzId="ceinsatz000000000000001" />
      </WorkspaceBlockingOverlayProvider>,
    );

    await user.keyboard('n');

    expect(screen.queryByTestId('drawer-stub')).toBeNull();
  });

  it('rendert vorhandene Beurteilungen als Liste mit Einheitenname und Risiko', () => {
    mocks.beurteilungenQuery = {
      data: [
        buildBeurteilung({
          version: 3,
          items: [
            { title: 'Absicherung', eintritt: 'SELTEN', schaden: 'GERING', risikoklasse: 'GRUEN' },
            { title: 'Brandrauch', eintritt: 'OFT', schaden: 'HOCH', risikoklasse: 'ROT' },
          ],
        }),
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    expect(screen.getByTestId('gefaehrdungen-list')).toBeInTheDocument();
    expect(screen.getByText('RTW 1')).toBeInTheDocument();
    expect(screen.getByText('Version 3')).toBeInTheDocument();
    expect(screen.getByText('2 Gefährdungen')).toBeInTheDocument();
    expect(screen.getByText('Rot')).toBeInTheDocument();
    expect(screen.queryByText('Noch keine Gefährdungsbeurteilungen')).not.toBeInTheDocument();
  });

  it('navigiert beim Klick auf eine Listen-Beurteilung in die Detail-Route', async () => {
    const user = userEvent.setup();
    mocks.beurteilungenQuery = {
      data: [buildBeurteilung({ id: 'cbeurteilung0000000000002' })],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    await user.click(screen.getByTestId('gefaehrdungen-list-item-cbeurteilung0000000000002'));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id',
      params: { einsatzId: 'ceinsatz000000000000001', id: 'cbeurteilung0000000000002' },
    });
  });

  it('navigiert nach erfolgreichem Anlegen in die Detail-Route', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" />);

    await user.click(screen.getByTestId('gefaehrdungen-neue-beurteilung'));
    await user.click(screen.getByTestId('drawer-stub-success'));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id',
      params: { einsatzId: 'ceinsatz000000000000001', id: 'cbeurteilung0000000000001' },
    });
    expect(screen.queryByTestId('drawer-stub')).toBeNull();
  });

  it('navigiert aus dem Action-Param-Erfolgspfad direkt in die Detail-Route', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenPage einsatzId="ceinsatz000000000000001" initialAction="new-gefaehrdung" />);

    await user.click(screen.getByTestId('drawer-stub-success'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id',
      params: { einsatzId: 'ceinsatz000000000000001', id: 'cbeurteilung0000000000001' },
    });
  });
});
