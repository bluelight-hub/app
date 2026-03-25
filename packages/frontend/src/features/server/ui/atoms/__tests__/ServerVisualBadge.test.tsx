/**
 * Unit Tests für ServerVisualBadge Atom
 *
 * Testet die korrekte Darstellung von Server-Visualisierung
 * mit Icon und Farbe, inkl. Fallback-Szenarien und Dark Mode.
 *
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ServerConfig } from '../../../types/server-config';
import { ServerVisualBadge } from '../ServerVisualBadge';

/**
 * Factory für Mock-Server mit optionalen Overrides
 */
function createMockServer(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    id: 'test-server-1',
    name: 'Test Server',
    url: 'https://api.test.com',
    isDefault: false,
    createdAt: '2025-01-01T00:00:00Z',
    lastUsedAt: null,
    ...overrides,
  };
}

describe('ServerVisualBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Icon Rendering', () => {
    it('should render custom icon when server has icon set', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'building' });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', `Server: ${server.name}`);
    });

    it('should render default server icon when no icon is set', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: undefined });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toBeInTheDocument();
    });

    it('should render default icon for invalid icon value', () => {
      // Given (Arrange) - Ungültiger Wert via type assertion um Runtime-Verhalten zu testen
      // eslint-disable-next-line typescript/no-explicit-any -- Testing runtime behavior with invalid input
      const server = createMockServer({ icon: 'invalid-icon' } as any);

      // When (Act)
      const { container } = render(<ServerVisualBadge server={server} />);

      // Then (Assert) - Badge existiert und verwendet Default-Farbe (sky via getDefaultServerColor)
      const badge = screen.getByRole('img');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-sky-500'); // Default-Farbe via getDefaultServerColor()
      // Prüfe, dass ein SVG-Icon gerendert wird (Default Icon wird verwendet)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render shield icon when server has shield icon', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'shield' });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Color Rendering', () => {
    it('should apply custom color class when server has color set', () => {
      // Given (Arrange)
      const server = createMockServer({ color: 'sky' });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('bg-sky-500');
    });

    it('should apply emerald color class correctly', () => {
      // Given (Arrange)
      const server = createMockServer({ color: 'emerald' });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('bg-emerald-500');
    });

    it('should use default color when no color is set', () => {
      // Given (Arrange)
      const server = createMockServer({ color: undefined });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert) - Default-Farbe ist 'sky' via getDefaultServerColor()
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('bg-sky-500');
    });

    it('should use slate fallback color for invalid color value', () => {
      // Given (Arrange) - Ungültiger Wert via type assertion um Runtime-Verhalten zu testen
      // eslint-disable-next-line typescript/no-explicit-any -- Testing runtime behavior with invalid input
      const server = createMockServer({ color: 'invalid-color' } as any);

      // When (Act)
      const { container } = render(<ServerVisualBadge server={server} />);

      // Then (Assert) - Badge existiert mit Fallback-Farbe und Default Icon
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('bg-slate-500'); // Fallback-Farbe
      // Prüfe, dass ein SVG-Icon gerendert wird (Default Icon wird verwendet)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size (sm) correctly - 24px', () => {
      // Given (Arrange)
      const server = createMockServer();
      const size = 'sm' as const;

      // When (Act)
      render(<ServerVisualBadge server={server} size={size} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('size-6');
    });

    it('should render medium size (md) as default - 32px', () => {
      // Given (Arrange)
      const server = createMockServer();
      // No size prop - should default to md

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('size-8');
    });

    it('should render large size (lg) correctly - 40px', () => {
      // Given (Arrange)
      const server = createMockServer();
      const size = 'lg' as const;

      // When (Act)
      render(<ServerVisualBadge server={server} size={size} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('size-10');
    });
  });

  describe('Icon Sizes within Badge', () => {
    it('should render smaller icon for sm badge', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'building' });

      // When (Act)
      const { container } = render(<ServerVisualBadge server={server} size="sm" />);

      // Then (Assert)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('size-3.5');
    });

    it('should render medium icon for md badge', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'building' });

      // When (Act)
      const { container } = render(<ServerVisualBadge server={server} size="md" />);

      // Then (Assert)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('size-5');
    });

    it('should render larger icon for lg badge', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'building' });

      // When (Act)
      const { container } = render(<ServerVisualBadge server={server} size="lg" />);

      // Then (Assert)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('size-6');
    });
  });

  describe('Accessibility', () => {
    it('should have role="img" for semantic correctness', () => {
      // Given (Arrange)
      const server = createMockServer();

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toBeInTheDocument();
    });

    it('should have aria-label with server name', () => {
      // Given (Arrange)
      const server = createMockServer({ name: 'Produktions-Server' });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveAttribute('aria-label', 'Server: Produktions-Server');
    });

    it('should mark icon as aria-hidden', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'shield' });

      // When (Act)
      const { container } = render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      // Given (Arrange)
      const server = createMockServer();
      const customClassName = 'mr-2 ring-2 ring-white';

      // When (Act)
      render(<ServerVisualBadge server={server} className={customClassName} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      // Custom classes
      expect(badge).toHaveClass('mr-2');
      expect(badge).toHaveClass('ring-2');
      expect(badge).toHaveClass('ring-white');
      // Default classes should remain
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('justify-center');
    });
  });

  describe('Base Styling', () => {
    it('should always have rounded-full class for circular shape', () => {
      // Given (Arrange)
      const server = createMockServer();

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('rounded-full');
    });

    it('should have flex centering classes', () => {
      // Given (Arrange)
      const server = createMockServer();

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('justify-center');
    });

    it('should have white text color for icon contrast', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'building' });

      // When (Act)
      const { container } = render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-text-inverse');
    });
  });

  describe('Combined Icon and Color', () => {
    it('should render with both custom icon and color', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'heart', color: 'rose' });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('bg-rose-500');
      expect(badge).toBeInTheDocument();
    });

    it('should render with custom icon and default color', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: 'shield', color: undefined });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert) - Default-Farbe ist 'sky' via getDefaultServerColor()
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('bg-sky-500');
    });

    it('should render with fallback icon and custom color', () => {
      // Given (Arrange)
      const server = createMockServer({ icon: undefined, color: 'violet' });

      // When (Act)
      render(<ServerVisualBadge server={server} />);

      // Then (Assert)
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('bg-violet-500');
    });
  });
});
