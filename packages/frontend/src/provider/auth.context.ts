import { createContext } from 'react';
import type { UserResponseDto } from '@bluelight-hub/shared/client';

/**
 * Interface für den Authentifizierungskontext
 */
export interface AuthContextType {
  /** Der aktuell authentifizierte Benutzer oder null wenn nicht angemeldet */
  user: UserResponseDto | null;
  /** Ob gerade eine Authentifizierung läuft */
  isLoading: boolean;
  /** Speichert den Benutzer im Kontext nach erfolgreicher Anmeldung/Registrierung */
  setUser: (user: UserResponseDto | null) => void;
  /** Setzt den Loading-Status */
  setLoading: (loading: boolean) => void;
  /** Meldet den Benutzer ab und löscht den Kontext */
  logout: () => void;
}

/**
 * React Context für die Authentifizierung
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
