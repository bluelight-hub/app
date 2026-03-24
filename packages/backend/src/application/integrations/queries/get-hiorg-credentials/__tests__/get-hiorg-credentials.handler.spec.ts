// @ts-nocheck
/**
 * Unit Tests für GetHiOrgCredentialsHandler.
 *
 * Testet das Laden des HiOrg-Server OAuth2-Verbindungsstatus.
 *
 * **Wichtig:** Dieser Handler darf NIEMALS Token-Werte zurückgeben!
 *
 * @module application/integrations/queries/get-hiorg-credentials/__tests__
 */

import { Result } from '@domain/common/result';
import { IntegrationCredential, INTEGRATION_TYPES } from '@domain/integrations';
import type { IIntegrationCredentialRepository } from '@domain/integrations/repositories/i-integration-credential.repository';
import { GetHiOrgCredentialsHandler, type HiOrgCredentialsDto } from '@application/integrations';
import { GetHiOrgCredentialsQuery } from '@application/integrations';

describe('GetHiOrgCredentialsHandler', () => {
  let handler: GetHiOrgCredentialsHandler;
  let mockRepository: jest.Mocked<IIntegrationCredentialRepository>;

  /**
   * Test-Fixture: Credentials mit OAuth Tokens.
   */
  const createCredentialWithTokens = (overrides?: Partial<{ isActive: boolean }>): IntegrationCredential => {
    return IntegrationCredential.fromPersistence({
      id: 'test-credential-id',
      type: INTEGRATION_TYPES.HIORG_SERVER,
      isActive: overrides?.isActive ?? true,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-15T14:30:00Z'),
      lastTestedAt: new Date('2024-01-10T12:00:00Z'),
      lastSyncAt: new Date('2024-01-14T08:00:00Z'),
      encryptedAccessToken: 'encrypted-access-token-value',
      encryptedRefreshToken: 'encrypted-refresh-token-value',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    });
  };

  /**
   * Test-Fixture: Credentials ohne OAuth Tokens.
   */
  const createCredentialWithoutTokens = (): IntegrationCredential => {
    return IntegrationCredential.fromPersistence({
      id: 'test-credential-id',
      type: INTEGRATION_TYPES.HIORG_SERVER,
      isActive: true,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-15T14:30:00Z'),
      // Keine OAuth Tokens
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findByType: jest.fn(),
      save: jest.fn(),
      deleteByType: jest.fn(),
    };

    handler = new GetHiOrgCredentialsHandler(mockRepository);
  });

  describe('execute', () => {
    it('should return undefined when no credentials exist', async () => {
      // Given: Keine Credentials vorhanden
      const query = GetHiOrgCredentialsQuery.create().value!;
      mockRepository.findByType.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
      expect(mockRepository.findByType).toHaveBeenCalledWith(INTEGRATION_TYPES.HIORG_SERVER);
    });

    it('should return DTO with hasOAuthTokens=true when tokens exist', async () => {
      // Given: Credentials mit OAuth Tokens
      const query = GetHiOrgCredentialsQuery.create().value!;
      const credential = createCredentialWithTokens();
      mockRepository.findByType.mockResolvedValue(Result.ok(credential));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.hasOAuthTokens).toBe(true);
      expect(result.value?.isActive).toBe(true);
      expect(result.value?.lastTestedAt).toEqual(new Date('2024-01-10T12:00:00Z'));
      expect(result.value?.lastSyncAt).toEqual(new Date('2024-01-14T08:00:00Z'));
    });

    it('should return DTO with hasOAuthTokens=false when no tokens', async () => {
      // Given: Credentials ohne OAuth Tokens
      const query = GetHiOrgCredentialsQuery.create().value!;
      const credential = createCredentialWithoutTokens();
      mockRepository.findByType.mockResolvedValue(Result.ok(credential));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.hasOAuthTokens).toBe(false);
    });

    it('should NEVER return actual token values (security!)', async () => {
      // Given: Credentials mit verschluesselten Tokens
      const query = GetHiOrgCredentialsQuery.create().value!;
      const credential = createCredentialWithTokens();
      mockRepository.findByType.mockResolvedValue(Result.ok(credential));

      // When
      const result = await handler.execute(query);

      // Then: DTO darf KEINE Token-Werte enthalten
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();

      const dto = result.value as HiOrgCredentialsDto;

      // Explizite Pruefung dass keine Token-Properties existieren
      expect(dto).not.toHaveProperty('accessToken');
      expect(dto).not.toHaveProperty('refreshToken');
      expect(dto).not.toHaveProperty('encryptedAccessToken');
      expect(dto).not.toHaveProperty('encryptedRefreshToken');
      expect(dto).not.toHaveProperty('token');
      expect(dto).not.toHaveProperty('apiToken');

      // Nur erlaubte Properties pruefen
      const allowedKeys = ['hasOAuthTokens', 'isActive', 'lastTestedAt', 'lastSyncAt', 'isAccessTokenExpired', 'accessTokenExpiresAt', 'hasRefreshToken'];
      const actualKeys = Object.keys(dto);
      for (const key of actualKeys) {
        expect(allowedKeys).toContain(key);
      }

      // Keine Strings die "token" enthalten sollten in Values sein
      const values = Object.values(dto);
      for (const value of values) {
        if (typeof value === 'string') {
          expect(value.toLowerCase()).not.toContain('token');
          expect(value.toLowerCase()).not.toContain('encrypted');
        }
      }
    });

    it('should propagate repository errors', async () => {
      // Given: Repository wirft Fehler
      const query = GetHiOrgCredentialsQuery.create().value!;
      mockRepository.findByType.mockResolvedValue(Result.fail('Database connection error'));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
    });

    it('should return correct isActive status when inactive', async () => {
      // Given: Deaktivierte Credentials
      const query = GetHiOrgCredentialsQuery.create().value!;
      const credential = createCredentialWithTokens({ isActive: false });
      mockRepository.findByType.mockResolvedValue(Result.ok(credential));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.isActive).toBe(false);
    });

    it('should handle missing lastTestedAt and lastSyncAt', async () => {
      // Given: Credentials ohne Test- und Sync-Datum
      const query = GetHiOrgCredentialsQuery.create().value!;
      const credential = IntegrationCredential.fromPersistence({
        id: 'test-credential-id',
        type: INTEGRATION_TYPES.HIORG_SERVER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        encryptedAccessToken: 'encrypted-token',
        // Kein lastTestedAt oder lastSyncAt
      });
      mockRepository.findByType.mockResolvedValue(Result.ok(credential));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.lastTestedAt).toBeUndefined();
      expect(result.value?.lastSyncAt).toBeUndefined();
    });
  });
});
