import { useStore } from '@tanstack/react-store';
import { useQueryClient } from '@tanstack/react-query';
import { authActions, authStore } from '../stores/auth.store';
import { AuthContext } from './auth.context';
import type { AuthContextType } from './auth.context';
import type { ReactNode } from 'react';

/**
 * Props für den AuthProvider
 */
interface AuthProviderProps {
  /** Die React-Komponenten, die vom Provider umschlossen werden */
  children: ReactNode;
}

/**
 * Provider-Komponente für die Authentifizierung
 *
 * Stellt den Authentifizierungsstatus und entsprechende Funktionen
 * für die gesamte Anwendung bereit. Sollte alle Komponenten umschließen,
 * die Zugriff auf die Authentifizierung benötigen.
 *
 * Nutzt intern TanStack Store für State Management mit fine-grained reactivity.
 *
 * @param props - Die Props für den AuthProvider
 * @param props.children - Die React-Komponenten, die vom Provider umschlossen werden
 * @returns Die gewrappten Komponenten mit Authentifizierungskontext
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Subscribe to auth store state
  const queryClient = useQueryClient();
  const user = useStore(authStore, (state) => state.user);
  const isLoading = useStore(authStore, (state) => state.isLoading);
  const isAdminAuthenticated = useStore(authStore, (state) => state.isAdminAuthenticated);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAdminAuthenticated,
    setUser: authActions.setUser,
    setLoading: authActions.setLoading,
    logout: authActions.logout(queryClient),
    logoutAdmin: authActions.logoutAdmin(queryClient),
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
