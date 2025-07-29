import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import IPWhitelistManager from './page';
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

const mockRules = [
  {
    id: '1',
    ipAddress: '192.168.1.100',
    ipRange: '/24',
    description: 'Office Network',
    isActive: true,
    createdBy: 'admin@example.com',
    createdAt: '2024-03-01T10:00:00Z',
    expiresAt: '2024-12-31T23:59:59Z',
  },
  {
    id: '2',
    ipAddress: '10.0.0.50',
    ipRange: null,
    description: 'VPN Server',
    isActive: false,
    createdBy: 'security@example.com',
    createdAt: '2024-02-15T14:30:00Z',
    expiresAt: null,
  },
  {
    id: '3',
    ipAddress: '172.16.0.1',
    ipRange: '/16',
    description: 'Expired Rule',
    isActive: true,
    createdBy: 'admin@example.com',
    createdAt: '2023-01-01T08:00:00Z',
    expiresAt: '2023-12-31T23:59:59Z',
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

describe.skip('IPWhitelistManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(securityApi.getIPWhitelistRules).mockResolvedValue(mockRules);
  });

  it('renders the component with header', () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    expect(screen.getByText('IP Whitelist Verwaltung')).toBeInTheDocument();
    expect(
      screen.getByText('Verwalten Sie erlaubte IP-Adressen für erweiterte Sicherheitsfunktionen'),
    ).toBeInTheDocument();
  });

  it('loads and displays IP rules', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.50')).toBeInTheDocument();
      expect(screen.getByText('172.16.0.1')).toBeInTheDocument();
    });
  });

  it('displays IP ranges correctly', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('(/24)')).toBeInTheDocument();
      expect(screen.getByText('(/16)')).toBeInTheDocument();
    });
  });

  it('displays descriptions', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Office Network')).toBeInTheDocument();
      expect(screen.getByText('VPN Server')).toBeInTheDocument();
      expect(screen.getByText('Expired Rule')).toBeInTheDocument();
    });
  });

  it('displays status tags correctly', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Aktiv')).toBeInTheDocument();
      expect(screen.getByText('Inaktiv')).toBeInTheDocument();
      expect(screen.getByText('Abgelaufen')).toBeInTheDocument();
    });
  });

  it('displays created by information', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('admin@example.com')).toHaveLength(2);
      expect(screen.getByText('security@example.com')).toBeInTheDocument();
    });
  });

  it('displays expiry dates correctly', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('31.12.2024')).toBeInTheDocument();
      expect(screen.getByText('Unbegrenzt')).toBeInTheDocument();
      expect(screen.getByText('31.12.2023')).toBeInTheDocument();
    });
  });

  it('formats creation dates correctly', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('01.03.2024 11:00')).toBeInTheDocument();
      expect(screen.getByText('15.02.2024 15:30')).toBeInTheDocument();
      expect(screen.getByText('01.01.2023 09:00')).toBeInTheDocument();
    });
  });

  it('opens create modal when new rule button is clicked', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    const newRuleButton = screen.getByText('Neue IP-Regel');
    fireEvent.click(newRuleButton);

    await waitFor(() => {
      expect(screen.getByText('Neue IP-Regel erstellen')).toBeInTheDocument();
      expect(screen.getByLabelText('IP-Adresse')).toBeInTheDocument();
      expect(screen.getByLabelText('IP-Bereich (CIDR-Notation)')).toBeInTheDocument();
      expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
      expect(screen.getByLabelText('Gültig bis')).toBeInTheDocument();
    });
  });

  it('creates a new IP rule', async () => {
    const newRule = {
      ipAddress: '192.168.2.1',
      ipRange: '/24',
      description: 'New Office Network',
      isActive: true,
      createdBy: 'Current User',
    };

    vi.mocked(securityApi.createIPWhitelistRule).mockResolvedValue({
      ...newRule,
      id: '4',
      createdAt: '2024-03-20T10:00:00Z',
      expiresAt: null,
    });

    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue IP-Regel erstellen')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('IP-Adresse'), { target: { value: '192.168.2.1' } });
    fireEvent.change(screen.getByLabelText('IP-Bereich (CIDR-Notation)'), { target: { value: '/24' } });
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'New Office Network' } });

    // Submit
    fireEvent.click(screen.getByText('Erstellen'));

    await waitFor(() => {
      expect(securityApi.createIPWhitelistRule).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.2.1',
          ipRange: '/24',
          description: 'New Office Network',
          isActive: true,
          createdBy: 'Current User',
        }),
      );
      expect(message.success).toHaveBeenCalledWith('IP-Regel wurde erfolgreich erstellt');
    });
  });

  it('validates IP address format', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      const ipInput = screen.getByLabelText('IP-Adresse');
      fireEvent.change(ipInput, { target: { value: 'invalid-ip' } });
      fireEvent.blur(ipInput);
    });

    await waitFor(() => {
      expect(screen.getByText('Bitte gültige IP-Adresse eingeben (z.B. 192.168.1.1)')).toBeInTheDocument();
    });
  });

  it('validates CIDR notation', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      const cidrInput = screen.getByLabelText('IP-Bereich (CIDR-Notation)');
      fireEvent.change(cidrInput, { target: { value: 'invalid' } });
      fireEvent.blur(cidrInput);
    });

    await waitFor(() => {
      expect(screen.getByText('Bitte gültigen CIDR-Bereich eingeben (z.B. /24)')).toBeInTheDocument();
    });
  });

  it('opens edit modal when edit button is clicked', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('IP-Regel bearbeiten')).toBeInTheDocument();
      expect(screen.getByDisplayValue('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('/24')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Office Network')).toBeInTheDocument();
    });
  });

  it('updates an existing rule', async () => {
    vi.mocked(securityApi.updateIPWhitelistRule).mockResolvedValue({
      ...mockRules[0],
      description: 'Updated Description',
    });

    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      const descriptionField = screen.getByLabelText('Beschreibung');
      fireEvent.change(descriptionField, { target: { value: 'Updated Description' } });
    });

    // Submit
    fireEvent.click(screen.getByText('Aktualisieren'));

    await waitFor(() => {
      expect(securityApi.updateIPWhitelistRule).toHaveBeenCalledWith('1', expect.any(Object));
      expect(message.success).toHaveBeenCalledWith('IP-Regel wurde erfolgreich aktualisiert');
    });
  });

  it('deletes a rule after confirmation', async () => {
    vi.mocked(securityApi.deleteIPWhitelistRule).mockResolvedValue(undefined);

    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);
    });

    // Confirm deletion
    await waitFor(() => {
      const confirmButton = screen.getByText('Ja');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(securityApi.deleteIPWhitelistRule).toHaveBeenCalledWith('1');
      expect(message.success).toHaveBeenCalledWith('IP-Regel wurde erfolgreich gelöscht');
    });
  });

  it('cancels rule deletion', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);
    });

    // Cancel deletion
    await waitFor(() => {
      const cancelButton = screen.getByText('Nein');
      fireEvent.click(cancelButton);
    });

    expect(securityApi.deleteIPWhitelistRule).not.toHaveBeenCalled();
  });

  it('handles create error', async () => {
    vi.mocked(securityApi.createIPWhitelistRule).mockRejectedValue(new Error('Create failed'));

    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal and fill form
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('IP-Adresse'), { target: { value: '192.168.1.1' } });
      fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test' } });
    });

    // Submit
    fireEvent.click(screen.getByText('Erstellen'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Erstellen der IP-Regel');
    });
  });

  it('handles update error', async () => {
    vi.mocked(securityApi.updateIPWhitelistRule).mockRejectedValue(new Error('Update failed'));

    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Aktualisieren'));
    });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Aktualisieren der IP-Regel');
    });
  });

  it('handles delete error', async () => {
    vi.mocked(securityApi.deleteIPWhitelistRule).mockRejectedValue(new Error('Delete failed'));

    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      const confirmButton = screen.getByText('Ja');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Löschen der IP-Regel');
    });
  });

  it('closes modal on cancel', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue IP-Regel erstellen')).toBeInTheDocument();
    });

    // Cancel
    fireEvent.click(screen.getByText('Abbrechen'));

    await waitFor(() => {
      expect(screen.queryByText('Neue IP-Regel erstellen')).not.toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      // Try to submit without filling required fields
      fireEvent.click(screen.getByText('Erstellen'));
    });

    // Should not call API
    expect(securityApi.createIPWhitelistRule).not.toHaveBeenCalled();
  });

  it('handles expiry date selection', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      const dateInput = screen.getByPlaceholderText('Unbegrenzt gültig');
      fireEvent.click(dateInput);
    });

    // Date picker interaction would require more complex mocking
    // This verifies the field exists and is clickable
  });

  it('handles empty rules list', async () => {
    vi.mocked(securityApi.getIPWhitelistRules).mockResolvedValue([]);

    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('0 IP-Regeln gesamt')).toBeInTheDocument();
    });
  });

  it('toggles active status', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue IP-Regel'));

    await waitFor(() => {
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(switchElement);
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('preserves expiry date when editing', async () => {
    render(<IPWhitelistManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]); // Rule with expiry date
    });

    await waitFor(() => {
      // Verify the date picker has a value
      const dateInput = screen.getByPlaceholderText('Unbegrenzt gültig');
      expect(dateInput).toHaveValue('31.12.2024');
    });
  });
});
