import { useContext } from 'react';
import { AuthContext } from '@/provider/auth.context';

/**
 * Hook zum Zugriff auf den Authentifizierungskontext
 *
 * @throws {Error} Wenn der Hook außerhalb eines AuthProviders verwendet wird
 * @returns Der Authentifizierungskontext
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
