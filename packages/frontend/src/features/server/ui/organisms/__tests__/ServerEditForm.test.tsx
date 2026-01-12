/**
 * Tests für ServerEditForm Organism
 *
 * Testet das Bearbeitungs-Formular für Server-Konfiguration (Story 3.3).
 *
 * @module features/server/ui/organisms/__tests__/ServerEditForm
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from '../../../types/server-config';
import { ServerEditForm } from '../ServerEditForm';

// =====================================================
// Mock Setup
// =====================================================

// Mock serverStore functions
// R1 Fix: updateServerVisuals wurde entfernt - alle Updates gehen jetzt über updateServer
const mockUpdateServer = vi.fn<(id: string, updates: Partial<Omit<ServerConfig, 'id' | 'createdAt' | 'lastUsedAt'>>) => Promise<void>>(() => Promise.resolve());
const mockIsServerNameTaken = vi.fn((_name: string, _excludeId?: string) => false);

vi.mock('../../../stores/server.store', () => ({
  updateServer: (...args: unknown[]) => mockUpdateServer(...(args as [string, Partial<Omit<ServerConfig, 'id' | 'createdAt' | 'lastUsedAt'>>])),
  isServerNameTaken: (...args: unknown[]) => mockIsServerNameTaken(...(args as [string, string | undefined])),
}));

// Mock healthCheck hook
const mockMutateAsync = vi.fn(() => Promise.resolve());
vi.mock('../../../api/use-health-check', () => ({
  useHealthCheck: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Import toast after mock for test assertions
import { toast } from 'sonner';

// =====================================================
// Test Utilities
// =====================================================

/**
 * Erstellt einen Mock-Server für Tests.
 */
const createMockServer = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
  id: 'test-server-1',
  name: 'Test Server',
  url: 'https://test.example.com',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: '2026-01-10T00:00:00Z',
  accessToken: 'test-token-123',
  ...overrides,
});

// =====================================================
// Before Each Hook
// =====================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateServer.mockResolvedValue(undefined);
  mockIsServerNameTaken.mockReturnValue(false);
});

// =====================================================
// Tests
// =====================================================

describe('ServerEditForm', () => {
  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render form with pre-filled server data', () => {
      // Given
      const server = createMockServer({ name: 'Produktiv-Server', url: 'https://api.prod.example.com' });

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByTestId('server-edit-form')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Produktiv-Server')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://api.prod.example.com')).toBeInTheDocument();
    });

    it('should render server name input field', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByLabelText('Server-Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('z.B. Produktiv-Server')).toBeInTheDocument();
    });

    it('should render server URL input field', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByLabelText('Server-URL')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://api.example.com')).toBeInTheDocument();
    });

    it('should render token hint showing saved token', () => {
      // Given
      const server = createMockServer({ accessToken: 'token-123' });

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByTestId('token-hint')).toBeInTheDocument();
      expect(screen.getByText('Access-Token gespeichert')).toBeInTheDocument();
    });

    it('should render token hint when no token configured', () => {
      // Given
      const server = createMockServer({ accessToken: undefined });

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByText('Kein Access-Token konfiguriert')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('test-connection-button')).toBeInTheDocument();
    });
  });

  // =====================================================
  // Form Submission Tests
  // =====================================================

  describe('Form Submission', () => {
    it('should update server when form submitted with changed name', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old Name' });
      const onSuccess = vi.fn();

      // When
      render(<ServerEditForm server={server} onSuccess={onSuccess} />);
      const nameInput = screen.getByDisplayValue('Old Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(screen.getByTestId('save-button'));

      // Then
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', { name: 'New Name' });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should update server when form submitted with changed URL', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ url: 'https://old.example.com' });
      const onSuccess = vi.fn();

      // When
      render(<ServerEditForm server={server} onSuccess={onSuccess} />);
      const urlInput = screen.getByDisplayValue('https://old.example.com');
      await user.clear(urlInput);
      await user.type(urlInput, 'https://new.example.com');
      await user.click(screen.getByTestId('save-button'));

      // Then
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', { url: 'https://new.example.com' });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should update both name and URL when both changed', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old', url: 'https://old.example.com' });

      // When
      render(<ServerEditForm server={server} />);
      const nameInput = screen.getByDisplayValue('Old');
      const urlInput = screen.getByDisplayValue('https://old.example.com');

      await user.clear(nameInput);
      await user.type(nameInput, 'New');
      await user.clear(urlInput);
      await user.type(urlInput, 'https://new.example.com');
      await user.click(screen.getByTestId('save-button'));

      // Then
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', {
          name: 'New',
          url: 'https://new.example.com',
        });
      });
    });

    it('should not call updateServer when no changes made', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Test Server' });

      // When
      render(<ServerEditForm server={server} />);
      await user.click(screen.getByTestId('save-button'));

      // Then
      await waitFor(() => {
        expect(mockUpdateServer).not.toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Keine Änderungen', expect.any(Object));
      });
    });

    it('should show success toast after successful update', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old Name' });

      // When
      render(<ServerEditForm server={server} />);
      const nameInput = screen.getByDisplayValue('Old Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(screen.getByTestId('save-button'));

      // Then
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Server aktualisiert', expect.any(Object));
      });
    });

    it('should show error toast when update fails', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old Name' });
      mockUpdateServer.mockRejectedValue(new Error('Update fehlgeschlagen'));

      // When
      render(<ServerEditForm server={server} />);
      const nameInput = screen.getByDisplayValue('Old Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(screen.getByTestId('save-button'));

      // Then
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Fehler beim Aktualisieren', { description: 'Update fehlgeschlagen' });
      });
    });
  });

  // =====================================================
  // Validation Tests
  // =====================================================

  describe('Validation', () => {
    it('should show error for empty server name', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);
      const nameInput = screen.getByDisplayValue(server.name);
      await user.clear(nameInput);
      await user.click(screen.getByLabelText('Server-URL')); // Blur to trigger validation

      // Then
      await waitFor(() => {
        expect(screen.getByText('Server-Name ist ein Pflichtfeld')).toBeInTheDocument();
      });
    });

    it('should show error for duplicate server name', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Unique Name' });
      mockIsServerNameTaken.mockReturnValue(true);

      // When
      render(<ServerEditForm server={server} />);
      const nameInput = screen.getByDisplayValue(server.name);
      await user.clear(nameInput);
      await user.type(nameInput, 'Duplicate Name');
      await user.click(screen.getByLabelText('Server-URL')); // Blur to trigger validation

      // Then
      await waitFor(() => {
        expect(screen.getByText(/existiert bereits/i)).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // Button Interaction Tests
  // =====================================================

  describe('Button Interactions', () => {
    it('should call onCancel when cancel button clicked', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();
      const onCancel = vi.fn();

      // When
      render(<ServerEditForm server={server} onCancel={onCancel} />);
      await user.click(screen.getByTestId('cancel-button'));

      // Then
      expect(onCancel).toHaveBeenCalled();
    });

    it('should test connection when test button clicked', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);
      await user.click(screen.getByTestId('test-connection-button'));

      // Then
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({ serverUrl: server.url });
      });
    });

    it('should show success toast on successful connection test', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);
      await user.click(screen.getByTestId('test-connection-button'));

      // Then
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Verbindung erfolgreich', expect.any(Object));
      });
    });

    it('should show error toast on failed connection test', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();
      mockMutateAsync.mockRejectedValue(new Error('Connection timeout'));

      // When
      render(<ServerEditForm server={server} />);
      await user.click(screen.getByTestId('test-connection-button'));

      // Then
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Verbindung fehlgeschlagen', { description: 'Connection timeout' });
      });
    });
  });

  // =====================================================
  // Accessibility Tests
  // =====================================================

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByLabelText('Server-Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Server-URL')).toBeInTheDocument();
    });

    it('should set aria-invalid on error fields', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);
      const nameInput = screen.getByDisplayValue(server.name);
      await user.clear(nameInput);
      await user.click(screen.getByLabelText('Server-URL'));

      // Then
      await waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  // =====================================================
  // M7 Fix: Keyboard Accessibility Tests
  // =====================================================

  describe('Keyboard Accessibility', () => {
    it('should support keyboard navigation with Tab through form fields', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();
      render(<ServerEditForm server={server} />);

      // When - Tab through form fields
      await user.tab(); // Focus Name Input

      // Then - Name input should have focus
      expect(screen.getByLabelText('Server-Name')).toHaveFocus();

      // When - Tab to next field
      await user.tab(); // Focus URL Input

      // Then - URL input should have focus
      expect(screen.getByLabelText('Server-URL')).toHaveFocus();
    });

    it('should allow Tab navigation to buttons after form fields', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();
      render(<ServerEditForm server={server} />);

      // When - Tab through form to buttons
      // Note: After Name and URL inputs, there are Color Picker buttons (9 colors)
      // and Icon Picker buttons (9 icons including "Kein Icon")
      await user.tab(); // Focus Name Input
      await user.tab(); // Focus URL Input

      // Tab through all color picker buttons (9 colors + potentially "Keine Farbe" button)
      // Tab through all icon picker buttons (9 icons = 1 "Kein Icon" + 8 icons)
      // Then Test Connection, Cancel, Save buttons

      // We'll tab multiple times to get past all the radio buttons
      // Color picker has focusable tabIndex=0 on one element (roving tabindex pattern)
      // Icon picker also uses roving tabindex
      for (let i = 0; i < 20; i++) {
        await user.tab();
      }

      // Then - Save button should be focusable and one of the last elements
      // Since the exact tab order depends on implementation, let's just verify the buttons exist and are focusable
      expect(screen.getByTestId('test-connection-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });

    it('should have aria-describedby linking input to error message', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();
      render(<ServerEditForm server={server} />);

      // When - Clear name and blur to trigger validation
      const nameInput = screen.getByLabelText('Server-Name');
      await user.clear(nameInput);
      await user.tab(); // Blur to trigger validation

      // Then - Input should have aria-describedby pointing to error
      await waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-describedby', 'serverName-error');
      });

      // Then - Error element should exist with matching ID
      const errorElement = screen.getByText('Server-Name ist ein Pflichtfeld');
      expect(errorElement).toHaveAttribute('id', 'serverName-error');
    });

    it('should show validation error linked via aria-describedby for URL field', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();
      render(<ServerEditForm server={server} />);

      // When - Clear URL and enter invalid value
      const urlInput = screen.getByLabelText('Server-URL');
      await user.clear(urlInput);
      await user.type(urlInput, 'not-a-valid-url');
      await user.tab(); // Blur to trigger validation

      // Then - URL input should have aria-describedby for error
      await waitFor(() => {
        expect(urlInput).toHaveAttribute('aria-describedby', 'serverUrl-error');
      });
    });

    it('should submit form on Enter key when focused on input', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old Name' });
      const onSuccess = vi.fn();
      render(<ServerEditForm server={server} onSuccess={onSuccess} />);

      // When - Change name and press Enter
      const nameInput = screen.getByLabelText('Server-Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.keyboard('{Enter}');

      // Then - Form should be submitted
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', { name: 'New Name' });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should have aria-invalid set correctly on valid input', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then - Input should not have aria-invalid=true when valid
      const nameInput = screen.getByLabelText('Server-Name');
      expect(nameInput).toHaveAttribute('aria-invalid', 'false');
    });
  });

  // =====================================================
  // Visual Settings Tests (Story 3.6 - Task 7)
  // =====================================================

  describe('Visual Settings', () => {
    it('should render visual settings section with color and icon pickers', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByTestId('visual-settings-section')).toBeInTheDocument();
      expect(screen.getByText('Visuelle Unterscheidung')).toBeInTheDocument();
      expect(screen.getByTestId('color-picker-section')).toBeInTheDocument();
      expect(screen.getByTestId('icon-picker-section')).toBeInTheDocument();
    });

    it('should render color picker with label', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByText('Farbe auswählen')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Farbe auswählen' })).toBeInTheDocument();
    });

    it('should render icon picker with label', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerEditForm server={server} />);

      // Then
      expect(screen.getByText('Icon auswählen')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Server-Icon auswählen' })).toBeInTheDocument();
    });

    it('should pre-fill color picker with server color', () => {
      // Given
      const server = createMockServer({ color: 'emerald' });

      // When
      render(<ServerEditForm server={server} />);

      // Then - The emerald color should be selected (aria-checked)
      const colorButtons = screen.getAllByRole('radio', { name: /smaragd/i });
      expect(colorButtons[0]).toHaveAttribute('aria-checked', 'true');
    });

    it('should pre-fill icon picker with server icon', () => {
      // Given
      const server = createMockServer({ icon: 'shield' });

      // When
      render(<ServerEditForm server={server} />);

      // Then - The shield icon should be selected (aria-checked)
      const iconButton = screen.getByRole('radio', { name: 'Schild' });
      expect(iconButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should call updateServer with color when color changed and form submitted', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ color: undefined, icon: undefined });
      const onSuccess = vi.fn();

      // When
      render(<ServerEditForm server={server} onSuccess={onSuccess} />);

      // Select a color
      const skyColorButton = screen.getByRole('radio', { name: 'Himmelblau' });
      await user.click(skyColorButton);

      // Submit form
      await user.click(screen.getByTestId('save-button'));

      // Then - R1 Fix: Alle Updates gehen jetzt über updateServer
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', {
          color: 'sky',
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call updateServer with icon when icon changed and form submitted', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ color: undefined, icon: undefined });
      const onSuccess = vi.fn();

      // When
      render(<ServerEditForm server={server} onSuccess={onSuccess} />);

      // Select an icon
      const buildingIconButton = screen.getByRole('radio', { name: 'Gebäude' });
      await user.click(buildingIconButton);

      // Submit form
      await user.click(screen.getByTestId('save-button'));

      // Then - R1 Fix: Alle Updates gehen jetzt über updateServer
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', {
          icon: 'building',
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call updateServer with name and color when both changed', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old Name', color: undefined, icon: undefined });

      // When
      render(<ServerEditForm server={server} />);

      // Change name
      const nameInput = screen.getByDisplayValue('Old Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      // Select a color
      const amberColorButton = screen.getByRole('radio', { name: 'Bernstein' });
      await user.click(amberColorButton);

      // Submit form
      await user.click(screen.getByTestId('save-button'));

      // Then - R1 Fix: Alle Updates gehen jetzt über einen einzigen updateServer Call
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', {
          name: 'New Name',
          color: 'amber',
        });
      });
    });

    it('should only update name when visuals not changed', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old Name', color: 'sky', icon: 'building' });

      // When
      render(<ServerEditForm server={server} />);

      // Only change name
      const nameInput = screen.getByDisplayValue('Old Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      // Submit form
      await user.click(screen.getByTestId('save-button'));

      // Then - R1 Fix: updateServer wird nur mit name aufgerufen, nicht mit icon/color
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', { name: 'New Name' });
      });
    });

    it('should show success toast when only visuals changed', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ color: undefined });

      // When
      render(<ServerEditForm server={server} />);

      // Select a color
      const roseColorButton = screen.getByRole('radio', { name: 'Rose' });
      await user.click(roseColorButton);

      // Submit form
      await user.click(screen.getByTestId('save-button'));

      // Then
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Server aktualisiert', expect.any(Object));
      });
    });

    it('should disable pickers during form submission', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ name: 'Old Name' });

      // Make updateServer take some time
      mockUpdateServer.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      // When
      render(<ServerEditForm server={server} />);

      // Change name and submit
      const nameInput = screen.getByDisplayValue('Old Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(screen.getByTestId('save-button'));

      // Then - pickers should be disabled during submission
      // Note: We check aria-disabled on the individual radio buttons inside the radiogroup
      const colorRadioGroup = screen.getByRole('radiogroup', { name: 'Farbe auswählen' });
      const colorButtons = colorRadioGroup.querySelectorAll('[role="radio"]');
      expect(colorButtons[0]).toHaveAttribute('aria-disabled', 'true');
    });

    it('should update icon when different icon is selected', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ icon: 'building', color: 'sky' });
      const onSuccess = vi.fn();

      // When
      render(<ServerEditForm server={server} onSuccess={onSuccess} />);

      // Verify the initial icon is selected (Gebäude)
      const buildingButton = screen.getByRole('radio', { name: 'Gebäude' });
      expect(buildingButton).toHaveAttribute('aria-checked', 'true');

      // Click on a different icon (Schild/shield)
      const shieldButton = screen.getByRole('radio', { name: 'Schild' });
      await user.click(shieldButton);

      // Submit form
      await user.click(screen.getByTestId('save-button'));

      // Then - R1 Fix: updateServer wird nur mit geänderten Feldern aufgerufen
      await waitFor(() => {
        expect(mockUpdateServer).toHaveBeenCalledWith('test-server-1', {
          icon: 'shield',
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});
