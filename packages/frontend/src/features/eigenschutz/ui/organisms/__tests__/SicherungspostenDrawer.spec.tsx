/**
 * Spec für `SicherungspostenDrawer` (Story 4.1, T6).
 *
 * Schwerpunkte:
 * - Pflichtfeld-Validation für `bezeichnung` blockiert Submit.
 * - Standort-Toggle wechselt zwischen Address-Textarea und Coordinate-Inputs.
 * - Personal-Eintrag hinzufügen + entfernen.
 * - Submit ruft `useCreateSicherungsposten` mit normalisiertem Payload.
 * - 409-Konflikt rendert Inline-Banner mit Server-Version.
 */

import { renderWithProviders } from '@/test/utils';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks, SicherungspostenConflictErrorMock } = vi.hoisted(() => {
  class SicherungspostenConflictErrorMock extends Error {
    readonly statusCode = 409;
    constructor(
      readonly currentVersion: number | undefined,
      readonly attemptedVersion: number | undefined,
      readonly originalError: unknown,
    ) {
      super('ConflictDetected:Sicherungsposten');
      this.name = 'SicherungspostenConflictError';
    }
  }
  return {
    SicherungspostenConflictErrorMock,
    mocks: {
      createMutation: { mutateAsync: vi.fn(), isPending: false },
      updateMutation: { mutateAsync: vi.fn(), isPending: false },
    },
  };
});

vi.mock('../../../api/use-sicherungsposten', () => ({
  useCreateSicherungsposten: () => mocks.createMutation,
  useUpdateSicherungsposten: () => mocks.updateMutation,
  useAufloeseSicherungsposten: () => ({ mutateAsync: vi.fn(), isPending: false }),
  SicherungspostenConflictError: SicherungspostenConflictErrorMock,
  extractSicherungspostenConflictError: vi.fn(),
  sicherungspostenQueryKeys: { all: ['sicherungsposten'], list: (id: string, s: string) => ['sicherungsposten', id, s] },
}));

import { SicherungspostenDrawer } from '../SicherungspostenDrawer';

const EXISTING_POSTEN = {
  id: 'posten-1',
  einsatzId: 'einsatz-1',
  bezeichnung: 'Eingang Süd',
  standort: { kind: 'address', text: 'Süd-Tor' },
  personal: [],
  version: 4,
  erstelltAm: '2026-05-01T10:00:00.000Z',
  erstelltVonUserId: 'user-1',
  aktualisiertAm: '2026-05-01T10:00:00.000Z',
  aktualisiertVonUserId: 'user-1',
} as const;

beforeEach(() => {
  mocks.createMutation.mutateAsync = vi.fn();
  mocks.createMutation.isPending = false;
  mocks.updateMutation.mutateAsync = vi.fn();
  mocks.updateMutation.isPending = false;
});

function setup(props: Partial<React.ComponentProps<typeof SicherungspostenDrawer>> = {}) {
  const onClose = vi.fn();
  renderWithProviders(<SicherungspostenDrawer einsatzId="einsatz-1" mode="create" open={true} onClose={onClose} {...props} />);
  return { onClose };
}

describe('SicherungspostenDrawer', () => {
  it('zeigt Inline-Fehler bei leerer Bezeichnung und blockiert Submit', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('sicherungsposten-drawer-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('sicherungsposten-drawer-inline-error')).toBeInTheDocument();
    });
    expect(mocks.createMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('Standort-Toggle wechselt zwischen Address und Coordinate', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByTestId('sicherungsposten-standort-text')).toBeInTheDocument();

    await user.click(screen.getByTestId('sicherungsposten-standort-toggle-coordinate'));
    await waitFor(() => {
      expect(screen.getByTestId('sicherungsposten-standort-latitude')).toBeInTheDocument();
      expect(screen.getByTestId('sicherungsposten-standort-longitude')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('sicherungsposten-standort-text')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('sicherungsposten-standort-toggle-address'));
    await waitFor(() => {
      expect(screen.getByTestId('sicherungsposten-standort-text')).toBeInTheDocument();
    });
  });

  it('Personal: Eintrag hinzufügen und wieder entfernen', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByTestId('sicherungsposten-personal-row-0')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('sicherungsposten-personal-add'));
    await waitFor(() => {
      expect(screen.getByTestId('sicherungsposten-personal-row-0')).toBeInTheDocument();
    });
    expect(screen.getByTestId('sicherungsposten-personal-name-0')).toBeInTheDocument();

    await user.click(screen.getByTestId('sicherungsposten-personal-remove-0'));
    await waitFor(() => {
      expect(screen.queryByTestId('sicherungsposten-personal-row-0')).not.toBeInTheDocument();
    });
  });

  it('Personal: Toggle zwischen User-ID und Freitext', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('sicherungsposten-personal-add'));
    await waitFor(() => {
      expect(screen.getByTestId('sicherungsposten-personal-name-0')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('sicherungsposten-personal-toggle-user-0'));
    await waitFor(() => {
      expect(screen.getByTestId('sicherungsposten-personal-userid-0')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('sicherungsposten-personal-name-0')).not.toBeInTheDocument();
  });

  it('Submit im Create-Modus ruft useCreateSicherungsposten mit Form-Werten', async () => {
    const user = userEvent.setup();
    mocks.createMutation.mutateAsync = vi.fn().mockResolvedValue({ id: 'posten-new' });
    const { onClose } = setup();

    await user.type(screen.getByTestId('sicherungsposten-bezeichnung'), 'Posten Mitte');
    const standortText = screen.getByTestId('sicherungsposten-standort-text');
    await user.type(standortText, 'Hauptzelt');

    await user.click(screen.getByTestId('sicherungsposten-drawer-submit'));

    await waitFor(() => {
      expect(mocks.createMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          bezeichnung: 'Posten Mitte',
          standort: { kind: 'address', text: 'Hauptzelt' },
        }),
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('Submit im Edit-Modus übergibt expectedVersion aus posten.version', async () => {
    const user = userEvent.setup();
    mocks.updateMutation.mutateAsync = vi.fn().mockResolvedValue({ id: EXISTING_POSTEN.id });

    setup({ mode: 'edit', posten: EXISTING_POSTEN });
    const bezeichnung = screen.getByTestId('sicherungsposten-bezeichnung') as HTMLInputElement;
    await waitFor(() => expect(bezeichnung.value).toBe('Eingang Süd'));

    await user.clear(bezeichnung);
    await user.type(bezeichnung, 'Eingang Nord');
    await user.click(screen.getByTestId('sicherungsposten-drawer-submit'));

    await waitFor(() => {
      expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          postenId: EXISTING_POSTEN.id,
          body: expect.objectContaining({ expectedVersion: 4, bezeichnung: 'Eingang Nord' }),
        }),
      );
    });
  });

  it('409-Konflikt rendert Inline-Banner mit Server-Version, schließt Drawer NICHT', async () => {
    const user = userEvent.setup();
    const conflict = new SicherungspostenConflictErrorMock(7, 4, undefined);
    mocks.updateMutation.mutateAsync = vi.fn().mockRejectedValue(conflict);

    const { onClose } = setup({ mode: 'edit', posten: EXISTING_POSTEN });
    const bezeichnung = screen.getByTestId('sicherungsposten-bezeichnung') as HTMLInputElement;
    await waitFor(() => expect(bezeichnung.value).toBe('Eingang Süd'));
    await user.clear(bezeichnung);
    await user.type(bezeichnung, 'Eingang Mitte');

    await user.click(screen.getByTestId('sicherungsposten-drawer-submit'));

    await waitFor(() => {
      const banner = screen.getByTestId('sicherungsposten-drawer-conflict-banner');
      expect(within(banner).getByText(/Server-Version: 7/)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
