import { renderWithProviders, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLogin } from '../AdminLogin';

const mockNavigate = vi.fn();
const mockRouterHistoryReplace = vi.fn();
const mockRouterHistoryPush = vi.fn();
const mockRouterHistoryFlush = vi.fn();
const mockSessionContextCard = vi.fn();
const mockConsumeRedirectAfterLogin = vi.fn();
const mockUseCurrentUser = vi.fn();
const mockUseActiveServer = vi.fn();
const mockUseSystemHealth = vi.fn();
const mockUseSystemVersion = vi.fn();
const mockAdminLoginState = {
  mutateAsync: vi.fn(),
  isPending: false,
};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    history: {
      replace: mockRouterHistoryReplace,
      push: mockRouterHistoryPush,
      flush: mockRouterHistoryFlush,
    },
  }),
}));

vi.mock('@/features/auth', () => ({
  SessionContextCard: (props: Record<string, unknown>) => {
    mockSessionContextCard(props);
    return <div data-testid="session-context-card">{String(props.username)}</div>;
  },
  consumeRedirectAfterLogin: () => mockConsumeRedirectAfterLogin(),
  useCurrentUser: () => mockUseCurrentUser(),
  useAdminLogin: () => mockAdminLoginState,
}));

vi.mock('@/features/server/hooks', () => ({
  useActiveServer: () => mockUseActiveServer(),
}));

vi.mock('@/features/system', () => ({
  STATUS_DOT_COLORS: {
    online: 'green',
    offline: 'yellow',
    error: 'red',
    checking: 'blue',
  },
  STATUS_LABELS: {
    online: 'System online',
    offline: 'Eingeschränkter Modus',
    error: 'Keine Verbindung zum Server',
    checking: 'Verbindung wird geprüft...',
  },
  SYSTEM_QUERY_KEYS: {
    health: () => ['system', 'health'],
    version: () => ['system', 'version'],
  },
  getIndicatorStatus: () => 'online',
  useSystemHealth: () => mockUseSystemHealth(),
  useSystemVersion: () => mockUseSystemVersion(),
}));

vi.mock('@/shared/ui/templates/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-layout">{children}</div>,
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockNavigate.mockResolvedValue(undefined);
    mockAdminLoginState.mutateAsync.mockReset();
    mockAdminLoginState.isPending = false;
    mockConsumeRedirectAfterLogin.mockReturnValue(undefined);
    mockUseCurrentUser.mockReturnValue({
      user: {
        id: 'user-1',
        username: 'einsatzleitung',
        role: 'ADMIN',
      },
      isLoading: false,
      isAdminAuthenticated: false,
      adminSessionStatus: 'unauthenticated',
      adminStatus: {
        adminSetupAvailable: false,
      },
    });
    mockUseActiveServer.mockReturnValue({
      id: 'server-1',
      name: 'Leitstelle West',
    });
    mockUseSystemHealth.mockReturnValue({
      connectionMode: 'online',
      setupComplete: true,
      version: '1.2.3',
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSystemVersion.mockReturnValue({
      frontendVersion: '1.2.3',
      backendVersion: '1.2.3',
      mismatchSeverity: 'none',
      isLoading: false,
    });

    window.history.replaceState({}, '', '/admin-login');
  });

  it('rendert die neue Einstiegsshell mit Sitzungskontext', async () => {
    renderWithProviders(<AdminLogin />);

    expect(await screen.findByText('Verwaltungszugang prüfen')).toBeInTheDocument();
    expect(screen.getByText('Administrator-Anmeldung')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Admin-Sitzung freischalten' })).toBeInTheDocument();
    expect(screen.getByTestId('session-context-card')).toHaveTextContent('einsatzleitung');

    const sessionContextProps = mockSessionContextCard.mock.calls.at(-1)?.[0];
    expect(sessionContextProps).toMatchObject({
      username: 'einsatzleitung',
      role: 'ADMIN',
      activeServerName: 'Leitstelle West',
      adminSessionStatus: 'unauthenticated',
      adminSetupAvailable: false,
    });
  });

  it('leitet ohne Benutzer-Session zurück zum User-Login', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
      isAdminAuthenticated: false,
      adminSessionStatus: 'unauthenticated',
      adminStatus: undefined,
    });

    renderWithProviders(<AdminLogin />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/auth',
        search: undefined,
        replace: true,
      });
    });
  });

  it('leitet bei aktiver Admin-Sitzung direkt zum Dashboard weiter', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: {
        id: 'user-1',
        username: 'einsatzleitung',
        role: 'ADMIN',
      },
      isLoading: false,
      isAdminAuthenticated: true,
      adminSessionStatus: 'authenticated',
      adminStatus: {
        adminSetupAvailable: false,
      },
    });

    renderWithProviders(<AdminLogin />);

    await waitFor(() => {
      expect(mockRouterHistoryReplace).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('leitet zu Admin-Setup weiter, wenn noch kein Admin-Passwort vorhanden ist', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: {
        id: 'user-1',
        username: 'einsatzleitung',
        role: 'ADMIN',
      },
      isLoading: false,
      isAdminAuthenticated: false,
      adminSessionStatus: 'unauthenticated',
      adminStatus: {
        adminSetupAvailable: true,
      },
    });

    renderWithProviders(<AdminLogin />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/setup',
        replace: true,
      });
    });
  });

  it('sperrt den Admin-Submit bei fehlendem Serverkontext und bietet eine Setup-Aktion an', async () => {
    const user = userEvent.setup();

    mockUseActiveServer.mockReturnValue(null);
    mockUseSystemHealth.mockReturnValue({
      connectionMode: 'online',
      setupComplete: false,
      version: '1.2.3',
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<AdminLogin />);

    expect(await screen.findAllByText('Serverkontext fehlt')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Admin-Sitzung freischalten' })).toBeDisabled();
    expect(screen.getByLabelText('Administrator-Passwort')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Server einrichten' }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/server/setup' });
    expect(mockAdminLoginState.mutateAsync).not.toHaveBeenCalled();
  });

  it('sperrt den Admin-Submit auch bei nicht erreichbarem Server', async () => {
    mockUseSystemHealth.mockReturnValue({
      connectionMode: 'error',
      setupComplete: true,
      version: '1.2.3',
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    });

    renderWithProviders(<AdminLogin />);

    expect(await screen.findByText('Serverstatus zuerst stabilisieren')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin-Sitzung freischalten' })).toBeDisabled();
    expect(screen.getByLabelText('Administrator-Passwort')).toBeDisabled();
    expect(mockAdminLoginState.mutateAsync).not.toHaveBeenCalled();
  });
});
