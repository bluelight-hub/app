/**
 * IHiOrgOAuthConfigPort - Framework-agnostisches OAuth2 Config Interface.
 *
 * Abstrahiert den Zugriff auf OAuth2 Client Credentials für HiOrg-Server.
 * Ermöglicht dem Application Layer Config-Zugriff ohne direkte Abhängigkeit
 * von NestJS ConfigService.
 *
 * **Clean Architecture:**
 * - Application Layer hängt von diesem Port ab (Dependency Inversion)
 * - Infrastructure Layer implementiert mit ConfigService
 * - Ermöglicht einfaches Testen (Mock Config) und Framework-Unabhängigkeit
 *
 * @module domain/ports
 */

/**
 * OAuth2 Client Credentials.
 *
 * Diese Credentials werden vom HiOrg-Server Support ausgestellt
 * und in Umgebungsvariablen gespeichert.
 */
export interface HiOrgOAuthClientCredentials {
  /** OAuth2 Client ID (aus HIORG_OAUTH_CLIENT_ID ENV) */
  clientId: string;
  /** OAuth2 Client Secret (aus HIORG_OAUTH_CLIENT_SECRET ENV) */
  clientSecret: string;
}

/**
 * Port für HiOrg OAuth2 Configuration.
 *
 * Bietet Zugriff auf OAuth2 Client Credentials ohne Framework-Abhängigkeit.
 */
export interface IHiOrgOAuthConfigPort {
  /**
   * Prüft ob OAuth2 für HiOrg-Server konfiguriert ist.
   *
   * @returns true wenn HIORG_OAUTH_CLIENT_ID gesetzt ist
   */
  isConfigured(): boolean;

  /**
   * Gibt die OAuth2 Client Credentials zurück.
   *
   * @returns Credentials oder undefined wenn nicht konfiguriert
   */
  getClientCredentials(): HiOrgOAuthClientCredentials | undefined;

  /**
   * Gibt die Client ID zurück.
   *
   * Convenience-Methode um nur die Client ID ohne Secret zu erhalten.
   *
   * @returns Client ID oder undefined wenn nicht konfiguriert
   */
  getClientId(): string | undefined;

  /**
   * Gibt die OAuth2 Redirect URI für den Callback zurück.
   *
   * Basiert auf APP_URL und dem HiOrg OAuth Callback-Pfad.
   *
   * @returns Vollständige Redirect URI (z.B. "http://localhost:3091/api/oauth/hiorg/callback")
   */
  getRedirectUri(): string;
}
