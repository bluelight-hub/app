import { Store } from '@tanstack/react-store';
import type { UserResponseDto } from '@bluelight-hub/shared/client';

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
  logout: () => {
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
};
