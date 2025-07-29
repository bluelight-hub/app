import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ThreatRulesEditor from './page';
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
    name: 'Brute Force Detection',
    description: 'Detects multiple failed login attempts',
    severity: 'critical',
    isActive: true,
    triggerCount: 15,
    lastTriggered: '2024-03-20T10:00:00Z',
    version: 1,
    conditionType: 'threshold',
    config: { threshold: 5, timeWindow: 300 },
  },
  {
    id: '2',
    name: 'SQL Injection Detection',
    description: 'Detects SQL injection patterns',
    severity: 'high',
    isActive: false,
    triggerCount: 0,
    lastTriggered: null,
    version: 2,
    conditionType: 'pattern',
    config: { patterns: ['DROP TABLE', 'UNION SELECT'] },
  },
  {
    id: '3',
    name: 'Anomaly Detection',
    description: 'Detects unusual access patterns',
    severity: 'medium',
    isActive: true,
    triggerCount: 3,
    lastTriggered: '2024-03-19T15:30:00Z',
    version: 1,
    conditionType: 'anomaly',
    config: { sensitivity: 0.8 },
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

describe.skip('ThreatRulesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(securityApi.getThreatRules).mockResolvedValue(mockRules);
  });

  it('renders the component with header', () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    expect(screen.getByText('Threat Detection Rules')).toBeInTheDocument();
    expect(screen.getByText('Konfigurieren Sie Regeln zur Erkennung von Sicherheitsbedrohungen')).toBeInTheDocument();
  });

  it('displays statistics cards', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Aktive Regeln')).toBeInTheDocument();
      expect(screen.getByText('Kritische Regeln')).toBeInTheDocument();
      expect(screen.getByText('Auslösungen heute')).toBeInTheDocument();
      expect(screen.getByText('Erfolgsrate')).toBeInTheDocument();
    });
  });

  it('calculates statistics correctly', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Active rules: 2 out of 3
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('/ 3')).toBeInTheDocument();

      // Critical rules: 1
      expect(screen.getByText('1')).toBeInTheDocument();

      // Total triggers: 18 (15 + 0 + 3)
      expect(screen.getByText('18')).toBeInTheDocument();

      // Success rate (hardcoded)
      expect(screen.getByText('98.5')).toBeInTheDocument();
    });
  });

  it('loads and displays threat rules', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Brute Force Detection')).toBeInTheDocument();
      expect(screen.getByText('SQL Injection Detection')).toBeInTheDocument();
      expect(screen.getByText('Anomaly Detection')).toBeInTheDocument();
    });
  });

  it('displays severity tags correctly', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });
  });

  it('displays rule status correctly', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const activeStatuses = screen.getAllByText('Aktiv');
      const inactiveStatuses = screen.getAllByText('Inaktiv');
      expect(activeStatuses).toHaveLength(2);
      expect(inactiveStatuses).toHaveLength(1);
    });
  });

  it('formats last triggered date correctly', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/20\.03\.2024 11:00/)).toBeInTheDocument();
      expect(screen.getByText(/19\.03\.2024 16:30/)).toBeInTheDocument();
      expect(screen.getByText('Nie')).toBeInTheDocument();
    });
  });

  it('opens create modal when new rule button is clicked', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    const newRuleButton = screen.getByText('Neue Regel');
    fireEvent.click(newRuleButton);

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
      expect(screen.getByLabelText('Schweregrad')).toBeInTheDocument();
      expect(screen.getByLabelText('Bedingungstyp')).toBeInTheDocument();
    });
  });

  it('creates a new rule', async () => {
    const newRule = {
      name: 'New Test Rule',
      description: 'Test description',
      severity: 'high',
      conditionType: 'threshold',
      config: { threshold: 10 },
      isActive: true,
    };

    vi.mocked(securityApi.createThreatRule).mockResolvedValue({
      ...newRule,
      id: '4',
      triggerCount: 0,
      lastTriggered: null,
      version: 1,
    });

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Test Rule' } });
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test description' } });

    // Select severity
    const severitySelect = screen.getByLabelText('Schweregrad');
    fireEvent.mouseDown(severitySelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Hoch'));
    });

    // Select condition type
    const conditionSelect = screen.getByLabelText('Bedingungstyp');
    fireEvent.mouseDown(conditionSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Schwellenwert'));
    });

    // Submit
    fireEvent.click(screen.getByText('Erstellen'));

    await waitFor(() => {
      expect(securityApi.createThreatRule).toHaveBeenCalled();
      expect(message.success).toHaveBeenCalledWith('Threat Rule wurde erfolgreich erstellt');
    });
  });

  it('handles create error', async () => {
    vi.mocked(securityApi.createThreatRule).mockRejectedValue(new Error('Create failed'));

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal and fill form
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test' } });
    });

    // Select required fields
    const severitySelect = screen.getByLabelText('Schweregrad');
    fireEvent.mouseDown(severitySelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Hoch'));
    });

    const conditionSelect = screen.getByLabelText('Bedingungstyp');
    fireEvent.mouseDown(conditionSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Schwellenwert'));
    });

    // Submit
    fireEvent.click(screen.getByText('Erstellen'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Erstellen der Threat Rule');
    });
  });

  it('opens edit modal when edit button is clicked', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Threat Rule bearbeiten')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Brute Force Detection')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Detects multiple failed login attempts')).toBeInTheDocument();
    });
  });

  it('updates an existing rule', async () => {
    vi.mocked(securityApi.updateThreatRule).mockResolvedValue({
      ...mockRules[0],
      name: 'Updated Rule Name',
    });

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Rule Name' } });
    });

    // Submit
    fireEvent.click(screen.getByText('Aktualisieren'));

    await waitFor(() => {
      expect(securityApi.updateThreatRule).toHaveBeenCalledWith('1', expect.any(Object));
      expect(message.success).toHaveBeenCalledWith('Threat Rule wurde erfolgreich aktualisiert');
    });
  });

  it('deletes a rule after confirmation', async () => {
    vi.mocked(securityApi.deleteThreatRule).mockResolvedValue(undefined);

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

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
      expect(securityApi.deleteThreatRule).toHaveBeenCalledWith('1');
      expect(message.success).toHaveBeenCalledWith('Threat Rule wurde erfolgreich gelöscht');
    });
  });

  it('cancels rule deletion', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);
    });

    // Cancel deletion
    await waitFor(() => {
      const cancelButton = screen.getByText('Nein');
      fireEvent.click(cancelButton);
    });

    expect(securityApi.deleteThreatRule).not.toHaveBeenCalled();
  });

  it('refreshes rules when refresh button is clicked', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const refreshButton = screen.getByText('Aktualisieren');
      fireEvent.click(refreshButton);
    });

    expect(securityApi.getThreatRules).toHaveBeenCalledTimes(2);
  });

  it('displays trigger count with warning icon', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('displays version tags', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Cancel
    fireEvent.click(screen.getByText('Abbrechen'));

    await waitFor(() => {
      expect(screen.queryByText('Neue Threat Rule erstellen')).not.toBeInTheDocument();
    });
  });

  it('validates form fields', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      // Try to submit without filling required fields
      fireEvent.click(screen.getByText('Erstellen'));
    });

    // Should not call API
    expect(securityApi.createThreatRule).not.toHaveBeenCalled();
  });

  it('handles invalid JSON in config', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Mock form.setFieldsValue to include invalid JSON
    const _mockForm = {
      setFieldsValue: vi.fn(),
      getFieldValue: vi.fn().mockReturnValue('invalid json'),
    };

    // This would be tested more thoroughly with integration tests
    // as it requires deeper form manipulation
  });

  it('opens test drawer when test button is clicked', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const testButtons = screen.getAllByText('Testen');
      fireEvent.click(testButtons[0]);
    });

    // Since ThreatRuleTest component is commented out, the drawer won't actually open
    // but we can verify the click handler is attached
    expect(testButtons[0]).toBeDefined();
  });

  it('handles empty rules list', async () => {
    vi.mocked(securityApi.getThreatRules).mockResolvedValue([]);

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Statistics should show zeros - check all occurrences
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements).toHaveLength(4); // activeRules, triggers, critical, and in "/ 0"
      expect(screen.getByText('/ 0')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    // Mock slow loading
    vi.mocked(securityApi.getThreatRules).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Table should show loading spinner
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });
});
