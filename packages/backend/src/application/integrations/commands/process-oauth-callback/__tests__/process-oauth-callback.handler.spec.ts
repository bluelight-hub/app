/**
 * Unit Tests fuer ProcessOAuthCallbackHandler.
 *
 * Testet die Verarbeitung des OAuth2 Callbacks nach User-Authentifizierung.
 *
 * @module application/integrations/commands/process-oauth-callback/__tests__
 */

import { Result } from '@domain/common/result';
import { INTEGRATION_TYPES, INTEGRATION_ERROR_CODES, IntegrationCredential, OAuth2State } from '@domain/integrations';
import type { IOAuth2StateRepository } from '@domain/integrations/repositories/i-oauth2-state.repository';
import type { IIntegrationCredentialRepository } from '@domain/integrations/repositories/i-integration-credential.repository';
import type { IOAuth2Port, OAuth2TokenResponse } from '@domain/ports/i-oauth2.port';
import type { IEncryptionPort } from '@domain/ports/i-encryption.port';
import type { IHiOrgOAuthConfigPort, HiOrgOAuthClientCredentials } from '@domain/ports/i-hiorg-oauth-config.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ProcessOAuthCallbackHandler } from '../process-oauth-callback.handler';
import { ProcessOAuthCallbackCommand } from '../process-oauth-callback.command';

describe('ProcessOAuthCallbackHandler', () => {
  let handler: ProcessOAuthCallbackHandler;
  let mockLogger: jest.Mocked<ILogger>;
  let mockOAuth2: jest.Mocked<IOAuth2Port>;
  let mockStateRepository: jest.Mocked<IOAuth2StateRepository>;
  let mockCredentialRepository: jest.Mocked<IIntegrationCredentialRepository>;
  let mockEncryption: jest.Mocked<IEncryptionPort>;
  let mockOAuthConfig: jest.Mocked<IHiOrgOAuthConfigPort>;

  // Test-Fixtures
  const clientCredentials: HiOrgOAuthClientCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  const tokenResponse: OAuth2TokenResponse = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: 'read write',
  };

  /**
   * Erstellt einen gueltigen OAuth2State fuer Tests.
   */
  const createValidOAuth2State = (overrides?: { isExpired?: boolean }): OAuth2State => {
    const expiresAt = overrides?.isExpired ? new Date(Date.now() - 1000) : new Date(Date.now() + 10 * 60 * 1000);

    return OAuth2State.fromPersistence({
      id: 'state-id',
      state: 'valid-state-token',
      codeVerifier: 'test-code-verifier-mit-mindestens-43-zeichen-fuer-pkce-rfc7636',
      integrationType: INTEGRATION_TYPES.HIORG_SERVER,
      redirectUri: 'http://localhost:3091/api/oauth/hiorg/callback',
      createdBy: 'test-user-id',
      expiresAt,
      createdAt: new Date(),
    });
  };

  /**
   * Erstellt eine gueltige IntegrationCredential fuer Tests.
   */
  const createExistingCredential = (): IntegrationCredential => {
    return IntegrationCredential.fromPersistence({
      id: 'credential-id',
      type: INTEGRATION_TYPES.HIORG_SERVER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      encryptedAccessToken: 'old-encrypted-access-token',
      encryptedRefreshToken: 'old-encrypted-refresh-token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    mockOAuth2 = {
      generateAuthorizationUrl: jest.fn(),
      exchangeCodeForTokens: jest.fn().mockResolvedValue(Result.ok(tokenResponse)),
      refreshAccessToken: jest.fn(),
    };

    mockStateRepository = {
      save: jest.fn(),
      findByState: jest.fn().mockResolvedValue(Result.ok(createValidOAuth2State())),
      deleteByState: jest.fn().mockResolvedValue(Result.ok(undefined)),
      deleteExpired: jest.fn(),
    };

    mockCredentialRepository = {
      findByType: jest.fn().mockResolvedValue(Result.ok(undefined)),
      save: jest.fn().mockImplementation(async (cred) => Result.ok(cred)),
      deleteByType: jest.fn(),
    };

    mockEncryption = {
      encrypt: jest.fn((value) => `encrypted:${value}`),
      decrypt: jest.fn((value) => value.replace('encrypted:', '')),
    };

    mockOAuthConfig = {
      isConfigured: jest.fn().mockReturnValue(true),
      getClientCredentials: jest.fn().mockReturnValue(clientCredentials),
    };

    handler = new ProcessOAuthCallbackHandler(mockLogger, mockOAuth2, mockStateRepository, mockCredentialRepository, mockEncryption, mockOAuthConfig);
  });

  describe('execute', () => {
    it('sollte mit OAUTH_STATE_INVALID fehlschlagen wenn State nicht gefunden', async () => {
      // Given: State existiert nicht in DB
      mockStateRepository.findByState.mockResolvedValue(Result.ok(undefined));

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'auth-code',
        state: 'non-existent-state',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.OAUTH_STATE_INVALID);
      expect(result.error).toContain('Ungültiger OAuth State');
      expect(mockOAuth2.exchangeCodeForTokens).not.toHaveBeenCalled();
    });

    it('sollte State loeschen UND fehlschlagen wenn State abgelaufen ist', async () => {
      // Given: Abgelaufener State
      mockStateRepository.findByState.mockResolvedValue(Result.ok(createValidOAuth2State({ isExpired: true })));

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'auth-code',
        state: 'expired-state',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.OAUTH_STATE_INVALID);
      expect(result.error).toContain('abgelaufen');

      // State sollte trotzdem geloescht werden
      expect(mockStateRepository.deleteByState).toHaveBeenCalledWith('expired-state');
      expect(mockOAuth2.exchangeCodeForTokens).not.toHaveBeenCalled();
    });

    it('sollte mit OAUTH_NOT_CONFIGURED fehlschlagen wenn Client Credentials fehlen', async () => {
      // Given: Keine Client Credentials konfiguriert
      mockOAuthConfig.getClientCredentials.mockReturnValue(undefined);

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.OAUTH_NOT_CONFIGURED);

      // State sollte vor dem Fehler geloescht werden
      expect(mockStateRepository.deleteByState).toHaveBeenCalledWith('valid-state-token');
      expect(mockOAuth2.exchangeCodeForTokens).not.toHaveBeenCalled();
    });

    it('sollte State loeschen (One-Time-Use) wenn Token Exchange fehlschlaegt', async () => {
      // Given: Token Exchange schlaegt fehl
      mockOAuth2.exchangeCodeForTokens.mockResolvedValue(Result.fail('Token exchange failed'));

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'invalid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Token exchange failed');

      // State sollte auch bei Fehler geloescht werden (One-Time-Use)
      expect(mockStateRepository.deleteByState).toHaveBeenCalledWith('valid-state-token');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('sollte Tokens vor dem Speichern verschluesseln', async () => {
      // Given: Erfolgreicher Token Exchange
      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);

      // Pruefen, dass Tokens verschluesselt wurden
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('new-access-token');
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('new-refresh-token');

      // Pruefen, dass verschluesselte Tokens gespeichert wurden
      expect(mockCredentialRepository.save).toHaveBeenCalled();
      const savedCredential = mockCredentialRepository.save.mock.calls[0][0] as IntegrationCredential;
      expect(savedCredential.encryptedAccessToken).toBe('encrypted:new-access-token');
      expect(savedCredential.encryptedRefreshToken).toBe('encrypted:new-refresh-token');
    });

    it('sollte bestehende Credential aktualisieren (nicht neu erstellen)', async () => {
      // Given: Bestehende Credential existiert
      const existingCredential = createExistingCredential();
      mockCredentialRepository.findByType.mockResolvedValue(Result.ok(existingCredential));

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);

      // Pruefen, dass updateOAuthTokens aufgerufen wurde (nicht createFromOAuth)
      expect(mockCredentialRepository.save).toHaveBeenCalledTimes(1);
      const savedCredential = mockCredentialRepository.save.mock.calls[0][0] as IntegrationCredential;

      // ID sollte von existierender Credential stammen
      expect(savedCredential.id).toBe('credential-id');
      // Tokens sollten aktualisiert sein
      expect(savedCredential.encryptedAccessToken).toBe('encrypted:new-access-token');
    });

    it('sollte neue Credential erstellen wenn keine existiert', async () => {
      // Given: Keine bestehende Credential
      mockCredentialRepository.findByType.mockResolvedValue(Result.ok(undefined));

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockCredentialRepository.save).toHaveBeenCalledTimes(1);

      const savedCredential = mockCredentialRepository.save.mock.calls[0][0] as IntegrationCredential;
      // Neue Credential hat leere ID (wird von Repository generiert)
      expect(savedCredential.id).toBe('');
      expect(savedCredential.type).toBe(INTEGRATION_TYPES.HIORG_SERVER);
      expect(savedCredential.encryptedAccessToken).toBe('encrypted:new-access-token');
    });

    it('sollte OAuth2State nach erfolgreicher Verarbeitung immer loeschen', async () => {
      // Given: Erfolgreiche Verarbeitung
      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockStateRepository.deleteByState).toHaveBeenCalledWith('valid-state-token');
    });

    it('sollte fehlschlagen wenn Credential-Speicherung fehlschlaegt', async () => {
      // Given: Repository-Save schlaegt fehl
      mockCredentialRepository.save.mockResolvedValue(Result.fail('Database error'));

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });

    it('sollte korrekte Token-Ablaufzeit berechnen', async () => {
      // Given: Token Response mit expiresIn = 3600 Sekunden
      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const beforeExecution = Date.now();
      const result = await handler.execute(commandResult.value!);
      const afterExecution = Date.now();

      // Then
      expect(result.isSuccess).toBe(true);

      const savedCredential = mockCredentialRepository.save.mock.calls[0][0] as IntegrationCredential;
      const expiresAt = savedCredential.accessTokenExpiresAt!.getTime();

      // expiresAt sollte ca. 1 Stunde (3600 Sekunden) in der Zukunft liegen
      const expectedExpiryMin = beforeExecution + 3600 * 1000;
      const expectedExpiryMax = afterExecution + 3600 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiryMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedExpiryMax);
    });

    it('sollte Verschluesselungsfehler korrekt behandeln', async () => {
      // Given: Encryption schlaegt fehl
      mockEncryption.encrypt.mockImplementation(() => {
        throw new Error('Encryption key not available');
      });

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.ENCRYPTION_FAILED);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('sollte ohne Refresh Token funktionieren wenn Provider keinen liefert', async () => {
      // Given: Token Response ohne Refresh Token
      mockOAuth2.exchangeCodeForTokens.mockResolvedValue(
        Result.ok({
          ...tokenResponse,
          refreshToken: undefined,
        }),
      );

      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);

      // Nur Access Token sollte verschluesselt werden
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('new-access-token');
      expect(mockEncryption.encrypt).toHaveBeenCalledTimes(1);

      const savedCredential = mockCredentialRepository.save.mock.calls[0][0] as IntegrationCredential;
      expect(savedCredential.encryptedRefreshToken).toBeUndefined();
    });

    it('sollte codeVerifier und redirectUri aus OAuth2State verwenden', async () => {
      // Given: Gueltiger State
      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      await handler.execute(commandResult.value!);

      // Then
      expect(mockOAuth2.exchangeCodeForTokens).toHaveBeenCalledWith({
        code: 'valid-auth-code',
        codeVerifier: 'test-code-verifier-mit-mindestens-43-zeichen-fuer-pkce-rfc7636',
        redirectUri: 'http://localhost:3091/api/oauth/hiorg/callback',
        clientId: clientCredentials.clientId,
        clientSecret: clientCredentials.clientSecret,
        tokenUrl: expect.stringContaining('hiorg-server.de'),
      });
    });

    it('sollte Erfolg loggen nach erfolgreicher Token-Speicherung', async () => {
      // Given: Erfolgreiche Verarbeitung
      const commandResult = ProcessOAuthCallbackCommand.create({
        code: 'valid-auth-code',
        state: 'valid-state-token',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('OAuth2 tokens successfully saved'));
    });
  });
});
