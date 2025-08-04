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
    // Funktion zur Admin-Verifizierung
    const checkAdminStatus = async () => {
      try {
        // Versuche das Admin-Cookie zu verifizieren
        const isAdminValid = await verifyAdmin();

        // Setze den Admin-Status im Store
        authActions.setAdminAuth(isAdminValid);
      } catch (_error) {
        // Bei Fehlern ist der Benutzer nicht als Admin authentifiziert
        authActions.setAdminAuth(false);
      }
    };

    // Führe die Verifizierung aus
    checkAdminStatus();
  }, []); // Nur einmal beim Mount ausführen
}
