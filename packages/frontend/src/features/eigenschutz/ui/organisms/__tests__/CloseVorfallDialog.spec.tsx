/**
 * Spec für `CloseVorfallDialog` (Issue #415).
 *
 * Schwerpunkte:
 * - Optionale Begründung — Confirm bleibt aktiv bei leerem Feld.
 * - Confirm ruft `useCloseVorfall` mit getrimmter Begründung (oder leerem Body).
 * - 422 `BusinessRule:VorfallBereitsGeschlossen` rendert spezifisches Banner.
 */

import { renderWithProviders } from '@/test/utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    closeMutation: { mutateAsync: vi.fn(), isPending: false },
  },
}));

vi.mock('../../../api/use-close-vorfall', () => ({
  useCloseVorfall: () => mocks.closeMutation,
}));

import { CloseVorfallDialog } from '../CloseVorfallDialog';

beforeEach(() => {
  mocks.closeMutation.mutateAsync = vi.fn();
  mocks.closeMutation.isPending = false;
});

describe('CloseVorfallDialog (Issue #415)', () => {
  it('rendert Dialog, wenn `vorfallId` gesetzt ist; Confirm-Button auch bei leerer Begründung aktiv', () => {
    renderWithProviders(<CloseVorfallDialog einsatzId="einsatz-1" vorfallId="vorfall-1" onClose={vi.fn()} />);
    expect(screen.getByTestId('close-vorfall-dialog')).toBeInTheDocument();
    const confirm = screen.getByTestId('close-vorfall-confirm') as HTMLButtonElement;
    expect(confirm).not.toBeDisabled();
  });

  it('schließt nicht, wenn `vorfallId` null ist', () => {
    renderWithProviders(<CloseVorfallDialog einsatzId="einsatz-1" vorfallId={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('close-vorfall-dialog')).not.toBeInTheDocument();
  });

  it('Confirm ohne Begründung → mutateAsync mit leerem Body', async () => {
    const user = userEvent.setup();
    mocks.closeMutation.mutateAsync = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    renderWithProviders(<CloseVorfallDialog einsatzId="einsatz-1" vorfallId="vorfall-1" onClose={onClose} />);
    await user.click(screen.getByTestId('close-vorfall-confirm'));

    await waitFor(() => {
      expect(mocks.closeMutation.mutateAsync).toHaveBeenCalledWith({ vorfallId: 'vorfall-1', body: {} });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('Confirm mit Begründung → mutateAsync mit getrimmter Begründung', async () => {
    const user = userEvent.setup();
    mocks.closeMutation.mutateAsync = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    renderWithProviders(<CloseVorfallDialog einsatzId="einsatz-1" vorfallId="vorfall-1" onClose={onClose} />);
    await user.type(screen.getByTestId('close-vorfall-begruendung'), '  Vorfall ist abgearbeitet  ');
    await user.click(screen.getByTestId('close-vorfall-confirm'));

    await waitFor(() => {
      expect(mocks.closeMutation.mutateAsync).toHaveBeenCalledWith({
        vorfallId: 'vorfall-1',
        body: { begruendung: 'Vorfall ist abgearbeitet' },
      });
    });
  });

  it('Cancel-Button schließt den Dialog ohne Mutation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<CloseVorfallDialog einsatzId="einsatz-1" vorfallId="vorfall-1" onClose={onClose} />);

    await user.click(screen.getByTestId('close-vorfall-cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(mocks.closeMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('422 BusinessRule:VorfallBereitsGeschlossen rendert spezifisches Banner', async () => {
    const user = userEvent.setup();
    const error = { response: { status: 422, data: { code: 'BusinessRule:VorfallBereitsGeschlossen' } } };
    mocks.closeMutation.mutateAsync = vi.fn().mockRejectedValue(error);
    const onClose = vi.fn();

    renderWithProviders(<CloseVorfallDialog einsatzId="einsatz-1" vorfallId="vorfall-1" onClose={onClose} />);
    await user.click(screen.getByTestId('close-vorfall-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('close-vorfall-bereits-geschlossen')).toHaveTextContent(/bereits geschlossen/i);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
