import { logger } from '@/shared/lib/logger';
import { clearServerAccessToken, getServerAccessToken, isSetupRedirectInProgress, isTokenErrorMessage, requestServerAccessToken, setSetupRedirectInProgress } from '@/shared/lib/server-access-token';
import { AuthApi, Configuration } from '@bluelight-hub/shared/client';
import { getBaseUrl } from './api';

/**
 * Custom fetch wrapper that handles automatic token refresh on 401 errors
 *
 * This wrapper intercepts 401 responses and attempts to refresh the access token
 * using the refresh token. If successful, it retries the original request.
 */

/**
 * Token Refresh Queue - verhindert parallele Refresh-Requests.
 *
 * **Warum Klasse statt globaler Variablen:**
 * - `finally` muss Teil des Promises sein, nicht Teil des wartenden Codes
 * - Sonst führen ALLE wartenden Requests den finally-Block aus → Race Condition
 * - State-Cleanup passiert nur EINMAL, nachdem das Promise resolved
 */
class TokenRefreshQueue {
  private refreshPromise: Promise<boolean> | null = null;

  /**
   * Startet oder wartet auf laufenden Token-Refresh.
   *
   * @param refreshFn - Funktion die den Token-Refresh durchführt
   * @returns true wenn Refresh erfolgreich, false sonst
   */
  async startRefresh(refreshFn: () => Promise<boolean>): Promise<boolean> {
    // Wenn bereits ein Refresh läuft, warte auf dessen Ergebnis
    if (this.refreshPromise) {
      logger.debug('Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    // Starte neuen Refresh mit eingebautem Cleanup
    logger.debug('Starting new token refresh');
    this.refreshPromise = refreshFn().finally(() => {
      // Cleanup passiert nur EINMAL, nachdem alle Wartenden fertig sind
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }
}

const tokenRefreshQueue = new TokenRefreshQueue();

/**
 * Attempts to refresh the access token using the refresh token
 * Uses the generated API client instead of manual fetch
 * @returns Promise<boolean> - true if refresh was successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    // Use the generated API client for refresh
    const authApi = new AuthApi(
      new Configuration({
        basePath: getBaseUrl(),
        fetchApi: fetch, // Use standard fetch for refresh to avoid recursion
        credentials: 'include',
      }),
    );

    await authApi.authControllerRefresh();
    logger.debug('Token refresh successful');
    return true;
  } catch (error) {
    logger.warn('Token refresh failed', { error });
    return false;
  }
}

/**
 * Fuegt den Server Access Token Header hinzu falls vorhanden
 *
 * @param init - Bestehende RequestInit-Optionen
 * @returns Erweiterte RequestInit mit Server Access Token Header
 */
function addServerAccessTokenHeader(init: RequestInit): RequestInit {
  const token = getServerAccessToken();
  if (!token) {
    return init;
  }

  const existingHeaders = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : (init.headers as Record<string, string>) || {};

  return {
    ...init,
    headers: {
      ...existingHeaders,
      'X-Server-Access-Token': token,
    },
  };
}

/**
 * Prueft ob der Response ein Server-Access-Token-Problem ist
 *
 * Erkennt zwei Faelle:
 * 1. Token fehlt: "Server access token required"
 * 2. Token ungueltig: "Invalid or revoked server access token"
 *
 * In beiden Faellen soll das TokenRequiredModal erscheinen,
 * damit der User einen gueltigen Token eingeben kann.
 */
async function isServerAccessTokenRequired(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false;
  }

  try {
    // Clone um Body mehrfach lesen zu koennen
    const cloned = response.clone();
    const body = await cloned.json();
    const message = body?.message || body?.error || '';

    return isTokenErrorMessage(message);
  } catch {
    return false;
  }
}

/**
 * Prueft ob der Response ein SERVER_NOT_SETUP (503) Fehler ist
 *
 * Der Server wirft diesen Fehler wenn noch kein Admin-Setup durchgeführt wurde.
 * In diesem Fall soll zur Setup-Seite weitergeleitet werden.
 */
async function isServerNotSetupError(response: Response): Promise<boolean> {
  if (response.status !== 503) {
    return false;
  }

  try {
    // Clone um Body mehrfach lesen zu koennen
    const cloned = response.clone();
    const body = await cloned.json();
    return body?.error === 'SERVER_NOT_SETUP' || body?.message === 'SERVER_NOT_SETUP';
  } catch {
    return false;
  }
}

/**
 * Behandelt SERVER_NOT_SETUP (503) Fehler
 *
 * Cleart den alten Token (falls vorhanden) und redirectet zur Setup-Seite.
 * Nutzt zentrales Flag um mehrfache Redirects bei parallelen Requests zu verhindern.
 */
function handleServerNotSetup(): void {
  // Vermeide mehrfache Redirects bei parallelen Requests
  if (isSetupRedirectInProgress()) {
    return;
  }
  // Flag SOFORT setzen um Race Conditions zu verhindern
  setSetupRedirectInProgress(true);

  // Nicht redirecten wenn wir bereits auf der Setup-Seite sind
  if (window.location.pathname.startsWith('/setup')) {
    setSetupRedirectInProgress(false);
    return;
  }

  // Clear old token - backend was reset, old token is invalid
  clearServerAccessToken();
  logger.info('Server requires setup, clearing old token and redirecting to /setup');
  window.location.href = '/setup';
}

/**
 * Enhanced fetch function with automatic token refresh on 401
 *
 * Fuegt automatisch den Server Access Token Header hinzu und
 * behandelt Token-Refresh bei 401 Errors.
 *
 * @param input - The resource URL or Request object
 * @param init - Optional request initialization options
 * @returns Promise<Response> - The fetch response
 */
export async function fetchWithRefresh(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Always include credentials for cookie-based auth
  const baseInit: RequestInit = {
    ...init,
    credentials: 'include',
  };

  // Add Server Access Token header if available
  const enhancedInit = addServerAccessTokenHeader(baseInit);

  // Make the initial request
  let response = await fetch(input, enhancedInit);

  // Check for SERVER_NOT_SETUP (503) - redirect to setup page
  if (response.status === 503) {
    const isSetupRequired = await isServerNotSetupError(response);
    if (isSetupRequired) {
      handleServerNotSetup();
      // Response zurueckgeben damit Caller wissen dass Request fehlschlug
      return response;
    }
  }

  // Check if server access token is required
  if (response.status === 401) {
    const tokenRequired = await isServerAccessTokenRequired(response);
    if (tokenRequired) {
      logger.warn('Server access token required but not provided or invalid');
      // Signalisiere dass Token benoetigt wird (fuer UI)
      requestServerAccessToken();
      // Response zurueckgeben damit Error-Handler es verarbeiten kann
      return response;
    }

    // Standard 401 - try token refresh
    logger.debug('Received 401, attempting token refresh');

    // Queue-basierter Refresh: alle parallelen 401s warten auf EINEN Refresh
    const refreshSuccess = await tokenRefreshQueue.startRefresh(refreshAccessToken);

    if (refreshSuccess) {
      // Retry the original request with the new token
      logger.debug('Retrying original request after token refresh');
      response = await fetch(input, enhancedInit);
    } else {
      // Refresh failed, redirect to login
      logger.warn('Token refresh failed, redirecting to login');
      // The 401 will be handled by the error boundary/auth context
    }
  }

  return response;
}
