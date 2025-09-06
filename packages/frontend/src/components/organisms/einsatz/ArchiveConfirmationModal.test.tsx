import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchiveConfirmationModal } from './ArchiveConfirmationModal';

describe('ArchiveConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    einsatzName: 'Test Einsatz',
    isArchiving: false,
  };

  it('sollte den Modal mit korrektem Inhalt rendern', () => {
    render(<ArchiveConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Einsatz archivieren')).toBeInTheDocument();
    expect(screen.getByText('Test Einsatz')).toBeInTheDocument();
    expect(screen.getByText(/Archivierte Einsätze können nicht wiederhergestellt werden/)).toBeInTheDocument();
  });

  it('sollte den Archivieren-Button initial deaktiviert haben', () => {
    render(<ArchiveConfirmationModal {...defaultProps} />);

    const archiveButton = screen.getByRole('button', { name: /Archivieren/i });
    expect(archiveButton).toBeDisabled();
  });

  it('sollte den Archivieren-Button aktivieren nach Checkbox-Bestätigung', () => {
    render(<ArchiveConfirmationModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    const archiveButton = screen.getByRole('button', { name: /Archivieren/i });

    expect(archiveButton).toBeDisabled();

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(archiveButton).not.toBeDisabled();
  });

  it('sollte onConfirm aufrufen wenn Archivieren geklickt wird', () => {
    render(<ArchiveConfirmationModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    const archiveButton = screen.getByRole('button', { name: /Archivieren/i });

    fireEvent.click(checkbox);
    fireEvent.click(archiveButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('sollte onClose aufrufen wenn Abbrechen geklickt wird', () => {
    render(<ArchiveConfirmationModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('sollte Checkbox zurücksetzen beim Schließen', () => {
    const { rerender } = render(<ArchiveConfirmationModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
    fireEvent.click(cancelButton);

    // Rerender mit geschlossenem Modal
    rerender(<ArchiveConfirmationModal {...defaultProps} isOpen={false} />);
    rerender(<ArchiveConfirmationModal {...defaultProps} isOpen={true} />);

    const newCheckbox = screen.getByRole('checkbox');
    expect(newCheckbox).not.toBeChecked();
  });

  it('sollte Loading-State korrekt anzeigen', () => {
    render(<ArchiveConfirmationModal {...defaultProps} isArchiving={true} />);

    const archiveButton = screen.getByRole('button', { name: /Archivieren/i });
    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
    const checkbox = screen.getByRole('checkbox');

    expect(archiveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(checkbox).toBeDisabled();
  });

  it('sollte nicht rendern wenn isOpen false ist', () => {
    render(<ArchiveConfirmationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Einsatz archivieren')).not.toBeInTheDocument();
  });
});
