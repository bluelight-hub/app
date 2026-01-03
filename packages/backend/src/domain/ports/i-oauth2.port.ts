/**
 * IOAuth2Port - Framework-agnostischer OAuth2 Flow Port.
 *
 * Abstrahiert den OAuth2 Authorization Code Flow mit PKCE (Proof Key for Code Exchange).
 * PKCE schützt vor Authorization Code Interception Attacks, insbesondere bei
 * öffentlichen Clients (Desktop Apps, Mobile Apps).
 *
 * **Clean Architecture:**
 * - Domain/Application Layer hängen von diesem Port ab (Dependency Inversion)
 * - Infrastructure Layer implementiert diesen Port mit konkreten HTTP-Clients
 * - Ermöglicht einfaches Testen (Mock OAuth) und Framework-Unabhängigkeit
 *
 * **OAuth2 Flow mit PKCE:**
 * 1. `generateAuthorizationUrl()` - Erstellt URL mit Code Challenge + State
 * 2. User authentifiziert sich beim Authorization Server
 * 3. `exchangeCodeForTokens()` - Tauscht Code + Code Verifier gegen Tokens
 * 4. `refreshAccessToken()` - Erneuert Access Token bei Ablauf
 *
 * **Sicherheitsanforderungen:**
 * - State muss serverseitig validiert werden (CSRF-Schutz)
 * - Code Verifier muss sicher (z.B. verschlüsselt) zwischengespeichert werden
 * - Refresh Tokens müssen verschlüsselt persistiert werden
 *
 * @module domain/ports
 */

import type { Result } from '@domain/common/result';

/**
 * OAuth2 Token Response vom Authorization Server.
 *
 * Enthält die Tokens nach erfolgreichem Authorization Code Exchange
 * oder Token Refresh.
 */
export interface OAuth2TokenResponse {
  /** Access Token für API-Requests (Bearer Token) */
  accessToken: string;

  /** Refresh Token für Token-Erneuerung (optional, je nach Grant Type) */
  refreshToken?: string;

  /** Token-Gültigkeit in Sekunden (typisch: 3600 = 1h) */
  expiresIn: number;

  /** Token-Typ (Standard: "Bearer") */
  tokenType: string;

  /** Gewährte Scopes (space-separated, optional) */
  scope?: string;
}

/**
 * OAuth2 Authorization URL Response.
 *
 * Enthält alle Daten, die für den Start des Authorization Flows benötigt werden.
 * State und Code Verifier müssen serverseitig gespeichert werden, um später
 * validiert bzw. beim Token Exchange verwendet werden zu können.
 */
export interface OAuth2AuthorizationUrlResponse {
  /** Vollständige Authorization URL für User-Redirect */
  authorizationUrl: string;

  /** State für CSRF-Schutz (muss im Callback validiert werden) */
  state: string;

  /**
   * PKCE Code Verifier (muss sicher gespeichert werden).
   *
   * Der Code Verifier wird beim Token Exchange benötigt, um zu beweisen,
   * dass derselbe Client den Flow initiiert hat. Sollte verschlüsselt
   * gespeichert werden (z.B. mit IEncryptionPort).
   */
  codeVerifier: string;
}

/**
 * OAuth2 Port Interface für Authorization Code Flow mit PKCE.
 *
 * Dieser Port definiert die Schnittstelle für OAuth2 Authorization Code Flow
 * mit PKCE-Erweiterung, wie er für HiOrg-Server und ähnliche Integrationen
 * benötigt wird.
 *
 * **Implementierung:**
 * Der Adapter in der Infrastructure Layer nutzt standardkonforme HTTP-Requests
 * gemäß RFC 6749 (OAuth 2.0) und RFC 7636 (PKCE).
 */
export interface IOAuth2Port {
  /**
   * Generiert Authorization URL mit PKCE Code Challenge.
   *
   * Erstellt eine vollständige Authorization URL mit:
   * - `response_type=code` (Authorization Code Flow)
   * - `code_challenge` + `code_challenge_method=S256` (PKCE)
   * - `state` für CSRF-Schutz (kryptografisch sichere Zufallszeichenkette)
   *
   * **Wichtig:** State und Code Verifier müssen serverseitig gespeichert werden,
   * um sie beim Callback validieren bzw. beim Token Exchange verwenden zu können.
   *
   * @param options - Konfiguration für die Authorization URL
   * @param options.authorizationUrl - Base URL des Authorization Endpoints
   * @param options.clientId - OAuth2 Client ID
   * @param options.redirectUri - Callback URL nach erfolgreicher Authentifizierung
   * @param options.scopes - Angeforderte Berechtigungen (z.B. ['read', 'write'])
   * @returns Authorization URL mit State und Code Verifier
   */
  generateAuthorizationUrl(options: { authorizationUrl: string; clientId: string; redirectUri: string; scopes: string[] }): OAuth2AuthorizationUrlResponse;

  /**
   * Tauscht Authorization Code gegen Access + Refresh Token.
   *
   * Nach erfolgreicher User-Authentifizierung beim Authorization Server
   * wird der Authorization Code gegen Tokens eingetauscht. Der Code Verifier
   * muss derselbe sein, der bei `generateAuthorizationUrl()` generiert wurde.
   *
   * **Fehlerbehandlung:**
   * - `OAUTH_CODE_EXCHANGE_FAILED` bei ungültigem Code oder abgelaufenem Code
   * - `OAUTH_NOT_CONFIGURED` wenn Client-Credentials fehlen
   * - `CONNECTION_FAILED` bei Netzwerkfehlern
   *
   * @param options - Parameter für den Token Exchange
   * @param options.code - Authorization Code aus dem Callback
   * @param options.codeVerifier - PKCE Code Verifier (aus generateAuthorizationUrl)
   * @param options.redirectUri - Dieselbe Redirect URI wie bei Authorization Request
   * @param options.clientId - OAuth2 Client ID
   * @param options.clientSecret - OAuth2 Client Secret
   * @param options.tokenUrl - URL des Token Endpoints
   * @returns Result mit Token Response oder Fehlercode
   */
  exchangeCodeForTokens(options: { code: string; codeVerifier: string; redirectUri: string; clientId: string; clientSecret: string; tokenUrl: string }): Promise<Result<OAuth2TokenResponse>>;

  /**
   * Refresht Access Token mittels Refresh Token.
   *
   * Wenn ein Access Token abgelaufen ist, kann mit dem Refresh Token
   * ein neuer Access Token angefordert werden, ohne dass der User
   * sich erneut authentifizieren muss.
   *
   * **Hinweis:** Nicht alle OAuth2 Provider geben einen neuen Refresh Token
   * zurück. Falls `refreshToken` in der Response fehlt, sollte der alte
   * Refresh Token weiter verwendet werden.
   *
   * **Fehlerbehandlung:**
   * - `OAUTH_TOKEN_REFRESH_FAILED` bei ungültigem oder widerrufenem Refresh Token
   * - `OAUTH_NOT_CONFIGURED` wenn Client-Credentials fehlen
   * - `CONNECTION_FAILED` bei Netzwerkfehlern
   *
   * @param options - Parameter für den Token Refresh
   * @param options.refreshToken - Der gespeicherte Refresh Token
   * @param options.clientId - OAuth2 Client ID
   * @param options.clientSecret - OAuth2 Client Secret
   * @param options.tokenUrl - URL des Token Endpoints
   * @returns Result mit Token Response oder Fehlercode
   */
  refreshAccessToken(options: { refreshToken: string; clientId: string; clientSecret: string; tokenUrl: string }): Promise<Result<OAuth2TokenResponse>>;
}
