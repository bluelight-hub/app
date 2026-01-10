/**
 * Type definitions für URL-Parameter des Web-Onboardings.
 *
 * Diese Types werden verwendet wenn die Web-App mit URL-Parametern
 * aufgerufen wird (z.B. https://app.bluelight-hub.de?server=...&invite=...).
 *
 * @module features/server/types/url-params
 */

/**
 * URL-Parameter für Web-basiertes Server-Onboarding.
 *
 * **Verwendung:**
 * - Web-App wird mit URL-Parametern aufgerufen
 * - Parameter werden extrahiert und validiert
 * - Bei erfolgreicher Validierung wird automatisch Exchange-Prozess gestartet
 *
 * **Beispiel:**
 * ```
 * https://app.bluelight-hub.de?server=https://api.example.de&invite=INV_ABC12
 * ```
 *
 * **AC1 (Story 2.5):** Beide Parameter → Automatischer Exchange
 * **AC2 (Story 2.5):** Nur `server` → Prefill im ServerSetupForm
 */
export interface UrlParams {
  /**
   * Server-URL für die Backend-Verbindung.
   *
   * Muss eine gültige HTTP/HTTPS URL sein.
   * Optional - wenn fehlend, bleibt Form leer.
   *
   * @example "https://api.example.de"
   * @example "http://localhost:3091"
   */
  server?: string;

  /**
   * Invite-Code für Server-Exchange.
   *
   * Format: 8 Zeichen (A-Z, 0-9)
   * Optional - wenn fehlend, muss User manuell eingeben.
   *
   * @example "ABC12345"
   * @example "INV_XYZ1"
   */
  invite?: string;
}
