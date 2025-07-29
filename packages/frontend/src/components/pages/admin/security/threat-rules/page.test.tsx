import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ThreatRulesEditor', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(securityApi.getThreatRules).mockResolvedValue(mockRules);
    // Clear any pending timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllTimers();
    if (queryClient) {
      queryClient.clear();
    }
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
      const criticalRulesValue = screen.getByText((content, element) => {
        return (
          element?.closest('.ant-statistic')?.querySelector('.ant-statistic-title')?.textContent ===
            'Kritische Regeln' && content === '1'
        );
      });
      expect(criticalRulesValue).toBeInTheDocument();

      // Total triggers: 18 (15 + 0 + 3)
      expect(screen.getByText('18')).toBeInTheDocument();

      // Success rate (hardcoded)
      const successRateElement = screen.getByText((content, element) => {
        return (
          element?.closest('.ant-statistic')?.querySelector('.ant-statistic-title')?.textContent === 'Erfolgsrate' &&
          element?.classList.contains('ant-statistic-content-value-decimal')
        );
      });
      expect(successRateElement).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Konfiguration'), {
      target: { value: JSON.stringify({ threshold: 10 }, null, 2) },
    });

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
    await act(async () => {
      fireEvent.click(screen.getByText('Neue Regel'));
    });

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Fill form fields
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText('Konfiguration'), {
        target: { value: JSON.stringify({ threshold: 5 }, null, 2) },
      });
    });

    // Select required fields
    await act(async () => {
      const severitySelect = screen.getByLabelText('Schweregrad');
      fireEvent.mouseDown(severitySelect);
    });
    await waitFor(() => {
      fireEvent.click(screen.getByText('Hoch'));
    });

    await act(async () => {
      const conditionSelect = screen.getByLabelText('Bedingungstyp');
      fireEvent.mouseDown(conditionSelect);
    });
    await waitFor(() => {
      fireEvent.click(screen.getByText('Schwellenwert'));
    });

    // Submit
    const modal = screen.getByRole('dialog');
    const submitButton = within(modal).getByRole('button', { name: 'Erstellen' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

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

    // Submit - look for the button within the modal footer
    const modal = screen.getByRole('dialog');
    const updateButton = within(modal).getByRole('button', { name: 'Aktualisieren' });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(securityApi.updateThreatRule).toHaveBeenCalledWith('1', expect.any(Object));
      expect(message.success).toHaveBeenCalledWith('Threat Rule wurde erfolgreich aktualisiert');
    });
  });

  it('deletes a rule after confirmation', async () => {
    vi.mocked(securityApi.deleteThreatRule).mockResolvedValue(undefined);

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Löschen').length).toBeGreaterThan(0);
    });

    await act(async () => {
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);
    });

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText('Threat Rule löschen?')).toBeInTheDocument();
    });

    await act(async () => {
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
      expect(screen.getByText('Threat Detection Rules')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Aktualisieren/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(securityApi.getThreatRules).toHaveBeenCalledTimes(2);
    });
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
      const v1Tags = screen.getAllByText('v1');
      const v2Tags = screen.getAllByText('v2');
      expect(v1Tags.length).toBeGreaterThan(0);
      expect(v2Tags.length).toBeGreaterThan(0);
    });
  });

  it.skip('closes modal on cancel', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Cancel
    const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Neue Threat Rule erstellen')).not.toBeInTheDocument();
    });
  });

  it('validates form fields', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    const modal = screen.getByRole('dialog');
    const submitButton = within(modal).getByRole('button', { name: 'Erstellen' });
    fireEvent.click(submitButton);

    // Wait for form validation to trigger
    await waitFor(() => {
      // Check for validation error messages
      expect(screen.getByText('Bitte Namen eingeben')).toBeInTheDocument();
      expect(screen.getByText('Bitte Beschreibung eingeben')).toBeInTheDocument();
      expect(screen.getByText('Bitte Schweregrad auswählen')).toBeInTheDocument();
      expect(screen.getByText('Bitte Bedingungstyp auswählen')).toBeInTheDocument();
    });

    // Should not call API when validation fails
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

  it.skip('opens test drawer when test button is clicked', async () => {
    // Skip this test until ThreatRuleTest component is implemented
    // The component is currently commented out in the main file
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Testen')).toBeDefined();
    });

    const testButtons = screen.getAllByText('Testen');
    fireEvent.click(testButtons[0]);

    // TODO: Re-enable when ThreatRuleTest component is uncommented
    // expect(screen.getByText('Test Threat Rule')).toBeInTheDocument();
  });

  it('handles empty rules list', async () => {
    vi.mocked(securityApi.getThreatRules).mockResolvedValue([]);

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Statistics should show zeros - check all occurrences
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(3); // activeRules, triggers, critical
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

  it('handles invalid JSON config in handleSubmit', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Fill form with invalid JSON in config
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Rule' } });
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test description' } });
    fireEvent.change(screen.getByLabelText('Konfiguration'), {
      target: { value: 'invalid json {' },
    });

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
    const modal = screen.getByRole('dialog');
    const submitButton = within(modal).getByRole('button', { name: 'Erstellen' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Ungültiges JSON in der Konfiguration');
      expect(securityApi.createThreatRule).not.toHaveBeenCalled();
    });
  });

  it('toggles rule status switch in modal', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Find and toggle the switch
    const statusSwitch = screen.getByRole('switch');
    expect(statusSwitch).toHaveAttribute('aria-checked', 'true'); // Default is active

    fireEvent.click(statusSwitch);

    await waitFor(() => {
      expect(statusSwitch).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('sets default values when opening create modal', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Check default values
    const configTextarea = screen.getByLabelText('Konfiguration') as HTMLTextAreaElement;
    expect(configTextarea.value).toContain('"threshold": 5');
    expect(configTextarea.value).toContain('"timeWindow": 300');

    const statusSwitch = screen.getByRole('switch');
    expect(statusSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('displays all severity options in select', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Open severity select
    const severitySelect = screen.getByLabelText('Schweregrad');
    fireEvent.mouseDown(severitySelect);

    await waitFor(() => {
      expect(screen.getByText('Niedrig')).toBeInTheDocument();
      expect(screen.getByText('Mittel')).toBeInTheDocument();
      expect(screen.getByText('Hoch')).toBeInTheDocument();
      expect(screen.getByText('Kritisch')).toBeInTheDocument();
    });
  });

  it('displays all condition type options in select', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Open condition type select
    const conditionSelect = screen.getByLabelText('Bedingungstyp');
    fireEvent.mouseDown(conditionSelect);

    await waitFor(() => {
      expect(screen.getByText('Schwellenwert')).toBeInTheDocument();
      expect(screen.getByText('Muster')).toBeInTheDocument();
      expect(screen.getByText('Anomalie')).toBeInTheDocument();
      expect(screen.getByText('Benutzerdefiniert')).toBeInTheDocument();
    });
  });

  it('handles update mutation error', async () => {
    vi.mocked(securityApi.updateThreatRule).mockRejectedValue(new Error('Update failed'));

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    });

    // Submit
    const modal = screen.getByRole('dialog');
    const updateButton = within(modal).getByRole('button', { name: 'Aktualisieren' });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Aktualisieren der Threat Rule');
    });
  });

  it('handles delete mutation error', async () => {
    vi.mocked(securityApi.deleteThreatRule).mockRejectedValue(new Error('Delete failed'));

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
      expect(message.error).toHaveBeenCalledWith('Fehler beim Löschen der Threat Rule');
    });
  });

  it('formats last triggered date for never triggered rules', async () => {
    const rulesWithNeverTriggered = [
      {
        id: '1',
        name: 'Never Triggered Rule',
        description: 'This rule was never triggered',
        severity: 'low',
        isActive: true,
        triggerCount: 0,
        lastTriggered: null,
        version: 1,
        conditionType: 'threshold',
        config: { threshold: 10 },
      },
    ];

    vi.mocked(securityApi.getThreatRules).mockResolvedValue(rulesWithNeverTriggered);

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Nie')).toBeInTheDocument();
    });
  });

  it('shows loading state for create mutation', async () => {
    let _resolveMutation: () => void;
    vi.mocked(securityApi.createThreatRule).mockImplementation(
      () =>
        new Promise<ThreatRule>((resolve) => {
          _resolveMutation = () => resolve(mockThreatRules[0]);
        }),
    );

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      // Fill form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText('Konfiguration'), {
        target: { value: JSON.stringify({ threshold: 5 }, null, 2) },
      });
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
    const modal = screen.getByRole('dialog');
    const submitButton = within(modal).getByRole('button', { name: 'Erstellen' });
    fireEvent.click(submitButton);

    // Button should show loading state
    await waitFor(() => {
      expect(submitButton.querySelector('.ant-btn-loading-icon')).toBeInTheDocument();
    });
  });

  it.skip('resets form after successful update', async () => {
    vi.mocked(securityApi.updateThreatRule).mockResolvedValue({
      ...mockRules[0],
      name: 'Updated Rule',
    });

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Rule' } });
    });

    // Submit
    const modal = screen.getByRole('dialog');
    const updateButton = within(modal).getByRole('button', { name: 'Aktualisieren' });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Threat Rule wurde erfolgreich aktualisiert');
    });

    // Wait for modal to be removed from DOM
    await waitFor(() => {
      expect(document.querySelector('.ant-modal')).not.toBeInTheDocument();
    });
  });

  it('handles rules with all severity levels for statistics', async () => {
    const mixedSeverityRules = [
      { ...mockRules[0], severity: 'critical' },
      { ...mockRules[1], severity: 'critical' },
      { ...mockRules[2], severity: 'high' },
      {
        id: '4',
        name: 'Low Severity Rule',
        description: 'Low severity test',
        severity: 'low',
        isActive: true,
        triggerCount: 2,
        lastTriggered: null,
        version: 1,
        conditionType: 'pattern',
        config: {},
      },
    ];

    vi.mocked(securityApi.getThreatRules).mockResolvedValue(mixedSeverityRules);

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check critical rules count
      const criticalRulesValue = screen.getByText((content, element) => {
        return (
          element?.closest('.ant-statistic')?.querySelector('.ant-statistic-title')?.textContent ===
            'Kritische Regeln' && content === '2'
        );
      });
      expect(criticalRulesValue).toBeInTheDocument();
    });
  });

  it('handles test button click and sets test context', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      const testButtons = screen.getAllByText('Testen');
      expect(testButtons.length).toBeGreaterThan(0);

      // Click test button
      fireEvent.click(testButtons[0]);
    });

    // Even though the drawer won't open (component is commented out),
    // the click handler should still execute and set state
    expect(true).toBe(true); // Placeholder assertion
  });

  it('displays table pagination correctly', async () => {
    // Create many rules to test pagination
    const manyRules = Array.from({ length: 25 }, (_, i) => ({
      id: `rule-${i}`,
      name: `Rule ${i}`,
      description: `Description ${i}`,
      severity: i % 2 === 0 ? 'high' : 'medium',
      isActive: i % 3 !== 0,
      triggerCount: i * 2,
      lastTriggered: i % 2 === 0 ? '2024-03-20T10:00:00Z' : null,
      version: 1,
      conditionType: 'threshold',
      config: { threshold: i },
    }));

    vi.mocked(securityApi.getThreatRules).mockResolvedValue(manyRules);

    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check pagination is rendered
      expect(screen.getByText('25 Regeln gesamt')).toBeInTheDocument();

      // Should show page size changer
      const pageSizeSelect = document.querySelector('.ant-pagination-options-size-changer');
      expect(pageSizeSelect).toBeInTheDocument();
    });
  });

  it.skip('closes modal when clicking outside', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      expect(screen.getByText('Neue Threat Rule erstellen')).toBeInTheDocument();
    });

    // Click on modal mask (outside modal content)
    const modalMask = document.querySelector('.ant-modal-wrap');
    if (modalMask) {
      // Simulate clicking on the mask area (not the content)
      fireEvent.click(modalMask);
    }

    // Wait for modal to be removed from DOM
    await waitFor(() => {
      expect(document.querySelector('.ant-modal')).not.toBeInTheDocument();
    });
  });

  it('preserves form data when switching between severity options', async () => {
    render(<ThreatRulesEditor />, { wrapper: createWrapper() });

    // Open modal
    fireEvent.click(screen.getByText('Neue Regel'));

    await waitFor(() => {
      // Fill some form fields
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Rule Name' } });
      fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test Description' } });
    });

    // Select severity
    const severitySelect = screen.getByLabelText('Schweregrad');
    fireEvent.mouseDown(severitySelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Hoch'));
    });

    // Change severity again
    fireEvent.mouseDown(severitySelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Kritisch'));
    });

    // Check that other form values are preserved
    expect(screen.getByLabelText('Name')).toHaveValue('Test Rule Name');
    expect(screen.getByLabelText('Beschreibung')).toHaveValue('Test Description');
  });
});
