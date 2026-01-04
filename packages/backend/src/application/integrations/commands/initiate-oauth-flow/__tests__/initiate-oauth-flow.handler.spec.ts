/**
 * Unit Tests fuer InitiateOAuthFlowHandler.
 *
 * Testet den Start des OAuth2 Authorization Code Flows mit PKCE.
 *
 * @module application/integrations/commands/initiate-oauth-flow/__tests__
 */

import { Result } from '@domain/common/result';
import { INTEGRATION_TYPES, INTEGRATION_ERROR_CODES } from '@domain/integrations';
import type { IOAuth2StateRepository } from '@domain/integrations/repositories/i-oauth2-state.repository';
import type { IOAuth2Port, OAuth2AuthorizationUrlResponse } from '@domain/ports/i-oauth2.port';
import type { IHiOrgOAuthConfigPort, HiOrgOAuthClientCredentials } from '@domain/ports/i-hiorg-oauth-config.port';
import { InitiateOAuthFlowHandler } from '../initiate-oauth-flow.handler';
import { InitiateOAuthFlowCommand } from '../initiate-oauth-flow.command';

describe('InitiateOAuthFlowHandler', () => {
  let handler: InitiateOAuthFlowHandler;
  let mockOAuth2: jest.Mocked<IOAuth2Port>;
  let mockStateRepository: jest.Mocked<IOAuth2StateRepository>;
  let mockOAuthConfig: jest.Mocked<IHiOrgOAuthConfigPort>;

  // Test-Fixture: Gueltige Authorization URL Response
  const validAuthResponse: OAuth2AuthorizationUrlResponse = {
    authorizationUrl: 'https://api.hiorg-server.de/oauth/v1/authorize?client_id=test-client&response_type=code',
    state: 'test-state-token-mit-mindestens-32-zeichen-fuer-csrf',
    codeVerifier: 'test-code-verifier-mit-mindestens-43-zeichen-fuer-pkce-rfc7636',
  };

  // Test-Fixture: Client Credentials
  const clientCredentials: HiOrgOAuthClientCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOAuth2 = {
      generateAuthorizationUrl: jest.fn().mockReturnValue(validAuthResponse),
      exchangeCodeForTokens: jest.fn(),
      refreshAccessToken: jest.fn(),
    };

    mockStateRepository = {
      save: jest.fn().mockResolvedValue(Result.ok({})),
      findByState: jest.fn(),
      deleteByState: jest.fn(),
      deleteExpired: jest.fn(),
    };

    mockOAuthConfig = {
      isConfigured: jest.fn().mockReturnValue(true),
      getClientCredentials: jest.fn().mockReturnValue(clientCredentials),
      getClientId: jest.fn().mockReturnValue('test-client-id'),
      getRedirectUri: jest.fn().mockReturnValue('http://localhost:3091/api/oauth/hiorg/callback'),
    };

    handler = new InitiateOAuthFlowHandler(mockOAuth2, mockStateRepository, mockOAuthConfig);
  });

  describe('execute', () => {
    it('sollte mit INVALID_INTEGRATION_TYPE fehlschlagen bei nicht unterstuetztem Typ', async () => {
      // Given: Command mit unbekanntem Integration Type
      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: 'UNKNOWN_TYPE',
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.INVALID_INTEGRATION_TYPE);
      expect(result.error).toContain('Unbekannter Integration Type');
      expect(mockOAuth2.generateAuthorizationUrl).not.toHaveBeenCalled();
    });

    it('sollte mit OAUTH_NOT_CONFIGURED fehlschlagen wenn Client ID fehlt', async () => {
      // Given: OAuthConfig gibt keine Client ID zurueck
      mockOAuthConfig.getClientId.mockReturnValue(undefined);

      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: INTEGRATION_TYPES.HIORG_SERVER,
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.OAUTH_NOT_CONFIGURED);
      expect(result.error).toContain('HIORG_OAUTH_CLIENT_ID');
      expect(mockOAuth2.generateAuthorizationUrl).not.toHaveBeenCalled();
    });

    it('sollte OAuth2State mit korrekter Ablaufzeit erstellen (10 Minuten)', async () => {
      // Given: Gueltige Konfiguration
      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: INTEGRATION_TYPES.HIORG_SERVER,
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const beforeExecution = Date.now();
      const result = await handler.execute(commandResult.value!);
      const afterExecution = Date.now();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockStateRepository.save).toHaveBeenCalledTimes(1);

      // Pruefen, dass OAuth2State mit expiresInMinutes: 10 erstellt wurde
      const savedState = mockStateRepository.save.mock.calls[0][0];
      expect(savedState).toBeDefined();
      expect(savedState.integrationType).toBe(INTEGRATION_TYPES.HIORG_SERVER);

      // expiresAt sollte ca. 10 Minuten in der Zukunft liegen
      const expectedExpiryMin = beforeExecution + 10 * 60 * 1000;
      const expectedExpiryMax = afterExecution + 10 * 60 * 1000;
      const actualExpiry = savedState.expiresAt.getTime();

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiryMin);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiryMax);
    });

    it('sollte Authorization URL mit allen erforderlichen Parametern zurueckgeben', async () => {
      // Given: Gueltige Konfiguration
      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: INTEGRATION_TYPES.HIORG_SERVER,
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.authorizationUrl).toBe(validAuthResponse.authorizationUrl);

      // Pruefen, dass generateAuthorizationUrl mit korrekten Parametern aufgerufen wurde
      expect(mockOAuth2.generateAuthorizationUrl).toHaveBeenCalledWith({
        authorizationUrl: 'https://api.hiorg-server.de/oauth/v1/authorize',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3091/api/oauth/hiorg/callback',
        scopes: ['organisation/selbst/stammdaten:read', 'personal:read'],
      });
    });

    it('sollte fehlschlagen wenn repository.save() fehlschlaegt', async () => {
      // Given: Repository-Save schlaegt fehl
      mockStateRepository.save.mockResolvedValue(Result.fail('Database connection error'));

      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: INTEGRATION_TYPES.HIORG_SERVER,
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
      expect(mockOAuth2.generateAuthorizationUrl).toHaveBeenCalled();
    });

    it('sollte redirectUri vom OAuthConfig Port nutzen', async () => {
      // Given: Konfiguration mit custom Redirect URI
      mockOAuthConfig.getRedirectUri.mockReturnValue('https://bluelight.example.com/api/oauth/hiorg/callback');

      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: INTEGRATION_TYPES.HIORG_SERVER,
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      await handler.execute(commandResult.value!);

      // Then
      expect(mockOAuth2.generateAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUri: 'https://bluelight.example.com/api/oauth/hiorg/callback',
        }),
      );
    });

    it('sollte State und CodeVerifier vom OAuth2Port korrekt im Repository speichern', async () => {
      // Given: Gueltige Konfiguration
      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: INTEGRATION_TYPES.HIORG_SERVER,
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      await handler.execute(commandResult.value!);

      // Then
      expect(mockStateRepository.save).toHaveBeenCalledTimes(1);
      const savedState = mockStateRepository.save.mock.calls[0][0];

      expect(savedState.state).toBe(validAuthResponse.state);
      expect(savedState.codeVerifier).toBe(validAuthResponse.codeVerifier);
      expect(savedState.createdBy).toBe('test-user-id');
    });

    it('sollte redirectUri im OAuth2State speichern', async () => {
      // Given: Gueltige Konfiguration
      const commandResult = InitiateOAuthFlowCommand.create({
        integrationType: INTEGRATION_TYPES.HIORG_SERVER,
        userId: 'test-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      await handler.execute(commandResult.value!);

      // Then
      const savedState = mockStateRepository.save.mock.calls[0][0];
      expect(savedState.redirectUri).toBe('http://localhost:3091/api/oauth/hiorg/callback');
    });
  });
});
