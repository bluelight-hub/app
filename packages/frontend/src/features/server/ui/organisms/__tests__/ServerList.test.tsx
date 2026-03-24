/**
 * Tests für ServerList Organism
 *
 * Testet die Darstellung der Server-Liste, Loading-State, Empty-State
 * und alle Interaktionsmöglichkeiten.
 *
 * @module features/server/ui/organisms/__tests__/ServerList
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionStatus, ServerConfig } from '../../../types/server-config';
import { ServerList } from '../ServerList';

// =====================================================
// Mock Setup
// =====================================================

// Mock für useStore
const mockIsHydrated = vi.fn(() => true);
const mockConnectionStatus = vi.fn(() => new Map<string, ConnectionStatus>());
vi.mock('@tanstack/react-store', () => ({
  useStore: vi.fn((_, selector) => {
    // Unterscheide zwischen verschiedenen Selektoren basierend auf dem Rückgabewert
    if (selector.toString().includes('isHydrated')) {
      return mockIsHydrated();
    }
    if (selector.toString().includes('connectionStatus')) {
      return mockConnectionStatus();
    }
    return undefined;
  }),
}));

// Mock für useServerList
const mockUseServerList = vi.fn<() => ServerConfig[]>(() => []);
vi.mock('../../../hooks/use-server-list', () => ({
  useServerList: () => mockUseServerList(),
}));

// Mock für useActiveServer
const mockUseActiveServer = vi.fn<() => ServerConfig | null>(() => null);
vi.mock('../../../hooks/use-active-server', () => ({
  useActiveServer: () => mockUseActiveServer(),
}));

// Mock für useServerListHealth
const mockUseServerListHealth = vi.fn();
vi.mock('../../../hooks/use-server-list-health', () => ({
  useServerListHealth: () => mockUseServerListHealth(),
}));

// Mock für serverStore (wird von useStore importiert)
vi.mock('../../../stores/server.store', () => ({
  serverStore: {},
}));

// =====================================================
// Test Utilities
// =====================================================

/**
 * Erstellt einen Mock-Server für Tests.
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

/**
 * Reset aller Mocks vor jedem Test.
 */
beforeEach(() => {
  vi.clearAllMocks();
  mockIsHydrated.mockReturnValue(true);
  mockConnectionStatus.mockReturnValue(new Map());
  mockUseServerList.mockReturnValue([]);
  mockUseActiveServer.mockReturnValue(null);
});

// =====================================================
// Tests
// =====================================================

describe('ServerList', () => {
  // =====================================================
  // Loading State Tests
  // =====================================================

  describe('Loading State', () => {
    it('should show spinner when store is not hydrated', () => {
      // Given
      mockIsHydrated.mockReturnValue(false);

      // When
      render(<ServerList />);

      // Then
      expect(screen.getByTestId('server-list-loading')).toBeInTheDocument();
    });

    it('should not show server list or empty state while loading', () => {
      // Given
      mockIsHydrated.mockReturnValue(false);
      mockUseServerList.mockReturnValue([createMockServer()]);

      // When
      render(<ServerList />);

      // Then
      expect(screen.queryByTestId('server-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('server-list-empty-state')).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // Empty State Tests
  // =====================================================

  describe('Empty State', () => {
    it('should show empty state when no servers configured', () => {
      // Given
      mockIsHydrated.mockReturnValue(true);
      mockUseServerList.mockReturnValue([]);

      // When
      render(<ServerList />);

      // Then
      expect(screen.getByTestId('server-list-empty-state')).toBeInTheDocument();
      expect(screen.getByText('Keine Server konfiguriert')).toBeInTheDocument();
    });

    it('should call onAddServer when clicking add button in empty state', async () => {
      // Given
      const user = userEvent.setup();
      const onAddServer = vi.fn();
      mockIsHydrated.mockReturnValue(true);
      mockUseServerList.mockReturnValue([]);

      // When
      render(<ServerList onAddServer={onAddServer} />);
      await user.click(screen.getByRole('button', { name: /server hinzufügen/i }));

      // Then
      expect(onAddServer).toHaveBeenCalledTimes(1);
    });

    it('should not show add button in empty state when onAddServer not provided', () => {
      // Given
      mockIsHydrated.mockReturnValue(true);
      mockUseServerList.mockReturnValue([]);

      // When
      render(<ServerList />);

      // Then
      expect(screen.queryByRole('button', { name: /server hinzufügen/i })).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // List Rendering Tests
  // =====================================================

  describe('List Rendering', () => {
    it('should render list of servers', () => {
      // Given
      const servers = [createMockServer({ id: 'server-1', name: 'Server 1' }), createMockServer({ id: 'server-2', name: 'Server 2' })];
      mockUseServerList.mockReturnValue(servers);

      // When
      render(<ServerList />);

      // Then
      expect(screen.getByTestId('server-list')).toBeInTheDocument();
      expect(screen.getByText('Server 1')).toBeInTheDocument();
      expect(screen.getByText('Server 2')).toBeInTheDocument();
    });

    it('should render correct number of ServerListItems', () => {
      // Given
      const servers = [createMockServer({ id: 'server-1', name: 'Server 1' }), createMockServer({ id: 'server-2', name: 'Server 2' }), createMockServer({ id: 'server-3', name: 'Server 3' })];
      mockUseServerList.mockReturnValue(servers);

      // When
      render(<ServerList />);

      // Then
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    it('should pass correct server data to ServerListItem', () => {
      // Given
      const server = createMockServer({
        id: 'test-id',
        name: 'Produktiv-Server',
        url: 'https://api.bluelight.example.com',
      });
      mockUseServerList.mockReturnValue([server]);

      // When
      render(<ServerList />);

      // Then
      expect(screen.getByText('Produktiv-Server')).toBeInTheDocument();
      expect(screen.getByText('https://api.bluelight.example.com')).toBeInTheDocument();
    });

    it('should mark active server with isActive=true', () => {
      // Given
      const activeServer = createMockServer({ id: 'active-server', name: 'Aktiver Server' });
      const inactiveServer = createMockServer({ id: 'inactive-server', name: 'Inaktiver Server' });
      mockUseServerList.mockReturnValue([activeServer, inactiveServer]);
      mockUseActiveServer.mockReturnValue(activeServer);

      // When
      render(<ServerList />);

      // Then
      // "Zuletzt verwendet" Badge sollte nur beim aktiven Server erscheinen
      const badges = screen.getAllByText('Zuletzt verwendet');
      expect(badges.length).toBeGreaterThan(0);

      // Prüfe dass es nur beim aktiven Server angezeigt wird
      const activeListItem = screen.getByLabelText(/Server Aktiver Server/);
      const inactiveListItem = screen.getByLabelText(/Server Inaktiver Server/);

      expect(within(activeListItem).queryAllByText('Zuletzt verwendet').length).toBeGreaterThan(0);
      expect(within(inactiveListItem).queryByText('Zuletzt verwendet')).not.toBeInTheDocument();
    });

    it('should have role="list"', () => {
      // Given
      mockUseServerList.mockReturnValue([createMockServer()]);

      // When
      render(<ServerList />);

      // Then
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should pass connection status to ServerListItem', () => {
      // Given
      const server = createMockServer({ id: 'server-with-status', name: 'Server mit Status' });
      mockUseServerList.mockReturnValue([server]);
      const statusMap = new Map<string, ConnectionStatus>();
      statusMap.set('server-with-status', 'connected');
      mockConnectionStatus.mockReturnValue(statusMap);

      // When
      render(<ServerList />);

      // Then
      // Der Status wird an ServerListItem weitergegeben, was den Status-Dot beeinflusst
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-status-success-text');
    });
  });

  // =====================================================
  // Sorting Tests
  // =====================================================

  describe('Sorting', () => {
    it('should display servers sorted by lastUsedAt (most recent first)', () => {
      // Given - Die Sortierung kommt bereits vom useServerList Hook
      // Der Hook gibt die Server bereits sortiert zurück
      const oldServer = createMockServer({
        id: 'old-server',
        name: 'Alter Server',
        lastUsedAt: '2026-01-01T00:00:00Z',
      });
      const newServer = createMockServer({
        id: 'new-server',
        name: 'Neuer Server',
        lastUsedAt: '2026-01-10T00:00:00Z',
      });
      // useServerList gibt bereits sortiert zurück (neuester zuerst)
      mockUseServerList.mockReturnValue([newServer, oldServer]);

      // When
      render(<ServerList />);

      // Then
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);

      // Prüfe Reihenfolge: Neuer Server zuerst
      expect(within(listItems[0]).getByText('Neuer Server')).toBeInTheDocument();
      expect(within(listItems[1]).getByText('Alter Server')).toBeInTheDocument();
    });
  });

  // =====================================================
  // Interaction Tests
  // =====================================================

  describe('Interactions', () => {
    it('should call onSelectServer when server clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onSelectServer = vi.fn();
      const server = createMockServer({ id: 'clickable-server', name: 'Klickbarer Server' });
      mockUseServerList.mockReturnValue([server]);

      // When
      render(<ServerList onSelectServer={onSelectServer} />);
      await user.click(screen.getByRole('listitem'));

      // Then
      expect(onSelectServer).toHaveBeenCalledTimes(1);
      expect(onSelectServer).toHaveBeenCalledWith('clickable-server');
    });

    it('should call onEditServer when edit button clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onEditServer = vi.fn();
      const server = createMockServer({ id: 'editable-server', name: 'Bearbeitbarer Server' });
      mockUseServerList.mockReturnValue([server]);

      // When
      render(<ServerList onEditServer={onEditServer} />);
      await user.click(screen.getByRole('button', { name: /bearbeiten/i }));

      // Then
      expect(onEditServer).toHaveBeenCalledTimes(1);
      expect(onEditServer).toHaveBeenCalledWith('editable-server');
    });

    it('should call onDeleteServer when delete button clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onDeleteServer = vi.fn();
      const server = createMockServer({ id: 'deletable-server', name: 'Löschbarer Server' });
      mockUseServerList.mockReturnValue([server]);

      // When
      render(<ServerList onDeleteServer={onDeleteServer} />);
      await user.click(screen.getByRole('button', { name: /löschen/i }));

      // Then
      expect(onDeleteServer).toHaveBeenCalledTimes(1);
      expect(onDeleteServer).toHaveBeenCalledWith('deletable-server');
    });
  });

  // =====================================================
  // Health Check Integration Tests
  // =====================================================

  describe('Health Check Integration', () => {
    it('should call useServerListHealth on mount', () => {
      // Given
      mockUseServerList.mockReturnValue([createMockServer()]);

      // When
      render(<ServerList />);

      // Then
      expect(mockUseServerListHealth).toHaveBeenCalled();
    });

    it('should display checking status correctly', () => {
      // Given
      const server = createMockServer({ id: 'checking-server' });
      mockUseServerList.mockReturnValue([server]);
      const statusMap = new Map<string, ConnectionStatus>();
      statusMap.set('checking-server', 'checking');
      mockConnectionStatus.mockReturnValue(statusMap);

      // When
      render(<ServerList />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-status-warning-text');
      expect(statusDot).toHaveClass('animate-pulse');
    });

    it('should display disconnected status correctly', () => {
      // Given
      const server = createMockServer({ id: 'disconnected-server' });
      mockUseServerList.mockReturnValue([server]);
      const statusMap = new Map<string, ConnectionStatus>();
      statusMap.set('disconnected-server', 'disconnected');
      mockConnectionStatus.mockReturnValue(statusMap);

      // When
      render(<ServerList />);

      // Then
      const statusDot = screen.getByRole('status');
      expect(statusDot).toHaveClass('bg-text-muted');
    });
  });

  // =====================================================
  // Styling & Accessibility Tests
  // =====================================================

  describe('Styling & Accessibility', () => {
    it('should have divider between list items', () => {
      // Given
      const servers = [createMockServer({ id: 'server-1' }), createMockServer({ id: 'server-2' })];
      mockUseServerList.mockReturnValue(servers);

      // When
      render(<ServerList />);

      // Then
      const list = screen.getByTestId('server-list');
      expect(list).toHaveClass('divide-y');
      expect(list).toHaveClass('divide-border-subtle');
    });

    it('should merge custom className', () => {
      // Given
      mockUseServerList.mockReturnValue([createMockServer()]);

      // When
      render(<ServerList className="custom-class mt-4" />);

      // Then
      const list = screen.getByTestId('server-list');
      expect(list).toHaveClass('custom-class');
      expect(list).toHaveClass('mt-4');
    });

    it('should forward ref correctly', () => {
      // Given
      const ref = vi.fn();
      mockUseServerList.mockReturnValue([createMockServer()]);

      // When
      render(<ServerList ref={ref} />);

      // Then
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });

    it('should forward ref in loading state', () => {
      // Given
      const ref = vi.fn();
      mockIsHydrated.mockReturnValue(false);

      // When
      render(<ServerList ref={ref} />);

      // Then
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  // =====================================================
  // Edge Cases Tests
  // =====================================================

  describe('Edge Cases', () => {
    it('should handle server without lastUsedAt', () => {
      // Given
      const server = createMockServer({ lastUsedAt: null });
      mockUseServerList.mockReturnValue([server]);

      // When
      render(<ServerList />);

      // Then
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('should handle multiple servers with same status', () => {
      // Given
      const servers = [createMockServer({ id: 'server-1' }), createMockServer({ id: 'server-2' }), createMockServer({ id: 'server-3' })];
      mockUseServerList.mockReturnValue(servers);
      const statusMap = new Map<string, ConnectionStatus>();
      statusMap.set('server-1', 'connected');
      statusMap.set('server-2', 'connected');
      statusMap.set('server-3', 'connected');
      mockConnectionStatus.mockReturnValue(statusMap);

      // When
      render(<ServerList />);

      // Then
      const statusDots = screen.getAllByRole('status');
      expect(statusDots).toHaveLength(3);
      for (const dot of statusDots) {
        expect(dot).toHaveClass('bg-status-success-text');
      }
    });

    it('should handle rapid hydration state changes', () => {
      // Given
      mockIsHydrated.mockReturnValue(false);
      const { rerender } = render(<ServerList />);

      // Then - Loading state
      expect(screen.getByTestId('server-list-loading')).toBeInTheDocument();

      // When - Hydration completes
      mockIsHydrated.mockReturnValue(true);
      mockUseServerList.mockReturnValue([createMockServer()]);
      rerender(<ServerList />);

      // Then - List is shown
      expect(screen.getByTestId('server-list')).toBeInTheDocument();
      expect(screen.queryByTestId('server-list-loading')).not.toBeInTheDocument();
    });
  });
});
