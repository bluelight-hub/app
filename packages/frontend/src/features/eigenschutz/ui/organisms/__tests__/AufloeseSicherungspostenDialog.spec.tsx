/**
 * Spec für `AufloeseSicherungspostenDialog` (Story 4.1, T6, UX-DR27).
 *
 * Schwerpunkte:
 * - Begründungs-Pflicht: Confirm-Button ist disabled, solange leer.
 * - Bei `BusinessRule:BereitsAufgeloest` rendert ein spezifischer Banner.
 * - Confirm ruft `useAufloeseSicherungsposten` mit expectedVersion + Begründung.
 */

import { renderWithProviders } from '@/test/utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    aufloesenMutation: { mutateAsync: vi.fn(), isPending: false },
  },
}));

vi.mock('../../../api/use-sicherungsposten', () => ({
  useAufloeseSicherungsposten: () => mocks.aufloesenMutation,
}));

import { AufloeseSicherungspostenDialog } from '../AufloeseSicherungspostenDialog';

const POSTEN = {
  id: 'posten-1',
  einsatzId: 'einsatz-1',
  bezeichnung: 'Eingang Süd',
  standort: { kind: 'address', text: 'Süd-Tor' },
  personal: [],
  version: 5,
  erstelltAm: '2026-05-01T10:00:00.000Z',
  erstelltVonUserId: 'user-1',
  aktualisiertAm: '2026-05-01T10:00:00.000Z',
  aktualisiertVonUserId: 'user-1',
} as const;

beforeEach(() => {
  mocks.aufloesenMutation.mutateAsync = vi.fn();
  mocks.aufloesenMutation.isPending = false;
});

describe('AufloeseSicherungspostenDialog', () => {
  it('Confirm-Button ist disabled, solange Begründung leer ist', () => {
    renderWithProviders(<AufloeseSicherungspostenDialog einsatzId="einsatz-1" posten={POSTEN} onClose={vi.fn()} />);
    const confirm = screen.getByTestId('aufloese-dialog-confirm') as HTMLButtonElement;
    expect(confirm).toBeDisabled();
  });

  it('Confirm ruft mutateAsync mit expectedVersion + Begründung und schließt Dialog', async () => {
    const user = userEvent.setup();
    mocks.aufloesenMutation.mutateAsync = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    renderWithProviders(<AufloeseSicherungspostenDialog einsatzId="einsatz-1" posten={POSTEN} onClose={onClose} />);

    await user.type(screen.getByTestId('aufloese-dialog-begruendung'), 'Wache abgelöst, Posten wird aufgegeben.');
    await user.click(screen.getByTestId('aufloese-dialog-confirm'));

    await waitFor(() => {
      expect(mocks.aufloesenMutation.mutateAsync).toHaveBeenCalledWith({
        postenId: POSTEN.id,
        body: { expectedVersion: 5, begruendung: 'Wache abgelöst, Posten wird aufgegeben.' },
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel-Button schließt den Dialog ohne Mutation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<AufloeseSicherungspostenDialog einsatzId="einsatz-1" posten={POSTEN} onClose={onClose} />);

    await user.click(screen.getByTestId('aufloese-dialog-cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(mocks.aufloesenMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('422 BusinessRule:BereitsAufgeloest rendert spezifisches Banner', async () => {
    const user = userEvent.setup();
    const error = { response: { status: 422, data: { code: 'BusinessRule:BereitsAufgeloest' } } };
    mocks.aufloesenMutation.mutateAsync = vi.fn().mockRejectedValue(error);
    const onClose = vi.fn();

    renderWithProviders(<AufloeseSicherungspostenDialog einsatzId="einsatz-1" posten={POSTEN} onClose={onClose} />);

    await user.type(screen.getByTestId('aufloese-dialog-begruendung'), 'Doppel-Auflösung-Versuch');
    await user.click(screen.getByTestId('aufloese-dialog-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('aufloese-dialog-bereits-aufgeloest')).toHaveTextContent(/bereits aufgelöst/i);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
