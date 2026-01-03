/**
 * HiOrg-Server OAuth2 Konfiguration.
 *
 * Enthält die statischen OAuth2 Endpunkte und Standard-Scopes für die
 * HiOrg-Server API Integration. Client-ID und Client-Secret werden
 * über Environment-Variablen konfiguriert (nicht hier gespeichert!).
 *
 * **Scopes:**
 * - `organisation/selbst/stammdaten:read`: Lesen der eigenen Organisationsdaten
 * - `personal:read`: Lesen von Personaldaten (für Kräfte-Import)
 *
 * @see https://www.hiorg-server.de/dokumentation/api/
 * @module infrastructure/config
 */

/**
 * OAuth2 Konfiguration für HiOrg-Server Integration.
 *
 * Diese Konfiguration enthält die statischen URLs und Scopes.
 * Client-Credentials müssen separat über IntegrationCredentials
 * oder Environment-Variablen bereitgestellt werden.
 */
export const HIORG_OAUTH_CONFIG = {
  /** OAuth2 Authorization URL für User-Redirect */
  authorizationUrl: 'https://api.hiorg-server.de/oauth/v1/authorize',

  /** OAuth2 Token URL für Code Exchange und Token Refresh */
  tokenUrl: 'https://api.hiorg-server.de/oauth/v1/token',

  /**
   * Benötigte Scopes für Bluelight Hub.
   *
   * - `organisation/selbst/stammdaten:read`: Organisations-Stammdaten lesen
   * - `personal:read`: Personaldaten für Kräfte-Synchronisation
   */
  scopes: ['organisation/selbst/stammdaten:read', 'personal:read'],
} as const;

/** Typ für typsichere Verwendung der Konfiguration */
export type HiOrgOAuthConfig = typeof HIORG_OAUTH_CONFIG;
