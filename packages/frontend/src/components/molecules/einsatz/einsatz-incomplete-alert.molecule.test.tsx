import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { EinsatzIncompleteAlert } from './einsatz-incomplete-alert.molecule';

describe('EinsatzIncompleteAlert', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    missingFields: ['Alarmstichwort', 'Einsatzort', 'Einsatzleiter'],
  };

  it('renders when isOpen is true', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} />);
    expect(screen.getByText('Unvollständiger Einsatz')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Unvollständiger Einsatz')).not.toBeInTheDocument();
  });

  it('displays custom title', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('displays custom message', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} message="Custom message text" />);
    expect(screen.getByText('Custom message text')).toBeInTheDocument();
  });

  it('displays missing fields list', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} />);
    expect(screen.getByText('Alarmstichwort')).toBeInTheDocument();
    expect(screen.getByText('Einsatzort')).toBeInTheDocument();
    expect(screen.getByText('Einsatzleiter')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<EinsatzIncompleteAlert {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /schließen/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onComplete when complete button is clicked', async () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();
    render(<EinsatzIncompleteAlert {...defaultProps} onClose={onClose} onComplete={onComplete} />);

    const completeButton = screen.getByText('Jetzt vervollständigen');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onIgnore when ignore button is clicked', async () => {
    const onIgnore = vi.fn();
    const onClose = vi.fn();
    render(<EinsatzIncompleteAlert {...defaultProps} onClose={onClose} onIgnore={onIgnore} />);

    const ignoreButton = screen.getByText('Trotzdem fortfahren');
    fireEvent.click(ignoreButton);

    await waitFor(() => {
      expect(onIgnore).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays custom button texts', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} onComplete={vi.fn()} onIgnore={vi.fn()} completeButtonText="Custom Complete" ignoreButtonText="Custom Ignore" />);

    expect(screen.getByText('Custom Complete')).toBeInTheDocument();
    expect(screen.getByText('Custom Ignore')).toBeInTheDocument();
  });

  it('shows only close button when no callbacks provided', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} />);

    expect(screen.queryByText('Jetzt vervollständigen')).not.toBeInTheDocument();
    expect(screen.queryByText('Trotzdem fortfahren')).not.toBeInTheDocument();
    expect(screen.getByText('Schließen')).toBeInTheDocument();
  });

  it('handles empty missing fields array', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} missingFields={[]} />);
    expect(screen.queryByText('Fehlende Felder:')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EinsatzIncompleteAlert {...defaultProps} className="custom-dialog-class" />);
    const dialog = container.querySelector('.custom-dialog-class');
    expect(dialog).toBeInTheDocument();
  });

  it('closes dialog on Escape key', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EinsatzIncompleteAlert {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows warning icon', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} />);
    const icon = document.querySelector('.text-yellow-600');
    expect(icon).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<EinsatzIncompleteAlert {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /schließen/i });
    expect(closeButton).toHaveAccessibleName();
  });

  it('handles transition animations', async () => {
    const { rerender } = render(<EinsatzIncompleteAlert {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Unvollständiger Einsatz')).not.toBeInTheDocument();

    rerender(<EinsatzIncompleteAlert {...defaultProps} isOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('Unvollständiger Einsatz')).toBeInTheDocument();
    });
  });
});
