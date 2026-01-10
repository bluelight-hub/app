/**
 * Unit Tests für ServerSetupForm Component
 *
 * Tests für Server Setup Formular mit Prefill-Support.
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 *
 * **Test Coverage (AC 5.4: >5 Tests):**
 * 1. Form Rendering & Prefill
 * 2. Validation
 * 3. Form Submission
 * 4. Error Handling
 * 5. Loading States
 * 6. Success Callback
 * 7. Toast Notifications
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServerSetupForm } from './ServerSetupForm';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('../../api/mutations', () => ({
  useExchangeInvite: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import nach mock setup
import { useExchangeInvite } from '../../api/mutations';

describe('ServerSetupForm', () => {
  // Mock functions
  let mockMutateAsync: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementation
    mockMutateAsync = vi.fn().mockResolvedValue({
      data: {
        accessToken: 'test-token',
        serverInfo: {
          name: 'Test Server',
          baseUrl: 'https://api.test.de',
        },
      },
    });

    mockOnSuccess = vi.fn();

    // Mock useExchangeInvite hook
    (useExchangeInvite as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  describe('Form Rendering & Prefill', () => {
    it('should render empty form when no prefillServerUrl is provided', () => {
      // Given (Arrange)
      // (No prefill)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);

      expect(serverUrlInput).toHaveValue('');
      expect(inviteCodeInput).toHaveValue('');
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

    it('should NOT prefill invite code (security requirement)', () => {
      // Given (Arrange)
      const prefillUrl = 'https://api.example.de';

      // When (Act)
      render(<ServerSetupForm prefillServerUrl={prefillUrl} />);

      // Then (Assert)
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      expect(inviteCodeInput).toHaveValue('');
    });

    it('should render submit button', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      expect(screen.getByRole('button', { name: /Server hinzufügen/i })).toBeInTheDocument();
    });

    it('should focus server URL input when no prefill is provided', () => {
      // Given (Arrange)
      // (No prefill)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      expect(serverUrlInput).toHaveAttribute('autoFocus');
    });

    it('should focus invite code input when prefill is provided', () => {
      // Given (Arrange)
      const prefillUrl = 'https://api.example.de';

      // When (Act)
      render(<ServerSetupForm prefillServerUrl={prefillUrl} />);

      // Then (Assert)
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      expect(inviteCodeInput).toHaveAttribute('autoFocus');
    });
  });

  describe('User can edit prefilled value', () => {
    it('should allow user to modify prefilled server URL', async () => {
      // Given (Arrange)
      const prefillUrl = 'https://api.example.de';
      const user = userEvent.setup();

      render(<ServerSetupForm prefillServerUrl={prefillUrl} />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);

      // When (Act)
      await user.clear(serverUrlInput);
      await user.type(serverUrlInput, 'https://api.modified.de');

      // Then (Assert)
      expect(serverUrlInput).toHaveValue('https://api.modified.de');
    });

    it('should validate modified server URL', async () => {
      // Given (Arrange)
      const prefillUrl = 'https://api.example.de';
      const user = userEvent.setup();

      render(<ServerSetupForm prefillServerUrl={prefillUrl} />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);

      // When (Act)
      await user.clear(serverUrlInput);
      await user.type(serverUrlInput, 'invalid-url');
      await user.tab(); // Trigger blur for validation

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText(/Ungültige Server-URL/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
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

    it('should show error for too short invite code', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);

      // When (Act)
      await user.type(inviteCodeInput, 'ABC123');
      await user.tab(); // Trigger blur

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText(/exakt 8 Zeichen/i)).toBeInTheDocument();
      });
    });

    it('should accept valid server URL', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.tab(); // Trigger blur

      // Then (Assert)
      await waitFor(() => {
        expect(screen.queryByText(/Ungültige Server-URL/i)).not.toBeInTheDocument();
      });
    });

    it('should accept valid invite code', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);

      // When (Act)
      await user.type(inviteCodeInput, 'ABC12345');
      await user.tab(); // Trigger blur

      // Then (Assert)
      await waitFor(() => {
        expect(screen.queryByText(/exakt 8 Zeichen/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call useExchangeInvite mutation on submit with valid data', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      const submitButton = screen.getByRole('button', { name: /Server hinzufügen/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(inviteCodeInput, 'ABC12345');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          inviteCode: 'ABC12345',
          serverUrl: 'https://api.example.de',
        });
      });
    });

    it('should NOT submit form when validation fails', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      const submitButton = screen.getByRole('button', { name: /Server hinzufügen/i });

      // When (Act)
      await user.type(serverUrlInput, 'invalid-url');
      await user.type(inviteCodeInput, 'ABC12345');
      await user.click(submitButton);

      // Then (Assert)
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should call onSuccess callback after successful submission', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm onSuccess={mockOnSuccess as any} />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      const submitButton = screen.getByRole('button', { name: /Server hinzufügen/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(inviteCodeInput, 'ABC12345');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should show success toast after successful submission', async () => {
      // Given (Arrange)
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      const submitButton = screen.getByRole('button', { name: /Server hinzufügen/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(inviteCodeInput, 'ABC12345');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Server erfolgreich hinzugefügt', {
          description: 'Du wirst weitergeleitet...',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should show ExpiredLinkError component when exchange fails', () => {
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
      expect(screen.getByText(/Dieser Einladungslink ist abgelaufen/i)).toBeInTheDocument();
    });

    it('should show error toast when submission fails', async () => {
      // Given (Arrange)
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
      const user = userEvent.setup();

      render(<ServerSetupForm />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      const submitButton = screen.getByRole('button', { name: /Server hinzufügen/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(inviteCodeInput, 'ABC12345');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Fehler beim Hinzufügen des Servers', {
          description: 'Network error',
        });
      });
    });

    it('should NOT call onSuccess callback when submission fails', async () => {
      // Given (Arrange)
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
      const user = userEvent.setup();

      render(<ServerSetupForm onSuccess={mockOnSuccess as any} />);

      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);
      const submitButton = screen.getByRole('button', { name: /Server hinzufügen/i });

      // When (Act)
      await user.type(serverUrlInput, 'https://api.example.de');
      await user.type(inviteCodeInput, 'ABC12345');
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state on submit button during submission', () => {
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
      expect(screen.getByRole('button', { name: /Verbinde.../i })).toBeInTheDocument();
    });

    it('should disable submit button during submission', () => {
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
      const submitButton = screen.getByRole('button', { name: /Verbinde.../i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerSetupForm />);

      // Then (Assert)
      expect(screen.getByLabelText(/Server-URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
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
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });
  });
});
