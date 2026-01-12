/**
 * Tests für LoginWindow Organism
 *
 * Testet das Conditional Rendering basierend auf der Anzahl konfigurierter Server.
 *
 * **ACs getestet:**
 * - AC1: Dropdown bei mehreren Servern (servers.length > 1)
 * - AC2: Kein Dropdown bei einem Server (servers.length === 1) - statischer Text
 * - AC3: Redirect bei keinem Server (servers.length === 0)
 *
 * @module features/auth/ui/organisms/__tests__/LoginWindow
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Store-Mock muss VOR dem Import der Komponente definiert werden
const mockConnectionStatus = new Map<string, string>();

// Mock @tanstack/react-store mit Store-Klasse
vi.mock('@tanstack/react-store', () => ({
  Store: vi.fn().mockImplementation(() => ({
    state: {},
    subscribe: vi.fn(),
    setState: vi.fn(),
  })),
  useStore: vi.fn(() => mockConnectionStatus),
}));

// Mock alle Hooks
vi.mock('@/features/auth', () => ({
  AUTH_KEYS: { auth: { queries: { authCheck: ['auth', 'check'] } } },
  useCurrentUser: vi.fn(() => ({ user: null, isLoading: false })),
  useUnifiedAuth: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useLogout: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false })),
}));

vi.mock('@/features/server/hooks', () => ({
  useRequireServer: vi.fn(),
  useServerList: vi.fn(),
  useActiveServer: vi.fn(),
  useServerListHealth: vi.fn(),
}));

vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: { state: { connectionStatus: new Map(), servers: [], isHydrated: true } },
  setActiveServer: vi.fn().mockResolvedValue(undefined),
  removeServer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/einsatz/stores/active-einsatz.store', () => ({
  einsatzStore: { state: {} },
}));

vi.mock('@/features/einsatz/api/use-einsatz-detail', () => ({
  useEinsatzDetail: () => ({ data: null, isLoading: false }),
}));

// Mock shared lib
vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock für QueryClient - wird in Tests überschrieben
const mockInvalidateQueriesGlobal = vi.fn().mockResolvedValue(undefined);
const mockRefetchQueriesGlobal = vi.fn().mockResolvedValue(undefined);

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: mockInvalidateQueriesGlobal,
    refetchQueries: mockRefetchQueriesGlobal,
  })),
}));

vi.mock('@/features/system', () => ({
  getIndicatorStatus: () => 'connected',
  STATUS_DOT_COLORS: { connected: 'green' },
  STATUS_LABELS: { connected: 'Verbunden' },
  useSystemHealth: () => ({
    connectionMode: 'online',
    isLoading: false,
    isError: false,
    insecureMode: false,
  }),
  useSystemVersion: () => ({
    frontendVersion: '1.0.0',
    mismatchSeverity: null,
  }),
}));

// Capture for onServerChange and onLogoutAndSwitch handlers
let capturedOnServerChange: ((serverId: string) => void) | null = null;
let capturedOnLogoutAndSwitch: ((serverId: string) => Promise<void>) | null = null;
let capturedIsAuthenticated: boolean | undefined;

// Mock Server Molecules
vi.mock('@/features/server/ui/molecules', () => ({
  ServerSelector: ({
    servers,
    onServerChange,
    onLogoutAndSwitch,
    isAuthenticated,
  }: {
    servers: unknown[];
    onServerChange: (serverId: string) => void;
    onLogoutAndSwitch?: (serverId: string) => Promise<void>;
    isAuthenticated?: boolean;
  }) => {
    capturedOnServerChange = onServerChange;
    capturedOnLogoutAndSwitch = onLogoutAndSwitch ?? null;
    capturedIsAuthenticated = isAuthenticated;
    return (
      <div data-testid="server-selector">
        <span>ServerSelector ({servers.length} servers)</span>
        <button type="button" data-testid="switch-server-btn" onClick={() => onServerChange('server-2')}>
          Switch to Server 2
        </button>
        {onLogoutAndSwitch && (
          <button type="button" data-testid="logout-and-switch-btn" onClick={() => onLogoutAndSwitch('server-2')}>
            Logout and Switch to Server 2
          </button>
        )}
      </div>
    );
  },
  ServerNameDisplay: ({ server }: { server: { name: string } }) => <div data-testid="server-name-display">{server.name}</div>,
}));

// Mock shared components
vi.mock('@/shared/ui/atoms/heading.atom', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/shared/ui/atoms/spinner.atom', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

vi.mock('@/shared/ui/atoms/text.atom', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/shared/ui/molecules/auth-card.molecule', () => ({
  AuthCard: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-card">{children}</div>,
}));

vi.mock('@/shared/ui/molecules/auth-footer.molecule', () => ({
  AuthFooter: () => <footer data-testid="auth-footer">Footer</footer>,
}));

vi.mock('@/shared/ui/molecules/logo-with-indicator.molecule', () => ({
  LogoWithIndicator: () => <div data-testid="logo">Logo</div>,
}));

vi.mock('@/shared/ui/molecules/dialog.molecule', () => ({
  Dialog: { Confirm: () => null },
}));

vi.mock('@/shared/ui/templates/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-layout">{children}</div>,
}));

vi.mock('@/features/auth/ui/organisms/UnifiedAuthForm', () => ({
  UnifiedAuthForm: () => <form data-testid="unified-auth-form">Login Form</form>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Import Component AFTER all mocks
import { LoginWindow } from '../LoginWindow';

// Import mocks to control
import { useRequireServer, useServerList, useActiveServer } from '@/features/server/hooks';
import { setActiveServer } from '@/features/server/stores/server.store';
import { useLogout, useCurrentUser } from '@/features/auth';
import { toast } from 'sonner';
import type { ServerConfig } from '@/features/server/types/server-config';

const mockUseRequireServer = vi.mocked(useRequireServer);
const mockUseServerList = vi.mocked(useServerList);
const mockUseActiveServer = vi.mocked(useActiveServer);
const mockSetActiveServer = vi.mocked(setActiveServer);
const mockUseLogout = vi.mocked(useLogout);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

/**
 * Factory für Mock-Server
 */
const createMockServer = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
  id: 'server-1',
  name: 'Test Server',
  url: 'https://test.example.com',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: '2026-01-10T00:00:00Z',
  ...overrides,
});

describe('LoginWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default Mocks: Server vorhanden, hydriert
    mockUseRequireServer.mockReturnValue({
      isLoading: false,
      hasServer: true,
      serverCount: 1,
    });
    mockUseServerList.mockReturnValue([createMockServer()]);
    mockUseActiveServer.mockReturnValue(createMockServer());
  });

  // =====================================================
  // AC3: Redirect/Loading bei keinem Server (0 Server)
  // =====================================================

  describe('Zero Servers (AC3)', () => {
    it('should show spinner when serverLoading is true', () => {
      // Given
      mockUseRequireServer.mockReturnValue({
        isLoading: true,
        hasServer: false,
        serverCount: 0,
      });
      mockUseServerList.mockReturnValue([]);
      mockUseActiveServer.mockReturnValue(null);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('auth-card')).not.toBeInTheDocument();
    });

    it('should show spinner when no server and hydrated (redirect pending)', () => {
      // Given
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: false,
        serverCount: 0,
      });
      mockUseServerList.mockReturnValue([]);
      mockUseActiveServer.mockReturnValue(null);

      // When
      render(<LoginWindow />);

      // Then - Spinner zeigt an, während useRequireServer redirected
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('auth-card')).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // AC2: Statischer Server-Text bei genau 1 Server
  // =====================================================

  // AC2 Update: Dropdown wird IMMER angezeigt (auch bei 1 Server) für konsistente UX
  // UX-Entscheidung: Option C - User kann so immer weitere Server hinzufügen
  describe('Single Server (Updated AC2 - Dropdown IMMER)', () => {
    it('should show ServerSelector dropdown even when exactly one server is configured', () => {
      // Given
      const singleServer = createMockServer({ id: 'single', name: 'Mein Einziger Server' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 1,
      });
      mockUseServerList.mockReturnValue([singleServer]);
      mockUseActiveServer.mockReturnValue(singleServer);

      // When
      render(<LoginWindow />);

      // Then - ServerSelector wird IMMER angezeigt für konsistente UX
      expect(screen.getByTestId('server-selector')).toBeInTheDocument();
      // ServerNameDisplay wird NICHT mehr verwendet
      expect(screen.queryByTestId('server-name-display')).not.toBeInTheDocument();
    });

    it('should show dropdown with single server for consistent navigation', () => {
      // Given
      const singleServer = createMockServer();
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 1,
      });
      mockUseServerList.mockReturnValue([singleServer]);
      mockUseActiveServer.mockReturnValue(singleServer);

      // When
      render(<LoginWindow />);

      // Then - Dropdown ist vorhanden damit User weitere Server hinzufügen kann
      expect(screen.getByTestId('server-selector')).toBeInTheDocument();
    });

    it('should show login form with single server', () => {
      // Given
      const singleServer = createMockServer();
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 1,
      });
      mockUseServerList.mockReturnValue([singleServer]);
      mockUseActiveServer.mockReturnValue(singleServer);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.getByTestId('unified-auth-form')).toBeInTheDocument();
    });
  });

  // =====================================================
  // AC1: Dropdown bei mehreren Servern (2+)
  // =====================================================

  describe('Multiple Servers (AC1)', () => {
    it('should show ServerSelector dropdown when multiple servers are configured', () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.getByTestId('server-selector')).toBeInTheDocument();
      expect(screen.queryByTestId('server-name-display')).not.toBeInTheDocument();
    });

    it('should NOT show static text when multiple servers', () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.queryByTestId('server-name-display')).not.toBeInTheDocument();
    });

    it('should show login form with multiple servers', () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.getByTestId('unified-auth-form')).toBeInTheDocument();
    });

    it('should pass correct server count to ServerSelector', () => {
      // Given
      const servers = [createMockServer({ id: 'server-1', name: 'Server 1' }), createMockServer({ id: 'server-2', name: 'Server 2' }), createMockServer({ id: 'server-3', name: 'Server 3' })];
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 3,
      });
      mockUseServerList.mockReturnValue(servers);
      mockUseActiveServer.mockReturnValue(servers[0]);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.getByText('ServerSelector (3 servers)')).toBeInTheDocument();
    });
  });

  // =====================================================
  // Common UI Elements
  // =====================================================

  describe('Common UI', () => {
    it('should always show logo and title when servers exist', () => {
      // Given
      const singleServer = createMockServer();
      mockUseServerList.mockReturnValue([singleServer]);
      mockUseActiveServer.mockReturnValue(singleServer);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByText('Bluelight Hub')).toBeInTheDocument();
    });

    it('should show footer with status', () => {
      // Given
      const singleServer = createMockServer();
      mockUseServerList.mockReturnValue([singleServer]);
      mockUseActiveServer.mockReturnValue(singleServer);

      // When
      render(<LoginWindow />);

      // Then
      expect(screen.getByTestId('auth-footer')).toBeInTheDocument();
    });
  });

  // =====================================================
  // AC4: Server-Wechsel Integration Tests
  // =====================================================

  describe('Server Switch (AC4)', () => {
    beforeEach(() => {
      // Reset mocks for server switch tests
      mockSetActiveServer.mockClear();
      vi.mocked(toast.success).mockClear();
      vi.mocked(toast.error).mockClear();
      capturedOnServerChange = null;
    });

    it('should call setActiveServer when server is changed', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);

      // When
      render(<LoginWindow />);

      // Verify the captured callback exists
      expect(capturedOnServerChange).toBeDefined();

      // Trigger server change via captured callback
      if (capturedOnServerChange) {
        capturedOnServerChange('server-2');
      }

      // Then
      expect(mockSetActiveServer).toHaveBeenCalledWith('server-2');
    });

    it('should show success toast on server change', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);

      // When
      render(<LoginWindow />);

      if (capturedOnServerChange) {
        capturedOnServerChange('server-2');
      }

      // Wait for async operations
      await vi.waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Server gewechselt', expect.any(Object));
      });
    });

    it('should keep login form visible during server change (no unmount)', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);

      // When
      render(<LoginWindow />);

      // Then - Login form should be visible before and after
      expect(screen.getByTestId('unified-auth-form')).toBeInTheDocument();

      if (capturedOnServerChange) {
        capturedOnServerChange('server-2');
      }

      // Form still visible after server change
      expect(screen.getByTestId('unified-auth-form')).toBeInTheDocument();
    });

    it('should show error toast when server change fails', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);
      mockSetActiveServer.mockRejectedValueOnce(new Error('Network error'));

      // When
      render(<LoginWindow />);

      if (capturedOnServerChange) {
        capturedOnServerChange('server-2');
      }

      // Wait for async operations and error handling
      await vi.waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Serverwechsel fehlgeschlagen', expect.any(Object));
      });
    });
  });

  // =====================================================
  // AC4: Server-Wechsel mit Logout (onLogoutAndSwitch)
  // =====================================================

  describe('Server Switch with Logout (onLogoutAndSwitch)', () => {
    let mockLogoutMutateAsync: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Reset captured handlers
      capturedOnLogoutAndSwitch = null;
      capturedIsAuthenticated = undefined;

      // Reset global mocks
      mockInvalidateQueriesGlobal.mockClear();
      mockRefetchQueriesGlobal.mockClear();

      // Setup mock function for logout
      mockLogoutMutateAsync = vi.fn().mockResolvedValue(undefined);

      mockUseLogout.mockReturnValue({
        mutateAsync: mockLogoutMutateAsync,
        isPending: false,
      } as ReturnType<typeof useLogout>);
    });

    it('should pass onLogoutAndSwitch callback to ServerSelector', () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);

      // When
      render(<LoginWindow />);

      // Then - onLogoutAndSwitch callback should be captured
      expect(capturedOnLogoutAndSwitch).toBeDefined();
      expect(typeof capturedOnLogoutAndSwitch).toBe('function');
    });

    it('should pass isAuthenticated=false when user is not logged in', () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 1,
      });
      mockUseServerList.mockReturnValue([server1]);
      mockUseActiveServer.mockReturnValue(server1);
      mockUseCurrentUser.mockReturnValue({ user: null, isLoading: false });

      // When
      render(<LoginWindow />);

      // Then
      expect(capturedIsAuthenticated).toBe(false);
    });

    it('should pass isAuthenticated=true when user is logged in', () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 1,
      });
      mockUseServerList.mockReturnValue([server1]);
      mockUseActiveServer.mockReturnValue(server1);
      mockUseCurrentUser.mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        isLoading: false,
      } as ReturnType<typeof useCurrentUser>);

      // When
      render(<LoginWindow />);

      // Then
      expect(capturedIsAuthenticated).toBe(true);
    });

    it('should call logout.mutateAsync when onLogoutAndSwitch is triggered', async () => {
      // Given - User ist eingeloggt
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);
      mockUseCurrentUser.mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        isLoading: false,
      } as ReturnType<typeof useCurrentUser>);

      // When
      render(<LoginWindow />);

      // Verify callback was captured
      expect(capturedOnLogoutAndSwitch).toBeDefined();

      // Trigger onLogoutAndSwitch
      await capturedOnLogoutAndSwitch?.('server-2');

      // Then
      expect(mockLogoutMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('should call setActiveServer with correct serverId after logout', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);
      mockUseCurrentUser.mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        isLoading: false,
      } as ReturnType<typeof useCurrentUser>);

      // When
      render(<LoginWindow />);
      await capturedOnLogoutAndSwitch?.('server-2');

      // Then - setActiveServer sollte mit der Ziel-Server-ID aufgerufen werden
      expect(mockSetActiveServer).toHaveBeenCalledWith('server-2');
    });

    it('should invalidate auth queries after logout and server switch', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);
      mockUseCurrentUser.mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        isLoading: false,
      } as ReturnType<typeof useCurrentUser>);

      // When
      render(<LoginWindow />);
      await capturedOnLogoutAndSwitch?.('server-2');

      // Then - Auth-Queries sollten invalidiert werden
      expect(mockInvalidateQueriesGlobal).toHaveBeenCalledWith({
        queryKey: ['auth', 'check'],
      });
    });

    it('should execute logout, setActiveServer, and invalidateQueries in correct order', async () => {
      // Given
      const callOrder: string[] = [];
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);
      mockUseCurrentUser.mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        isLoading: false,
      } as ReturnType<typeof useCurrentUser>);

      // Track call order
      mockLogoutMutateAsync.mockImplementation(async () => {
        callOrder.push('logout');
        return undefined;
      });
      mockSetActiveServer.mockImplementation(async () => {
        callOrder.push('setActiveServer');
        return undefined;
      });
      mockInvalidateQueriesGlobal.mockImplementation(async () => {
        callOrder.push('invalidateQueries');
        return undefined;
      });

      // When
      render(<LoginWindow />);
      await capturedOnLogoutAndSwitch?.('server-2');

      // Then - Die Reihenfolge muss logout → setActiveServer → invalidateQueries sein
      expect(callOrder).toEqual(['logout', 'setActiveServer', 'invalidateQueries']);
    });

    it('should handle logout failure gracefully', async () => {
      // Given
      const server1 = createMockServer({ id: 'server-1', name: 'Server 1' });
      const server2 = createMockServer({ id: 'server-2', name: 'Server 2' });
      mockUseRequireServer.mockReturnValue({
        isLoading: false,
        hasServer: true,
        serverCount: 2,
      });
      mockUseServerList.mockReturnValue([server1, server2]);
      mockUseActiveServer.mockReturnValue(server1);
      mockUseCurrentUser.mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        isLoading: false,
      } as ReturnType<typeof useCurrentUser>);

      // Simulate logout failure
      const logoutError = new Error('Logout failed');
      mockLogoutMutateAsync.mockRejectedValueOnce(logoutError);

      // When
      render(<LoginWindow />);

      // Then - Der Fehler sollte propagiert werden (kein catch im onLogoutAndSwitch)
      await expect(capturedOnLogoutAndSwitch?.('server-2')).rejects.toThrow('Logout failed');

      // setActiveServer sollte NICHT aufgerufen werden wenn logout fehlschlägt
      expect(mockSetActiveServer).not.toHaveBeenCalled();
    });
  });
});
