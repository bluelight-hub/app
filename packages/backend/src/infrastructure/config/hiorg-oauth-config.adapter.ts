/**
 * HiOrgOAuthConfigAdapter - NestJS ConfigService Adapter für IHiOrgOAuthConfigPort.
 *
 * Implementiert den OAuth Config Port mit NestJS ConfigService,
 * um OAuth2 Client Credentials aus Umgebungsvariablen zu lesen.
 *
 * **Umgebungsvariablen:**
 * - HIORG_OAUTH_CLIENT_ID - OAuth2 Client ID
 * - HIORG_OAUTH_CLIENT_SECRET - OAuth2 Client Secret
 *
 * @module infrastructure/config
 */

import { Injectable } from '@nestjs/common';
// biome-ignore lint/style/useImportType: ConfigService needed for DI at runtime
import { ConfigService } from '@nestjs/config';
import type { IHiOrgOAuthConfigPort, HiOrgOAuthClientCredentials } from '@domain/ports/i-hiorg-oauth-config.port';

/**
 * Adapter für HiOrg OAuth2 Configuration.
 *
 * Nutzt NestJS ConfigService um Credentials aus ENV zu lesen.
 * Implementiert IHiOrgOAuthConfigPort für Clean Architecture.
 */
@Injectable()
export class HiOrgOAuthConfigAdapter implements IHiOrgOAuthConfigPort {
  constructor(private readonly config: ConfigService) {}

  /**
   * Prüft ob OAuth2 für HiOrg-Server konfiguriert ist.
   *
   * @returns true wenn HIORG_OAUTH_CLIENT_ID gesetzt ist
   */
  isConfigured(): boolean {
    const clientId = this.config.get<string>('HIORG_OAUTH_CLIENT_ID');
    return !!clientId && clientId.length > 0;
  }

  /**
   * Gibt die OAuth2 Client Credentials zurück.
   *
   * @returns Credentials oder undefined wenn nicht vollständig konfiguriert
   */
  getClientCredentials(): HiOrgOAuthClientCredentials | undefined {
    const clientId = this.config.get<string>('HIORG_OAUTH_CLIENT_ID');
    const clientSecret = this.config.get<string>('HIORG_OAUTH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return undefined;
    }

    return { clientId, clientSecret };
  }

  /**
   * Gibt die Client ID zurück.
   *
   * @returns Client ID oder undefined wenn nicht konfiguriert
   */
  getClientId(): string | undefined {
    return this.config.get<string>('HIORG_OAUTH_CLIENT_ID');
  }

  /**
   * Gibt die OAuth2 Redirect URI für den Callback zurück.
   *
   * Nutzt APP_URL aus der Konfiguration mit Fallback auf localhost.
   *
   * @returns Vollständige Redirect URI
   */
  getRedirectUri(): string {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3091');
    return `${appUrl}/api/oauth/hiorg/callback`;
  }
}
