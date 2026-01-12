/**
 * Tests für ServerSwitchWarningDialog Molecule
 *
 * Testet den Warndialog für Server-Wechsel bei eingeloggtem User.
 * Prüft Darstellung, Accessibility und Interaktivität.
 *
 * @module features/server/ui/molecules/__tests__/ServerSwitchWarningDialog
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ServerConfig } from '../../../types/server-config';
import { ServerSwitchWarningDialog } from '../ServerSwitchWarningDialog';

/**
 * Mock-Server für Tests.
 */
const createMockServer = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
  id: 'test-server-1',
  name: 'Test Server',
  url: 'https://test.example.com',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: '2026-01-10T00:00:00Z',
  ...overrides,
});

describe('ServerSwitchWarningDialog', () => {
  const mockCurrentServer = createMockServer({ id: 'current', name: 'Current Server' });
  const mockTargetServer = createMockServer({ id: 'target', name: 'Target Server' });
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // Rendering Tests
  // =====================================================
  describe('Rendering', () => {
    it('should render dialog when open is true', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should not render dialog when open is false', () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={false} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should display target server name in message', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      await waitFor(() => {
        expect(screen.getByText(/Target Server/)).toBeInTheDocument();
      });
    });

    it('should display current server name in session info', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      await waitFor(() => {
        expect(screen.getByText(/Current Server/)).toBeInTheDocument();
      });
    });

    it('should display dialog title "Server wechseln"', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      await waitFor(() => {
        expect(screen.getByText('Server wechseln')).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // Interaction Tests
  // =====================================================
  describe('Interactions', () => {
    it('should call onCancel when Abbrechen button is clicked', async () => {
      // Given
      const user = userEvent.setup();
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // When
      await waitFor(() => {
        expect(screen.getByText('Abbrechen')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Abbrechen'));

      // Then
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when confirm button is clicked', async () => {
      // Given
      const user = userEvent.setup();
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // When
      await waitFor(() => {
        expect(screen.getByText(/Abmelden und wechseln/)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/Abmelden und wechseln/));

      // Then
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should call onCancel when clicking outside dialog (backdrop)', async () => {
      // Given
      const user = userEvent.setup();
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // When - Klick auf Backdrop (Dialog schließen)
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      // Drücke Escape um Dialog zu schließen (Headless UI Standard-Verhalten)
      await user.keyboard('{Escape}');

      // Then
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================================
  // Loading State Tests
  // =====================================================
  describe('Loading State', () => {
    it('should disable buttons when isLoading is true', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} isLoading={true} />);

      // Then - Finde Button via Text, dann prüfe disabled am Button-Element
      await waitFor(() => {
        const cancelButton = screen.getByText('Abbrechen').closest('button');
        expect(cancelButton).toBeDisabled();
      });
    });

    it('should not call onConfirm when clicking confirm button during loading', async () => {
      // Given
      const _user = userEvent.setup();
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} isLoading={true} />);

      // When - Versuche auf Confirm-Button zu klicken während Loading
      await waitFor(() => {
        expect(screen.getByText(/Abmelden und wechseln/)).toBeInTheDocument();
      });

      // Button ist während Loading deaktiviert, Klick sollte nichts tun
      const confirmButton = screen.getByText(/Abmelden und wechseln/).closest('button');
      expect(confirmButton).toBeDisabled();

      // Then
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should enable buttons when isLoading is false', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} isLoading={false} />);

      // Then - Finde Button via Text, dann prüfe enabled am Button-Element
      await waitFor(() => {
        const cancelButton = screen.getByText('Abbrechen').closest('button');
        expect(cancelButton).not.toBeDisabled();
      });
    });
  });

  // =====================================================
  // Accessibility Tests
  // =====================================================
  describe('Accessibility', () => {
    it('should have role="alertdialog"', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should have test id for e2e testing', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      await waitFor(() => {
        expect(screen.getByTestId('switch-server-dialog')).toBeInTheDocument();
      });
    });

    it('should have correct ARIA attributes for accessibility', async () => {
      // Given/When
      render(<ServerSwitchWarningDialog currentServer={mockCurrentServer} targetServer={mockTargetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then - Prüfe ob Dialog mit aria-labelledby korrekt verknüpft ist
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toHaveAttribute('aria-labelledby', 'switch-warning-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'switch-warning-description');
      });

      // Title und Description sind vorhanden
      expect(screen.getByText('Server wechseln')).toBeInTheDocument();
    });
  });

  // =====================================================
  // Server Names Display Tests
  // =====================================================
  describe('Server Names Display', () => {
    it('should display both server names in correct context', async () => {
      // Given
      const currentServer = createMockServer({ name: 'Production Server' });
      const targetServer = createMockServer({ name: 'Staging Server' });

      // When
      render(<ServerSwitchWarningDialog currentServer={currentServer} targetServer={targetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then
      await waitFor(() => {
        // Target Server im Haupt-Text
        expect(screen.getByText(/Staging Server/)).toBeInTheDocument();
        // Current Server im Info-Text
        expect(screen.getByText(/Production Server/)).toBeInTheDocument();
      });
    });

    it('should handle long server names gracefully', async () => {
      // Given
      const currentServer = createMockServer({ name: 'Very Long Production Server Name That Could Overflow' });
      const targetServer = createMockServer({ name: 'Another Very Long Staging Server Name For Testing' });

      // When
      render(<ServerSwitchWarningDialog currentServer={currentServer} targetServer={targetServer} open={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      // Then - Dialog sollte trotz langer Namen korrekt rendern
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });
  });
});
