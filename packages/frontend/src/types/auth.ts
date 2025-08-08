/**
 * Benutzer-Interface für die Authentifizierung
 */
export interface User {
  id: string;
  username: string;
  roles: Array<string>;
  createdAt: string;
}

/**
 * Auth-State Interface für den TanStack Store
 */
export interface AuthState {
  currentUser: User | null;
  isAdminAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  adminLogin: () => void;
  adminLogout: () => void;
  reset: () => void;
}
