/**
 * Unit Tests für BefehlExportDialog Komponente
 *
 * Verifiziert die Export-Dialog-UI:
 * - Dialog rendert korrekt wenn isOpen=true
 * - Dialog nicht sichtbar wenn isOpen=false
 * - Format-Auswahl funktioniert (Radio CSV/JSON)
 * - Download-Button klickbar
 * - Loading-State wird angezeigt
 * - onClose wird aufgerufen bei Abbrechen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { BefehlExportDialog } from '../BefehlExportDialog.organism';

// Mock useExportBefehle Hook
const mockExportBefehle = vi.fn();
let mockIsExporting = false;

vi.mock('../../../api/use-export-befehle', () => ({
  useExportBefehle: () => ({
    exportBefehle: mockExportBefehle,
    isExporting: mockIsExporting,
  }),
}));

describe('BefehlExportDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    einsatzId: 'einsatz-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsExporting = false;
    mockExportBefehle.mockResolvedValue('befehle_export.csv');
  });

  it('should render dialog when isOpen is true', () => {
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    expect(screen.getByText('Befehle exportieren')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should not render dialog content when isOpen is false', () => {
    renderWithProviders(<BefehlExportDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Befehle exportieren')).not.toBeInTheDocument();
  });

  it('should have CSV selected by default', () => {
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    const csvRadio = screen.getByRole('radio', { name: /CSV/i });
    expect(csvRadio).toBeChecked();

    const jsonRadio = screen.getByRole('radio', { name: /JSON/i });
    expect(jsonRadio).not.toBeChecked();
  });

  it('should allow switching format to JSON', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    const jsonRadio = screen.getByRole('radio', { name: /JSON/i });
    await user.click(jsonRadio);

    expect(jsonRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /CSV/i })).not.toBeChecked();
  });

  it('should call exportBefehle with correct params on Exportieren click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    await user.click(screen.getByText('Exportieren'));

    expect(mockExportBefehle).toHaveBeenCalledWith('einsatz-1', 'csv');
  });

  it('should call exportBefehle with JSON format when JSON is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    await user.click(screen.getByRole('radio', { name: /JSON/i }));
    await user.click(screen.getByText('Exportieren'));

    expect(mockExportBefehle).toHaveBeenCalledWith('einsatz-1', 'json');
  });

  it('should call onClose after successful export', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    await user.click(screen.getByText('Exportieren'));

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('should call onClose when Abbrechen is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    await user.click(screen.getByText('Abbrechen'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should disable buttons during loading state', () => {
    mockIsExporting = true;
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    const abbrechenBtn = screen.getByText('Abbrechen').closest('button');
    expect(abbrechenBtn).toBeDisabled();
    const exportBtn = screen.getByText('Exportieren').closest('button');
    expect(exportBtn).toBeDisabled();
  });

  it('should disable radio buttons during loading state', () => {
    mockIsExporting = true;
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio).toBeDisabled();
    }
  });

  it('should show format descriptions', () => {
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    expect(screen.getByText('Für Excel, Tabellenkalkulation und einfache Auswertung')).toBeInTheDocument();
    expect(screen.getByText('Strukturierte Daten für technische Weiterverarbeitung')).toBeInTheDocument();
  });

  it('should not call onClose on export error', async () => {
    mockExportBefehle.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    await user.click(screen.getByText('Exportieren'));

    await waitFor(() => {
      expect(mockExportBefehle).toHaveBeenCalled();
    });

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should not close dialog via Escape while exporting', async () => {
    mockIsExporting = true;
    const user = userEvent.setup();
    renderWithProviders(<BefehlExportDialog {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
