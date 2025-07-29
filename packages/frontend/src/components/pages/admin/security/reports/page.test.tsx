import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SecurityReports from './page';
import { securityApi } from '@/api/security';
import { message } from 'antd';

// Mock dependencies
vi.mock('@/api/security');
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: ({ children }: { children: any }) => children({ loading: false }),
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

const mockReports = [
  {
    id: '1',
    type: 'compliance',
    title: 'Compliance Report Q1 2024',
    description: 'Quarterly compliance report',
    period: {
      start: '2024-01-01',
      end: '2024-03-31',
    },
    generatedAt: '2024-04-01T10:00:00Z',
    generatedBy: 'admin@example.com',
    metrics: {
      totalEvents: 150,
      criticalIncidents: 5,
      resolvedIncidents: 140,
    },
  },
  {
    id: '2',
    type: 'incident',
    title: 'Security Incident Report',
    description: 'Monthly incident summary',
    period: {
      start: '2024-03-01',
      end: '2024-03-31',
    },
    generatedAt: '2024-04-01T15:00:00Z',
    generatedBy: 'security@example.com',
    metrics: {
      totalEvents: 45,
      criticalIncidents: 2,
      resolvedIncidents: 43,
    },
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe.skip('SecurityReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(securityApi.getSecurityReports).mockResolvedValue(mockReports);
  });

  it('renders the component with header', () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    expect(screen.getByText('Security Reports')).toBeInTheDocument();
    expect(screen.getByText('Generieren und verwalten Sie Compliance- und Audit-Reports')).toBeInTheDocument();
  });

  it('displays statistics cards', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Gesamt Reports')).toBeInTheDocument();
      expect(screen.getByText('Compliance Reports')).toBeInTheDocument();
      expect(screen.getByText('Incident Reports')).toBeInTheDocument();
      expect(screen.getByText('Letzter Report')).toBeInTheDocument();
    });
  });

  it('loads and displays reports', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Compliance Report Q1 2024')).toBeInTheDocument();
      expect(screen.getByText('Security Incident Report')).toBeInTheDocument();
    });
  });

  it('filters reports by type', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    const typeFilter = screen.getByRole('combobox');
    fireEvent.mouseDown(typeFilter);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Compliance'));
    });

    expect(securityApi.getSecurityReports).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'compliance',
      }),
    );
  });

  it('opens generate report modal', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    const generateButton = screen.getByText('Neuen Report generieren');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Neuen Security Report generieren')).toBeInTheDocument();
      expect(screen.getByLabelText('Report-Typ')).toBeInTheDocument();
      expect(screen.getByLabelText('Zeitraum')).toBeInTheDocument();
      expect(screen.getByLabelText('Format')).toBeInTheDocument();
    });
  });

  it('generates a new report', async () => {
    const mockGenerateResult = {
      id: '3',
      downloadUrl: 'https://example.com/download/report-3.pdf',
    };
    vi.mocked(securityApi.generateSecurityReport).mockResolvedValue(mockGenerateResult);

    // Mock window.open
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(<SecurityReports />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neuen Report generieren'));

    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    // Fill form
    const typeSelect = screen.getByLabelText('Report-Typ');
    fireEvent.mouseDown(typeSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Compliance Report'));
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Report generieren' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(securityApi.generateSecurityReport).toHaveBeenCalled();
      expect(message.success).toHaveBeenCalledWith('Report wurde erfolgreich generiert');
      expect(mockOpen).toHaveBeenCalledWith('https://example.com/download/report-3.pdf', '_blank');
    });
  });

  it('handles report generation error', async () => {
    vi.mocked(securityApi.generateSecurityReport).mockRejectedValue(new Error('Generation failed'));

    render(<SecurityReports />, { wrapper: createWrapper() });

    // Open modal and submit
    fireEvent.click(screen.getByText('Neuen Report generieren'));

    await waitFor(() => {
      const typeSelect = screen.getByLabelText('Report-Typ');
      fireEvent.mouseDown(typeSelect);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Compliance Report'));
    });

    const submitButton = screen.getByRole('button', { name: 'Report generieren' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Generieren des Reports');
    });
  });

  it('downloads a report', async () => {
    const mockBlob = new Blob(['report content']);
    vi.mocked(securityApi.downloadReport).mockResolvedValue(mockBlob);

    // Mock URL methods
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:url');
    const mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      const downloadButtons = screen.getAllByText('Download');
      fireEvent.click(downloadButtons[0]);
    });

    await waitFor(() => {
      expect(securityApi.downloadReport).toHaveBeenCalledWith('1');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockAnchor.href).toBe('blob:url');
      expect(mockAnchor.download).toBe('security-report-1.pdf');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
      expect(message.success).toHaveBeenCalledWith('Report wurde heruntergeladen');
    });
  });

  it('handles download error', async () => {
    vi.mocked(securityApi.downloadReport).mockRejectedValue(new Error('Download failed'));

    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      const downloadButtons = screen.getAllByText('Download');
      fireEvent.click(downloadButtons[0]);
    });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Herunterladen des Reports');
    });
  });

  it('displays report type tags correctly', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Compliance')).toBeInTheDocument();
      expect(screen.getByText('Incident')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check period format
      expect(screen.getByText(/01\.01\.2024 - 31\.03\.2024/)).toBeInTheDocument();
      expect(screen.getByText(/01\.03\.2024 - 31\.03\.2024/)).toBeInTheDocument();

      // Check generated date format
      expect(screen.getByText(/01\.04\.2024 12:00/)).toBeInTheDocument();
      expect(screen.getByText(/01\.04\.2024 17:00/)).toBeInTheDocument();
    });
  });

  it('shows generated by information', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('von admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('von security@example.com')).toBeInTheDocument();
    });
  });

  it('updates date range filter', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    // Find and interact with date picker
    const dateRangePicker = screen.getAllByPlaceholderText('Start date')[0];
    fireEvent.click(dateRangePicker);

    // Select a date (simplified for testing)
    fireEvent.change(dateRangePicker, { target: { value: '01.01.2024' } });

    await waitFor(() => {
      expect(securityApi.getSecurityReports).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      );
    });
  });

  it('calculates statistics correctly', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Total reports
      const totalStat = screen.getByText('2');
      expect(totalStat).toBeInTheDocument();

      // Compliance reports count
      const complianceStat = screen.getAllByText('1')[0];
      expect(complianceStat).toBeInTheDocument();

      // Incident reports count
      const incidentStat = screen.getAllByText('1')[1];
      expect(incidentStat).toBeInTheDocument();
    });
  });

  it('closes generate modal on cancel', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neuen Report generieren'));

    await waitFor(() => {
      expect(screen.getByText('Neuen Security Report generieren')).toBeInTheDocument();
    });

    // Cancel
    const cancelButton = screen.getByText('Abbrechen');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Neuen Security Report generieren')).not.toBeInTheDocument();
    });
  });

  it('validates form fields', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neuen Report generieren'));

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Report generieren' });
      fireEvent.click(submitButton);
    });

    // Should show validation errors (form submission won't proceed)
    expect(securityApi.generateSecurityReport).not.toHaveBeenCalled();
  });

  it('renders PDF download link for reports with metrics', async () => {
    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      const pdfButtons = screen.getAllByText('PDF');
      expect(pdfButtons).toHaveLength(2); // Both mock reports have metrics
    });
  });

  it('handles empty report list', async () => {
    vi.mocked(securityApi.getSecurityReports).mockResolvedValue([]);

    render(<SecurityReports />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Total reports
      expect(screen.getByText('N/A')).toBeInTheDocument(); // Last report date
    });
  });
});
