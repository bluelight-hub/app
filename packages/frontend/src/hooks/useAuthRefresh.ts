import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/api';
import { authActions } from '@/stores/auth.store';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/queryKeys';

/**
 * Hook für die automatische Wiederherstellung der Authentifizierung beim App-Start
 *
 * Dieser Hook prüft beim ersten Laden der App, ob der Benutzer noch über
 * gültige Cookies authentifiziert ist und stellt die Session wieder her.
 *
 * Das läuft im Hintergrund (Silent-Refresh) ohne die UI zu blockieren.
 */
export function useAuthRefresh() {
  // WICHTIG: HttpOnly Cookies (accessToken, refreshToken) sind im JavaScript nicht sichtbar!
  // Wir müssen immer versuchen, den User zu laden und das Backend entscheiden lassen,
  // ob gültige Cookies vorhanden sind.

  const { data: _currentUser = null, isLoading } = useQuery({
    queryKey: QUERY_KEYS.auth.authCheck,
    queryFn: async () => {
      // Set loading state when query starts
      authActions.setLoading(true);

      try {
        const response = await api.auth().authControllerCheckAuth();

        // Handle successful response
        if (response.user) {
          // Admin-Auth-Status setzen
          authActions.setAdminAuth(response.isAdminAuthenticated === true);
          // User im Store speichern
          authActions.loginSuccess(response.user);
          logger.log('Auth refresh successful, user restored from session:', response.user);
          return response.user;
        } else {
          // Kein User vorhanden - Store zurücksetzen
          authActions.clearAuth();
          authActions.setAdminAuth(false);
          logger.log('No active session found, user state cleared');
          return null;
        }
      } catch (error) {
        logger.error('Auth check failed:', error);
        // Bei Fehler Store zurücksetzen
        authActions.clearAuth();
        authActions.setAdminAuth(false);
        authActions.setLoading(false);
        return null;
      }
    },
    enabled: true,
    // Nur beim ersten Mount ausführen
    staleTime: Infinity,
    retry: false,
    throwOnError: false,
  });

  // Nur noch Loading-Status synchronisieren wenn die Query läuft
  useEffect(() => {
    if (!isLoading) {
      authActions.setLoading(false);
    }
  }, [isLoading]);
}
