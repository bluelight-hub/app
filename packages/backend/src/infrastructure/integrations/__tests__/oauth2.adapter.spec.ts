/**
 * Unit Tests für OAuth2Adapter.
 *
 * Testet OAuth2 Authorization Code Flow mit PKCE (RFC 7636):
 * - Code Verifier Generierung (43 chars base64url)
 * - Code Challenge als SHA-256 Hash
 * - State Token Generierung (64 hex chars)
 * - Authorization URL Building
 * - Token Exchange
 * - Token Refresh
 *
 * @module infrastructure/integrations/__tests__
 */

import { createHash } from 'node:crypto';
import { INTEGRATION_ERROR_CODES, IntegrationError } from '@domain/integrations/common/integration-error-codes';
import { OAuth2Adapter } from '../oauth2.adapter';

describe('OAuth2Adapter', () => {
  let adapter: OAuth2Adapter;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new OAuth2Adapter();

    // Mock global fetch
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  /**
   * Erstellt ein Mock Response-Objekt für fetch.
   */
  const createMockResponse = (options: { status?: number; ok?: boolean; data?: unknown }) => {
    const { status = 200, ok = true, data = {} } = options;
    return {
      ok,
      status,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    } as unknown as Response;
  };

  describe('PKCE Code Verifier Generation', () => {
    it('sollte Code Verifier mit korrekter Länge generieren (43 chars base64url)', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);

      // Then
      // 32 bytes random → base64url encoding → 43 characters
      expect(result.codeVerifier).toHaveLength(43);
    });

    it('sollte Code Verifier als gültigen base64url String generieren', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);

      // Then
      // Base64URL erlaubt: A-Z, a-z, 0-9, -, _ (keine +, /, =)
      expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('sollte bei jedem Aufruf unterschiedliche Code Verifier generieren', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result1 = adapter.generateAuthorizationUrl(options);
      const result2 = adapter.generateAuthorizationUrl(options);

      // Then
      expect(result1.codeVerifier).not.toBe(result2.codeVerifier);
    });
  });

  describe('PKCE Code Challenge Generation', () => {
    it('sollte Code Challenge als SHA-256 Hash des Verifiers generieren', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);

      // Then - Manuell verifizieren dass Challenge = SHA256(Verifier) base64url
      const expectedChallenge = createHash('sha256').update(result.codeVerifier).digest('base64url');

      const url = new URL(result.authorizationUrl);
      const actualChallenge = url.searchParams.get('code_challenge');

      expect(actualChallenge).toBe(expectedChallenge);
    });

    it('sollte code_challenge_method als S256 setzen', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);
      const url = new URL(result.authorizationUrl);

      // Then
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });
  });

  describe('State Token Generation', () => {
    it('sollte State Token mit korrekter Länge generieren (64 hex chars)', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);

      // Then
      // 32 bytes random → hex encoding → 64 characters
      expect(result.state).toHaveLength(64);
    });

    it('sollte State Token als gültigen hex String generieren', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);

      // Then
      expect(result.state).toMatch(/^[0-9a-f]+$/);
    });

    it('sollte bei jedem Aufruf unterschiedliche State Tokens generieren', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result1 = adapter.generateAuthorizationUrl(options);
      const result2 = adapter.generateAuthorizationUrl(options);

      // Then
      expect(result1.state).not.toBe(result2.state);
    });
  });

  describe('Authorization URL Building', () => {
    it('sollte alle erforderlichen OAuth2 Parameter enthalten', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.hiorg-server.de/authorize',
        clientId: 'my-client-id',
        redirectUri: 'https://bluelight-hub.local/callback',
        scopes: ['personal:read', 'ausbildungen:read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);
      const url = new URL(result.authorizationUrl);

      // Then
      expect(url.origin).toBe('https://auth.hiorg-server.de');
      expect(url.pathname).toBe('/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe('my-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('https://bluelight-hub.local/callback');
      expect(url.searchParams.get('scope')).toBe('personal:read ausbildungen:read');
    });

    it('sollte PKCE Parameter in Authorization URL enthalten', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);
      const url = new URL(result.authorizationUrl);

      // Then
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('sollte State Parameter in Authorization URL enthalten', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);
      const url = new URL(result.authorizationUrl);

      // Then
      expect(url.searchParams.get('state')).toBe(result.state);
    });

    it('sollte leere Scopes als leeren String setzen', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: [],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);
      const url = new URL(result.authorizationUrl);

      // Then
      expect(url.searchParams.get('scope')).toBe('');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('sollte Tokens bei erfolgreicher Antwort zurückgeben', async () => {
      // Given
      const options = {
        code: 'auth-code-123',
        codeVerifier: 'code-verifier-abc',
        redirectUri: 'https://app.example.com/callback',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: {
            access_token: 'access-token-xyz',
            refresh_token: 'refresh-token-xyz',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'read write',
          },
        }),
      );

      // When
      const result = await adapter.exchangeCodeForTokens(options);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toMatchObject({
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-xyz',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read write',
      });
    });

    it('sollte korrekte Request-Parameter senden', async () => {
      // Given
      const options = {
        code: 'auth-code-123',
        codeVerifier: 'code-verifier-abc',
        redirectUri: 'https://app.example.com/callback',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: {
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        }),
      );

      // When
      await adapter.exchangeCodeForTokens(options);

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://auth.example.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          }),
        }),
      );

      // Body-Parameter prüfen
      const callArgs = fetchSpy.mock.calls[0][1];
      const body = new URLSearchParams(callArgs.body);
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('auth-code-123');
      expect(body.get('code_verifier')).toBe('code-verifier-abc');
      expect(body.get('redirect_uri')).toBe('https://app.example.com/callback');
      expect(body.get('client_id')).toBe('test-client');
      expect(body.get('client_secret')).toBe('test-secret');
    });

    it('sollte OAUTH_CODE_EXCHANGE_FAILED bei 400 Response zurückgeben', async () => {
      // Given
      const options = {
        code: 'invalid-code',
        codeVerifier: 'code-verifier',
        redirectUri: 'https://app.example.com/callback',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          status: 400,
          ok: false,
          data: { error: 'invalid_grant', error_description: 'Code expired' },
        }),
      );

      // When
      const result = await adapter.exchangeCodeForTokens(options);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.OAUTH_CODE_EXCHANGE_FAILED)).toBe(true);
    });

    it('sollte OAUTH_CODE_EXCHANGE_FAILED bei 401 Response zurückgeben', async () => {
      // Given
      const options = {
        code: 'auth-code',
        codeVerifier: 'code-verifier',
        redirectUri: 'https://app.example.com/callback',
        clientId: 'wrong-client',
        clientSecret: 'wrong-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 401, ok: false }));

      // When
      const result = await adapter.exchangeCodeForTokens(options);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.OAUTH_CODE_EXCHANGE_FAILED)).toBe(true);
    });

    it('sollte OAUTH_CODE_EXCHANGE_FAILED bei Netzwerkfehler zurückgeben', async () => {
      // Given
      const options = {
        code: 'auth-code',
        codeVerifier: 'code-verifier',
        redirectUri: 'https://app.example.com/callback',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      // When
      const result = await adapter.exchangeCodeForTokens(options);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.OAUTH_CODE_EXCHANGE_FAILED)).toBe(true);
    });
  });

  describe('refreshAccessToken', () => {
    it('sollte neue Tokens bei erfolgreicher Antwort zurückgeben', async () => {
      // Given
      const options = {
        refreshToken: 'old-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        }),
      );

      // When
      const result = await adapter.refreshAccessToken(options);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.accessToken).toBe('new-access-token');
      expect(result.value?.refreshToken).toBe('new-refresh-token');
    });

    it('sollte korrekte Request-Parameter senden', async () => {
      // Given
      const options = {
        refreshToken: 'my-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: {
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        }),
      );

      // When
      await adapter.refreshAccessToken(options);

      // Then
      const callArgs = fetchSpy.mock.calls[0][1];
      const body = new URLSearchParams(callArgs.body);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('my-refresh-token');
      expect(body.get('client_id')).toBe('test-client');
      expect(body.get('client_secret')).toBe('test-secret');
    });

    it('sollte OAUTH_TOKEN_REFRESH_FAILED bei 400 Response zurückgeben', async () => {
      // Given
      const options = {
        refreshToken: 'invalid-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          status: 400,
          ok: false,
          data: { error: 'invalid_grant' },
        }),
      );

      // When
      const result = await adapter.refreshAccessToken(options);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.OAUTH_TOKEN_REFRESH_FAILED)).toBe(true);
    });

    it('sollte OAUTH_TOKEN_REFRESH_FAILED bei widerrufenem Token zurückgeben', async () => {
      // Given
      const options = {
        refreshToken: 'revoked-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          status: 401,
          ok: false,
        }),
      );

      // When
      const result = await adapter.refreshAccessToken(options);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.OAUTH_TOKEN_REFRESH_FAILED)).toBe(true);
    });

    it('sollte OAUTH_TOKEN_REFRESH_FAILED bei Netzwerkfehler zurückgeben', async () => {
      // Given
      const options = {
        refreshToken: 'refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

      // When
      const result = await adapter.refreshAccessToken(options);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.OAUTH_TOKEN_REFRESH_FAILED)).toBe(true);
    });

    it('sollte Token Response auch ohne neuen Refresh Token akzeptieren', async () => {
      // Given
      const options = {
        refreshToken: 'current-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: {
            access_token: 'new-access-token',
            // Kein refresh_token in Response (manche Provider geben keinen neuen zurück)
            expires_in: 3600,
            token_type: 'Bearer',
          },
        }),
      );

      // When
      const result = await adapter.refreshAccessToken(options);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.accessToken).toBe('new-access-token');
      expect(result.value?.refreshToken).toBeUndefined();
    });
  });

  describe('PKCE RFC 7636 Compliance', () => {
    it('sollte Code Verifier mit mindestens 43 Zeichen generieren (RFC 7636 Minimum)', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);

      // Then - RFC 7636 verlangt 43-128 Zeichen
      expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(result.codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('sollte Code Challenge korrekt nach RFC 7636 berechnen', () => {
      // Given - Bekannter Test-Verifier aus RFC 7636 Appendix B
      // Wir können zwar nicht den internen Verifier kontrollieren,
      // aber wir können verifizieren dass die Berechnung korrekt ist

      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When
      const result = adapter.generateAuthorizationUrl(options);
      const url = new URL(result.authorizationUrl);
      const challenge = url.searchParams.get('code_challenge');

      // Then - Manuell den erwarteten Challenge-Wert berechnen
      const expectedChallenge = createHash('sha256').update(result.codeVerifier).digest('base64url');

      expect(challenge).toBe(expectedChallenge);
    });

    it('sollte nur erlaubte base64url Zeichen in Code Verifier verwenden', () => {
      // Given
      const options = {
        authorizationUrl: 'https://auth.example.com/authorize',
        clientId: 'test-client',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['read'],
      };

      // When - Mehrfach generieren für statistische Sicherheit
      for (let i = 0; i < 10; i++) {
        const result = adapter.generateAuthorizationUrl(options);

        // Then - Nur A-Z, a-z, 0-9, -, _ erlaubt (kein +, /, =)
        expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);

        // Darf NICHT enthalten: +, /, = (Standard Base64 Zeichen)
        expect(result.codeVerifier).not.toMatch(/[+/=]/);
      }
    });
  });
});
