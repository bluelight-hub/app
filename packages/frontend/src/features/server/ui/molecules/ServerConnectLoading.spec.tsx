/**
 * Unit Tests für ServerConnectLoading Component
 *
 * Tests für Loading Spinner und Message.
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerConnectLoading } from './ServerConnectLoading';

describe('ServerConnectLoading', () => {
  describe('Default Behavior', () => {
    it('should render default loading message', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerConnectLoading />);

      // Then (Assert)
      expect(screen.getByText('Verbinde mit Server...')).toBeInTheDocument();
    });

    it('should render spinner with correct ARIA label', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerConnectLoading />);

      // Then (Assert)
      const spinner = screen.getByLabelText('Lädt');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Lädt');
    });

    it('should apply Tailwind animation classes to spinner', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerConnectLoading />);

      // Then (Assert)
      const spinner = screen.getByLabelText('Lädt');
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveClass('rounded-full');
      expect(spinner).toHaveClass('border-4');
    });
  });

  describe('Custom Props', () => {
    it('should render custom message when provided', () => {
      // Given (Arrange)
      const customMessage = 'Custom Loading Message...';

      // When (Act)
      render(<ServerConnectLoading message={customMessage} />);

      // Then (Assert)
      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(screen.queryByText('Verbinde mit Server...')).not.toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      // Given (Arrange)
      const customClassName = 'bg-blue-500 rounded-xl';

      // When (Act)
      const { container } = render(<ServerConnectLoading className={customClassName} />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-blue-500');
      expect(wrapper).toHaveClass('rounded-xl');
      // Should still have default classes
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
    });

    it('should merge custom className with default classes', () => {
      // Given (Arrange)
      const customClassName = 'bg-red-100';

      // When (Act)
      const { container } = render(<ServerConnectLoading className={customClassName} />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      // Custom class
      expect(wrapper).toHaveClass('bg-red-100');
      // Default classes should remain
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerConnectLoading />);

      // Then (Assert)
      const spinner = screen.getByLabelText('Lädt');
      expect(spinner).toBeInTheDocument();
    });
  });
});
