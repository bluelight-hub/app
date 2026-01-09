/**
 * Unit Tests für ExpiredLinkError Component
 *
 * Tests für Error Card mit CTA Button.
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExpiredLinkError } from './ExpiredLinkError';

describe('ExpiredLinkError', () => {
  describe('Default Rendering', () => {
    it('should render error title', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ExpiredLinkError />);

      // Then (Assert)
      expect(screen.getByText('Dieser Einladungslink ist abgelaufen.')).toBeInTheDocument();
    });

    it('should render error message', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ExpiredLinkError />);

      // Then (Assert)
      expect(screen.getByText('Fordere einen neuen Link bei deinem Administrator an.')).toBeInTheDocument();
    });

    it('should render with correct ARIA attributes', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      const { container } = render(<ExpiredLinkError />);

      // Then (Assert)
      const alert = container.firstChild as HTMLElement;
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should render warning icon', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      const { container } = render(<ExpiredLinkError />);

      // Then (Assert)
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-red-600');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should NOT render CTA button when onRequestNew is not provided', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ExpiredLinkError />);

      // Then (Assert)
      expect(screen.queryByText('Neuen Link anfordern')).not.toBeInTheDocument();
    });
  });

  describe('CTA Button Behavior', () => {
    it('should render CTA button when onRequestNew is provided', () => {
      // Given (Arrange)
      const mockCallback = vi.fn();

      // When (Act)
      render(<ExpiredLinkError onRequestNew={mockCallback} />);

      // Then (Assert)
      expect(screen.getByText('Neuen Link anfordern')).toBeInTheDocument();
    });

    it('should call onRequestNew when CTA button is clicked', async () => {
      // Given (Arrange)
      const mockCallback = vi.fn();
      const user = userEvent.setup();

      render(<ExpiredLinkError onRequestNew={mockCallback} />);

      const button = screen.getByText('Neuen Link anfordern');

      // When (Act)
      await user.click(button);

      // Then (Assert)
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should call onRequestNew multiple times when clicked repeatedly', async () => {
      // Given (Arrange)
      const mockCallback = vi.fn();
      const user = userEvent.setup();

      render(<ExpiredLinkError onRequestNew={mockCallback} />);

      const button = screen.getByText('Neuen Link anfordern');

      // When (Act)
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Then (Assert)
      expect(mockCallback).toHaveBeenCalledTimes(3);
    });

    it('should have correct button styling classes', () => {
      // Given (Arrange)
      const mockCallback = vi.fn();

      // When (Act)
      render(<ExpiredLinkError onRequestNew={mockCallback} />);

      const button = screen.getByText('Neuen Link anfordern');

      // Then (Assert)
      expect(button).toHaveClass('text-red-800');
      expect(button).toHaveClass('underline');
      expect(button).toHaveClass('hover:text-red-900');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className when provided', () => {
      // Given (Arrange)
      const customClassName = 'shadow-lg rounded-xl';

      // When (Act)
      const { container } = render(<ExpiredLinkError className={customClassName} />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('shadow-lg');
      expect(wrapper).toHaveClass('rounded-xl');
      // Should still have default classes
      expect(wrapper).toHaveClass('border-red-200');
      expect(wrapper).toHaveClass('bg-red-50');
    });

    it('should merge custom className with default classes', () => {
      // Given (Arrange)
      const customClassName = 'p-8';

      // When (Act)
      const { container } = render(<ExpiredLinkError className={customClassName} />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      // Custom class
      expect(wrapper).toHaveClass('p-8');
      // Default classes should remain
      expect(wrapper).toHaveClass('rounded-lg');
      expect(wrapper).toHaveClass('border');
      expect(wrapper).toHaveClass('border-red-200');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible when CTA is present', async () => {
      // Given (Arrange)
      const mockCallback = vi.fn();
      const user = userEvent.setup();

      render(<ExpiredLinkError onRequestNew={mockCallback} />);

      const button = screen.getByText('Neuen Link anfordern');

      // When (Act)
      button.focus();
      await user.keyboard('{Enter}');

      // Then (Assert)
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should have focus ring styles on button', () => {
      // Given (Arrange)
      const mockCallback = vi.fn();

      // When (Act)
      render(<ExpiredLinkError onRequestNew={mockCallback} />);

      const button = screen.getByText('Neuen Link anfordern');

      // Then (Assert)
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-red-600');
    });
  });
});
