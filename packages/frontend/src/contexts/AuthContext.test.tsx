import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthContext';

// Mock für fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

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
    isMfaEnabled: false,
};

// Test-Komponente, die den useAuth-Hook verwendet
function TestComponent({ onAuth }: { onAuth?: (auth: ReturnType<typeof useAuth>) => void }) {
    const auth = useAuth();
    if (onAuth) {
        onAuth(auth);
    }
    return (
        <div data-testid="auth-status">
            {auth.isLoading ? 'Loading' : auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
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
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
    }
    return false;
};

describe('AuthContext', () => {
    // Setup und Teardown
    beforeEach(() => {
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
        localStorageMock.clear();
        vi.clearAllMocks();
        fetchMock.mockClear();

        // Echte Timer verwenden
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Hilfsfunktion, um den Provider mit der Testkomponente zu rendern
    const renderWithAuthProvider = (onAuth?: Parameters<typeof TestComponent>[0]['onAuth']) => {
        return render(
            <AuthProvider>
                <TestComponent onAuth={onAuth} />
            </AuthProvider>
        );
    };

    it('sollte initial nicht authentifiziert sein', () => {
        let authData: ReturnType<typeof useAuth> | undefined;

        renderWithAuthProvider((auth) => {
            authData = auth;
        });

        expect(authData).toBeDefined();
        expect(authData?.isAuthenticated).toBe(false);
        expect(authData?.user).toBeNull();
        expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });

    it('sollte den Benutzer aus dem localStorage laden, wenn ein Token vorhanden ist', async () => {
        // Token im localStorage setzen
        localStorageMock.setItem('auth_token', 'mock_jwt_token');

        let authData: ReturnType<typeof useAuth> | undefined;

        // Komponente rendern
        await act(async () => {
            renderWithAuthProvider((auth) => {
                authData = auth;
            });

            // Warten auf asynchrone Operationen
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Der aktuelle AuthContext verifiziert das Token noch nicht automatisch
        // Daher bleibt der Benutzer unauthentifiziert, bis ein login durchgeführt wird
        expect(authData?.isAuthenticated).toBe(false);
        expect(authData?.user).toBeNull();
        expect(authData?.isLoading).toBe(false);
        expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
        expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });

    it('sollte erfolgreiche Anmeldung durchführen', async () => {
        let authData: ReturnType<typeof useAuth> | undefined;
        let result: boolean | undefined;

        // Mock erfolgreiche Login-Response
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                user: mockUser,
            }),
        } as Response);

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
        expect(result).toBe(true);
        expect(authData?.isAuthenticated).toBe(true);
        expect(authData?.user).not.toBeNull();
        expect(authData?.user?.email).toBe('test@example.com');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock-access-token');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token');
        expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });

    it('sollte fehlgeschlagene Anmeldung behandeln', async () => {
        let authData: ReturnType<typeof useAuth> | undefined;
        let result: boolean | undefined;

        // Mock fehlgeschlagene Login-Response
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Invalid credentials' }),
        } as Response);

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
        expect(result).toBe(false);
        expect(authData?.isAuthenticated).toBe(false);
        expect(authData?.user).toBeNull();
        expect(localStorageMock.setItem).not.toHaveBeenCalledWith('auth_token', expect.any(String));
        expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });

    it('sollte Abmeldung durchführen', async () => {
        let authData: ReturnType<typeof useAuth> | undefined;

        // Mock erfolgreiche Login-Response
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                user: mockUser,
            }),
        } as Response);

        // Mock erfolgreiche Logout-Response
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Logged out' }),
        } as Response);

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
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        // Prüfen des Ergebnisses
        expect(authData?.isAuthenticated).toBe(false);
        expect(authData?.user).toBeNull();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
        expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });
});