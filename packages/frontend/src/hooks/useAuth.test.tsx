import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';
import { useAuth } from './useAuth';

/**
 * Mock-Funktion für den AuthContext
 */
const mockAuthContext = (contextValue: Partial<AuthContextType> = {}) => {
  const defaultValue: AuthContextType = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn().mockResolvedValue(false),
    logout: vi.fn(),
    ...contextValue,
  };

  return {
    AuthContextProvider: ({ children }: PropsWithChildren) => (
      <AuthContext.Provider value={defaultValue}>{children}</AuthContext.Provider>
    ),
    contextValue: defaultValue,
  };
};

describe('useAuth Hook', () => {
  it('sollte einen Fehler werfen, wenn außerhalb eines AuthProvider verwendet', () => {
    // Error Ausgabe in der Konsole unterdrücken für diesen Test
    const consoleError = vi.spyOn(console, 'error');
    consoleError.mockImplementation(() => {});

    // Hook ohne Provider aufrufen sollte einen Fehler werfen
    expect(() => {
      const { result } = renderHook(() => useAuth());
      return result.current;
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });

  it('sollte AuthContext-Werte zurückgeben, wenn innerhalb eines AuthProvider verwendet', () => {
    // Mock-AuthContext mit bestimmten Werten
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'user' };
    const { AuthContextProvider } = mockAuthContext({
      user: mockUser,
      isAuthenticated: true,
    });

    // Hook innerhalb eines Providers rendern
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthContextProvider,
    });

    // Prüfen, ob die richtigen Werte zurückgegeben werden
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('sollte die login-Funktion korrekt aufrufen', async () => {
    // Mock-AuthContext mit erfolgreicher Login-Funktion
    const { AuthContextProvider, contextValue } = mockAuthContext({
      login: vi.fn().mockResolvedValue(true),
    });

    // Hook innerhalb eines Providers rendern
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthContextProvider,
    });

    // Login-Funktion aufrufen
    const success = await result.current.login('test@example.com', 'password');

    // Prüfen, ob die Funktion aufgerufen wurde und das richtige Ergebnis zurückgibt
    expect(contextValue.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(success).toBe(true);
  });

  it('sollte die logout-Funktion korrekt aufrufen', () => {
    // Mock-AuthContext
    const { AuthContextProvider, contextValue } = mockAuthContext();

    // Hook innerhalb eines Providers rendern
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthContextProvider,
    });

    // Logout-Funktion aufrufen
    result.current.logout();

    // Prüfen, ob die Funktion aufgerufen wurde
    expect(contextValue.logout).toHaveBeenCalled();
  });
});
