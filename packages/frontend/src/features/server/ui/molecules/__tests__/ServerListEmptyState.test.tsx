/**
 * Tests für ServerListEmptyState Molecule
 *
 * Testet die Darstellung und Interaktivität des leeren Zustands
 * der Server-Liste.
 *
 * @module features/server/ui/molecules/__tests__/ServerListEmptyState
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ServerListEmptyState } from '../ServerListEmptyState';

describe('ServerListEmptyState', () => {
  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render empty state message "Keine Server konfiguriert"', () => {
      // Given / When
      render(<ServerListEmptyState />);

      // Then
      expect(screen.getByText('Keine Server konfiguriert')).toBeInTheDocument();
    });

    it('should render server icon', () => {
      // Given / When
      render(<ServerListEmptyState />);

      // Then
      const svg = screen.getByTestId('server-list-empty-state').querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render helper text', () => {
      // Given / When
      render(<ServerListEmptyState />);

      // Then
      expect(screen.getByText('Füge einen Server hinzu, um loszulegen.')).toBeInTheDocument();
    });

    it('should render "Server hinzufügen" button when onAddServer is provided', () => {
      // Given
      const onAddServer = vi.fn();

      // When
      render(<ServerListEmptyState onAddServer={onAddServer} />);

      // Then
      expect(screen.getByRole('button', { name: 'Server hinzufügen' })).toBeInTheDocument();
    });

    it('should not render button when onAddServer is undefined', () => {
      // Given / When
      render(<ServerListEmptyState />);

      // Then
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // Interaction Tests
  // =====================================================

  describe('Interactions', () => {
    it('should call onAddServer when button is clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onAddServer = vi.fn();

      // When
      render(<ServerListEmptyState onAddServer={onAddServer} />);
      await user.click(screen.getByRole('button', { name: 'Server hinzufügen' }));

      // Then
      expect(onAddServer).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================================
  // Styling Tests
  // =====================================================

  describe('Styling', () => {
    it('should apply custom className', () => {
      // Given / When
      render(<ServerListEmptyState className="custom-class bg-gray-100" />);

      // Then
      const container = screen.getByTestId('server-list-empty-state');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('bg-gray-100');
    });

    it('should have centered layout', () => {
      // Given / When
      render(<ServerListEmptyState />);

      // Then
      const container = screen.getByTestId('server-list-empty-state');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
      expect(container).toHaveClass('text-center');
    });

    it('should have proper text styling for heading', () => {
      // Given / When
      render(<ServerListEmptyState />);

      // Then
      const heading = screen.getByText('Keine Server konfiguriert');
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveClass('text-lg');
      expect(heading).toHaveClass('font-medium');
      expect(heading).toHaveClass('text-gray-900');
      expect(heading).toHaveClass('dark:text-white');
    });

    it('should have proper text styling for helper text', () => {
      // Given / When
      render(<ServerListEmptyState />);

      // Then
      const helperText = screen.getByText('Füge einen Server hinzu, um loszulegen.');
      expect(helperText).toHaveClass('text-sm');
      expect(helperText).toHaveClass('text-gray-500');
      expect(helperText).toHaveClass('dark:text-gray-400');
    });
  });

  // =====================================================
  // Ref Forwarding Tests
  // =====================================================

  describe('Ref Forwarding', () => {
    it('should forward ref correctly', () => {
      // Given
      const ref = vi.fn();

      // When
      render(<ServerListEmptyState ref={ref} />);

      // Then
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });
});
