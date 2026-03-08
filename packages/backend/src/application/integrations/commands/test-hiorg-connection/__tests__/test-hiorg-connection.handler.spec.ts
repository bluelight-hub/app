// @ts-nocheck
/**
 * Unit Tests für TestHiOrgConnectionHandler.
 *
 * Testet den Verbindungstest zum HiOrg-Server mit automatischem Token-Refresh.
 *
 * @module application/integrations/commands/test-hiorg-connection/__tests__
 */

import { Result } from '@domain/common/result';
import { IntegrationCredential, INTEGRATION_TYPES, INTEGRATION_ERROR_CODES } from '@domain/integrations';
import type { IIntegrationCredentialRepository } from '@domain/integrations/repositories/i-integration-credential.repository';
import type { IHiOrgServerPort, HiOrgConnectionInfo } from '@domain/ports/i-hiorg-server.port';
import { TestHiOrgConnectionHandler } from '@application/integrations';
import { TestHiOrgConnectionCommand } from '@application/integrations';
import type { HiOrgTokenRefreshService, ValidTokenResult } from '@application/integrations';

describe('TestHiOrgConnectionHandler', () => {
  let handler: TestHiOrgConnectionHandler;
  let mockRepository: jest.Mocked<IIntegrationCredentialRepository>;
  let mockHiOrgPort: jest.Mocked<IHiOrgServerPort>;
  let mockTokenRefresh: jest.Mocked<HiOrgTokenRefreshService>;

  /**
   * Test-Fixture: Gültige Credentials für HiOrg-Server.
   */
  const createValidCredential = (): IntegrationCredential => {
    return IntegrationCredential.fromPersistence({
      id: 'test-credential-id',
      type: INTEGRATION_TYPES.HIORG_SERVER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      encryptedAccessToken: 'encrypted-access-token',
      encryptedRefreshToken: 'encrypted-refresh-token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    });
  };

  /**
   * Test-Fixture: ValidTokenResult vom Token-Refresh-Service.
   */
  const createValidTokenResult = (wasRefreshed = false): ValidTokenResult => ({
    accessToken: 'decrypted-access-token',
    credential: createValidCredential(),
    wasRefreshed,
  });

  /**
   * Test-Fixture: ConnectionInfo vom HiOrg-Server.
   */
  const createConnectionInfo = (): HiOrgConnectionInfo => ({
    organisationName: 'Test Organisation',
    testedAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findByType: jest.fn(),
      save: jest.fn(),
      deleteByType: jest.fn(),
    };

    mockHiOrgPort = {
      testConnection: jest.fn(),
      fetchPersons: jest.fn(),
    };

    mockTokenRefresh = {
      getValidAccessToken: jest.fn(),
    } as unknown as jest.Mocked<HiOrgTokenRefreshService>;

    handler = new TestHiOrgConnectionHandler(mockRepository, mockHiOrgPort, mockTokenRefresh);
  });

  describe('execute', () => {
    it('should fail when token refresh fails', async () => {
      // Given: Token-Refresh schlägt fehl
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.fail(`${INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND}: Keine Credentials`));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND);
      expect(mockHiOrgPort.testConnection).not.toHaveBeenCalled();
    });

    it('should use refreshed token for connection test', async () => {
      // Given: Token wurde refreshed
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      const tokenResult = createValidTokenResult(true);
      const connectionInfo = createConnectionInfo();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.testConnection.mockResolvedValue(Result.ok(connectionInfo));
      mockRepository.save.mockResolvedValue(Result.ok(tokenResult.credential.markConnectionTested()));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockHiOrgPort.testConnection).toHaveBeenCalledWith('decrypted-access-token');
    });

    it('should propagate HiOrgServerPort 401 error', async () => {
      // Given: HiOrg-Server gibt 401 zurück
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      const tokenResult = createValidTokenResult(false);

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.testConnection.mockResolvedValue(Result.fail('401: Token ungültig'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('401');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should propagate HiOrgServerPort 403 error', async () => {
      // Given: HiOrg-Server gibt 403 zurück
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      const tokenResult = createValidTokenResult(false);

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.testConnection.mockResolvedValue(Result.fail('403: Zugriff verweigert'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('403');
    });

    it('should propagate HiOrgServerPort 423 error', async () => {
      // Given: HiOrg-Server gibt 423 zurück (Feature gesperrt)
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      const tokenResult = createValidTokenResult(false);

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.testConnection.mockResolvedValue(Result.fail('423: Feature gesperrt'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('423');
    });

    it('should update credential.lastTestedAt on success', async () => {
      // Given: Erfolgreicher Connection Test
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      const tokenResult = createValidTokenResult(false);
      const connectionInfo = createConnectionInfo();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.testConnection.mockResolvedValue(Result.ok(connectionInfo));
      mockRepository.save.mockResolvedValue(Result.ok(tokenResult.credential.markConnectionTested()));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastTestedAt: expect.any(Date),
        }),
      );
    });

    it('should return connection info on success', async () => {
      // Given: Erfolgreicher Connection Test
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      const tokenResult = createValidTokenResult(false);
      const connectionInfo = createConnectionInfo();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.testConnection.mockResolvedValue(Result.ok(connectionInfo));
      mockRepository.save.mockResolvedValue(Result.ok(tokenResult.credential.markConnectionTested()));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        organisationName: 'Test Organisation',
        testedAt: expect.any(Date),
      });
    });

    it('should fail when tokenResult value is undefined', async () => {
      // Given: Token-Refresh gibt Success aber undefined value zurück
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(undefined as unknown as ValidTokenResult));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Access Token');
    });

    it('should fail when connectionResult value is undefined', async () => {
      // Given: Connection Test gibt Success aber undefined value zurück
      const command = TestHiOrgConnectionCommand.create({ userId: 'admin-user' }).value!;
      const tokenResult = createValidTokenResult(false);

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.testConnection.mockResolvedValue(Result.ok(undefined as unknown as HiOrgConnectionInfo));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Verbindungsinformationen');
    });
  });
});
