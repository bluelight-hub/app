import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/api';
import { authActions } from '@/stores/auth.store';
import { logger } from '@/utils/logger';

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

  const { data: currentUser = null, isLoading } = useQuery({
    queryKey: ['auth-check'],
    queryFn: async () => {
      try {
        const response = await api.auth().authControllerCheckAuth();
        if (response.user) {
          logger.log('Auth refresh successful:', response.user);
          // Admin-Auth-Status speichern, falls vorhanden
          if (response.isAdminAuthenticated) {
            authActions.setAdminAuth(true);
          }
        }
        // Explizit null zurückgeben wenn kein User vorhanden
        return response.user ?? null;
      } catch (error) {
        logger.error('Auth check failed:', error);
        return null;
      }
    },
    enabled: true,
    // Nur beim ersten Mount ausführen
    staleTime: Infinity,
    retry: false,
    throwOnError: false,
  });
  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        // User erfolgreich geladen - im Store speichern
        authActions.loginSuccess(currentUser);
        logger.log('User restored from session:', currentUser);
      }
    }
  }, [currentUser, isLoading]);

  // Setze den Loading-Status im Store
  useEffect(() => {
    authActions.setLoading(isLoading);
  }, [isLoading]);
}
