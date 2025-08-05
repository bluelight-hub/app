import { BackendApi } from '@/api/api';

/**
 * Verifiziert ob der aktuelle Benutzer Admin-Rechte hat
 *
 * Diese Funktion prüft das Admin-Cookie durch einen API-Call zum Backend.
 * Das Cookie wird automatisch mitgesendet (credentials: 'include').
 *
 * @returns Promise<boolean> - true wenn Admin-Token gültig, false sonst
 */
export async function verifyAdmin(): Promise<boolean> {
  try {
    const api = new BackendApi();
    // Der verify Endpoint gibt 200 zurück wenn das Admin-Cookie gültig ist
    await api.auth().authControllerVerifyAdminToken();
    return true;
  } catch (_error) {
    // Bei 401 oder anderen Fehlern ist das Token ungültig
    return false;
  }
}
