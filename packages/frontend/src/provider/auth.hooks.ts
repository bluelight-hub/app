import { useContext } from 'react';
import { AuthContext } from './auth.context';
import type { AuthContextType } from './auth.context';

/**
 * Hook zum Zugriff auf den Authentifizierungskontext
 *
 * @returns Der Authentifizierungskontext mit Benutzer und Funktionen
 * @throws Fehler wenn der Hook außerhalb eines AuthProviders verwendet wird
 *
 * @example
 * import { useAuth } from './auth.hooks';
 *
 * function MyComponent() {
 *   const { user, logout } = useAuth();
 *   // ...
 * }
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth muss innerhalb eines AuthProviders verwendet werden');
  }

  return context;
}
