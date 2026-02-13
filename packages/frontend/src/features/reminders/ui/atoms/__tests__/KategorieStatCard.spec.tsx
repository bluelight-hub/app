/**
 * Unit Tests für KategorieStatCard Atom
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * KategorieStatCard zeigt eine Kategorie mit Farbpunkt, Name und
 * Aktiv-/Überfällig-Statistiken als klickbaren Filter-Button an.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KategorieStatCard } from '../KategorieStatCard';

const defaultProps = {
  name: 'Technische Rettung',
  farbe: '#FF5733',
  activeCount: 5,
  overdueCount: 2,
  isActive: false,
  onClick: vi.fn(),
};

describe('KategorieStatCard', () => {
  describe('rendering', () => {
    it('should render name and color dot', () => {
      // Given (Arrange)
      const props = { ...defaultProps };

      // When (Act)
      const { container } = render(<KategorieStatCard {...props} />);

      // Then (Assert)
      expect(screen.getByText('Technische Rettung')).toBeInTheDocument();
      const colorDot = container.querySelector('span[aria-hidden="true"]');
      expect(colorDot).toBeInTheDocument();
      expect(colorDot).toHaveStyle({ backgroundColor: '#FF5733' });
    });

    it('should display active and overdue statistics', () => {
      // Given (Arrange)
      const props = { ...defaultProps, activeCount: 8, overdueCount: 3 };

      // When (Act)
      render(<KategorieStatCard {...props} />);

      // Then (Assert)
      expect(screen.getByText('8 aktiv')).toBeInTheDocument();
      expect(screen.getByText('3 überfällig')).toBeInTheDocument();
    });

    it('should highlight overdue count in red when greater than zero', () => {
      // Given (Arrange)
      const props = { ...defaultProps, overdueCount: 4 };

      // When (Act)
      render(<KategorieStatCard {...props} />);

      // Then (Assert)
      const overdueElement = screen.getByText('4 überfällig');
      expect(overdueElement).toHaveClass('text-red-600');
      expect(overdueElement).toHaveClass('font-semibold');
    });

    it('should NOT highlight overdue count when zero', () => {
      // Given (Arrange)
      const props = { ...defaultProps, overdueCount: 0 };

      // When (Act)
      render(<KategorieStatCard {...props} />);

      // Then (Assert)
      const overdueElement = screen.getByText('0 überfällig');
      expect(overdueElement).not.toHaveClass('text-red-600');
      expect(overdueElement).not.toHaveClass('font-semibold');
    });
  });

  describe('interaction', () => {
    it('should call onClick when clicked', () => {
      // Given (Arrange)
      const handleClick = vi.fn();
      const props = { ...defaultProps, onClick: handleClick };

      // When (Act)
      render(<KategorieStatCard {...props} />);
      fireEvent.click(screen.getByRole('button'));

      // Then (Assert)
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should show ring when isActive is true', () => {
      // Given (Arrange)
      const props = { ...defaultProps, isActive: true };

      // When (Act)
      render(<KategorieStatCard {...props} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      expect(button).toHaveClass('ring-2');
    });

    it('should NOT show ring when isActive is false', () => {
      // Given (Arrange)
      const props = { ...defaultProps, isActive: false };

      // When (Act)
      render(<KategorieStatCard {...props} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('ring-2');
    });
  });

  describe('accessibility', () => {
    it('should set aria-pressed correctly based on isActive', () => {
      // Given (Arrange)
      const propsInactive = { ...defaultProps, isActive: false };
      const propsActive = { ...defaultProps, isActive: true };

      // When (Act)
      const { rerender } = render(<KategorieStatCard {...propsInactive} />);

      // Then (Assert)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

      // When (Act) - Rerender mit isActive=true
      rerender(<KategorieStatCard {...propsActive} />);

      // Then (Assert)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have descriptive aria-label with name and counts', () => {
      // Given (Arrange)
      const props = { ...defaultProps, name: 'Brandschutz', activeCount: 3, overdueCount: 1 };

      // When (Act)
      render(<KategorieStatCard {...props} />);

      // Then (Assert)
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Kategorie Brandschutz: 3 aktiv, 1 überfällig');
    });
  });
});
