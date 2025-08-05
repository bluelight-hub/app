import { useEffect } from 'react';
import { authActions } from '@/stores/auth.store';
import { verifyAdmin } from '@/utils/adminAuth';

/**
 * Hook für die automatische Admin-Token-Verifizierung beim App-Start
 *
 * Dieser Hook prüft beim ersten Laden der App, ob ein gültiges Admin-Cookie
 * vorhanden ist und setzt entsprechend den Admin-Authentifizierungsstatus.
 *
 * Das läuft im Hintergrund (Silent-Refresh) ohne die UI zu blockieren.
 */
export function useAdminRefresh() {
  useEffect(() => {
    const checkAdminStatus = async () => {
      // Prüfe ob adminToken Cookie existiert
      const hasAdminCookie = document.cookie
        .split('; ')
        .some((row) => row.startsWith('adminToken='));

      if (!hasAdminCookie) {
        // Kein Cookie vorhanden, setze auth auf false ohne API-Call
        authActions.setAdminAuth(false);
        return;
      }

      try {
        const isAdminValid = await verifyAdmin();
        authActions.setAdminAuth(isAdminValid);
      } catch (_error) {
        authActions.setAdminAuth(false);
      }
    };

    checkAdminStatus();
  }, []);
}
