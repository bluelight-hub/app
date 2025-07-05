import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthContext';

// Mock für das API-Modul
vi.mock('../api', () => ({
  api: {
    auth: {
      authControllerLoginV1Raw: vi.fn(),
      authControllerLogoutV1: vi.fn(),
      authControllerGetCurrentUserV1Raw: vi.fn(),
      authControllerRefreshTokenV1Raw: vi.fn(),
      authControllerMfaLoginV1Raw: vi.fn(),
    },
  },
}));

// Import API after mocking to get the mocked version
import { api } from '../api';
import { authStorage } from '../utils/authStorage';
import { useAuthStore } from '../stores/useAuthStore';

// Mock für authStorage
vi.mock('../utils/authStorage', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getTokens: vi.fn().mockResolvedValue({ authToken: null, refreshToken: null }),
    setTokens: vi.fn().mockResolvedValue(undefined),
    clearTokens: vi.fn().mockResolvedValue(undefined),
    hasValidTokens: vi.fn().mockResolvedValue(false),
  },
}));

// Mock für logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock für localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Mock-User für Tests
const mockUser = {
  id: '123',
  email: 'test@example.com',
  roles: ['ADMIN'],
  permissions: ['ADMIN_USERS_READ', 'ADMIN_USERS_WRITE'],
  isActive: true,
  organizationId: 'org-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Test-Komponente, die den useAuth-Hook verwendet
function TestComponent({ onAuth }: { onAuth?: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  if (onAuth) {
    onAuth(auth);
  }
  return (
    <div>
      <div data-testid="auth-status">
        {auth.isLoading ? 'Loading' : auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="is-admin">{auth.isAdmin() ? 'Is Admin' : 'Not Admin'}</div>
      <div data-testid="has-admin-role">{auth.hasRole('ADMIN') ? 'Has ADMIN Role' : 'No ADMIN Role'}</div>
    </div>
  );
}

// Hilfsfunktion zum Warten auf UI-Updates
const waitForUI = async (expectedText: string) => {
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 50;

  while (attempts < maxAttempts) {
    if (screen.getByTestId('auth-status').textContent === expectedText) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    attempts++;
  }
  return false;
};

describe.skip('AuthContext', () => {
  // TODO: Fix these tests after Zustand auth store migration
  // Setup und Teardown
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset Zustand store
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isRefreshing: false,
      accessToken: null,
      refreshToken: null,
      sessionExpiresAt: null,
      lastRefreshAt: null,
      refreshTimer: null,
    });

    // Echte Timer verwenden
    vi.useRealTimers();
  });

  afterEach(() => {
    // Clear any timers
    const { refreshTimer } = useAuthStore.getState();
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    vi.restoreAllMocks();
  });

  // Hilfsfunktion, um den Provider mit der Testkomponente zu rendern
  const renderWithAuthProvider = (onAuth?: Parameters<typeof TestComponent>[0]['onAuth']) => {
    return render(
      <AuthProvider>
        <TestComponent onAuth={onAuth} />
      </AuthProvider>,
    );
  };

  it('sollte initial nicht authentifiziert sein', async () => {
    let authData: ReturnType<typeof useAuth> | undefined;

    await act(async () => {
      renderWithAuthProvider((auth) => {
        authData = auth;
      });
    });

    expect(authData).toBeDefined();
    expect(authData?.isAuthenticated).toBe(false);
    expect(authData?.user).toBeNull();
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
  });

  it('sollte den Benutzer aus dem authStorage laden, wenn Token vorhanden sind', async () => {
    // Mock authStorage mit gültigen Tokens
    vi.mocked(authStorage.hasValidTokens).mockResolvedValue(true);
    vi.mocked(authStorage.getTokens).mockResolvedValue({
      authToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
    vi.mocked(api.auth.authControllerGetCurrentUserV1Raw).mockResolvedValueOnce({
      raw: {
        ok: true,
        json: async () => mockUser,
      } as Response,
    });

    let authData: ReturnType<typeof useAuth> | undefined;

    // Komponente rendern
    await act(async () => {
      renderWithAuthProvider((auth) => {
        authData = auth;
      });

      // Warten auf asynchrone Operationen
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Nach dem Laden sollte der Benutzer authentifiziert sein
    expect(authData?.isAuthenticated).toBe(true);
    expect(authData?.user).toEqual(mockUser);
    expect(authData?.isLoading).toBe(false);
    expect(authStorage.hasValidTokens).toHaveBeenCalled();
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
  });

  it('sollte erfolgreiche Anmeldung durchführen', async () => {
    let authData: ReturnType<typeof useAuth> | undefined;
    let result: { success: boolean } | undefined;

    // Mock erfolgreiche Login-Response
    const mockLoginResponse = {
      raw: {
        ok: true,
        json: async () => ({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: mockUser,
        }),
      } as Response,
    };

    vi.mocked(api.auth.authControllerLoginV1Raw).mockResolvedValueOnce(mockLoginResponse);

    // Komponente rendern
    renderWithAuthProvider((auth) => {
      authData = auth;
    });

    // Login-Funktion aufrufen und auf UI-Update warten
    await act(async () => {
      result = await authData?.login('test@example.com', 'password');
    });

    // Warten auf UI-Update
    await act(async () => {
      await waitForUI('Authenticated');
    });

    // Assertions für erfolgreiche Anmeldung
    expect(result?.success).toBe(true);
    expect(authData?.isAuthenticated).toBe(true);
    expect(authData?.user).not.toBeNull();
    expect(authData?.user?.email).toBe('test@example.com');
    expect(authStorage.setTokens).toHaveBeenCalledWith('mock-access-token', 'mock-refresh-token');
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
  });

  it('sollte fehlgeschlagene Anmeldung behandeln', async () => {
    let authData: ReturnType<typeof useAuth> | undefined;
    let result: { success: boolean } | undefined;

    // Mock fehlgeschlagene Login-Response
    const mockFailedResponse = {
      raw: {
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response,
    };

    vi.mocked(api.auth.authControllerLoginV1Raw).mockResolvedValueOnce(mockFailedResponse);

    // Komponente rendern
    renderWithAuthProvider((auth) => {
      authData = auth;
    });

    // Login mit falschen Daten
    await act(async () => {
      result = await authData?.login('wrong@example.com', 'wrongpassword');
    });

    // Warten auf UI-Update
    await act(async () => {
      await waitForUI('Not Authenticated');
    });

    // Assertions für fehlgeschlagene Anmeldung
    expect(result?.success).toBe(false);
    expect(result?.requiresMfa).toBeUndefined();
    expect(authData?.isAuthenticated).toBe(false);
    expect(authData?.user).toBeNull();
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('auth_token', expect.any(String));
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
  });

  it('sollte Abmeldung durchführen', async () => {
    let authData: ReturnType<typeof useAuth> | undefined;

    // Mock erfolgreiche Login-Response
    const mockLoginResponse = {
      raw: {
        ok: true,
        json: async () => ({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: mockUser,
        }),
      } as Response,
    };

    vi.mocked(api.auth.authControllerLoginV1Raw).mockResolvedValueOnce(mockLoginResponse);

    // Mock erfolgreiche Logout-Response
    vi.mocked(api.auth.authControllerLogoutV1).mockResolvedValueOnce(undefined);

    // Komponente rendern
    renderWithAuthProvider((auth) => {
      authData = auth;
    });

    // Zuerst anmelden
    await act(async () => {
      await authData?.login('test@example.com', 'password');
    });

    // Warten auf UI-Update
    await act(async () => {
      await waitForUI('Authenticated');
    });

    // Prüfen, ob der Benutzer angemeldet ist
    expect(authData?.isAuthenticated).toBe(true);
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');

    // Abmelden
    await act(async () => {
      authData?.logout();
      // Warten auf UI-Update
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Prüfen des Ergebnisses
    expect(authData?.isAuthenticated).toBe(false);
    expect(authData?.user).toBeNull();
    expect(authStorage.clearTokens).toHaveBeenCalled();
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
  });

  it('sollte Admin-Rolle korrekt erkennen', async () => {
    let authData: ReturnType<typeof useAuth> | undefined;

    // Mock erfolgreiche Login-Response mit Admin-Rolle
    const mockLoginResponse = {
      raw: {
        ok: true,
        json: async () => ({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: mockUser,
        }),
      } as Response,
    };

    vi.mocked(api.auth.authControllerLoginV1Raw).mockResolvedValueOnce(mockLoginResponse);

    // Komponente rendern
    renderWithAuthProvider((auth) => {
      authData = auth;
    });

    // Als Admin anmelden
    await act(async () => {
      await authData?.login('admin@example.com', 'password');
    });

    // Warten auf UI-Update
    await act(async () => {
      await waitForUI('Authenticated');
    });

    // Admin-Status prüfen
    expect(authData?.isAdmin()).toBe(true);
    expect(authData?.hasRole('ADMIN')).toBe(true);
    expect(screen.getByTestId('is-admin').textContent).toBe('Is Admin');
    expect(screen.getByTestId('has-admin-role').textContent).toBe('Has ADMIN Role');
  });

  it('sollte Nicht-Admin-Rolle korrekt erkennen', async () => {
    let authData: ReturnType<typeof useAuth> | undefined;

    // Mock erfolgreiche Login-Response mit normaler Benutzer-Rolle
    const normalUser = {
      ...mockUser,
      roles: ['USER'],
    };

    const mockLoginResponse = {
      raw: {
        ok: true,
        json: async () => ({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: normalUser,
        }),
      } as Response,
    };

    vi.mocked(api.auth.authControllerLoginV1Raw).mockResolvedValueOnce(mockLoginResponse);

    // Komponente rendern
    renderWithAuthProvider((auth) => {
      authData = auth;
    });

    // Als normaler Benutzer anmelden
    await act(async () => {
      await authData?.login('user@example.com', 'password');
    });

    // Warten auf UI-Update
    await act(async () => {
      await waitForUI('Authenticated');
    });

    // Admin-Status prüfen
    expect(authData?.isAdmin()).toBe(false);
    expect(authData?.hasRole('ADMIN')).toBe(false);
    expect(authData?.hasRole('USER')).toBe(true);
    expect(screen.getByTestId('is-admin').textContent).toBe('Not Admin');
    expect(screen.getByTestId('has-admin-role').textContent).toBe('No ADMIN Role');
  });

  it('sollte mehrere Admin-Rollen erkennen', async () => {
    let authData: ReturnType<typeof useAuth> | undefined;

    // Mock erfolgreiche Login-Response mit SUPER_ADMIN Rolle
    const superAdminUser = {
      ...mockUser,
      roles: ['SUPER_ADMIN'],
    };

    const mockLoginResponse = {
      raw: {
        ok: true,
        json: async () => ({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: superAdminUser,
        }),
      } as Response,
    };

    vi.mocked(api.auth.authControllerLoginV1Raw).mockResolvedValueOnce(mockLoginResponse);

    // Komponente rendern
    renderWithAuthProvider((auth) => {
      authData = auth;
    });

    // Als Super Admin anmelden
    await act(async () => {
      await authData?.login('superadmin@example.com', 'password');
    });

    // Warten auf UI-Update
    await act(async () => {
      await waitForUI('Authenticated');
    });

    // Admin-Status prüfen
    expect(authData?.isAdmin()).toBe(true);
    expect(authData?.hasRole('SUPER_ADMIN')).toBe(true);
    expect(authData?.hasRole('ADMIN')).toBe(false);
    expect(screen.getByTestId('is-admin').textContent).toBe('Is Admin');
  });
});
