import { useEffect, useRef } from 'react';
import { verifyAdmin } from '@/utils/adminAuth';
import { authActions } from '@/stores/auth.store';

/**
 * Prüft beim App-Start einmalig, ob ein gültiges Admin-Cookie vorhanden ist
 * und setzt den Admin-Authentifizierungsstatus entsprechend.
 *
 * - Wenn kein `adminToken` Cookie vorhanden ist, wird synchron auf `false` gesetzt
 * - Wenn ein Cookie vorhanden ist, wird einmalig eine Server-Verifikation durchgeführt
 */
export function useAdminRefresh() {
  // Synchronous path: if no admin cookie, set to false immediately
  const hasAdminCookie =
    typeof document !== 'undefined' && /(?:^|;\s*)adminToken=/.test(document.cookie);
  const verifiedRef = useRef(false);

  if (!hasAdminCookie) {
    // Set synchronously so tests and UI can observe immediately
    authActions.setAdminAuth(false);
  }

  useEffect(() => {
    if (!hasAdminCookie) return;
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const run = async () => {
      try {
        const ok = await verifyAdmin();
        authActions.setAdminAuth(ok === true);
      } catch {
        authActions.setAdminAuth(false);
      }
    };

    void run();
  }, [hasAdminCookie]);
}
