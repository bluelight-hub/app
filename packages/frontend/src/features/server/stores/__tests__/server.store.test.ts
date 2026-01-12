import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  serverStore,
  addServer,
  setActiveServer,
  removeServer,
  hydrateServerStore,
  updateConnectionStatus,
  updateServer,
  isServerNameTaken,
  getDefaultServer,
  sortServersByLastUsed,
  updateServerVisuals,
} from '../server.store';
import * as persistence from '../server-persistence';
import type { ServerConfig } from '../../types/server-config';

// Mock Storage Adapter
vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: vi.fn(() => ({
    setItem: vi.fn(),
    getItem: vi.fn(),
  })),
}));

// Mock Persistence Functions
vi.mock('../server-persistence', () => ({
  saveServers: vi.fn(),
  loadServers: vi.fn(),
}));

describe('serverStore', () => {
  beforeEach(() => {
    // Reset Store State vor jedem Test
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('addServer()', () => {
    it('should add server and sync to storage', async () => {
      // Given
      const config = { name: 'Test Server', url: 'https://test.com', isDefault: false, lastUsedAt: null };

      // When
      await addServer(config);

      // Then
      expect(serverStore.state.servers).toHaveLength(1);
      expect(serverStore.state.servers[0].name).toBe('Test Server');
      expect(serverStore.state.servers[0].url).toBe('https://test.com');
      expect(serverStore.state.servers[0].id).toBeDefined();
      expect(serverStore.state.servers[0].createdAt).toBeDefined();
      expect(serverStore.state.servers[0].lastUsedAt).toBeDefined();
      expect(persistence.saveServers).toHaveBeenCalledWith(serverStore.state.servers);
    });

    it('should throw error for invalid URL', async () => {
      // Given - FTP Protokoll ist niemals erlaubt (HTTP ist in Dev-Modus mit VITE_INSECURE_MODE=true erlaubt)
      const config = { name: 'Test', url: 'ftp://test.com', isDefault: false, lastUsedAt: null };

      // When/Then
      await expect(addServer(config)).rejects.toThrow('Invalid server URL');
    });

    it('should throw error for empty name', async () => {
      // Given
      const config = { name: '', url: 'https://test.com', isDefault: false, lastUsedAt: null };

      // When/Then
      await expect(addServer(config)).rejects.toThrow('Server-Name darf nicht leer sein');
    });

    it('should allow localhost for development', async () => {
      // Given
      const config = { name: 'Local Dev', url: 'http://localhost:3091', isDefault: false, lastUsedAt: null };

      // When
      await addServer(config);

      // Then
      expect(serverStore.state.servers).toHaveLength(1);
      expect(serverStore.state.servers[0].url).toBe('http://localhost:3091');
    });

    it('should sanitize XSS script tags from server name (Defense in Depth)', async () => {
      // Given - Malicious name with script tag
      const config = { name: '<script>alert("xss")</script>Test Server', url: 'https://test.com', isDefault: false, lastUsedAt: null };

      // When
      await addServer(config);

      // Then - Script tag should be stripped, only "Test Server" remains
      expect(serverStore.state.servers).toHaveLength(1);
      expect(serverStore.state.servers[0].name).toBe('Test Server');
      expect(serverStore.state.servers[0].name).not.toContain('<script>');
    });

    it('should sanitize XSS img onerror tags from server name', async () => {
      // Given - Malicious name with img onerror
      const config = { name: '<img src="x" onerror="alert(1)">Produktiv', url: 'https://test.com', isDefault: false, lastUsedAt: null };

      // When
      await addServer(config);

      // Then - img tag should be stripped
      expect(serverStore.state.servers[0].name).toBe('Produktiv');
      expect(serverStore.state.servers[0].name).not.toContain('<img');
    });

    it('should limit server name to 100 characters (DoS Prevention)', async () => {
      // Given - Name with 150 characters
      const longName = 'A'.repeat(150);
      const config = { name: longName, url: 'https://test.com', isDefault: false, lastUsedAt: null };

      // When
      await addServer(config);

      // Then - Should be truncated to 100 characters
      expect(serverStore.state.servers[0].name.length).toBe(100);
    });

    it('should throw error when name becomes empty after XSS sanitization', async () => {
      // Given - Name that is only a script tag (empty after sanitization)
      const config = { name: '<script>alert("xss")</script>', url: 'https://test.com', isDefault: false, lastUsedAt: null };

      // When/Then
      await expect(addServer(config)).rejects.toThrow('Server-Name darf nicht leer sein');
    });
  });

  describe('setActiveServer()', () => {
    it('should set active server and update isDefault', async () => {
      // Given
      const server1: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };
      const server2: ServerConfig = {
        id: '2',
        name: 'Server 2',
        url: 'https://server2.com',
        isDefault: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
        activeServerId: '1',
      }));

      // When
      await setActiveServer('2');

      // Then
      expect(serverStore.state.activeServerId).toBe('2');
      expect(serverStore.state.servers[0].isDefault).toBe(false); // Server 1
      expect(serverStore.state.servers[1].isDefault).toBe(true); // Server 2
      expect(persistence.saveServers).toHaveBeenCalledWith(serverStore.state.servers);
    });

    it('should throw error for non-existent server ID', async () => {
      // Given
      const server: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
      }));

      // When/Then
      await expect(setActiveServer('non-existent-id')).rejects.toThrow('Server with id "non-existent-id" does not exist');
    });

    it('should update lastUsedAt timestamp', async () => {
      // Use fake timers for deterministic timing
      vi.useFakeTimers();
      const initialTime = new Date('2025-01-08T11:00:00.000Z');
      vi.setSystemTime(initialTime);

      // Given: Server with old timestamp
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      const server: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: oldTimestamp,
        lastUsedAt: oldTimestamp,
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When: Advance time and set active
      const newTime = new Date('2025-01-08T12:01:00.000Z');
      vi.setSystemTime(newTime);
      await setActiveServer('1');

      // Then: Timestamp should match exact new time
      const updatedServer = serverStore.state.servers[0];
      expect(updatedServer.lastUsedAt).toBe(newTime.toISOString());

      // Cleanup
      vi.useRealTimers();
    });
  });

  describe('removeServer()', () => {
    it('should remove server and sync to storage', async () => {
      // Given
      const server: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await removeServer('1');

      // Then
      expect(serverStore.state.servers).toHaveLength(0);
      expect(serverStore.state.activeServerId).toBeNull();
      expect(persistence.saveServers).toHaveBeenCalledWith([]);
    });

    it('should fallback to first server when active server is deleted', async () => {
      // Given
      const server1: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };
      const server2: ServerConfig = {
        id: '2',
        name: 'Server 2',
        url: 'https://server2.com',
        isDefault: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
        activeServerId: '1',
      }));

      // When
      await removeServer('1');

      // Then
      expect(serverStore.state.servers).toHaveLength(1);
      expect(serverStore.state.activeServerId).toBe('2');
      expect(serverStore.state.servers[0].isDefault).toBe(true); // Server 2 is now default
    });

    it('should set activeServerId to null when last server is deleted', async () => {
      // Given
      const server: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await removeServer('1');

      // Then
      expect(serverStore.state.servers).toHaveLength(0);
      expect(serverStore.state.activeServerId).toBeNull();
    });
  });

  describe('hydrateServerStore()', () => {
    it('should load servers from storage and set default server active', async () => {
      // Given - Server 2 hat neueren lastUsedAt, wird also als Default ausgewählt
      // (Story 3.5: Last-Used Priorität für Default-Server)
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Server 1',
          url: 'https://server1.com',
          isDefault: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          lastUsedAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'Server 2',
          url: 'https://server2.com',
          isDefault: true,
          createdAt: '2025-01-01T00:00:00.000Z',
          lastUsedAt: '2025-01-10T00:00:00.000Z', // Neuerer lastUsedAt
        },
      ];

      vi.mocked(persistence.loadServers).mockResolvedValue(servers);

      // When
      await hydrateServerStore();

      // Then
      expect(serverStore.state.servers).toEqual(servers);
      expect(serverStore.state.activeServerId).toBe('2');
      expect(serverStore.state.isHydrated).toBe(true);
    });

    it('should skip hydration if already hydrated (race condition protection)', async () => {
      // Given
      serverStore.setState((state) => ({
        ...state,
        isHydrated: true,
      }));

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // When
      await hydrateServerStore();

      // Then
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ServerStore] Already hydrated, skipping...');
      expect(persistence.loadServers).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty storage gracefully', async () => {
      // Given
      vi.mocked(persistence.loadServers).mockResolvedValue([]);

      // When
      await hydrateServerStore();

      // Then
      expect(serverStore.state.servers).toEqual([]);
      expect(serverStore.state.activeServerId).toBeNull();
      expect(serverStore.state.isHydrated).toBe(true);
    });

    it('should propagate storage errors to caller', async () => {
      // Given - Storage-Fehler simulieren
      vi.mocked(persistence.loadServers).mockRejectedValue(new Error('Storage error'));

      // When/Then - Fehler wird propagiert (nicht intern abgefangen)
      await expect(hydrateServerStore()).rejects.toThrow('Storage error');

      // State bleibt unverändert
      expect(serverStore.state.servers).toEqual([]);
      expect(serverStore.state.isHydrated).toBe(false);
    });
  });

  describe('updateConnectionStatus()', () => {
    it('should update connection status synchronously', () => {
      // Given
      const server: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
      }));

      // When
      updateConnectionStatus('1', 'checking');

      // Then
      expect(serverStore.state.connectionStatus.get('1')).toBe('checking');

      // When
      updateConnectionStatus('1', 'connected');

      // Then
      expect(serverStore.state.connectionStatus.get('1')).toBe('connected');
    });

    it('should not persist to storage (in-memory only)', () => {
      // Given
      const server: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server],
      }));

      // When
      updateConnectionStatus('1', 'connected');

      // Then
      expect(persistence.saveServers).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // Story 3.3: updateServer() Tests
  // =====================================================
  describe('updateServer()', () => {
    const createMockServer = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
      accessToken: 'original-token',
      ...overrides,
    });

    it('should update server name and sync to storage', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServer('1', { name: 'Neuer Name' });

      // Then
      expect(serverStore.state.servers[0].name).toBe('Neuer Name');
      expect(persistence.saveServers).toHaveBeenCalledWith(serverStore.state.servers);
    });

    it('should update server URL and sync to storage', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServer('1', { url: 'https://new-api.example.com' });

      // Then
      expect(serverStore.state.servers[0].url).toBe('https://new-api.example.com');
      expect(persistence.saveServers).toHaveBeenCalledWith(serverStore.state.servers);
    });

    it('should allow same name for same server (no duplicate error)', async () => {
      // Given - Server 1 hat bereits Name "Server 1"
      const server = createMockServer({ name: 'Server 1' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Gleicher Name wie vorher
      await updateServer('1', { name: 'Server 1' });

      // Then - Kein Fehler, Name bleibt gleich
      expect(serverStore.state.servers[0].name).toBe('Server 1');
    });

    it('should throw error for duplicate name from other server', async () => {
      // Given - Zwei Server mit unterschiedlichen Namen
      const server1 = createMockServer({ id: '1', name: 'Server 1' });
      const server2 = createMockServer({ id: '2', name: 'Server 2' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
        activeServerId: '1',
      }));

      // When/Then - Versuche Server 1 auf "Server 2" umzubenennen
      await expect(updateServer('1', { name: 'Server 2' })).rejects.toThrow('existiert bereits');
    });

    it('should preserve token when not provided in updates', async () => {
      // Given
      const server = createMockServer({ accessToken: 'secret-token-123' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Nur Name ändern, Token nicht angeben
      await updateServer('1', { name: 'Neuer Name' });

      // Then - Token bleibt erhalten
      expect(serverStore.state.servers[0].accessToken).toBe('secret-token-123');
      expect(serverStore.state.servers[0].name).toBe('Neuer Name');
    });

    it('should throw error for invalid URL', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When/Then - FTP Protokoll ist niemals erlaubt (HTTP ist in Dev-Modus mit VITE_INSECURE_MODE=true erlaubt)
      await expect(updateServer('1', { url: 'ftp://insecure.com' })).rejects.toThrow('Invalid server URL');
    });

    it('should throw error for non-existent server', async () => {
      // Given - Kein Server im Store
      serverStore.setState((state) => ({
        ...state,
        servers: [],
      }));

      // When/Then
      await expect(updateServer('non-existent-id', { name: 'Test' })).rejects.toThrow('does not exist');
    });

    it('should throw error for empty name', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When/Then
      await expect(updateServer('1', { name: '' })).rejects.toThrow('Server-Name darf nicht leer sein');
    });

    it('should update both name and URL simultaneously', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServer('1', { name: 'Produktiv-Server', url: 'https://prod.api.com' });

      // Then
      expect(serverStore.state.servers[0].name).toBe('Produktiv-Server');
      expect(serverStore.state.servers[0].url).toBe('https://prod.api.com');
      expect(serverStore.state.servers[0].accessToken).toBe('original-token'); // Token erhalten
    });

    it('should sanitize XSS script tags when updating server name (Defense in Depth)', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Update mit XSS-Inhalt
      await updateServer('1', { name: '<script>alert("xss")</script>Produktiv' });

      // Then - Script tag sollte entfernt werden
      expect(serverStore.state.servers[0].name).toBe('Produktiv');
      expect(serverStore.state.servers[0].name).not.toContain('<script>');
    });

    it('should limit updated server name to 100 characters', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Update mit 150 Zeichen
      const longName = 'B'.repeat(150);
      await updateServer('1', { name: longName });

      // Then - Sollte auf 100 Zeichen gekürzt werden
      expect(serverStore.state.servers[0].name.length).toBe(100);
    });
  });

  // =====================================================
  // Story 3.5: sortServersByLastUsed() Tests (Performance-optimiert)
  // =====================================================
  describe('sortServersByLastUsed()', () => {
    it('should return empty array for empty input', () => {
      // Given
      const servers: ServerConfig[] = [];

      // When
      const result = sortServersByLastUsed(servers);

      // Then
      expect(result).toEqual([]);
    });

    it('should return copy of single server array', () => {
      // Given
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Only Server',
          url: 'https://only.example.com',
          isDefault: true,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
      ];

      // When
      const result = sortServersByLastUsed(servers);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      // Should be a new array (immutable)
      expect(result).not.toBe(servers);
    });

    it('should sort servers by lastUsedAt descending (most recent first)', () => {
      // Given
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Old Server',
          url: 'https://old.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Recent Server',
          url: 'https://recent.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '3',
          name: 'Middle Server',
          url: 'https://middle.example.com',
          isDefault: false,
          createdAt: '2025-12-10T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
      ];

      // When
      const result = sortServersByLastUsed(servers);

      // Then - Sorted by lastUsedAt DESC
      expect(result[0].id).toBe('2'); // 2026-01-10
      expect(result[1].id).toBe('3'); // 2026-01-05
      expect(result[2].id).toBe('1'); // 2026-01-01
    });

    it('should place servers with lastUsedAt before servers without', () => {
      // Given
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'No Usage',
          url: 'https://nousage.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '2',
          name: 'Used Server',
          url: 'https://used.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
      ];

      // When
      const result = sortServersByLastUsed(servers);

      // Then - Server with lastUsedAt comes first
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
    });

    it('should sort servers without lastUsedAt by createdAt ascending (oldest first)', () => {
      // Given
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Newer Created',
          url: 'https://newer.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '2',
          name: 'Oldest Created',
          url: 'https://oldest.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '3',
          name: 'Middle Created',
          url: 'https://middle.example.com',
          isDefault: false,
          createdAt: '2025-12-10T00:00:00Z',
          lastUsedAt: null,
        },
      ];

      // When
      const result = sortServersByLastUsed(servers);

      // Then - Sorted by createdAt ASC (oldest first)
      expect(result[0].id).toBe('2'); // 2025-12-01
      expect(result[1].id).toBe('3'); // 2025-12-10
      expect(result[2].id).toBe('1'); // 2025-12-15
    });

    it('should handle mixed servers (with and without lastUsedAt) correctly', () => {
      // Given
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'No Usage 1',
          url: 'https://nousage1.example.com',
          isDefault: false,
          createdAt: '2025-11-01T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '2',
          name: 'Middle Usage',
          url: 'https://middle.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
        {
          id: '3',
          name: 'Latest Usage',
          url: 'https://latest.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '4',
          name: 'No Usage 2',
          url: 'https://nousage2.example.com',
          isDefault: false,
          createdAt: '2025-12-20T00:00:00Z',
          lastUsedAt: null,
        },
      ];

      // When
      const result = sortServersByLastUsed(servers);

      // Then - Servers with lastUsedAt first (sorted DESC), then without (sorted by createdAt ASC)
      expect(result[0].id).toBe('3'); // Latest lastUsedAt: 2026-01-10
      expect(result[1].id).toBe('2'); // Middle lastUsedAt: 2026-01-05
      expect(result[2].id).toBe('1'); // No lastUsedAt, oldest createdAt: 2025-11-01
      expect(result[3].id).toBe('4'); // No lastUsedAt, newer createdAt: 2025-12-20
    });

    it('should not modify original array (immutability)', () => {
      // Given
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Server A',
          url: 'https://a.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Server B',
          url: 'https://b.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z',
        },
      ];

      const originalOrder = servers.map((s) => s.id);

      // When
      sortServersByLastUsed(servers);

      // Then - Original array unchanged
      expect(servers.map((s) => s.id)).toEqual(originalOrder);
    });
  });

  // =====================================================
  // Story 3.5: getDefaultServer() Tests
  // =====================================================
  describe('getDefaultServer()', () => {
    // getDefaultServer nutzt intern sortServersByLastUsed für konsistente Sortierung

    it('should return server with most recent lastUsedAt', () => {
      // Given - Zwei Server mit unterschiedlichen lastUsedAt Timestamps
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Old Server',
          url: 'https://old.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Recent Server',
          url: 'https://recent.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z',
        },
      ];

      // When
      const result = getDefaultServer(servers);

      // Then - Server mit neuestem lastUsedAt wird zurückgegeben
      expect(result?.id).toBe('2');
    });

    it('should fallback to first created server when all lastUsedAt are null', () => {
      // Given - Zwei Server ohne lastUsedAt, unterschiedliche createdAt
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Newer Created',
          url: 'https://newer.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '2',
          name: 'Older Created',
          url: 'https://older.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: null,
        },
      ];

      // When
      const result = getDefaultServer(servers);

      // Then - Ältester Server (nach createdAt) wird zurückgegeben
      expect(result?.id).toBe('2');
    });

    it('should return null for empty array', () => {
      // Given - Leeres Array
      const servers: ServerConfig[] = [];

      // When
      const result = getDefaultServer(servers);

      // Then
      expect(result).toBeNull();
    });

    it('should prefer server with lastUsedAt over server without', () => {
      // Given - Ein Server mit lastUsedAt, einer ohne
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'No Usage',
          url: 'https://nousage.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '2',
          name: 'Used Server',
          url: 'https://used.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
      ];

      // When
      const result = getDefaultServer(servers);

      // Then - Server mit lastUsedAt wird bevorzugt
      expect(result?.id).toBe('2');
    });

    it('should handle servers with same lastUsedAt by returning first after sort', () => {
      // Given - Zwei Server mit gleichem lastUsedAt
      const sameTimestamp = '2026-01-10T00:00:00Z';
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Server A',
          url: 'https://a.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: sameTimestamp,
        },
        {
          id: '2',
          name: 'Server B',
          url: 'https://b.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: sameTimestamp,
        },
      ];

      // When
      const result = getDefaultServer(servers);

      // Then - Bei gleichem lastUsedAt ist die Reihenfolge stabil (erster in der Liste)
      expect(result).not.toBeNull();
      expect(result?.lastUsedAt).toBe(sameTimestamp);
    });

    it('should handle single server correctly', () => {
      // Given - Nur ein Server
      const servers: ServerConfig[] = [
        {
          id: 'only',
          name: 'Only Server',
          url: 'https://only.example.com',
          isDefault: true,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
      ];

      // When
      const result = getDefaultServer(servers);

      // Then
      expect(result?.id).toBe('only');
    });

    it('should correctly sort multiple servers with mixed lastUsedAt', () => {
      // Given - Mehrere Server mit gemischten lastUsedAt Werten
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'No Usage 1',
          url: 'https://nousage1.example.com',
          isDefault: false,
          createdAt: '2025-11-01T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '2',
          name: 'Middle Usage',
          url: 'https://middle.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
        {
          id: '3',
          name: 'Latest Usage',
          url: 'https://latest.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '4',
          name: 'No Usage 2',
          url: 'https://nousage2.example.com',
          isDefault: false,
          createdAt: '2025-12-20T00:00:00Z',
          lastUsedAt: null,
        },
      ];

      // When
      const result = getDefaultServer(servers);

      // Then - Server mit neuestem lastUsedAt wird zurückgegeben
      expect(result?.id).toBe('3');
    });
  });

  // =====================================================
  // Story 3.5: hydrateServerStore() with Last-Used Logic
  // =====================================================
  describe('hydrateServerStore() with Last-Used Logic', () => {
    it('should select server with most recent lastUsedAt as active', async () => {
      // Given - Drei Server mit unterschiedlichen lastUsedAt
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Old Server',
          url: 'https://old.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Recent Server',
          url: 'https://recent.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z', // Neuester
        },
        {
          id: '3',
          name: 'Middle Server',
          url: 'https://middle.example.com',
          isDefault: false,
          createdAt: '2025-12-10T00:00:00Z',
          lastUsedAt: '2026-01-05T00:00:00Z',
        },
      ];

      vi.mocked(persistence.loadServers).mockResolvedValue(servers);

      // When
      await hydrateServerStore();

      // Then - Server mit neuestem lastUsedAt wird aktiv
      expect(serverStore.state.activeServerId).toBe('2');
    });

    it('should select oldest created server when all lastUsedAt are undefined', async () => {
      // Given - Server ohne lastUsedAt
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Newer Server',
          url: 'https://newer.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: null,
        },
        {
          id: '2',
          name: 'Oldest Server',
          url: 'https://oldest.example.com',
          isDefault: false,
          createdAt: '2025-12-01T00:00:00Z', // Ältester
          lastUsedAt: null,
        },
      ];

      vi.mocked(persistence.loadServers).mockResolvedValue(servers);

      // When
      await hydrateServerStore();

      // Then - Ältester Server (nach createdAt) wird aktiv
      expect(serverStore.state.activeServerId).toBe('2');
    });

    it('should prefer server with lastUsedAt over isDefault flag', async () => {
      // Given - Server mit isDefault aber älterer lastUsedAt
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Default Server',
          url: 'https://default.example.com',
          isDefault: true, // Hat isDefault Flag
          createdAt: '2025-12-01T00:00:00Z',
          lastUsedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Recent Server',
          url: 'https://recent.example.com',
          isDefault: false,
          createdAt: '2025-12-15T00:00:00Z',
          lastUsedAt: '2026-01-10T00:00:00Z', // Neuerer lastUsedAt
        },
      ];

      vi.mocked(persistence.loadServers).mockResolvedValue(servers);

      // When
      await hydrateServerStore();

      // Then - lastUsedAt hat Vorrang über isDefault
      expect(serverStore.state.activeServerId).toBe('2');
    });
  });

  // =====================================================
  // Story 3.3: isServerNameTaken() with excludeServerId
  // =====================================================
  describe('isServerNameTaken() with excludeServerId', () => {
    it('should return true when name exists in another server', () => {
      // Given
      const server1: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };
      const server2: ServerConfig = {
        id: '2',
        name: 'Server 2',
        url: 'https://server2.com',
        isDefault: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
      }));

      // When/Then - Prüfe "Server 2" ausgenommen Server 1 (sollte true sein)
      expect(isServerNameTaken('Server 2', '1')).toBe(true);
    });

    it('should return false when name exists only in excluded server', () => {
      // Given
      const server1: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server1],
      }));

      // When/Then - Prüfe "Server 1" ausgenommen Server 1 (sollte false sein)
      expect(isServerNameTaken('Server 1', '1')).toBe(false);
    });

    it('should be case-insensitive with excludeServerId', () => {
      // Given
      const server1: ServerConfig = {
        id: '1',
        name: 'Server 1',
        url: 'https://server1.com',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };
      const server2: ServerConfig = {
        id: '2',
        name: 'Production',
        url: 'https://server2.com',
        isDefault: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUsedAt: '2025-01-01T00:00:00.000Z',
      };

      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
      }));

      // When/Then - Case-insensitive, excluded ist Server 1
      expect(isServerNameTaken('PRODUCTION', '1')).toBe(true);
      expect(isServerNameTaken('production', '1')).toBe(true);
    });
  });

  // =====================================================
  // Story 3.6: updateServerVisuals() Tests
  // =====================================================
  describe('updateServerVisuals()', () => {
    const createMockServer = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
      id: '1',
      name: 'Server 1',
      url: 'https://server1.com',
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUsedAt: '2025-01-01T00:00:00.000Z',
      ...overrides,
    });

    // =====================================================
    // Basic Icon Update Tests
    // =====================================================
    it('should update server icon and sync to storage', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServerVisuals('1', { icon: 'star' });

      // Then
      expect(serverStore.state.servers[0].icon).toBe('star');
      expect(persistence.saveServers).toHaveBeenCalledWith(serverStore.state.servers);
    });

    it('should update server color and sync to storage', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServerVisuals('1', { color: 'rose' });

      // Then
      expect(serverStore.state.servers[0].color).toBe('rose');
      expect(persistence.saveServers).toHaveBeenCalledWith(serverStore.state.servers);
    });

    it('should update both icon and color simultaneously', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServerVisuals('1', { icon: 'shield', color: 'sky' });

      // Then
      expect(serverStore.state.servers[0].icon).toBe('shield');
      expect(serverStore.state.servers[0].color).toBe('sky');
      expect(persistence.saveServers).toHaveBeenCalledWith(serverStore.state.servers);
    });

    // =====================================================
    // Server Not Found Tests
    // =====================================================
    it('should throw error for non-existent server ID', async () => {
      // Given - Kein Server im Store
      serverStore.setState((state) => ({
        ...state,
        servers: [],
      }));

      // When/Then
      await expect(updateServerVisuals('non-existent-id', { icon: 'star' })).rejects.toThrow('Server with id "non-existent-id" does not exist');
    });

    it('should throw error when server list is empty', async () => {
      // Given
      serverStore.setState((state) => ({
        ...state,
        servers: [],
        activeServerId: null,
      }));

      // When/Then
      await expect(updateServerVisuals('any-id', { color: '#000000' })).rejects.toThrow('Server with id "any-id" does not exist');
    });

    // =====================================================
    // Preserve Existing Data Tests
    // =====================================================
    it('should preserve existing server data when updating icon', async () => {
      // Given
      const server = createMockServer({
        name: 'Produktiv-Server',
        url: 'https://prod.example.com',
        accessToken: 'secret-token',
      });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServerVisuals('1', { icon: 'server' });

      // Then - Alle anderen Felder bleiben erhalten
      const updatedServer = serverStore.state.servers[0];
      expect(updatedServer.name).toBe('Produktiv-Server');
      expect(updatedServer.url).toBe('https://prod.example.com');
      expect(updatedServer.accessToken).toBe('secret-token');
      expect(updatedServer.icon).toBe('server');
    });

    it('should preserve existing icon when only updating color', async () => {
      // Given - Nutze gültigen ServerIconValue
      const server = createMockServer({ icon: 'building' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Nutze gültigen ServerColorValue
      await updateServerVisuals('1', { color: 'emerald' });

      // Then
      expect(serverStore.state.servers[0].icon).toBe('building');
      expect(serverStore.state.servers[0].color).toBe('emerald');
    });

    it('should preserve existing color when only updating icon', async () => {
      // Given - Nutze gültigen ServerColorValue
      const server = createMockServer({ color: 'rose' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Nutze gültigen ServerIconValue
      await updateServerVisuals('1', { icon: 'shield' });

      // Then
      expect(serverStore.state.servers[0].icon).toBe('shield');
      expect(serverStore.state.servers[0].color).toBe('rose');
    });

    // =====================================================
    // Edge Cases Tests
    // =====================================================
    it('should handle empty visuals update (no-op)', async () => {
      // Given - Nutze gültige ServerIconValue/ServerColorValue
      const server = createMockServer({ icon: 'star', color: 'violet' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Leeres Update-Objekt
      await updateServerVisuals('1', {});

      // Then - Keine Änderung, saveServers wird NICHT aufgerufen (M6 Fix: Early Return)
      expect(serverStore.state.servers[0].icon).toBe('star');
      expect(serverStore.state.servers[0].color).toBe('violet');
      expect(persistence.saveServers).not.toHaveBeenCalled();
    });

    it('should allow clearing icon by setting undefined', async () => {
      // Given - Nutze gültigen ServerIconValue
      const server = createMockServer({ icon: 'home' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServerVisuals('1', { icon: undefined });

      // Then
      expect(serverStore.state.servers[0].icon).toBeUndefined();
    });

    it('should allow clearing color by setting undefined', async () => {
      // Given - Nutze gültigen ServerColorValue
      const server = createMockServer({ color: 'cyan' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When
      await updateServerVisuals('1', { color: undefined });

      // Then
      expect(serverStore.state.servers[0].color).toBeUndefined();
    });

    // =====================================================
    // Multiple Servers Tests
    // =====================================================
    it('should update only the targeted server in multi-server environment', async () => {
      // Given - Nutze gültige ServerIconValue/ServerColorValue
      const server1 = createMockServer({ id: '1', name: 'Server 1', icon: 'building', color: 'sky' });
      const server2 = createMockServer({ id: '2', name: 'Server 2', icon: 'shield', color: 'emerald' });
      const server3 = createMockServer({ id: '3', name: 'Server 3', icon: 'star', color: 'amber' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2, server3],
        activeServerId: '1',
      }));

      // When - Nutze gültige ServerIconValue/ServerColorValue
      await updateServerVisuals('2', { icon: 'pin', color: 'rose' });

      // Then - Nur Server 2 wurde aktualisiert
      expect(serverStore.state.servers[0].icon).toBe('building');
      expect(serverStore.state.servers[0].color).toBe('sky');
      expect(serverStore.state.servers[1].icon).toBe('pin');
      expect(serverStore.state.servers[1].color).toBe('rose');
      expect(serverStore.state.servers[2].icon).toBe('star');
      expect(serverStore.state.servers[2].color).toBe('amber');
    });

    it('should work on inactive server', async () => {
      // Given
      const server1 = createMockServer({ id: '1', name: 'Active Server' });
      const server2 = createMockServer({ id: '2', name: 'Inactive Server' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server1, server2],
        activeServerId: '1', // Server 1 ist aktiv
      }));

      // When - Nutze gültige ServerIconValue/ServerColorValue
      await updateServerVisuals('2', { icon: 'academic', color: 'fuchsia' });

      // Then
      expect(serverStore.state.servers[1].icon).toBe('academic');
      expect(serverStore.state.servers[1].color).toBe('fuchsia');
    });

    // =====================================================
    // Persistence Tests
    // =====================================================
    it('should call saveServers with updated servers array', async () => {
      // Given
      const server = createMockServer();
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Nutze gültigen ServerIconValue
      await updateServerVisuals('1', { icon: 'server' });

      // Then
      expect(persistence.saveServers).toHaveBeenCalledTimes(1);
      expect(persistence.saveServers).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            icon: 'server',
          }),
        ]),
      );
    });

    it('should persist visuals to storage for later hydration', async () => {
      // Given - Server mit Icon und Color (gültige Values)
      const server = createMockServer({ icon: 'building', color: 'sky' });
      serverStore.setState((state) => ({
        ...state,
        servers: [server],
        activeServerId: '1',
      }));

      // When - Update visuals mit gültigen Values
      await updateServerVisuals('1', { icon: 'heart', color: 'orange' });

      // Then - Persistence function wurde mit korrekten Daten aufgerufen
      const savedServers = vi.mocked(persistence.saveServers).mock.calls[0][0];
      expect(savedServers[0].icon).toBe('heart');
      expect(savedServers[0].color).toBe('orange');
    });
  });

  // =====================================================
  // Story 3.6: ServerConfig with icon/color (Integration Tests)
  // =====================================================
  describe('ServerConfig icon/color integration', () => {
    it('should support icon and color in addServer', async () => {
      // Given - Nutze gültige ServerIconValue/ServerColorValue
      const config = {
        name: 'New Server',
        url: 'https://new.example.com',
        isDefault: false,
        lastUsedAt: null,
        icon: 'shield' as const,
        color: 'violet' as const,
      };

      // When
      await addServer(config);

      // Then
      expect(serverStore.state.servers[0].icon).toBe('shield');
      expect(serverStore.state.servers[0].color).toBe('violet');
    });

    it('should support icon and color in hydration', async () => {
      // Given - Servers mit Icon/Color im Storage (gültige Values)
      const servers: ServerConfig[] = [
        {
          id: '1',
          name: 'Visual Server',
          url: 'https://visual.example.com',
          isDefault: true,
          createdAt: '2025-01-01T00:00:00.000Z',
          lastUsedAt: '2025-01-01T00:00:00.000Z',
          icon: 'building',
          color: 'slate',
        },
      ];

      vi.mocked(persistence.loadServers).mockResolvedValue(servers);

      // When
      await hydrateServerStore();

      // Then
      expect(serverStore.state.servers[0].icon).toBe('building');
      expect(serverStore.state.servers[0].color).toBe('slate');
    });
  });
});
