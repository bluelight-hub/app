/**
 * Unit Tests für ServerStatusDot Atom
 *
 * Testet die korrekte Darstellung von Server-Verbindungsstatus
 * mit passenden Farben und ARIA-Labels.
 *
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 */

import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerStatusDot } from '../ServerStatusDot';

describe('ServerStatusDot', () => {
  describe('Status Colors', () => {
    it('should render green dot for online status', () => {
      // Given (Arrange)
      const status = 'online' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('bg-green-500');
    });

    it('should render green dot for connected status (alias)', () => {
      // Given (Arrange)
      const status = 'connected' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('bg-green-500');
    });

    it('should render gray dot for offline status', () => {
      // Given (Arrange)
      const status = 'offline' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('bg-gray-400');
    });

    it('should render gray dot for disconnected status (alias)', () => {
      // Given (Arrange)
      const status = 'disconnected' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('bg-gray-400');
    });

    it('should render yellow pulsing dot for checking status', () => {
      // Given (Arrange)
      const status = 'checking' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('bg-yellow-500');
      expect(dot).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility (ARIA)', () => {
    it('should have correct aria-label for online status', () => {
      // Given (Arrange)
      const status = 'online' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveAttribute('aria-label', 'Server online');
    });

    it('should have correct aria-label for offline status', () => {
      // Given (Arrange)
      const status = 'offline' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveAttribute('aria-label', 'Server offline');
    });

    it('should have correct aria-label for checking status', () => {
      // Given (Arrange)
      const status = 'checking' as const;

      // When (Act)
      render(<ServerStatusDot status={status} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveAttribute('aria-label', 'Serververbindung wird geprüft');
    });
  });

  describe('Size Variants', () => {
    it('should render small size (sm) correctly', () => {
      // Given (Arrange)
      const size = 'sm' as const;

      // When (Act)
      render(<ServerStatusDot status="online" size={size} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('h-2');
      expect(dot).toHaveClass('w-2');
    });

    it('should render medium size (md) as default', () => {
      // Given (Arrange)
      // No size prop - should default to md

      // When (Act)
      render(<ServerStatusDot status="online" />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('h-2.5');
      expect(dot).toHaveClass('w-2.5');
    });

    it('should render large size (lg) correctly', () => {
      // Given (Arrange)
      const size = 'lg' as const;

      // When (Act)
      render(<ServerStatusDot status="online" size={size} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('h-3');
      expect(dot).toHaveClass('w-3');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      // Given (Arrange)
      const customClassName = 'mr-2 opacity-75';

      // When (Act)
      render(<ServerStatusDot status="online" className={customClassName} />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      // Custom classes
      expect(dot).toHaveClass('mr-2');
      expect(dot).toHaveClass('opacity-75');
      // Default classes should remain
      expect(dot).toHaveClass('rounded-full');
      expect(dot).toHaveClass('bg-green-500');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to span element', () => {
      // Given
      const ref = createRef<HTMLSpanElement>();

      // When
      render(<ServerStatusDot ref={ref} status="online" />);

      // Then
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current).toHaveRole('status');
    });

    it('should forward ref with combined props', () => {
      // Given
      const ref = createRef<HTMLSpanElement>();

      // When
      render(<ServerStatusDot ref={ref} status="checking" size="lg" className="custom-class" />);

      // Then
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current).toHaveClass('custom-class');
    });
  });

  describe('Base Styling', () => {
    it('should always have rounded-full class for circular shape', () => {
      // Given (Arrange)
      const statuses = ['online', 'offline', 'checking'] as const;

      // When & Then
      for (const status of statuses) {
        const { unmount } = render(<ServerStatusDot status={status} />);
        const dot = screen.getByRole('status');
        expect(dot).toHaveClass('rounded-full');
        unmount();
      }
    });

    it('should have flex-shrink-0 to prevent shrinking in flex containers', () => {
      // Given (Arrange)
      // (No setup needed)

      // When (Act)
      render(<ServerStatusDot status="online" />);

      // Then (Assert)
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('flex-shrink-0');
    });
  });
});
