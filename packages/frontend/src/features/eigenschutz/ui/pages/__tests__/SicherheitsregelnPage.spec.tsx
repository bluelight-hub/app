/**
 * Spec für `SicherheitsregelnPage` (Story 2.6, Task 9.4).
 *
 * Fokus: Listen-/Empty-/Loading-/Error-States, Drawer-Interaktion
 * (Create vs. Edit), Zeile-Klick → Edit-Modus.
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EINSATZ_ID = 'cl1einsatzidforsicherheit';
const REGEL_ID = 'cl1sicherheitsregelxxxxxxxxxx';
const EINHEIT_ID = 'cl1einheitrettungstrupp1';

const { mocks, drawerProps } = vi.hoisted(() => ({
  mocks: {
    regelnQuery: {
      data: [] as unknown[],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    },
    einheitenQuery: {
      data: [] as Array<{ id: string; name: string }>,
    },
  },
  drawerProps: {
    lastOpen: false,
    lastRegel: undefined as unknown,
    closeCount: 0,
  },
}));

vi.mock('@/features/eigenschutz/api/queries', () => ({
  useSicherheitsregeln: () => mocks.regelnQuery,
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheitenQuery,
}));

vi.mock('@/features/eigenschutz/ui/organisms/SicherheitsregelDrawer', () => ({
  SicherheitsregelDrawer: ({ open, onClose, regel }: { open: boolean; onClose: () => void; regel?: unknown }) => {
    drawerProps.lastOpen = open;
    drawerProps.lastRegel = regel;
    return open ? (
      <div data-testid="sicherheitsregel-drawer-mock">
        <span data-testid="sicherheitsregel-drawer-mode">{regel ? 'edit' : 'create'}</span>
        <button
          type="button"
          onClick={() => {
            drawerProps.closeCount += 1;
            onClose();
          }}
          data-testid="sicherheitsregel-drawer-close"
        >
          close
        </button>
      </div>
    ) : null;
  },
}));

import { SicherheitsregelnPage } from '../SicherheitsregelnPage';

beforeEach(() => {
  mocks.regelnQuery.data = [];
  mocks.regelnQuery.isPending = false;
  mocks.regelnQuery.isError = false;
  mocks.regelnQuery.refetch = vi.fn();
  mocks.einheitenQuery.data = [{ id: EINHEIT_ID, name: 'Rettungstrupp 1' }];
  drawerProps.lastOpen = false;
  drawerProps.lastRegel = undefined;
  drawerProps.closeCount = 0;
});

describe('SicherheitsregelnPage', () => {
  it('rendert Empty-State, wenn keine Regeln vorhanden', () => {
    renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} />);
    expect(screen.getByText(/Noch keine Sicherheitsregeln/i)).toBeInTheDocument();
  });

  it('rendert Loading-State', () => {
    mocks.regelnQuery.isPending = true;
    renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} />);
    expect(screen.getByTestId('sicherheitsregeln-list-loading')).toBeInTheDocument();
  });

  it('rendert Error-State mit Retry-Button', async () => {
    mocks.regelnQuery.isError = true;
    const user = userEvent.setup();
    renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} />);
    expect(screen.getByTestId('sicherheitsregeln-list-error')).toBeInTheDocument();
    await user.click(screen.getByTestId('sicherheitsregeln-list-retry'));
    expect(mocks.regelnQuery.refetch).toHaveBeenCalled();
  });

  it('rendert aktive Regeln mit Zuordnung und Version', () => {
    mocks.regelnQuery.data = [
      {
        id: REGEL_ID,
        einsatzId: EINSATZ_ID,
        einheitId: null,
        einsatzweit: true,
        titel: 'Absperrung 20 m',
        inhalt: 'Rund um die Einsatzstelle 20 m Abstand halten.',
        version: 2,
        erstelltAm: '2026-04-24T10:00:00.000Z',
        erstelltVonUserId: 'u1',
        aktualisiertAm: '2026-04-24T12:00:00.000Z',
        aktualisiertVonUserId: 'u1',
        propagationGroupId: 'g1',
      },
      {
        id: 'cl1sicherheitsregeleinheit1',
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        einsatzweit: false,
        titel: 'Sichtkontakt nach Funkspruch',
        inhalt: 'Sichtkontakt zur Führung alle 10 Minuten.',
        version: 1,
        erstelltAm: '2026-04-24T10:00:00.000Z',
        erstelltVonUserId: 'u1',
        aktualisiertAm: '2026-04-24T11:00:00.000Z',
        aktualisiertVonUserId: 'u1',
        propagationGroupId: 'g2',
      },
    ];
    renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} />);
    expect(screen.getByText('Absperrung 20 m')).toBeInTheDocument();
    expect(screen.getByText('Sichtkontakt nach Funkspruch')).toBeInTheDocument();
    expect(screen.getByText('Gesamter Einsatz')).toBeInTheDocument();
    expect(screen.getByText(/Rettungstrupp 1/)).toBeInTheDocument();
  });

  it('„+ Sicherheitsregel" öffnet Drawer im Create-Modus', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} />);
    await user.click(screen.getByTestId('sicherheitsregeln-neue-regel'));
    expect(screen.getByTestId('sicherheitsregel-drawer-mock')).toBeInTheDocument();
    expect(screen.getByTestId('sicherheitsregel-drawer-mode')).toHaveTextContent('create');
  });

  it('öffnet den Create-Drawer per Action-Param und entfernt den Param beim Schließen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} initialAction="new-sicherheitsregel" />);

    expect(screen.getByTestId('sicherheitsregel-drawer-mock')).toBeInTheDocument();
    expect(screen.getByTestId('sicherheitsregel-drawer-mode')).toHaveTextContent('create');

    await user.click(screen.getByTestId('sicherheitsregel-drawer-close'));

    expect(drawerProps.closeCount).toBe(1);
  });

  it('öffnet den Create-Drawer, wenn der Action-Param auf derselben Route nachträglich gesetzt wird', () => {
    const { rerender } = renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} />);

    expect(screen.queryByTestId('sicherheitsregel-drawer-mock')).toBeNull();

    rerender(<SicherheitsregelnPage einsatzId={EINSATZ_ID} initialAction="new-sicherheitsregel" />);

    expect(screen.getByTestId('sicherheitsregel-drawer-mock')).toBeInTheDocument();
    expect(screen.getByTestId('sicherheitsregel-drawer-mode')).toHaveTextContent('create');
  });

  it('Zeilen-Klick öffnet Drawer im Edit-Modus mit regel prop', async () => {
    mocks.regelnQuery.data = [
      {
        id: REGEL_ID,
        einsatzId: EINSATZ_ID,
        einheitId: null,
        einsatzweit: true,
        titel: 'Absperrung 20 m',
        inhalt: 'Rund um die Einsatzstelle 20 m Abstand halten.',
        version: 2,
        erstelltAm: '2026-04-24T10:00:00.000Z',
        erstelltVonUserId: 'u1',
        aktualisiertAm: '2026-04-24T12:00:00.000Z',
        aktualisiertVonUserId: 'u1',
        propagationGroupId: 'g1',
      },
    ];
    const user = userEvent.setup();
    renderWithProviders(<SicherheitsregelnPage einsatzId={EINSATZ_ID} />);
    await user.click(screen.getByTestId(`sicherheitsregel-zeile-${REGEL_ID}`));
    expect(screen.getByTestId('sicherheitsregel-drawer-mode')).toHaveTextContent('edit');
    expect(drawerProps.lastRegel).toMatchObject({ id: REGEL_ID });
  });
});
