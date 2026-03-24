/**
 * Unit Tests für ServerSetupForm Component
 *
 * Tests für Server Setup Formular mit Multi-Step Flow.
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 *
 * **Flow:**
 * 1. idle: Server-URL + Server-Name (Pflichtfeld, Auto-Fill)
 * 2. Nach Health-Check → invite oder admin-setup Modus
 *
 * **Test Coverage:**
 * 1. Form Rendering & Initial State
 * 2. Server Name Validation (Pflichtfeld, Duplikate)
 * 3. Auto-Fill Behavior
 * 4. Health-Check Flow
 * 5. Error Handling
 * 6. Loading States
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServerSetupForm } from './ServerSetupForm';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('../../api/mutations', () => ({
  useExchangeInvite: vi.fn(),
  // biome-ignore lint/nursery/noShadow: Mock class intentionally shadows the real error export
  ExchangeInvitePersistenceError: class ExchangeInvitePersistenceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ExchangeInvitePersistenceError';
    }
  },
}));

vi.mock('../../api/use-health-check', () => ({
  useHealthCheck: vi.fn(),
  // biome-ignore lint/nursery/noShadow: Mock class intentionally shadows the real HealthCheckError
  HealthCheckError: class HealthCheckError extends Error {
    type: string;
    constructor(message: string, type: string) {
      super(message);
      this.type = type;
      this.name = 'HealthCheckError';
    }
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock store functions
vi.mock('../../stores/server.store', () => ({
  addServer: vi.fn().mockResolvedValue('mock-server-id'),
  setActiveServer: vi.fn().mockResolvedValue(undefined),
  isServerNameTaken: vi.fn().mockReturnValue(false),
}));

// Mock HealthApi für Auto-Fill Tests
vi.mock('@bluelight-hub/shared/client', () => ({
  Configuration: vi.fn().mockImplementation(() => ({})),
  AdminApi: vi.fn().mockImplementation(() => ({
    adminSetupControllerCompleteSetupVAlpha: vi.fn(),
  })),
}));

// Import nach mock setup
import { ExchangeInvitePersistenceError, useExchangeInvite } from '../../api/mutations';
import { useHealthCheck, HealthCheckError } from '../../api/use-health-check';
import { isServerNameTaken } from '../../stores/server.store';

describe('ServerSetupForm', () => {
  // Mock functions
  let mockMutateAsync: ReturnType<typeof vi.fn>;
  let mockHealthCheckMutateAsync: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementation for exchange
    mockMutateAsync = vi.fn().mockResolvedValue({
      data: {
        accessToken: 'test-token',
        serverInfo: {
          name: 'Test Server',
          baseUrl: 'https://api.test.de',
        },
      },
    });

    // Default mock implementation for health check (setupComplete: true)
    mockHealthCheckMutateAsync = vi.fn().mockResolvedValue({
      isHealthy: true,
      status: 'ok',
      setupComplete: true,
    });

    mockOnSuccess = vi.fn();

    // Mock useExchangeInvite hook
    (useExchangeInvite as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    // Mock useHealthCheck hook
    (useHealthCheck as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockHealthCheckMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    // Default: no duplicate names
    (isServerNameTaken as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  describe('Form Rendering & Initial State (idle mode)', () => {
    it('should render Server-URL and Server-Name fields in idle mode', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      expect(screen.getByLabelText(/Server-URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Server-Name/i)).toBeInTheDocument();
      // Invite-Code should NOT be visible in idle mode
      expect(screen.queryByLabelText(/Einladungscode/i)).not.toBeInTheDocument();
    });

    it('should render empty form when no prefillServerUrl is provided', () => {
      // Given (Arrange)
      // (No prefill)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      expect(serverUrlInput).toHaveValue('');
      expect(serverNameInput).toHaveValue('');
    });

    it('should prefill server URL when prefillServerUrl prop is provided', () => {
      // Given (Arrange)
      const prefillUrl = 'https://api.example.de';

      // When (Act)
      render(<ServerSetupForm prefillServerUrl={prefillUrl} />);

      // Then (Assert)
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      expect(serverUrlInput).toHaveValue(prefillUrl);
    });

    it('should render submit button with "Mit Server verbinden" text in idle mode', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      expect(screen.getByRole('button', { name: /Mit Server verbinden/i })).toBeInTheDocument();
    });

    // Note: autoFocus Test entfernt - React's autoFocus wird zur Runtime
    // angewendet und ist nicht als DOM-Attribut sichtbar in JSDOM Tests
  });

  describe('Server Name Validation (Pflichtfeld)', () => {
    it('should show error when server name is empty on blur', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      // When (Act)
      await user.click(serverNameInput);
      await user.tab(); // Trigger blur with empty value

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText(/Server-Name ist ein Pflichtfeld/i)).toBeInTheDocument();
      });
    });

    it('should show error for duplicate server name', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      (isServerNameTaken as ReturnType<typeof vi.fn>).mockReturnValue(true);

      render(<ServerSetupForm />);

      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      // When (Act)
      await user.type(serverNameInput, 'Existing Server');
      await user.tab();

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText(/Ein Server mit diesem Namen existiert bereits/i)).toBeInTheDocument();
      });
    });

    it('should accept valid unique server name', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      (isServerNameTaken as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(<ServerSetupForm />);

      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      // When (Act)
      await user.type(serverNameInput, 'Unique Server Name');
      await user.tab();

      // Then (Assert)
      await waitFor(() => {
        expect(screen.queryByText(/Server-Name ist ein Pflichtfeld/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/existiert bereits/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Server Name Auto-Fill from URL', () => {
    it('should auto-fill server name from URL hostname when typing', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');

      // Then (Assert)
      await waitFor(() => {
        expect(serverNameInput).toHaveValue('api.example.de');
      });
    });

    it('should auto-fill server name with port if present', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      // When (Act)
      await user.type(serverUrlInput, 'https://localhost:3091');

      // Then (Assert)
      await waitFor(() => {
        expect(serverNameInput).toHaveValue('localhost:3091');
      });
    });

    it('should NOT overwrite manually entered server name', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      // When (Act)
      // First, manually enter a server name
      await user.type(serverNameInput, 'Mein Server');
      // Then, fill in the URL
      await user.type(serverUrlInput, 'https://api.example.de');

      // Then (Assert)
      // The manually entered name should NOT be overwritten
      expect(serverNameInput).toHaveValue('Mein Server');
    });

    it('should show hint about auto-fill when not manually edited', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      expect(screen.getByText(/Wird automatisch aus der URL befüllt/i)).toBeInTheDocument();
    });

    it('should NOT trigger auto-fill for invalid URL', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);

      // When (Act)
      await user.type(serverUrlInput, 'invalid-url');

      // Then (Assert)
      expect(serverNameInput).toHaveValue('');
    });
  });

  describe('URL Validation', () => {
    it('should show error for invalid server URL', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);

      // When (Act)
      await user.type(serverUrlInput, 'not-a-valid-url');
      await user.tab(); // Trigger blur

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText(/Ungültige Server-URL/i)).toBeInTheDocument();
      });
    });

    it('should accept valid HTTPS server URL', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.tab();

      // Then (Assert)
      await waitFor(() => {
        expect(screen.queryByText(/Ungültige Server-URL/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Health-Check Flow (Step 1 → Step 2)', () => {
    it('should trigger health-check on form submit in idle mode', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);
      const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(serverNameInput, 'Test Server');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(mockHealthCheckMutateAsync).toHaveBeenCalledWith({
          serverUrl: 'https://api.example.de',
        });
      });
    });

    it('should show invite code field after health-check with setupComplete: true', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);
      const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(serverNameInput, 'Test Server');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });
      // Button text should change
      expect(screen.getByRole('button', { name: /Server hinzufügen/i })).toBeInTheDocument();
    });

    it('should show admin setup fields after health-check with setupComplete: false', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: false,
      });

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);
      const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(serverNameInput, 'Test Server');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByLabelText(/Admin-Nutzername/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Admin-Passwort/i)).toBeInTheDocument();
      });
      // Button text should change
      expect(screen.getByRole('button', { name: /Admin-Account erstellen/i })).toBeInTheDocument();
    });

    it('should disable URL field after health-check', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);
      const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(serverNameInput, 'Test Server');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByLabelText(/Server-URL/i)).toBeDisabled();
      });
    });

    it('should show "Ändern" button after health-check to reset mode', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const serverNameInput = screen.getByLabelText(/Server-Name/i);
      const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(serverNameInput, 'Test Server');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Ändern/i })).toBeInTheDocument();
      });
    });
  });

  describe('Invite Code Exchange (after health-check)', () => {
    it('should call useExchangeInvite mutation on submit with valid data', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      // Step 1: Enter URL first (will auto-fill server name), then modify the name
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      await user.type(serverUrlInput, 'https://api.example.de');

      // Wait for auto-fill to happen
      await waitFor(() => {
        expect(screen.getByLabelText(/Server-Name/i)).toHaveValue('api.example.de');
      });

      // Now manually change the server name (sets hasManuallyEditedName = true)
      const serverNameInput = screen.getByLabelText(/Server-Name/i);
      await user.clear(serverNameInput);
      await user.type(serverNameInput, 'Test Server');

      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Wait for invite mode
      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });

      // Step 2: Enter invite code and submit
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      await user.type(inviteCodeInput, 'ABC12345');
      await user.click(screen.getByRole('button', { name: /Server hinzufügen/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          inviteCode: 'ABC12345',
          serverUrl: 'https://api.example.de',
          serverName: 'Test Server',
        });
      });
    });

    it('should call onSuccess callback after successful submission', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      // biome-ignore lint/suspicious/noExplicitAny: Test mock type assertion
      render(<ServerSetupForm onSuccess={mockOnSuccess as any} />);

      // Step 1
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/Einladungscode/i), 'ABC12345');
      await user.click(screen.getByRole('button', { name: /Server hinzufügen/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should show success toast after successful submission', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      // Step 1
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/Einladungscode/i), 'ABC12345');
      await user.click(screen.getByRole('button', { name: /Server hinzufügen/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('hinzugefügt'), expect.any(Object));
      });
    });
  });

  describe('Health-Check Error Handling', () => {
    it('should show specific error message for TIMEOUT error', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Timeout', 'TIMEOUT'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText(/Server antwortet nicht \(Timeout nach 5 Sekunden\)/i)).toBeInTheDocument();
      });
    });

    it('should show inline Alert for NETWORK error (Story 2.7, AC3)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert) - Story 2.7: NETWORK errors now show inline Alert instead of text
      await waitFor(() => {
        // Alert sollte angezeigt werden mit spezifischer Nachricht
        const alert = screen.getByTestId('inline-network-error');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Server nicht erreichbar');
        expect(alert).toHaveTextContent('Prüfe deine Internetverbindung und versuche es erneut.');
      });
    });

    it('should show "Erneut versuchen" button when health-check fails', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Timeout', 'TIMEOUT'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
      });
    });

    it('should clear error when "Erneut versuchen" button is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Timeout', 'TIMEOUT'));

      render(<ServerSetupForm />);

      // Trigger error
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/Server antwortet nicht/i)).toBeInTheDocument();
      });

      // Click retry button
      await user.click(screen.getByRole('button', { name: /Erneut versuchen/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(screen.queryByText(/Server antwortet nicht/i)).not.toBeInTheDocument();
      });
    });

    it('should NOT show error toast for health-check failures (inline error only)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert) - Error should be shown inline, NOT as toast
      await waitFor(() => {
        expect(screen.getByText(/Server nicht erreichbar/i)).toBeInTheDocument();
      });
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('Exchange Error Handling', () => {
    it('should show OnboardingErrorCard component when exchange fails', () => {
      // Given (Arrange)
      (useExchangeInvite as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: true,
        error: { message: 'Invite code expired' },
      });

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      expect(screen.getByText(/Einladungslink abgelaufen/i)).toBeInTheDocument();
    });

    it('should show error toast when exchange submission fails', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      render(<ServerSetupForm />);

      // Step 1
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/Einladungscode/i), 'ABC12345');
      await user.click(screen.getByRole('button', { name: /Server hinzufügen/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Fehler beim Hinzufügen des Servers', {
          description: 'Network error',
        });
      });
    });

    it('should show storage-specific toast when local persistence fails after exchange', async () => {
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });
      mockMutateAsync.mockRejectedValueOnce(new ExchangeInvitePersistenceError('Store failed'));

      render(<ServerSetupForm />);

      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/Einladungscode/i), 'ABC12345');
      await user.click(screen.getByRole('button', { name: /Server hinzufügen/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server lokal nicht gespeichert', {
          description: 'Der Server wurde bestätigt, konnte aber auf diesem Gerät nicht konsistent gespeichert werden. Bitte prüfe Speicherrechte und versuche es erneut.',
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during health-check phase', () => {
      // Given (Arrange)
      (useHealthCheck as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: mockHealthCheckMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      });

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state during exchange phase', () => {
      // Given (Arrange)
      (useExchangeInvite as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      });

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields in idle mode', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      expect(screen.getByLabelText(/Server-URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Server-Name/i)).toBeInTheDocument();
    });

    it('should show validation errors in accessible way', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);

      // When (Act)
      await user.type(serverUrlInput, 'invalid');
      await user.tab();

      // Then (Assert)
      await waitFor(() => {
        const errorMessage = screen.getByText(/Ungültige Server-URL/i);
        expect(errorMessage).toHaveClass('text-status-danger-text');
      });
    });
  });

  describe('Reset Mode Flow', () => {
    it('should reset to idle mode when "Ändern" button is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      // Go to invite mode
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });

      // When (Act) - Click "Ändern" button
      await user.click(screen.getByRole('button', { name: /Ändern/i }));

      // Then (Assert) - Should be back to idle mode
      await waitFor(() => {
        expect(screen.queryByLabelText(/Einladungscode/i)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/Server-URL/i)).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /Mit Server verbinden/i })).toBeInTheDocument();
      });
    });

    it('should reset hasManuallyEditedName when mode is reset', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockResolvedValue({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      // Manually edit server name
      await user.type(screen.getByLabelText(/Server-Name/i), 'Manual Name');
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
      });

      // Reset mode
      await user.click(screen.getByRole('button', { name: /Ändern/i }));

      // Wait for idle mode
      await waitFor(() => {
        expect(screen.queryByLabelText(/Einladungscode/i)).not.toBeInTheDocument();
      });

      // Clear and type new URL - should auto-fill again
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      await user.clear(serverUrlInput);
      await user.type(serverUrlInput, 'https://new.example.de');

      // Then (Assert) - Auto-fill should work again
      await waitFor(() => {
        expect(screen.getByLabelText(/Server-Name/i)).toHaveValue('new.example.de');
      });
    });
  });

  /**
   * Story 2.7, AC3: Inline Network Error Alert Tests
   *
   * Testet die Anzeige und Interaktion mit dem Inline-Netzwerkfehler-Alert.
   * NFR-R2: Fehlerfeedback < 2s.
   */
  describe('Inline Network Error Alert (Story 2.7, AC3)', () => {
    it('should display Alert component with status="error" for NETWORK errors', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert)
      await waitFor(() => {
        // Alert component mit status="error" sollte angezeigt werden
        const alert = screen.getByTestId('inline-network-error');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Server nicht erreichbar');
        expect(alert).toHaveTextContent('Prüfe deine Internetverbindung und versuche es erneut.');
      });
    });

    it('should show "Erneut versuchen" button inside network error Alert', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert)
      await waitFor(() => {
        const retryButton = screen.getByTestId('retry-network-error-button');
        expect(retryButton).toBeInTheDocument();
        expect(retryButton).toHaveTextContent('Erneut versuchen');
      });
    });

    it('should clear inline network error and re-trigger submission when "Erneut versuchen" is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      // First call fails with NETWORK error, second call succeeds
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK')).mockResolvedValueOnce({
        isHealthy: true,
        status: 'ok',
        setupComplete: true,
      });

      render(<ServerSetupForm />);

      // Submit form to trigger network error
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('inline-network-error')).toBeInTheDocument();
      });

      // When (Act) - Click retry button
      await user.click(screen.getByTestId('retry-network-error-button'));

      // Then (Assert) - Error should be cleared and health check re-triggered
      await waitFor(() => {
        expect(screen.queryByTestId('inline-network-error')).not.toBeInTheDocument();
      });

      // Health check should have been called twice
      expect(mockHealthCheckMutateAsync).toHaveBeenCalledTimes(2);
    });

    it('should clear inline network error when server URL input changes', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK'));

      render(<ServerSetupForm />);

      // Submit form to trigger network error
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('inline-network-error')).toBeInTheDocument();
      });

      // When (Act) - Change server URL input
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      await user.type(serverUrlInput, '/new-path');

      // Then (Assert) - Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('inline-network-error')).not.toBeInTheDocument();
      });
    });

    it('should NOT clear inline network error when server name input changes (only serverUrl should clear it)', async () => {
      // Given (Arrange)
      // FIX: Server-Name hat keine Verbindung zu Netzwerkfehlern - nur serverUrl-Änderung sollte den Error clearen
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK'));

      render(<ServerSetupForm />);

      // Submit form to trigger network error
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('inline-network-error')).toBeInTheDocument();
      });

      // When (Act) - Change server name input (NOT serverUrl)
      const serverNameInput = screen.getByLabelText(/Server-Name/i);
      await user.type(serverNameInput, ' Updated');

      // Then (Assert) - Error should STILL be visible (serverName has nothing to do with network errors)
      // Network error should only be cleared when serverUrl changes
      expect(screen.getByTestId('inline-network-error')).toBeInTheDocument();
    });

    it('should NOT display inline Alert for non-NETWORK errors (TIMEOUT should use text error)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Timeout', 'TIMEOUT'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert)
      await waitFor(() => {
        // Inline Alert sollte NICHT angezeigt werden für TIMEOUT
        expect(screen.queryByTestId('inline-network-error')).not.toBeInTheDocument();
        // Stattdessen sollte der Text-basierte Fehler angezeigt werden
        expect(screen.getByText(/Server antwortet nicht \(Timeout nach 5 Sekunden\)/i)).toBeInTheDocument();
      });
    });

    it('should position inline Alert above submit button', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockHealthCheckMutateAsync.mockRejectedValueOnce(new HealthCheckError('Network error', 'NETWORK'));

      render(<ServerSetupForm />);

      // When (Act)
      await user.type(screen.getByLabelText(/Server-URL/i), 'https://api.example.de');
      await user.type(screen.getByLabelText(/Server-Name/i), 'Test Server');
      await user.click(screen.getByRole('button', { name: /Mit Server verbinden/i }));

      // Then (Assert)
      await waitFor(() => {
        const alert = screen.getByTestId('inline-network-error');
        const submitButton = screen.getByRole('button', { name: /Mit Server verbinden/i });

        // Alert sollte im DOM vor dem Submit Button kommen
        // compareDocumentPosition: 4 bedeutet "follows" (alert kommt vor button)
        expect(alert.compareDocumentPosition(submitButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });
    });
  });
});
