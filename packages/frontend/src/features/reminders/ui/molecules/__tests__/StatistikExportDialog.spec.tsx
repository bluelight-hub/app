/**
 * Unit Tests fuer StatistikExportDialog Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 9.6:**
 * - Dialog rendert korrekt mit Format-Optionen
 * - Export-Button loest mutateAsync aus
 * - Spinner bei laufendem Export
 * - Fehleranzeige bei fehlgeschlagenem Export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock cn utility
vi.mock('@/shared/ui/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock useExportStatistik hook
const mockMutateAsync = vi.fn();
const mockReset = vi.fn();
const mockUseExportStatistik = vi.fn();
vi.mock('../../../api/use-export-statistik', () => ({
  useExportStatistik: (...args: unknown[]) => mockUseExportStatistik(...args),
}));

// Mock downloadExport
const mockDownloadExport = vi.fn();
vi.mock('../../../lib/download-export', () => ({
  downloadExport: (...args: unknown[]) => mockDownloadExport(...args),
}));

import { StatistikExportDialog } from '../StatistikExportDialog';

const defaultProps = {
  einsatzId: 'einsatz-123',
  isOpen: true,
  onClose: vi.fn(),
};

describe('StatistikExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExportStatistik.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('should not render when isOpen is false', () => {
    // Given
    const props = { ...defaultProps, isOpen: false };

    // When
    render(<StatistikExportDialog {...props} />);

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog with title when isOpen is true', () => {
    // Given / When
    render(<StatistikExportDialog {...defaultProps} />);

    // Then
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Statistik exportieren')).toBeInTheDocument();
  });

  it('should render 3 format options (PDF, CSV, JSON)', () => {
    // Given / When
    render(<StatistikExportDialog {...defaultProps} />);

    // Then
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should call onClose when Abbrechen button is clicked', async () => {
    // Given
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StatistikExportDialog {...defaultProps} onClose={onClose} />);

    // When
    await user.click(screen.getByText('Abbrechen'));

    // Then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call mutateAsync with einsatzId and format on export click', async () => {
    // Given
    const user = userEvent.setup();
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'export.pdf' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<StatistikExportDialog {...defaultProps} />);

    // When - PDF is selected by default
    await user.click(screen.getByText('Exportieren'));

    // Then
    expect(mockMutateAsync).toHaveBeenCalledWith({
      einsatzId: 'einsatz-123',
      format: 'pdf',
    });
  });

  it('should show spinner when export is pending', () => {
    // Given
    mockUseExportStatistik.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: true,
      isError: false,
      error: null,
    });

    // When
    render(<StatistikExportDialog {...defaultProps} />);

    // Then
    expect(screen.getByText('Exportiere...')).toBeInTheDocument();
    expect(screen.queryByText('Exportieren')).not.toBeInTheDocument();
  });

  it('should show error message when export fails', () => {
    // Given
    mockUseExportStatistik.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: false,
      isError: true,
      error: new Error('Export fehlgeschlagen. Bitte erneut versuchen.'),
    });

    // When
    render(<StatistikExportDialog {...defaultProps} />);

    // Then
    expect(screen.getByText('Export fehlgeschlagen. Bitte erneut versuchen.')).toBeInTheDocument();
  });

  it('should export with CSV format when CSV is selected', async () => {
    // Given
    const user = userEvent.setup();
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'export.csv' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<StatistikExportDialog {...defaultProps} />);

    // When
    await user.click(screen.getByText('CSV'));
    await user.click(screen.getByText('Exportieren'));

    // Then
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        einsatzId: 'einsatz-123',
        format: 'csv',
      });
    });
  });

  it('should export with JSON format when JSON is selected', async () => {
    // Given
    const user = userEvent.setup();
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'export.json' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<StatistikExportDialog {...defaultProps} />);

    // When
    await user.click(screen.getByText('JSON'));
    await user.click(screen.getByText('Exportieren'));

    // Then
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        einsatzId: 'einsatz-123',
        format: 'json',
      });
    });
  });

  it('should call downloadExport after successful export', async () => {
    // Given
    const user = userEvent.setup();
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'export.pdf' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<StatistikExportDialog {...defaultProps} />);

    // When
    await user.click(screen.getByText('Exportieren'));

    // Then
    await waitFor(() => {
      expect(mockDownloadExport).toHaveBeenCalledWith(mockBlob, 'export.pdf');
    });
  });

  it('should close dialog after successful export', async () => {
    // Given
    const user = userEvent.setup();
    const onClose = vi.fn();
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    mockMutateAsync.mockResolvedValue({ blob: mockBlob, filename: 'export.pdf' });
    mockDownloadExport.mockResolvedValue(undefined);
    render(<StatistikExportDialog {...defaultProps} onClose={onClose} />);

    // When
    await user.click(screen.getByText('Exportieren'));

    // Then
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable export button when pending', () => {
    // Given
    mockUseExportStatistik.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: true,
      isError: false,
      error: null,
    });

    // When
    render(<StatistikExportDialog {...defaultProps} />);

    // Then
    const button = screen.getByText('Exportiere...').closest('button');
    expect(button).toBeDisabled();
  });
});
