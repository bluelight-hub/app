import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SessionsTable from './page';
import { securityApi } from '@/api/security';
import { message, Modal } from 'antd';

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
    Modal: {
      ...actual.Modal,
      confirm: vi.fn(),
    },
  };
});

const mockSessions = [
  {
    id: '1',
    username: 'john.doe',
    email: 'john.doe@example.com',
    ipAddress: '192.168.1.100',
    location: 'Berlin, Deutschland',
    deviceType: 'desktop',
    os: 'Windows',
    osVersion: '10',
    browser: 'Chrome',
    browserVersion: '120',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    isOnline: true,
    isRevoked: false,
    riskScore: 20,
    lastActivityAt: '2024-03-20T10:00:00Z',
    createdAt: '2024-03-20T08:00:00Z',
    expiresAt: '2024-03-21T08:00:00Z',
    loginMethod: 'password',
    activityCount: 42,
    suspiciousFlags: [],
  },
  {
    id: '2',
    username: 'jane.smith',
    email: 'jane.smith@example.com',
    ipAddress: '10.0.0.50',
    location: 'München, Deutschland',
    deviceType: 'mobile',
    os: 'iOS',
    osVersion: '17',
    browser: 'Safari',
    browserVersion: '17',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    isOnline: false,
    isRevoked: false,
    riskScore: 60,
    lastActivityAt: '2024-03-20T09:30:00Z',
    createdAt: '2024-03-20T07:00:00Z',
    expiresAt: '2024-03-21T07:00:00Z',
    loginMethod: 'oauth',
    activityCount: 15,
    suspiciousFlags: ['unusual_location', 'rapid_requests'],
  },
  {
    id: '3',
    username: 'admin',
    email: 'admin@example.com',
    ipAddress: '172.16.0.10',
    location: null,
    deviceType: 'desktop',
    os: 'Linux',
    osVersion: 'Ubuntu 22.04',
    browser: 'Firefox',
    browserVersion: '121',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0)',
    isOnline: false,
    isRevoked: true,
    riskScore: 10,
    lastActivityAt: '2024-03-19T15:00:00Z',
    createdAt: '2024-03-19T14:00:00Z',
    expiresAt: '2024-03-20T14:00:00Z',
    loginMethod: 'password',
    activityCount: 5,
    suspiciousFlags: [],
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

describe.skip('SessionsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(securityApi.getSessions).mockResolvedValue(mockSessions);
  });

  it('renders the component with header', () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    expect(screen.getByText('Aktive Sessions')).toBeInTheDocument();
    expect(
      screen.getByText('Verwalten Sie aktive Benutzersitzungen und überwachen Sie verdächtige Aktivitäten'),
    ).toBeInTheDocument();
  });

  it('loads and displays sessions', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('john.doe')).toBeInTheDocument();
      expect(screen.getByText('jane.smith')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  it('displays user information correctly', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('displays IP addresses and locations', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.50')).toBeInTheDocument();
      expect(screen.getByText('172.16.0.10')).toBeInTheDocument();
    });
  });

  it('displays device information correctly', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Chrome 120')).toBeInTheDocument();
      expect(screen.getByText('Safari 17')).toBeInTheDocument();
      expect(screen.getByText('Firefox 121')).toBeInTheDocument();
    });
  });

  it('displays status tags correctly', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Beendet')).toBeInTheDocument();
    });
  });

  it('displays risk scores correctly', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Niedrig')).toBeInTheDocument(); // score 20 and 10
      expect(screen.getByText('Mittel')).toBeInTheDocument(); // score 60
    });
  });

  it('filters sessions by status', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const statusFilter = screen.getByRole('combobox');
      fireEvent.mouseDown(statusFilter);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Nur aktive'));
    });

    // Should only show online sessions
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.queryByText('jane.smith')).not.toBeInTheDocument();
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });

  it('filters suspicious sessions', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const statusFilter = screen.getByRole('combobox');
      fireEvent.mouseDown(statusFilter);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Verdächtige'));
    });

    // Should only show sessions with risk score > 50
    expect(screen.getByText('jane.smith')).toBeInTheDocument();
    expect(screen.queryByText('john.doe')).not.toBeInTheDocument();
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });

  it('searches sessions by text', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Suche nach Benutzer, E-Mail oder IP');
      fireEvent.change(searchInput, { target: { value: 'john' } });
    });

    // Should only show matching sessions
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.queryByText('jane.smith')).not.toBeInTheDocument();
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });

  it('opens session details modal', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Session Details')).toBeInTheDocument();
      expect(screen.getByText('Windows 10')).toBeInTheDocument();
      expect(screen.getByText('Berlin, Deutschland')).toBeInTheDocument();
      expect(screen.getByText('password')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('displays suspicious flags in details modal', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[1]); // jane.smith with suspicious flags
    });

    await waitFor(() => {
      expect(screen.getByText('Verdächtige Flags')).toBeInTheDocument();
      expect(screen.getByText('unusual_location')).toBeInTheDocument();
      expect(screen.getByText('rapid_requests')).toBeInTheDocument();
    });
  });

  it('revokes a single session', async () => {
    vi.mocked(securityApi.revokeSession).mockResolvedValue(undefined);

    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const revokeButtons = screen.getAllByText('Beenden');
      fireEvent.click(revokeButtons[0]);
    });

    // Confirm revocation
    await waitFor(() => {
      const confirmButton = screen.getByText('Ja');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(securityApi.revokeSession).toHaveBeenCalledWith('1', 'Admin action');
      expect(message.success).toHaveBeenCalledWith('Session wurde erfolgreich beendet');
    });
  });

  it('handles revoke error', async () => {
    vi.mocked(securityApi.revokeSession).mockRejectedValue(new Error('Revoke failed'));

    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const revokeButtons = screen.getAllByText('Beenden');
      fireEvent.click(revokeButtons[0]);
    });

    await waitFor(() => {
      const confirmButton = screen.getByText('Ja');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Beenden der Session');
    });
  });

  it('selects multiple sessions for bulk revoke', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first session
      fireEvent.click(checkboxes[2]); // Select second session
    });

    await waitFor(() => {
      expect(screen.getByText('2 Sessions beenden')).toBeInTheDocument();
    });
  });

  it('performs bulk revoke', async () => {
    vi.mocked(securityApi.revokeSession).mockResolvedValue(undefined);
    const mockConfirm = vi.fn((config) => {
      config.onOk();
    });
    vi.mocked(Modal.confirm).mockImplementation(mockConfirm);

    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);
    });

    await waitFor(() => {
      const bulkButton = screen.getByText('2 Sessions beenden');
      fireEvent.click(bulkButton);
    });

    await waitFor(() => {
      expect(Modal.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Mehrere Sessions beenden',
          content: 'Möchten Sie wirklich 2 Sessions beenden?',
        }),
      );
      expect(securityApi.revokeSession).toHaveBeenCalledTimes(2);
      expect(message.success).toHaveBeenCalledWith('2 Sessions wurden beendet');
    });
  });

  it('exports sessions to CSV', async () => {
    // Mock URL and DOM methods
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:url');
    const mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);
    });

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/sessions_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv/);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
      expect(message.success).toHaveBeenCalledWith('Sessions exportiert');
    });
  });

  it('refreshes sessions data', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const refreshButton = screen.getByText('Aktualisieren');
      fireEvent.click(refreshButton);
    });

    expect(securityApi.getSessions).toHaveBeenCalledTimes(2);
  });

  it('does not show revoke button for already revoked sessions', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Find the row with revoked session (admin)
      const rows = document.querySelectorAll('tr');
      const revokedRow = Array.from(rows).find((row) => row.textContent?.includes('admin@example.com'));

      // Should not have "Beenden" button
      expect(revokedRow?.textContent).not.toContain('Beenden');
    });
  });

  it('closes details modal', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Session Details')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = document.querySelector('.ant-modal-close');
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('Session Details')).not.toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Last activity times
      expect(screen.getByText('11:00')).toBeInTheDocument();
      expect(screen.getByText('10:30')).toBeInTheDocument();
    });
  });

  it('handles sessions without location', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[2]); // admin session without location
    });

    await waitFor(() => {
      expect(screen.getByText('Unbekannt')).toBeInTheDocument();
    });
  });

  it('displays user agent in details modal', async () => {
    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('User Agent')).toBeInTheDocument();
      expect(screen.getByText(/Mozilla.*Windows NT 10.0/)).toBeInTheDocument();
    });
  });

  it('handles empty sessions list', async () => {
    vi.mocked(securityApi.getSessions).mockResolvedValue([]);

    render(<SessionsTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('0 Sessions gesamt')).toBeInTheDocument();
    });
  });
});
