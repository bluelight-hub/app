/**
 * Tests für ServerSelector Molecule
 *
 * Testet die Darstellung und Interaktivität des Server-Auswahl-Dropdowns.
 *
 * @module features/server/ui/molecules/__tests__/ServerSelector
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConnectionStatus, ServerConfig } from '../../../types/server-config';
import { ServerSelector } from '../ServerSelector';

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

describe('ServerSelector', () => {
  // =====================================================
  // Story 3.5: Server Sorting Tests (Last-Used Priorität)
  // =====================================================

  describe('Server Sorting by Last-Used', () => {
    it('should sort servers by lastUsedAt descending (most recent first)', async () => {
      // Given - Server mit unterschiedlichen lastUsedAt Werten
      const user = userEvent.setup();
      const oldServer = createMockServer({
        id: 'server-old',
        name: 'Old Server',
        lastUsedAt: '2026-01-01T00:00:00Z',
      });
      const recentServer = createMockServer({
        id: 'server-recent',
        name: 'Recent Server',
        lastUsedAt: '2026-01-10T00:00:00Z',
      });
      const middleServer = createMockServer({
        id: 'server-middle',
        name: 'Middle Server',
        lastUsedAt: '2026-01-05T00:00:00Z',
      });

      // When - Array wird NICHT nach lastUsedAt sortiert übergeben
      render(
        <ServerSelector
          servers={[oldServer, middleServer, recentServer]}
          activeServer={oldServer}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /old server/i });
      await user.click(button);

      // Then - Server sollten nach lastUsedAt sortiert sein (neueste zuerst)
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        // Reihenfolge sollte sein: Recent (1.), Middle (2.), Old (3.)
        expect(options[0]).toHaveTextContent('Recent Server');
        expect(options[1]).toHaveTextContent('Middle Server');
        expect(options[2]).toHaveTextContent('Old Server');
      });
    });

    it('should place servers with lastUsedAt before servers without', async () => {
      // Given - Mix aus Servern mit und ohne lastUsedAt
      const user = userEvent.setup();
      const serverWithUsage = createMockServer({
        id: 'server-with-usage',
        name: 'Server With Usage',
        createdAt: '2025-12-15T00:00:00Z',
        lastUsedAt: '2026-01-05T00:00:00Z',
      });
      const serverWithoutUsage = createMockServer({
        id: 'server-without-usage',
        name: 'Server Without Usage',
        createdAt: '2025-12-01T00:00:00Z',
        lastUsedAt: null,
      });

      // When - Server ohne lastUsedAt kommt zuerst im Array
      render(
        <ServerSelector
          servers={[serverWithoutUsage, serverWithUsage]}
          activeServer={serverWithoutUsage}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /server without usage/i });
      await user.click(button);

      // Then - Server mit lastUsedAt sollte zuerst kommen
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveTextContent('Server With Usage');
        expect(options[1]).toHaveTextContent('Server Without Usage');
      });
    });

    it('should maintain stable order for servers without lastUsedAt', async () => {
      // Given - Mehrere Server ohne lastUsedAt
      const user = userEvent.setup();
      const serverA = createMockServer({
        id: 'server-a',
        name: 'Server A',
        lastUsedAt: null,
      });
      const serverB = createMockServer({
        id: 'server-b',
        name: 'Server B',
        lastUsedAt: null,
      });

      // When
      render(
        <ServerSelector
          servers={[serverA, serverB]}
          activeServer={serverA}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /server a/i });
      await user.click(button);

      // Then - Reihenfolge sollte stabil bleiben (keine Sortierung bei gleichem Status)
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(2);
        // Bei gleichem lastUsedAt (beide undefined) bleibt Original-Reihenfolge
        expect(options[0]).toHaveTextContent('Server A');
        expect(options[1]).toHaveTextContent('Server B');
      });
    });

    it('should handle servers with same lastUsedAt timestamp', async () => {
      // Given - Zwei Server mit identischem lastUsedAt
      const user = userEvent.setup();
      const sameTimestamp = '2026-01-10T00:00:00Z';
      const serverA = createMockServer({
        id: 'server-a',
        name: 'Server A',
        lastUsedAt: sameTimestamp,
      });
      const serverB = createMockServer({
        id: 'server-b',
        name: 'Server B',
        lastUsedAt: sameTimestamp,
      });

      // When
      render(
        <ServerSelector
          servers={[serverA, serverB]}
          activeServer={serverA}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /server a/i });
      await user.click(button);

      // Then - Beide Server sollten angezeigt werden (stabile Sortierung)
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(2);
      });
    });

    it('should sort correctly with mixed lastUsedAt values', async () => {
      // Given - Komplexer Mix aus Servern
      const user = userEvent.setup();
      const servers = [
        createMockServer({
          id: 'no-usage-1',
          name: 'No Usage 1',
          createdAt: '2025-11-01T00:00:00Z',
          lastUsedAt: null,
        }),
        createMockServer({
          id: 'latest',
          name: 'Latest Usage',
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z',
        }),
        createMockServer({
          id: 'middle',
          name: 'Middle Usage',
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        }),
        createMockServer({
          id: 'no-usage-2',
          name: 'No Usage 2',
          createdAt: '2025-12-20T00:00:00Z',
          lastUsedAt: null,
        }),
      ];

      // When
      render(
        <ServerSelector
          servers={servers}
          activeServer={servers[0]}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /no usage 1/i });
      await user.click(button);

      // Then - Erwartete Reihenfolge:
      // 1. Latest Usage (lastUsedAt: 2026-01-10)
      // 2. Middle Usage (lastUsedAt: 2026-01-05)
      // 3. No Usage 1 (kein lastUsedAt)
      // 4. No Usage 2 (kein lastUsedAt)
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveTextContent('Latest Usage');
        expect(options[1]).toHaveTextContent('Middle Usage');
        // Server ohne lastUsedAt behalten ihre relative Reihenfolge
      });
    });
  });

  // =====================================================
  // Offline Label Tests (Story 3.2, AC5)
  // =====================================================

  describe('Offline Label', () => {
    it('should not render per-server action buttons in dropdown', async () => {
      const user = userEvent.setup();
      const server = createMockServer({ id: 'single-server', name: 'Single Server' });

      render(
        <ServerSelector servers={[server]} activeServer={server} connectionStatus={new Map()} onServerChange={vi.fn()} onAddServer={vi.fn()} onReconfigureServer={vi.fn()} onDeleteServer={vi.fn()} />,
      );

      await user.click(screen.getByRole('button', { name: /single server/i }));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /single server/i })).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /aktionen für single server/i })).not.toBeInTheDocument();
    });

    it('should show "Offline" label for disconnected servers in dropdown', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'offline-server', name: 'Offline Server' });
      const connectionStatus = new Map<string, ConnectionStatus>([['offline-server', 'disconnected']]);

      // When
      render(
        <ServerSelector
          servers={[server]}
          activeServer={server}
          connectionStatus={connectionStatus}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown durch Klick auf den Button
      const button = screen.getByRole('button', { name: /offline server/i });
      await user.click(button);

      // Then - warte auf das Dropdown und prüfe das Offline Label
      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });

    it('should NOT show "Offline" label for connected servers', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'connected-server', name: 'Connected Server' });
      const connectionStatus = new Map<string, ConnectionStatus>([['connected-server', 'connected']]);

      // When
      render(
        <ServerSelector
          servers={[server]}
          activeServer={server}
          connectionStatus={connectionStatus}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /connected server/i });
      await user.click(button);

      // Then
      await waitFor(() => {
        expect(screen.getByText('Server hinzufügen')).toBeInTheDocument(); // Dropdown ist offen
      });
      expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    });

    it('should NOT show "Offline" label for checking servers', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'checking-server', name: 'Checking Server' });
      const connectionStatus = new Map<string, ConnectionStatus>([['checking-server', 'checking']]);

      // When
      render(
        <ServerSelector
          servers={[server]}
          activeServer={server}
          connectionStatus={connectionStatus}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /checking server/i });
      await user.click(button);

      // Then
      await waitFor(() => {
        expect(screen.getByText('Server hinzufügen')).toBeInTheDocument(); // Dropdown ist offen
      });
      expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    });

    it('should NOT show "Offline" label when connectionStatus is undefined', async () => {
      // Given
      const user = userEvent.setup();
      const server = createMockServer({ id: 'no-status-server', name: 'No Status Server' });

      // When
      render(
        <ServerSelector servers={[server]} activeServer={server} connectionStatus={undefined} onServerChange={vi.fn()} onAddServer={vi.fn()} onReconfigureServer={vi.fn()} onDeleteServer={vi.fn()} />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /no status server/i });
      await user.click(button);

      // Then
      await waitFor(() => {
        expect(screen.getByText('Server hinzufügen')).toBeInTheDocument(); // Dropdown ist offen
      });
      expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    });

    it('should show "Offline" label only for disconnected servers when multiple servers exist', async () => {
      // Given
      const user = userEvent.setup();
      const connectedServer = createMockServer({ id: 'server-1', name: 'Connected Server' });
      const disconnectedServer = createMockServer({ id: 'server-2', name: 'Disconnected Server' });
      const connectionStatus = new Map<string, ConnectionStatus>([
        ['server-1', 'connected'],
        ['server-2', 'disconnected'],
      ]);

      // When
      render(
        <ServerSelector
          servers={[connectedServer, disconnectedServer]}
          activeServer={connectedServer}
          connectionStatus={connectionStatus}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      const button = screen.getByRole('button', { name: /connected server/i });
      await user.click(button);

      // Then - warte auf das Dropdown
      await waitFor(() => {
        expect(screen.getByText('Server hinzufügen')).toBeInTheDocument();
      });

      // Es sollte genau ein "Offline" Label geben (nur beim disconnected Server)
      const offlineLabels = screen.getAllByText('Offline');
      expect(offlineLabels).toHaveLength(1);
    });
  });

  // =====================================================
  // Story 3.5: Server Switch Warning Dialog Tests (AC4)
  // =====================================================

  describe('Server Switch Warning Dialog (AC4)', () => {
    it('should show warning dialog when authenticated user tries to switch servers', async () => {
      // Given - User ist eingeloggt
      const user = userEvent.setup();
      const currentServer = createMockServer({ id: 'current', name: 'Current Server' });
      const targetServer = createMockServer({ id: 'target', name: 'Target Server' });
      const onLogoutAndSwitch = vi.fn();

      render(
        <ServerSelector
          servers={[currentServer, targetServer]}
          activeServer={currentServer}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
          isAuthenticated={true}
          onLogoutAndSwitch={onLogoutAndSwitch}
        />,
      );

      // When - Öffne Dropdown und wähle anderen Server
      const button = screen.getByRole('button', { name: /current server/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /target server/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: /target server/i }));

      // Then - Warndialog sollte erscheinen
      await waitFor(() => {
        expect(screen.getByTestId('switch-server-dialog')).toBeInTheDocument();
      });
    });

    it('should NOT show warning dialog when user is not authenticated', async () => {
      // Given - User ist NICHT eingeloggt
      const user = userEvent.setup();
      const currentServer = createMockServer({ id: 'current', name: 'Current Server' });
      const targetServer = createMockServer({ id: 'target', name: 'Target Server' });
      const onServerChange = vi.fn();

      render(
        <ServerSelector
          servers={[currentServer, targetServer]}
          activeServer={currentServer}
          connectionStatus={new Map()}
          onServerChange={onServerChange}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
          isAuthenticated={false}
        />,
      );

      // When - Öffne Dropdown und wähle anderen Server
      const button = screen.getByRole('button', { name: /current server/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /target server/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: /target server/i }));

      // Then - Kein Warndialog, direkter Serverwechsel
      expect(screen.queryByTestId('switch-server-dialog')).not.toBeInTheDocument();
      expect(onServerChange).toHaveBeenCalledWith('target');
    });

    it('should call onLogoutAndSwitch when confirm is clicked in warning dialog', async () => {
      // Given
      const user = userEvent.setup();
      const currentServer = createMockServer({ id: 'current', name: 'Current Server' });
      const targetServer = createMockServer({ id: 'target', name: 'Target Server' });
      const onLogoutAndSwitch = vi.fn().mockResolvedValue(undefined);

      render(
        <ServerSelector
          servers={[currentServer, targetServer]}
          activeServer={currentServer}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
          isAuthenticated={true}
          onLogoutAndSwitch={onLogoutAndSwitch}
        />,
      );

      // When - Öffne, wähle Server, bestätige Dialog
      await user.click(screen.getByRole('button', { name: /current server/i }));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /target server/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: /target server/i }));

      await waitFor(() => {
        expect(screen.getByTestId('switch-server-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByText(/abmelden und wechseln/i));

      // Then
      await waitFor(() => {
        expect(onLogoutAndSwitch).toHaveBeenCalledWith('target');
      });
    });
  });

  // =====================================================
  // ServerVisualBadge Integration Tests
  // =====================================================

  describe('ServerVisualBadge Integration', () => {
    it('should render ServerVisualBadge in closed button state', () => {
      // Given
      const server = createMockServer({
        name: 'Visual Server',
        icon: 'server',
        color: 'blue',
      });

      // When
      render(
        <ServerSelector servers={[server]} activeServer={server} connectionStatus={new Map()} onServerChange={vi.fn()} onAddServer={vi.fn()} onReconfigureServer={vi.fn()} onDeleteServer={vi.fn()} />,
      );

      // Then - Badge sollte im geschlossenen Button sichtbar sein
      expect(screen.getByRole('img', { name: /Server: Visual Server/i })).toBeInTheDocument();
    });

    it('should render ServerVisualBadge for each server in dropdown', async () => {
      // Given
      const user = userEvent.setup();
      const server1 = createMockServer({
        id: 'server-1',
        name: 'Server One',
        icon: 'database',
        color: 'green',
      });
      const server2 = createMockServer({
        id: 'server-2',
        name: 'Server Two',
        icon: 'cloud',
        color: 'purple',
      });

      // When
      render(
        <ServerSelector
          servers={[server1, server2]}
          activeServer={server1}
          connectionStatus={new Map()}
          onServerChange={vi.fn()}
          onAddServer={vi.fn()}
          onReconfigureServer={vi.fn()}
          onDeleteServer={vi.fn()}
        />,
      );

      // Öffne Dropdown
      await user.click(screen.getByRole('button', { name: /server one/i }));

      // Then - Beide Server sollten ihre Visual Badges haben
      await waitFor(() => {
        const badges = screen.getAllByRole('img', { name: /Server:/i });
        expect(badges.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should render default badge when server has no icon or color', () => {
      // Given
      const server = createMockServer({
        name: 'Default Style Server',
        icon: undefined,
        color: undefined,
      });

      // When
      render(
        <ServerSelector servers={[server]} activeServer={server} connectionStatus={new Map()} onServerChange={vi.fn()} onAddServer={vi.fn()} onReconfigureServer={vi.fn()} onDeleteServer={vi.fn()} />,
      );

      // Then - Badge sollte auch ohne Icon/Color gerendert werden (Fallback)
      expect(screen.getByRole('img', { name: /Server: Default Style Server/i })).toBeInTheDocument();
    });

    it('should display badge with correct size (sm) in button', () => {
      // Given
      const server = createMockServer({ icon: 'server', color: 'sky' });

      // When
      render(
        <ServerSelector servers={[server]} activeServer={server} connectionStatus={new Map()} onServerChange={vi.fn()} onAddServer={vi.fn()} onReconfigureServer={vi.fn()} onDeleteServer={vi.fn()} />,
      );

      // Then - Badge sollte size-6 Klasse haben (sm = 24px)
      const badge = screen.getByRole('img', { name: /Server:/i });
      expect(badge).toHaveClass('size-6');
    });
  });
});
