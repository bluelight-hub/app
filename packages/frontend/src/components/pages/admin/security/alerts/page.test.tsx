import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AlertsView from './page';
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

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  })),
}));

const mockAlerts = [
  {
    id: '1',
    type: 'LOGIN_FAILURE',
    severity: 'critical',
    message: 'Multiple failed login attempts detected',
    ipAddress: '192.168.1.100',
    userId: 'user123',
    timestamp: '2024-03-20T10:00:00Z',
    resolved: false,
  },
  {
    id: '2',
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'high',
    message: 'Unusual access pattern detected',
    ipAddress: '10.0.0.50',
    userId: 'user456',
    timestamp: '2024-03-20T09:30:00Z',
    resolved: true,
  },
  {
    id: '3',
    type: 'BRUTE_FORCE',
    severity: 'medium',
    message: 'Potential brute force attack',
    ipAddress: '172.16.0.10',
    userId: null,
    timestamp: '2024-03-20T08:45:00Z',
    resolved: false,
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

describe.skip('AlertsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(securityApi.getRecentAlerts).mockResolvedValue(mockAlerts);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders the component with header', () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    expect(screen.getByText('Sicherheitswarnungen')).toBeInTheDocument();
    expect(screen.getByText('Überwachen und reagieren Sie auf Sicherheitsereignisse in Echtzeit')).toBeInTheDocument();
  });

  it('displays statistics cards', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Offene Alerts')).toBeInTheDocument();
      expect(screen.getByText('Kritische Alerts')).toBeInTheDocument();
      expect(screen.getByText('Gesamt heute')).toBeInTheDocument();
      expect(screen.getByText('WebSocket Status')).toBeInTheDocument();
    });
  });

  it('calculates statistics correctly', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Unresolved count: 2 (alerts 1 and 3)
      expect(screen.getByText('2')).toBeInTheDocument();

      // Critical count: 1 (alert 1)
      expect(screen.getByText('1')).toBeInTheDocument();

      // Total count: 3
      expect(screen.getByText('3')).toBeInTheDocument();

      // WebSocket status
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  it('loads and displays alerts', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Multiple failed login attempts detected')).toBeInTheDocument();
      expect(screen.getByText('Unusual access pattern detected')).toBeInTheDocument();
      expect(screen.getByText('Potential brute force attack')).toBeInTheDocument();
    });
  });

  it('displays severity badges correctly', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });
  });

  it('displays alert type tags correctly', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Login-Fehler')).toBeInTheDocument();
      expect(screen.getByText('Verdächtige Aktivität')).toBeInTheDocument();
      expect(screen.getByText('Brute-Force')).toBeInTheDocument();
    });
  });

  it('displays resolved status correctly', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const aufgeloestTags = screen.getAllByText('Aufgelöst');
      const offenTags = screen.getAllByText('Offen');
      expect(aufgeloestTags).toHaveLength(1);
      expect(offenTags).toHaveLength(2);
    });
  });

  it('filters alerts by severity', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const severityFilter = screen.getByRole('combobox', { name: /alle schweregrade/i });
      fireEvent.mouseDown(severityFilter);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Kritisch'));
    });

    expect(securityApi.getRecentAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'critical',
      }),
    );
  });

  it('filters alerts by resolved status', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const statusFilter = screen.getAllByRole('combobox')[1];
      fireEvent.mouseDown(statusFilter);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Nur offene'));
    });

    // Local filtering should hide resolved alerts
    await waitFor(() => {
      expect(screen.queryByText('Unusual access pattern detected')).not.toBeInTheDocument();
      expect(screen.getByText('Multiple failed login attempts detected')).toBeInTheDocument();
      expect(screen.getByText('Potential brute force attack')).toBeInTheDocument();
    });
  });

  it('searches alerts by text', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Suche in Alerts...');
      fireEvent.change(searchInput, { target: { value: 'user123' } });
    });

    // Should only show alerts matching the search
    await waitFor(() => {
      expect(screen.getByText('Multiple failed login attempts detected')).toBeInTheDocument();
      expect(screen.queryByText('Unusual access pattern detected')).not.toBeInTheDocument();
      expect(screen.queryByText('Potential brute force attack')).not.toBeInTheDocument();
    });
  });

  it('opens alert details modal', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Alert Details')).toBeInTheDocument();
      expect(screen.getByText('Alert ID')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('user123')).toBeInTheDocument();
    });
  });

  it('opens resolution modal for unresolved alerts', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const resolveButtons = screen.getAllByText('Auflösen');
      fireEvent.click(resolveButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Alert auflösen')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Beschreiben Sie die durchgeführten Maßnahmen...')).toBeInTheDocument();
    });
  });

  it('resolves an alert', async () => {
    vi.mocked(securityApi.resolveAlert).mockResolvedValue(undefined);

    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const resolveButtons = screen.getAllByText('Auflösen');
      fireEvent.click(resolveButtons[0]);
    });

    await waitFor(() => {
      const textArea = screen.getByPlaceholderText('Beschreiben Sie die durchgeführten Maßnahmen...');
      fireEvent.change(textArea, { target: { value: 'False positive - legitimate user activity' } });
    });

    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);

    await waitFor(() => {
      expect(securityApi.resolveAlert).toHaveBeenCalledWith('1', 'False positive - legitimate user activity');
      expect(message.success).toHaveBeenCalledWith('Alert wurde erfolgreich aufgelöst');
    });
  });

  it('handles resolution error', async () => {
    vi.mocked(securityApi.resolveAlert).mockRejectedValue(new Error('Resolution failed'));

    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const resolveButtons = screen.getAllByText('Auflösen');
      fireEvent.click(resolveButtons[0]);
    });

    await waitFor(() => {
      const textArea = screen.getByPlaceholderText('Beschreiben Sie die durchgeführten Maßnahmen...');
      fireEvent.change(textArea, { target: { value: 'Test resolution' } });
    });

    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Auflösen des Alerts');
    });
  });

  it('refreshes alerts when refresh button is clicked', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const refreshButton = screen.getByText('Aktualisieren');
      fireEvent.click(refreshButton);
    });

    expect(securityApi.getRecentAlerts).toHaveBeenCalledTimes(2);
  });

  it('displays user information when available', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('User: user123')).toBeInTheDocument();
      expect(screen.getByText('User: user456')).toBeInTheDocument();
    });
  });

  it('displays IP addresses', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.50')).toBeInTheDocument();
      expect(screen.getByText('172.16.0.10')).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/20\.03\.2024 11:00:00/)).toBeInTheDocument();
      expect(screen.getByText(/20\.03\.2024 10:30:00/)).toBeInTheDocument();
      expect(screen.getByText(/20\.03\.2024 09:45:00/)).toBeInTheDocument();
    });
  });

  it('highlights critical unresolved alerts', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const rows = document.querySelectorAll('tr');
      const criticalRow = Array.from(rows).find((row) =>
        row.textContent?.includes('Multiple failed login attempts detected'),
      );
      expect(criticalRow?.classList.contains('bg-red-50')).toBe(true);
    });
  });

  it('closes details modal', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Alert Details')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = document.querySelector('.ant-modal-close');
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('Alert Details')).not.toBeInTheDocument();
    });
  });

  it('cancels resolution modal', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const resolveButtons = screen.getAllByText('Auflösen');
      fireEvent.click(resolveButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Alert auflösen')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Alert auflösen')).not.toBeInTheDocument();
    });
  });

  it('shows timeline in details modal', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[1]); // Click on resolved alert
    });

    await waitFor(() => {
      expect(screen.getByText('Ereignisverlauf')).toBeInTheDocument();
      expect(screen.getByText(/Alert ausgelöst/)).toBeInTheDocument();
      expect(screen.getByText(/Alert aufgelöst/)).toBeInTheDocument();
    });
  });

  it('handles empty alert list', async () => {
    vi.mocked(securityApi.getRecentAlerts).mockResolvedValue([]);

    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // All statistics should be 0
    });
  });

  it('does not show resolve button for resolved alerts', async () => {
    render(<AlertsView />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Find the row with resolved alert
      const rows = document.querySelectorAll('tr');
      const resolvedRow = Array.from(rows).find((row) => row.textContent?.includes('Unusual access pattern detected'));

      // Should not have "Auflösen" button
      expect(resolvedRow?.textContent).not.toContain('Auflösen');
    });
  });
});
