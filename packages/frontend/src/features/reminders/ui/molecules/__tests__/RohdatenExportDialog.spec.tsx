/**
 * Unit Tests fuer RohdatenExportDialog Komponente
 *
 * Story 9.10: Export der Rohdaten (CSV/JSON)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock cn utility
vi.mock('@/shared/ui/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock useExportRohdaten hook
const mockMutateAsync = vi.fn();
const mockReset = vi.fn();
const mockUseExportRohdaten = vi.fn();
vi.mock('../../../api/use-export-rohdaten', () => ({
  useExportRohdaten: (...args: unknown[]) => mockUseExportRohdaten(...args),
}));

// Mock downloadExport
const mockDownloadExport = vi.fn();
vi.mock('../../../lib/download-export', () => ({
  downloadExport: (...args: unknown[]) => mockDownloadExport(...args),
}));

import { RohdatenExportDialog } from '../RohdatenExportDialog';

const defaultProps = {
  einsatzId: 'einsatz-123',
  isOpen: true,
  onClose: vi.fn(),
};

describe('RohdatenExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExportRohdaten.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('should not render when isOpen is false', () => {
    render(<RohdatenExportDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog with title when isOpen is true', () => {
    render(<RohdatenExportDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Rohdaten exportieren')).toBeInTheDocument();
  });

  it('should render only CSV and JSON options (no PDF)', () => {
    render(<RohdatenExportDialog {...defaultProps} />);
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.queryByText('PDF')).not.toBeInTheDocument();
  });

  it('should call onClose when Abbrechen button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RohdatenExportDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Abbrechen'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should export with CSV format by default', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'rohdaten.csv' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<RohdatenExportDialog {...defaultProps} />);

    await user.click(screen.getByText('Exportieren'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        einsatzId: 'einsatz-123',
        format: 'csv',
      });
    });
  });

  it('should export with JSON format when JSON is selected', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'rohdaten.json' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<RohdatenExportDialog {...defaultProps} />);

    await user.click(screen.getByText('JSON'));
    await user.click(screen.getByText('Exportieren'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        einsatzId: 'einsatz-123',
        format: 'json',
      });
    });
  });

  it('should call downloadExport after successful export', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'rohdaten.csv' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<RohdatenExportDialog {...defaultProps} />);

    await user.click(screen.getByText('Exportieren'));

    await waitFor(() => {
      expect(mockDownloadExport).toHaveBeenCalledWith(mockBlob, 'rohdaten.csv');
    });
  });

  it('should close dialog after successful export', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'rohdaten.csv' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<RohdatenExportDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Exportieren'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should show spinner when export is pending', () => {
    mockUseExportRohdaten.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: true,
      isError: false,
      error: null,
    });

    render(<RohdatenExportDialog {...defaultProps} />);
    expect(screen.getByText('Exportiere...')).toBeInTheDocument();
    expect(screen.queryByText('Exportieren')).not.toBeInTheDocument();
  });

  it('should disable export button when pending', () => {
    mockUseExportRohdaten.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: true,
      isError: false,
      error: null,
    });

    render(<RohdatenExportDialog {...defaultProps} />);
    const button = screen.getByText('Exportiere...').closest('button');
    expect(button).toBeDisabled();
  });

  it('should show error message when export fails', () => {
    mockUseExportRohdaten.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: false,
      isError: true,
      error: new Error('Export fehlgeschlagen. Bitte erneut versuchen.'),
    });

    render(<RohdatenExportDialog {...defaultProps} />);
    expect(screen.getByText('Export fehlgeschlagen. Bitte erneut versuchen.')).toBeInTheDocument();
  });
});
