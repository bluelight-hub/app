/**
 * Unit Tests für FilterChip Atom
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * FilterChip ist eine kleine Komponente zur Anzeige aktiver Filter
 * mit optionaler Kategorie-Farbdarstellung und Entfernen-Button.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterChip } from '../FilterChip';

describe('FilterChip', () => {
  describe('rendering', () => {
    it('should render label text', () => {
      // Given (Arrange)
      const label = 'Test Filter';

      // When (Act)
      render(<FilterChip label={label} onRemove={vi.fn()} />);

      // Then (Assert)
      expect(screen.getByText('Test Filter')).toBeInTheDocument();
    });

    it('should render remove button with X icon', () => {
      // Given (Arrange)
      const label = 'Test';

      // When (Act)
      render(<FilterChip label={label} onRemove={vi.fn()} />);

      // Then (Assert)
      expect(screen.getByRole('button', { name: /entfernen/i })).toBeInTheDocument();
    });

    it('should apply custom colorClass', () => {
      // Given (Arrange)
      const colorClass = 'bg-red-100 border-red-300';

      // When (Act)
      const { container } = render(<FilterChip label="Test" colorClass={colorClass} onRemove={vi.fn()} />);

      // Then (Assert)
      expect(container.firstChild).toHaveClass('bg-red-100', 'border-red-300');
    });

    it('should apply kategorieColor as inline style when provided', () => {
      // Given (Arrange)
      const kategorieColor = '#FF5733';

      // When (Act)
      const { container } = render(<FilterChip label="Test" kategorieColor={kategorieColor} onRemove={vi.fn()} />);

      // Then (Assert)
      expect(container.firstChild).toHaveStyle({
        backgroundColor: '#FF573320',
        borderColor: '#FF5733',
      });
    });

    it('should render color dot when kategorieColor provided', () => {
      // Given (Arrange)
      const kategorieColor = '#FF5733';

      // When (Act)
      const { container } = render(<FilterChip label="Test" kategorieColor={kategorieColor} onRemove={vi.fn()} />);

      // Then (Assert)
      const colorDot = container.querySelector('span[aria-hidden="true"]');
      expect(colorDot).toBeInTheDocument();
      expect(colorDot).toHaveStyle({ backgroundColor: '#FF5733' });
    });

    it('should NOT render color dot when kategorieColor is NOT provided', () => {
      // Given (Arrange)
      const label = 'Test';

      // When (Act)
      const { container } = render(<FilterChip label={label} onRemove={vi.fn()} />);

      // Then (Assert)
      const colorDot = container.querySelector('span[aria-hidden="true"]');
      expect(colorDot).not.toBeInTheDocument();
    });

    it('should use default gray colorClass when no color props provided', () => {
      // Given (Arrange)
      const label = 'Test';

      // When (Act)
      const { container } = render(<FilterChip label={label} onRemove={vi.fn()} />);

      // Then (Assert)
      expect(container.firstChild).toHaveClass('bg-surface-raised', 'border-border-subtle');
    });

    it('should apply additional className', () => {
      // Given (Arrange)
      const additionalClass = 'mt-2';

      // When (Act)
      const { container } = render(<FilterChip label="Test" className={additionalClass} onRemove={vi.fn()} />);

      // Then (Assert)
      expect(container.firstChild).toHaveClass('mt-2');
    });
  });

  describe('interaction', () => {
    it('should call onRemove when remove button clicked', () => {
      // Given (Arrange)
      const handleRemove = vi.fn();

      // When (Act)
      render(<FilterChip label="Test" onRemove={handleRemove} />);
      fireEvent.click(screen.getByRole('button'));

      // Then (Assert)
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('should have accessible aria-label on remove button', () => {
      // Given (Arrange)
      const label = 'Meine Kategorie';

      // When (Act)
      render(<FilterChip label={label} onRemove={vi.fn()} />);

      // Then (Assert)
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Filter "Meine Kategorie" entfernen');
    });
  });

  describe('label truncation', () => {
    it('should have truncate class for long labels', () => {
      // Given (Arrange)
      const longLabel = 'Ein sehr langer Filtername der abgeschnitten werden sollte';

      // When (Act)
      const { container } = render(<FilterChip label={longLabel} onRemove={vi.fn()} />);

      // Then (Assert)
      const labelSpan = container.querySelector('span.truncate');
      expect(labelSpan).toBeInTheDocument();
      expect(labelSpan).toHaveClass('max-w-[120px]');
    });

    it('should have title attribute for accessibility on truncated labels', () => {
      // Given (Arrange)
      const longLabel = 'Ein sehr langer Filtername der abgeschnitten werden sollte';

      // When (Act)
      render(<FilterChip label={longLabel} onRemove={vi.fn()} />);

      // Then (Assert)
      const labelSpan = screen.getByText(longLabel);
      expect(labelSpan).toHaveAttribute('title', longLabel);
    });
  });
});
