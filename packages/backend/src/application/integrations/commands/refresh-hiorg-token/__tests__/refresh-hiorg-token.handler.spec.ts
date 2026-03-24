// @ts-nocheck
/**
 * Unit Tests für RefreshHiOrgTokenHandler.
 *
 * @module application/integrations/commands/refresh-hiorg-token/__tests__
 */

import { Result } from '@domain/common/result';
import { IntegrationCredential, INTEGRATION_TYPES, INTEGRATION_ERROR_CODES } from '@domain/integrations';
import type { ILogger } from '@domain/ports/i-logger.port';
import { RefreshHiOrgTokenHandler } from '../refresh-hiorg-token.handler';
import { RefreshHiOrgTokenCommand } from '../refresh-hiorg-token.command';
import type { HiOrgTokenRefreshService, ValidTokenResult } from '@application/integrations/services';

describe('RefreshHiOrgTokenHandler', () => {
  let handler: RefreshHiOrgTokenHandler;
  let mockLogger: jest.Mocked<ILogger>;
  let mockTokenRefresh: jest.Mocked<HiOrgTokenRefreshService>;

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

  const createValidTokenResult = (wasRefreshed: boolean): ValidTokenResult => ({
    accessToken: 'decrypted-access-token',
    credential: createValidCredential(),
    wasRefreshed,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockTokenRefresh = {
      getValidAccessToken: jest.fn(),
    } as unknown as jest.Mocked<HiOrgTokenRefreshService>;

    handler = new RefreshHiOrgTokenHandler(mockLogger, mockTokenRefresh);
  });

  describe('execute', () => {
    it('should return refreshed=true when token was refreshed', async () => {
      const command = RefreshHiOrgTokenCommand.create({ userId: 'admin-user' }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(createValidTokenResult(true)));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.refreshed).toBe(true);
      expect(result.value!.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.value!.hasRefreshToken).toBe(true);
    });

    it('should return refreshed=false when token was still valid', async () => {
      const command = RefreshHiOrgTokenCommand.create({ userId: 'admin-user' }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(createValidTokenResult(false)));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.refreshed).toBe(false);
    });

    it('should fail when token refresh service fails', async () => {
      const command = RefreshHiOrgTokenCommand.create({ userId: 'admin-user' }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.fail(`${INTEGRATION_ERROR_CODES.OAUTH_TOKEN_REFRESH_FAILED}: Refresh fehlgeschlagen`));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.OAUTH_TOKEN_REFRESH_FAILED);
    });

    it('should fail when no credentials exist', async () => {
      const command = RefreshHiOrgTokenCommand.create({ userId: 'admin-user' }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.fail(`${INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND}: Keine Credentials`));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND);
    });

    it('should fail when tokenResult value is undefined', async () => {
      const command = RefreshHiOrgTokenCommand.create({ userId: 'admin-user' }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(undefined as unknown as ValidTokenResult));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });
  });

  describe('RefreshHiOrgTokenCommand', () => {
    it('should create command with valid userId', () => {
      const result = RefreshHiOrgTokenCommand.create({ userId: 'admin-user' });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.userId).toBe('admin-user');
    });

    it('should fail with empty userId', () => {
      const result = RefreshHiOrgTokenCommand.create({ userId: '' });
      expect(result.isFailure).toBe(true);
    });
  });
});
