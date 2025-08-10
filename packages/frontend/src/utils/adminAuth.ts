import { ResponseError } from '@bluelight-hub/shared/client';
import { api } from '@/api/api';

/**
 * Verifiziert ob das Admin-Token/Cookie gültig ist
 *
 * Diese Funktion prüft das Admin-Cookie durch einen API-Call zum Backend.
 * Das Cookie wird automatisch mitgesendet (credentials: 'include').
 *
 * Hinweis: Diese Funktion prüft die Gültigkeit des Tokens, nicht ob ein Admin-Account existiert.
 * Für letzteres verwenden Sie verifyAdmin() aus adminApi.ts
 *
 * @returns Promise<boolean> - true wenn Admin-Token gültig, false sonst
 * @throws Fehler werden bei API-Fehlern außer 401 und 403 erneut geworfen.
 *         Dies ermöglicht eine zentrale Fehlerbehandlung für unerwartete Fehler.
 */
export async function verifyAdminToken(): Promise<boolean> {
  try {
    // Der verify Endpoint gibt 200 zurück wenn das Admin-Cookie gültig ist
    await api.auth().authControllerVerifyAdminToken();
    return true;
  } catch (error: unknown) {
    // Return false only for expected auth errors; rethrow others for global handling
    if (error instanceof ResponseError) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        return false;
      }
    }
    throw error;
  }
}
