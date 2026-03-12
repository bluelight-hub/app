/**
 * Tests für ServerListItem Molecule
 *
 * Testet die Darstellung und Interaktivität der Server-Listen-Einträge.
 *
 * @module features/server/ui/molecules/__tests__/ServerListItem
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConnectionStatus, ServerConfig } from '../../../types/server-config';
import { ServerListItem } from '../ServerListItem';

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

describe('ServerListItem', () => {
  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render server name', () => {
      // Given
      const server = createMockServer({ name: 'Produktiv-Server' });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      expect(screen.getByText('Produktiv-Server')).toBeInTheDocument();
    });

    it('should render server URL', () => {
      // Given
      const server = createMockServer({ url: 'https://api.bluelight.example.com' });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      expect(screen.getByText('https://api.bluelight.example.com')).toBeInTheDocument();
    });

    it('should render status dot', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render "Zuletzt verwendet" badge when isActive', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={true} status="connected" />);

      // Then
      const badges = screen.getAllByText('Zuletzt verwendet');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should not render badge when not active', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      expect(screen.queryByText('Zuletzt verwendet')).not.toBeInTheDocument();
    });

    it('should render edit button when onEdit provided', () => {
      // Given
      const server = createMockServer();
      const onEdit = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onEdit={onEdit} />);

      // Then
      expect(screen.getByRole('button', { name: /bearbeiten/i })).toBeInTheDocument();
    });

    it('should render delete button when onDelete provided', () => {
      // Given
      const server = createMockServer();
      const onDelete = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onDelete={onDelete} />);

      // Then
      expect(screen.getByRole('button', { name: /löschen/i })).toBeInTheDocument();
    });

    it('should render confirmation button when delete confirmation is pending', () => {
      // Given
      const server = createMockServer();
      const onDelete = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onDelete={onDelete} isDeleteConfirmationPending={true} />);

      // Then
      expect(screen.getByRole('button', { name: /wirklich löschen/i })).toBeInTheDocument();
      expect(screen.getByText('Wirklich löschen?')).toBeInTheDocument();
    });

    it('should not render action buttons when no callbacks provided', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // Status Tests
  // =====================================================

  describe('Status Display', () => {
    it('should show green status for connected', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-green-500');
    });

    it('should show gray status for disconnected', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="disconnected" />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-gray-400');
    });

    it('should show yellow status with pulse for checking', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="checking" />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-yellow-500');
      expect(statusDot).toHaveClass('animate-pulse');
    });

    it('should default to disconnected when status is undefined', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status={undefined} />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-gray-400');
    });
  });

  // =====================================================
  // Interaction Tests
  // =====================================================

  describe('Interactions', () => {
    it('should call onClick when clicked', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'server-123' });
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} />);
      await user.click(screen.getByRole('listitem'));

      // Then
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('server-123');
    });

    it('should call onClick on Enter key press', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'server-456' });
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} />);
      const listItem = screen.getByRole('listitem');
      listItem.focus();
      await user.keyboard('{Enter}');

      // Then
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('server-456');
    });

    it('should call onClick on Space key press', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'server-789' });
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} />);
      const listItem = screen.getByRole('listitem');
      listItem.focus();
      await user.keyboard(' ');

      // Then
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('server-789');
    });

    it('should call onEdit when edit button clicked', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'edit-server' });
      const onEdit = vi.fn();
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} onEdit={onEdit} />);
      await user.click(screen.getByRole('button', { name: /bearbeiten/i }));

      // Then
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith('edit-server');
      expect(onClick).not.toHaveBeenCalled(); // Event propagation stopped
    });

    it('should call onDelete when delete button clicked', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'delete-server' });
      const onDelete = vi.fn();
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} onDelete={onDelete} />);
      await user.click(screen.getByRole('button', { name: /löschen/i }));

      // Then
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('delete-server');
      expect(onClick).not.toHaveBeenCalled(); // Event propagation stopped
    });

    it('should disable confirmation and edit actions while delete is running', () => {
      // Given
      const server = createMockServer();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onEdit={onEdit} onDelete={onDelete} isDeleteConfirmationPending={true} isDeleting={true} />);

      // Then
      expect(screen.getByRole('button', { name: /wird entfernt/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /bearbeiten/i })).toBeDisabled();
    });

    it('should not call onClick when no handler provided', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);
      await user.click(screen.getByRole('listitem'));

      // Then - no error should occur, item is not interactive
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });
  });

  // =====================================================
  // Accessibility Tests
  // =====================================================

  describe('Accessibility', () => {
    it('should have listitem role', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('should have accessible label for connected status', () => {
      // Given
      const server = createMockServer({ name: 'Main Server' });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveAttribute('aria-label', 'Server Main Server, verbunden');
    });

    it('should have accessible label for disconnected status', () => {
      // Given
      const server = createMockServer({ name: 'Backup Server' });

      // When
      render(<ServerListItem server={server} isActive={false} status="disconnected" />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveAttribute('aria-label', 'Server Backup Server, nicht verbunden');
    });

    it('should have accessible label for checking status', () => {
      // Given
      const server = createMockServer({ name: 'Test Server' });

      // When
      render(<ServerListItem server={server} isActive={false} status="checking" />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveAttribute('aria-label', 'Server Test Server, wird geprüft');
    });

    it('should be focusable when onClick is provided', () => {
      // Given
      const server = createMockServer();
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveAttribute('tabIndex', '0');
    });

    it('should not be focusable when no onClick', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).not.toHaveAttribute('tabIndex');
    });

    it('should have accessible labels for action buttons', () => {
      // Given
      const server = createMockServer({ name: 'API Server' });
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onEdit={onEdit} onDelete={onDelete} />);

      // Then
      expect(screen.getByRole('button', { name: 'Server API Server bearbeiten' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Server API Server löschen' })).toBeInTheDocument();
    });
  });

  // =====================================================
  // Style Tests
  // =====================================================

  describe('Styling', () => {
    it('should have hover styles class when item is interactive', () => {
      // Given
      const server = createMockServer();
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveClass('hover:bg-slate-100/80');
      expect(listItem).toHaveClass('dark:hover:bg-slate-900/50');
    });

    it('should have cursor-pointer when onClick provided', () => {
      // Given
      const server = createMockServer();
      const onClick = vi.fn();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" onClick={onClick} />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveClass('cursor-pointer');
    });

    it('should not have cursor-pointer when no onClick', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).not.toHaveClass('cursor-pointer');
    });

    it('should merge custom className', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" className="custom-class border-2" />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveClass('custom-class');
      expect(listItem).toHaveClass('border-2');
    });

    it('should have responsive layout classes', () => {
      // Given
      const server = createMockServer();

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveClass('flex-col');
      expect(listItem).toHaveClass('sm:flex-row');
    });
  });

  // =====================================================
  // Edge Case Tests
  // =====================================================

  describe('Edge Cases', () => {
    it('should handle server with long name (truncation)', () => {
      // Given
      const server = createMockServer({
        name: 'Ein sehr langer Server-Name der möglicherweise abgeschnitten werden muss',
      });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      const nameElement = screen.getByText(/Ein sehr langer Server-Name/);
      expect(nameElement).toHaveClass('truncate');
    });

    it('should handle server with long URL (truncation)', () => {
      // Given
      const server = createMockServer({
        url: 'https://very-long-subdomain.api.example.organization.company.com/v1/api/endpoint',
      });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then
      const urlElement = screen.getByText(/very-long-subdomain/);
      expect(urlElement).toHaveClass('truncate');
    });

    it('should handle all status types correctly', () => {
      // Given
      const server = createMockServer();
      const statuses: (ConnectionStatus | undefined)[] = ['connected', 'disconnected', 'checking', undefined];

      // When/Then - should not throw for any status
      for (const status of statuses) {
        const { unmount } = render(<ServerListItem server={server} isActive={false} status={status} />);
        expect(screen.getByRole('listitem')).toBeInTheDocument();
        unmount();
      }
    });

    it('should forward ref correctly', () => {
      // Given
      const server = createMockServer();
      const ref = vi.fn();

      // When
      render(<ServerListItem ref={ref} server={server} isActive={false} status="connected" />);

      // Then
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  // =====================================================
  // ServerVisualBadge Integration Tests
  // =====================================================

  describe('ServerVisualBadge Integration', () => {
    it('should render ServerVisualBadge with server icon and color', () => {
      // Given - Nutze gültige ServerIconValue/ServerColorValue
      const server = createMockServer({
        name: 'Production Server',
        icon: 'server',
        color: 'sky', // 'blue' ist kein gültiger ServerColorValue
      });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then - Badge sollte als img mit aria-label gerendert werden
      expect(screen.getByRole('img', { name: /Server: Production Server/i })).toBeInTheDocument();
    });

    it('should render default badge when server has no icon or color', () => {
      // Given
      const server = createMockServer({
        name: 'Default Server',
        icon: undefined,
        color: undefined,
      });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then - Badge sollte auch ohne Icon/Color gerendert werden
      expect(screen.getByRole('img', { name: /Server: Default Server/i })).toBeInTheDocument();
    });

    it('should show status overlay on the visual badge', () => {
      // Given - Nutze gültige ServerIconValue/ServerColorValue
      const server = createMockServer({ icon: 'building', color: 'emerald' }); // 'database'/'green' sind ungültig

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then - Sowohl Badge als auch Status-Dot sollten vorhanden sein
      expect(screen.getByRole('img', { name: /Server:/i })).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display badge with correct size (sm)', () => {
      // Given - M8 Fix: Nutze gültigen ServerIconValue und erwarte sm (konsistent mit ServerSelector)
      const server = createMockServer({ icon: 'building', color: 'sky' });

      // When
      render(<ServerListItem server={server} isActive={false} status="connected" />);

      // Then - Badge sollte size-6 Klasse haben (sm = 24px, konsistent mit ServerSelector)
      const badge = screen.getByRole('img', { name: /Server:/i });
      expect(badge).toHaveClass('size-6');
    });
  });
});
