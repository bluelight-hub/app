/**
 * Tests für ServerNameDisplay Molecule
 *
 * Testet die statische Anzeige von Server-Informationen (Name, URL, Status).
 * Wird verwendet wenn nur ein Server konfiguriert ist.
 *
 * @module features/server/ui/molecules/__tests__/ServerNameDisplay
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from '../../../types/server-config';
import { ServerNameDisplay } from '../ServerNameDisplay';

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

describe('ServerNameDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render server name', () => {
      // Given
      const server = createMockServer({ name: 'Produktiv-Server' });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      expect(screen.getByTestId('server-name')).toHaveTextContent('Produktiv-Server');
    });

    it('should render server URL as hostname', () => {
      // Given
      const server = createMockServer({ url: 'https://api.bluelight.example.com:8080/path' });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      expect(screen.getByTestId('server-url')).toHaveTextContent('api.bluelight.example.com:8080');
    });

    it('should render status dot', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} status="connected" />);

      // Then
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  // =====================================================
  // Status Tests
  // =====================================================

  describe('Status Display', () => {
    it('should show online status dot when connected', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} status="connected" />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-status-success-text');
    });

    it('should show offline status dot when disconnected', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} status="disconnected" />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-text-muted');
    });

    it('should show checking status with pulse animation', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} status="checking" />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-status-warning-text');
      expect(statusDot).toHaveClass('animate-pulse');
    });

    it('should default to disconnected when no status provided', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-text-muted');
    });
  });

  // =====================================================
  // Edge Case Tests
  // =====================================================

  describe('Edge Cases', () => {
    it('should handle invalid URL gracefully', () => {
      // Given
      const server = createMockServer({ url: 'not-a-valid-url' });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      expect(screen.getByTestId('server-url')).toHaveTextContent('Unbekannt');
    });

    it('should handle URL without protocol gracefully', () => {
      // Given
      const server = createMockServer({ url: 'example.com' });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      expect(screen.getByTestId('server-url')).toHaveTextContent('Unbekannt');
    });

    it('should extract only hostname from URL with path', () => {
      // Given
      const server = createMockServer({ url: 'https://api.example.com/v1/endpoint' });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      expect(screen.getByTestId('server-url')).toHaveTextContent('api.example.com');
    });

    it('should handle server with long name (truncation style)', () => {
      // Given
      const server = createMockServer({
        name: 'Ein sehr langer Server-Name der möglicherweise abgeschnitten werden muss',
      });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      const nameElement = screen.getByTestId('server-name');
      expect(nameElement).toHaveClass('truncate');
    });
  });

  // =====================================================
  // Styling Tests
  // =====================================================

  describe('Styling', () => {
    it('should apply custom className', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} className="custom-class mt-4" />);

      // Then
      const container = screen.getByTestId('server-name-display');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('mt-4');
    });

    it('should have base border and background styles', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      const container = screen.getByTestId('server-name-display');
      expect(container).toHaveClass('border-2');
      expect(container).toHaveClass('border-border-subtle');
      expect(container).toHaveClass('bg-surface-panel');
      expect(container).toHaveClass('rounded-lg');
    });

    it('should have flex layout with gap', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerNameDisplay server={server} />);

      // Then
      const container = screen.getByTestId('server-name-display');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('gap-3');
    });
  });

  // =====================================================
  // ServerVisualBadge Integration Tests
  // =====================================================

  describe('ServerVisualBadge Integration', () => {
    it('should render ServerVisualBadge with server icon and color', () => {
      // Given
      const server = createMockServer({
        name: 'Custom Server',
        icon: 'database',
        color: 'purple',
      });

      // When
      render(<ServerNameDisplay server={server} status="connected" />);

      // Then - Badge sollte mit korrektem aria-label gerendert werden
      expect(screen.getByRole('img', { name: /Server: Custom Server/i })).toBeInTheDocument();
    });

    it('should render default badge when server has no icon or color', () => {
      // Given
      const server = createMockServer({
        name: 'Plain Server',
        icon: undefined,
        color: undefined,
      });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then - Badge sollte auch ohne Icon/Color gerendert werden (Fallback)
      expect(screen.getByRole('img', { name: /Server: Plain Server/i })).toBeInTheDocument();
    });

    it('should show status overlay on the visual badge', () => {
      // Given
      const server = createMockServer({ icon: 'server', color: 'green' });

      // When
      render(<ServerNameDisplay server={server} status="connected" />);

      // Then - Sowohl Badge als auch Status-Dot sollten vorhanden sein
      expect(screen.getByRole('img', { name: /Server:/i })).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display badge with correct size (md)', () => {
      // Given
      const server = createMockServer({ icon: 'cloud', color: 'sky' });

      // When
      render(<ServerNameDisplay server={server} />);

      // Then - Badge sollte size-8 Klasse haben (md = 32px)
      const badge = screen.getByRole('img', { name: /Server:/i });
      expect(badge).toHaveClass('size-8');
    });
  });
});
