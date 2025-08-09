import { Store } from '@tanstack/react-store';
import type { QueryClient } from '@tanstack/react-query';
import type { UserResponseDto } from '@bluelight-hub/shared/client';
import { api } from '@/api/api';
import { logger } from '@/utils/logger';

/**
 * Interface für den Authentifizierungs-Store
 */
export interface AuthState {
  /** Der aktuell authentifizierte Benutzer oder null wenn nicht angemeldet */
  user: UserResponseDto | null;
  /** Ob der Benutzer authentifiziert ist */
  isAuthenticated: boolean;
  /** Ob gerade eine Authentifizierung läuft */
  isLoading: boolean;
  /** Ob der Benutzer als Admin authentifiziert ist */
  isAdminAuthenticated: boolean;
}

/**
 * TanStack Store für die Authentifizierung
 *
 * Verwaltet den globalen Authentifizierungszustand der Anwendung.
 * Der Store ist framework-agnostisch und bietet fine-grained reactivity,
 * sodass Komponenten nur bei Änderungen der abonnierten Properties re-rendern.
 */
export const authStore = new Store<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isAdminAuthenticated: false,
});

/**
 * Actions für den Auth Store
 *
 * Kapselt alle Authentifizierungs-bezogenen Aktionen
 */
export const authActions = {
  /**
   * Setzt den authentifizierten Benutzer
   *
   * @param user - Die Benutzerdaten oder null zum Ausloggen
   */
  setUser: (user: UserResponseDto | null) => {
    authStore.setState((state) => ({
      ...state,
      user,
      isAuthenticated: !!user,
    }));
  },

  /**
   * Setzt den Loading-Status
   *
   * @param isLoading - Der neue Loading-Status
   */
  setLoading: (isLoading: boolean) => {
    authStore.setState((state) => ({
      ...state,
      isLoading,
    }));
  },

  /**
   * Meldet den Benutzer ab und löscht den Store
   */
  logout: (queryClient: QueryClient) => async () => {
    await api.auth().authControllerLogout();
    await queryClient.refetchQueries({ queryKey: ['auth-check'] });
    authStore.setState(() => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAdminAuthenticated: false,
    }));
  },

  /**
   * Hilfsfunktion für Login/Registrierung
   * Setzt User und beendet Loading-Status
   *
   * @param user - Die Benutzerdaten nach erfolgreicher Authentifizierung
   */
  loginSuccess: (user: UserResponseDto) => {
    authStore.setState((state) => ({
      ...state,
      user,
      isAuthenticated: true,
      isLoading: false,
    }));
  },

  /**
   * Setzt den Admin-Authentifizierungsstatus
   *
   * @param isAdminAuthenticated - Ob der Benutzer als Admin authentifiziert ist
   */
  setAdminAuth: (isAdminAuthenticated: boolean) => {
    authStore.setState((state) => ({
      ...state,
      isAdminAuthenticated,
    }));
  },

  /**
   * Meldet nur den Admin ab, behält aber den normalen Benutzer eingeloggt
   * Entfernt nur das Admin-Token, nicht die normale Session
   */
  logoutAdmin: (queryClient: QueryClient) => async () => {
    try {
      // API-Call zum Admin-Logout (entfernt nur Admin-Token)
      await api.auth().authControllerAdminLogout();
    } catch (error) {
      logger.error('Admin logout failed:', error);
    }

    // Setze nur Admin-Auth auf false, behalte User-Session
    authStore.setState((state) => ({
      ...state,
      isAdminAuthenticated: false,
    }));

    // Refetch auth status to update permissions
    await queryClient.refetchQueries({ queryKey: ['auth-check'] });
  },
};
