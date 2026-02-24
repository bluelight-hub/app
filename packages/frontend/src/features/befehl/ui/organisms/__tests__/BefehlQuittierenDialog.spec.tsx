/**
 * Unit Tests für BefehlQuittierenDialog Komponente
 *
 * Verifiziert die Quittierungs-UI:
 * - 3 Buttons mit korrekten Labels und aria-labels
 * - Klick-Handler und Mutation-Aufruf
 * - Rückfrage-Textarea inline-Einblendung
 * - Bereits-quittiert-Anzeige
 * - Loading-State
 * - Touch-Target Mindestgrößen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { BefehlQuittierenDialog } from '../BefehlQuittierenDialog.organism';
import { QuittierenBefehlDtoQuittierungArtEnum } from '@bluelight-hub/shared/client';

// Mock useQuittierenBefehl Hook
const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock('../../../api/use-quittieren-befehl', () => ({
  useQuittierenBefehl: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

describe('BefehlQuittierenDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    befehlId: 'befehl-1',
    befehlNummer: '001',
    empfaengerId: 'emp-1',
    einsatzId: 'einsatz-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    mockMutate.mockImplementation((_input: unknown, options?: { onSuccess?: () => void; onSettled?: () => void }) => {
      options?.onSuccess?.();
      options?.onSettled?.();
    });
  });

  it('should render 3 quittierung buttons', () => {
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    expect(screen.getByText('Verstanden')).toBeInTheDocument();
    expect(screen.getByText('Rückfrage')).toBeInTheDocument();
    expect(screen.getByText('Nicht verstanden')).toBeInTheDocument();
  });

  it('should have correct aria-labels on buttons', () => {
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    expect(screen.getByLabelText('Befehl als verstanden quittieren')).toBeInTheDocument();
    expect(screen.getByLabelText('Rückfrage zum Befehl stellen')).toBeInTheDocument();
    expect(screen.getByLabelText('Befehl als nicht verstanden quittieren')).toBeInTheDocument();
  });

  it('should call mutation with VERSTANDEN on Verstanden click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    await user.click(screen.getByText('Verstanden'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        befehlId: 'befehl-1',
        empfaengerId: 'emp-1',
        quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onSettled: expect.any(Function),
      }),
    );
  });

  it('should open textarea inline on first Rückfrage click (not mutate)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    await user.click(screen.getByText('Rückfrage'));

    // Mutation should NOT be called on first click
    expect(mockMutate).not.toHaveBeenCalled();

    // Textarea should be visible
    expect(screen.getByLabelText('Rückfrage-Text eingeben')).toBeInTheDocument();
  });

  it('should show "Rückfrage senden" button after textarea is opened', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    await user.click(screen.getByText('Rückfrage'));

    expect(screen.getByText('Rückfrage senden')).toBeInTheDocument();
  });

  it('should show "Bereits quittiert" text when bereitsQuittiert is true', () => {
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} bereitsQuittiert />);

    expect(screen.getByText('Dieser Befehl wurde bereits quittiert.')).toBeInTheDocument();
    expect(screen.queryByText('Verstanden')).not.toBeInTheDocument();
  });

  it('should disable buttons during loading state', () => {
    mockIsPending = true;
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const quittierungButtons = buttons.filter((b) =>
      ['Befehl als verstanden quittieren', 'Rückfrage zum Befehl stellen', 'Befehl als nicht verstanden quittieren'].includes(b.getAttribute('aria-label') || ''),
    );

    for (const button of quittierungButtons) {
      expect(button).toBeDisabled();
    }
  });

  it('should have touch-friendly min-h-12 min-w-12 classes on buttons', () => {
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    const verstandenBtn = screen.getByLabelText('Befehl als verstanden quittieren');
    const rueckfrageBtn = screen.getByLabelText('Rückfrage zum Befehl stellen');
    const nichtVerstandenBtn = screen.getByLabelText('Befehl als nicht verstanden quittieren');

    for (const btn of [verstandenBtn, rueckfrageBtn, nichtVerstandenBtn]) {
      expect(btn.className).toContain('min-h-12');
      expect(btn.className).toContain('min-w-12');
    }
  });

  it('should call mutation with NICHT_VERSTANDEN on Nicht verstanden click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    await user.click(screen.getByText('Nicht verstanden'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        befehlId: 'befehl-1',
        empfaengerId: 'emp-1',
        quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.NichtVerstanden,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('should show "Gesendet..." text when a button action is pending', async () => {
    // Given: mutate does nothing (never resolves) → activeAction stays set
    mockMutate.mockImplementation(() => {});

    const { rerender } = renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);
    const user = userEvent.setup();

    // When: Click setzt activeAction auf VERSTANDEN
    await user.click(screen.getByText('Verstanden'));

    // Simulate isPending becoming true (server is processing)
    mockIsPending = true;
    rerender(<BefehlQuittierenDialog {...defaultProps} />);

    // Then: activeAction === VERSTANDEN && isPending === true → "Gesendet..."
    expect(screen.getByText('Gesendet...')).toBeInTheDocument();
  });

  it('should call onClose after successful quittierung', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlQuittierenDialog {...defaultProps} />);

    await user.click(screen.getByText('Verstanden'));

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
