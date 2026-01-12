/**
 * Tests für ServerDeleteConfirmDialog Molecule
 *
 * Testet die Bestätigungs-Dialog Komponente für das Löschen von Servern.
 * Prüft Rendering, Interaktionen, Loading-States und Accessibility.
 *
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 *
 * @module features/server/ui/molecules/__tests__/ServerDeleteConfirmDialog
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from '../../../types/server-config';
import { ServerDeleteConfirmDialog } from '../ServerDeleteConfirmDialog';

/**
 * Mock-Server für Tests.
 */
const mockServer: ServerConfig = {
  id: 'test-1',
  name: 'Test Server',
  url: 'https://test.example.com',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: '2026-01-10T00:00:00Z',
};

describe('ServerDeleteConfirmDialog', () => {
  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render dialog when open is true', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should not render dialog when open is false', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={false} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should display server name in dialog', () => {
      // Given
      const server: ServerConfig = {
        ...mockServer,
        name: 'Produktiv-Server',
      };
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={server} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      expect(screen.getByText(/Produktiv-Server/)).toBeInTheDocument();
    });

    it('should display confirmation message', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      expect(screen.getByText(/wirklich entfernen/i)).toBeInTheDocument();
    });

    it('should render Entfernen button', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      expect(screen.getByRole('button', { name: /entfernen/i })).toBeInTheDocument();
    });

    it('should render Abbrechen button', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
    });
  });

  // =====================================================
  // Interaction Tests
  // =====================================================

  describe('Interactions', () => {
    it('should call onConfirm when Entfernen clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);
      await user.click(screen.getByRole('button', { name: /entfernen/i }));

      // Then
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should call onCancel when Abbrechen clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);
      await user.click(screen.getByRole('button', { name: /abbrechen/i }));

      // Then
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should close on Escape key (via onCancel)', async () => {
      // Given
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);
      await user.keyboard('{Escape}');

      // Then
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // Loading State Tests
  // =====================================================

  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={true} />);

      // Then
      expect(screen.getByRole('button', { name: /entfernen|wird entfernt/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeDisabled();
    });

    it('should show loading state on confirm button', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={true} />);

      // Then - Button zeigt Loading-State via aria-busy (Button component setzt das)
      const confirmButton = screen.getByRole('button', { name: /entfernen|wird entfernt/i });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should not call onConfirm when loading and button clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={true} />);
      // Versuche trotz disabled-State zu klicken
      const confirmButton = screen.getByRole('button', { name: /entfernen|wird entfernt/i });
      await user.click(confirmButton);

      // Then
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // Accessibility Tests
  // =====================================================

  describe('Accessibility', () => {
    it('should have correct ARIA labels', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should have alertdialog role', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should have alertdialog role for destructive action', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then - Dialog sollte role="alertdialog" haben für destruktive Aktionen
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should have accessible title', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then - Dialog sollte einen Titel haben
      const dialog = screen.getByRole('alertdialog');
      const labelledById = dialog.getAttribute('aria-labelledby');
      if (labelledById) {
        const titleElement = document.getElementById(labelledById);
        expect(titleElement).toBeInTheDocument();
      }
    });

    it('should focus trap within dialog', async () => {
      // Given
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={mockServer} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then - Tab sollte innerhalb des Dialogs bleiben
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      // Tab durch die Buttons
      await user.tab();
      await user.tab();
      // Focus sollte immer noch auf einem Dialog-Element sein
      const activeElement = document.activeElement;
      const dialog = screen.getByRole('alertdialog');
      expect(dialog.contains(activeElement)).toBe(true);
    });
  });

  // =====================================================
  // Edge Cases
  // =====================================================

  describe('Edge Cases', () => {
    it('should handle server with long name gracefully', () => {
      // Given
      const serverWithLongName: ServerConfig = {
        ...mockServer,
        name: 'Ein sehr langer Server-Name der möglicherweise über mehrere Zeilen geht und abgeschnitten werden könnte',
      };
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={serverWithLongName} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then - Dialog sollte gerendert werden ohne zu brechen
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/Ein sehr langer Server-Name/)).toBeInTheDocument();
    });

    it('should handle null server gracefully', () => {
      // Given
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When - Dialog mit null server (kann passieren wenn Server während Dialog gelöscht wird)
      render(<ServerDeleteConfirmDialog open={true} server={null} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then - Dialog sollte ohne Absturz rendern
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      // Server-Name sollte gracefully gehandled werden (optional chaining zeigt nichts oder fallback)
    });

    it('should handle special characters in server name', () => {
      // Given
      const serverWithSpecialChars: ServerConfig = {
        ...mockServer,
        name: 'Server <script>alert("XSS")</script> & "Test"',
      };
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      // When
      render(<ServerDeleteConfirmDialog open={true} server={serverWithSpecialChars} onConfirm={onConfirm} onCancel={onCancel} isLoading={false} />);

      // Then - Special chars sollten escaped sein (React macht das automatisch)
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });
});
