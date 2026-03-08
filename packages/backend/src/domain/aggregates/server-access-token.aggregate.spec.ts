// @ts-nocheck
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { ServerAccessTokenCreatedEvent } from '@domain/events/server-access-token-created.event';
import { ServerAccessTokenRevokedEvent } from '@domain/events/server-access-token-revoked.event';
import { ServerAccessTokenUsedEvent } from '@domain/events/server-access-token-used.event';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import { TokenHash } from '@domain/value-objects/token-hash';

// Mock CUID2 for Jest compatibility (ESM module issue)
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
}));

// Valid bcrypt hash for tests (60 chars, cost factor 10)
const VALID_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

describe('ServerAccessToken', () => {
  let validTokenHash: TokenHash;

  beforeEach(() => {
    jest.clearAllMocks();
    validTokenHash = TokenHash.create(VALID_HASH).value!;
  });

  describe('create() - Factory Method', () => {
    it('should create token with required props only', () => {
      // Given: Only required tokenHash
      const props = { tokenHash: validTokenHash };

      // When: Creating ServerAccessToken
      const result = ServerAccessToken.create(props);

      // Then: Success with defaults
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.tokenHash.value).toBe(VALID_HASH);
      expect(result.value?.name).toBeNull();
      expect(result.value?.lastUsedAt).toBeNull();
      expect(result.value?.expiresAt).toBeNull();
      expect(result.value?.isRevoked).toBe(false);
      expect(result.value?.revokedAt).toBeNull();
    });

    it('should create token with all optional props', () => {
      // Given: All props including optionals
      const expiresAt = new Date('2025-12-31');
      const props = {
        tokenHash: validTokenHash,
        name: 'HiOrg Integration',
        expiresAt,
      };

      // When: Creating ServerAccessToken
      const result = ServerAccessToken.create(props);

      // Then: Success with provided values
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe('HiOrg Integration');
      expect(result.value?.expiresAt).toEqual(expiresAt);
    });

    it('should generate unique AccessTokenId with blh_ prefix', () => {
      // Given: Valid props
      const props = { tokenHash: validTokenHash };

      // When: Creating two tokens
      const result1 = ServerAccessToken.create(props);
      const result2 = ServerAccessToken.create(props);

      // Then: Both have unique IDs with blh_ prefix
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value?.id.value).toMatch(/^blh_[a-z0-9]{24}$/);
      expect(result2.value?.id.value).toMatch(/^blh_[a-z0-9]{24}$/);
      expect(result1.value?.id.value).not.toBe(result2.value?.id.value);
    });

    it('should reject name exceeding 100 characters', () => {
      // Given: Name with 101 characters
      const longName = 'a'.repeat(101);
      const props = {
        tokenHash: validTokenHash,
        name: longName,
      };

      // When: Creating ServerAccessToken
      const result = ServerAccessToken.create(props);

      // Then: Failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('maximal 100 Zeichen');
    });

    it('should accept name with exactly 100 characters', () => {
      // Given: Name with exactly 100 characters
      const exactName = 'a'.repeat(100);
      const props = {
        tokenHash: validTokenHash,
        name: exactName,
      };

      // When: Creating ServerAccessToken
      const result = ServerAccessToken.create(props);

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe(exactName);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      // Given: Valid props
      const before = new Date();
      const props = { tokenHash: validTokenHash };

      // When: Creating ServerAccessToken
      const result = ServerAccessToken.create(props);
      const after = new Date();

      // Then: Timestamps are set
      expect(result.isSuccess).toBe(true);
      expect(result.value?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.value?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.value?.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('reconstruct() - Database Reconstruction', () => {
    it('should reconstruct token with all fields', () => {
      // Given: All fields from database
      const id = AccessTokenId.create('blh_abcdefghij1234567890abcd').value!;
      const rotatedFromId = AccessTokenId.create('blh_originaltokenid123456789').value!;
      const lastUsedAt = new Date('2025-01-01');
      const expiresAt = new Date('2025-12-31');
      const revokedAt = new Date('2025-06-15');
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2025-06-15');

      // When: Reconstructing
      const token = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: 'Test Token',
        lastUsedAt,
        expiresAt,
        isRevoked: true,
        revokedAt,
        rotatedFromId,
        createdAt,
        updatedAt,
      });

      // Then: All fields are set correctly
      expect(token.id.value).toBe('blh_abcdefghij1234567890abcd');
      expect(token.tokenHash.value).toBe(VALID_HASH);
      expect(token.name).toBe('Test Token');
      expect(token.lastUsedAt).toEqual(lastUsedAt);
      expect(token.expiresAt).toEqual(expiresAt);
      expect(token.isRevoked).toBe(true);
      expect(token.revokedAt).toEqual(revokedAt);
      expect(token.rotatedFromId?.value).toBe('blh_originaltokenid123456789');
      expect(token.createdAt).toEqual(createdAt);
      expect(token.updatedAt).toEqual(updatedAt);
    });

    it('should reconstruct token with null optional fields', () => {
      // Given: Null optional fields
      const id = AccessTokenId.create('blh_abcdefghij1234567890abcd').value!;
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-01');

      // When: Reconstructing
      const token = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: null,
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        rotatedFromId: null,
        createdAt,
        updatedAt,
      });

      // Then: Null fields are preserved
      expect(token.name).toBeNull();
      expect(token.lastUsedAt).toBeNull();
      expect(token.expiresAt).toBeNull();
      expect(token.revokedAt).toBeNull();
      expect(token.rotatedFromId).toBeNull();
    });
  });

  describe('rotatedFromId - Token Rotation Tracking', () => {
    it('should create token with rotatedFromId when provided', () => {
      // Given: Original token ID for rotation reference
      const originalTokenId = AccessTokenId.create().value!;
      const props = {
        tokenHash: validTokenHash,
        name: 'Rotated Token',
        rotatedFromId: originalTokenId,
      };

      // When: Creating ServerAccessToken with rotatedFromId
      const result = ServerAccessToken.create(props);

      // Then: Token has rotatedFromId set
      expect(result.isSuccess).toBe(true);
      expect(result.value?.rotatedFromId).not.toBeNull();
      expect(result.value?.rotatedFromId?.equals(originalTokenId)).toBe(true);
    });

    it('should create token without rotatedFromId by default', () => {
      // Given: Props without rotatedFromId
      const props = { tokenHash: validTokenHash };

      // When: Creating ServerAccessToken
      const result = ServerAccessToken.create(props);

      // Then: rotatedFromId is null
      expect(result.isSuccess).toBe(true);
      expect(result.value?.rotatedFromId).toBeNull();
    });

    it('should preserve rotatedFromId on reconstruct', () => {
      // Given: Reconstructed token with rotatedFromId
      const id = AccessTokenId.create().value!;
      const originalTokenId = AccessTokenId.create('blh_originaltokenid123456789').value!;
      const createdAt = new Date();

      // When: Reconstructing
      const token = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: 'Rotated Token',
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        rotatedFromId: originalTokenId,
        createdAt,
        updatedAt: createdAt,
      });

      // Then: rotatedFromId is preserved
      expect(token.rotatedFromId?.value).toBe('blh_originaltokenid123456789');
    });
  });

  describe('wasRotated()', () => {
    it('should return true when token was created from rotation', () => {
      // Given: Token with rotatedFromId
      const originalTokenId = AccessTokenId.create().value!;
      const token = ServerAccessToken.create({
        tokenHash: validTokenHash,
        rotatedFromId: originalTokenId,
      }).value!;

      // When/Then
      expect(token.wasRotated()).toBe(true);
    });

    it('should return false when token was created normally', () => {
      // Given: Token without rotatedFromId
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When/Then
      expect(token.wasRotated()).toBe(false);
    });

    it('should return true for reconstructed rotated token', () => {
      // Given: Reconstructed token with rotatedFromId
      const id = AccessTokenId.create().value!;
      const originalTokenId = AccessTokenId.create().value!;
      const createdAt = new Date();

      const token = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: null,
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        rotatedFromId: originalTokenId,
        createdAt,
        updatedAt: createdAt,
      });

      // When/Then
      expect(token.wasRotated()).toBe(true);
    });

    it('should return false for reconstructed non-rotated token', () => {
      // Given: Reconstructed token without rotatedFromId
      const id = AccessTokenId.create().value!;
      const createdAt = new Date();

      const token = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: null,
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        rotatedFromId: null,
        createdAt,
        updatedAt: createdAt,
      });

      // When/Then
      expect(token.wasRotated()).toBe(false);
    });
  });

  describe('isValid()', () => {
    it('should return true for active non-expired token', () => {
      // Given: Active token without expiry
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When/Then
      expect(token.isValid()).toBe(true);
    });

    it('should return true for active token with future expiry', () => {
      // Given: Active token with future expiry
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const token = ServerAccessToken.create({
        tokenHash: validTokenHash,
        expiresAt: futureDate,
      }).value!;

      // When/Then
      expect(token.isValid()).toBe(true);
    });

    it('should return false for revoked token', () => {
      // Given: Revoked token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      token.revoke();

      // When/Then
      expect(token.isValid()).toBe(false);
    });

    it('should return false for expired token', () => {
      // Given: Expired token (reconstructed with past expiry)
      const id = AccessTokenId.create().value!;
      const pastDate = new Date('2020-01-01');
      const token = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: null,
        lastUsedAt: null,
        expiresAt: pastDate,
        isRevoked: false,
        revokedAt: null,
        rotatedFromId: null,
        createdAt: new Date('2019-01-01'),
        updatedAt: new Date('2019-01-01'),
      });

      // When/Then
      expect(token.isValid()).toBe(false);
    });

    it('should return false for revoked AND expired token', () => {
      // Given: Both revoked and expired
      const id = AccessTokenId.create().value!;
      const pastDate = new Date('2020-01-01');
      const token = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: null,
        lastUsedAt: null,
        expiresAt: pastDate,
        isRevoked: true,
        revokedAt: new Date('2020-06-01'),
        rotatedFromId: null,
        createdAt: new Date('2019-01-01'),
        updatedAt: new Date('2020-06-01'),
      });

      // When/Then
      expect(token.isValid()).toBe(false);
    });
  });

  describe('recordUsage()', () => {
    it('should update lastUsedAt timestamp', () => {
      // Given: Fresh token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      expect(token.lastUsedAt).toBeNull();
      const beforeUsage = new Date();

      // When: Recording usage
      token.recordUsage();
      const afterUsage = new Date();

      // Then: lastUsedAt is set
      expect(token.lastUsedAt).not.toBeNull();
      expect(token.lastUsedAt?.getTime()).toBeGreaterThanOrEqual(beforeUsage.getTime());
      expect(token.lastUsedAt?.getTime()).toBeLessThanOrEqual(afterUsage.getTime());
    });

    it('should update updatedAt timestamp', () => {
      // Given: Token with known updatedAt
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      const _originalUpdatedAt = token.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      const beforeUsage = new Date();

      // When: Recording usage
      token.recordUsage();

      // Then: updatedAt is updated
      expect(token.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUsage.getTime());
    });

    it('should allow multiple usage recordings', () => {
      // Given: Token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When: Recording usage multiple times
      token.recordUsage();
      const firstUsage = token.lastUsedAt;

      // Small delay to ensure different timestamps
      token.recordUsage();
      const secondUsage = token.lastUsedAt;

      // Then: Both recordings work
      expect(firstUsage).not.toBeNull();
      expect(secondUsage).not.toBeNull();
      expect(secondUsage?.getTime()).toBeGreaterThanOrEqual(firstUsage?.getTime());
    });
  });

  describe('revoke()', () => {
    it('should set isRevoked to true', () => {
      // Given: Active token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      expect(token.isRevoked).toBe(false);

      // When: Revoking
      const result = token.revoke();

      // Then: Token is revoked
      expect(result.isSuccess).toBe(true);
      expect(token.isRevoked).toBe(true);
    });

    it('should set revokedAt timestamp', () => {
      // Given: Active token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      expect(token.revokedAt).toBeNull();
      const beforeRevoke = new Date();

      // When: Revoking
      token.revoke();
      const afterRevoke = new Date();

      // Then: revokedAt is set
      expect(token.revokedAt).not.toBeNull();
      expect(token.revokedAt?.getTime()).toBeGreaterThanOrEqual(beforeRevoke.getTime());
      expect(token.revokedAt?.getTime()).toBeLessThanOrEqual(afterRevoke.getTime());
    });

    it('should be idempotent (multiple revokes dont fail)', () => {
      // Given: Revoked token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      token.revoke();
      const firstRevokedAt = token.revokedAt;

      // When: Revoking again
      const result = token.revoke();

      // Then: Success (idempotent) and revokedAt unchanged
      expect(result.isSuccess).toBe(true);
      expect(token.revokedAt).toEqual(firstRevokedAt);
    });

    it('should make token invalid', () => {
      // Given: Valid token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      expect(token.isValid()).toBe(true);

      // When: Revoking
      token.revoke();

      // Then: Token is invalid
      expect(token.isValid()).toBe(false);
    });
  });

  describe('updateName()', () => {
    it('should update name successfully', () => {
      // Given: Token without name
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When: Updating name
      const result = token.updateName('New Name');

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(token.name).toBe('New Name');
    });

    it('should allow setting name to null', () => {
      // Given: Token with name
      const token = ServerAccessToken.create({
        tokenHash: validTokenHash,
        name: 'Original Name',
      }).value!;

      // When: Setting name to null
      const result = token.updateName(null);

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(token.name).toBeNull();
    });

    it('should reject name exceeding 100 characters', () => {
      // Given: Token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      const longName = 'a'.repeat(101);

      // When: Updating with long name
      const result = token.updateName(longName);

      // Then: Failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('maximal 100 Zeichen');
    });

    it('should update updatedAt timestamp', () => {
      // Given: Token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      const beforeUpdate = new Date();

      // When: Updating name
      token.updateName('New Name');

      // Then: updatedAt is updated
      expect(token.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('equals()', () => {
    it('should return true for same ID', () => {
      // Given: Two tokens with same ID (via reconstruct)
      const id = AccessTokenId.create().value!;
      const createdAt = new Date();
      const token1 = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: 'Token 1',
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        rotatedFromId: null,
        createdAt,
        updatedAt: createdAt,
      });
      const token2 = ServerAccessToken.reconstruct({
        id,
        tokenHash: validTokenHash,
        name: 'Token 2', // Different name, same ID
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        rotatedFromId: null,
        createdAt,
        updatedAt: createdAt,
      });

      // When/Then: Same ID = equal
      expect(token1.equals(token2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      // Given: Two tokens with different IDs
      const token1 = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
      const token2 = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When/Then: Different IDs = not equal
      expect(token1.equals(token2)).toBe(false);
    });

    it('should return true for same instance', () => {
      // Given: Same token instance
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When/Then
      expect(token.equals(token)).toBe(true);
    });

    it('should return false for null', () => {
      // Given: Token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When/Then
      expect(token.equals(null as unknown as ServerAccessToken)).toBe(false);
    });

    it('should return false for undefined', () => {
      // Given: Token
      const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

      // When/Then
      expect(token.equals(undefined)).toBe(false);
    });
  });

  describe('Domain Events', () => {
    describe('create() - ServerAccessTokenCreatedEvent', () => {
      it('should emit ServerAccessTokenCreatedEvent on create', () => {
        // Given/When: Creating token
        const token = ServerAccessToken.create({
          tokenHash: validTokenHash,
          name: 'Test Token',
          expiresAt: new Date('2025-12-31'),
        }).value!;

        // Then: One event emitted
        const events = token.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(ServerAccessTokenCreatedEvent);

        const event = events[0] as ServerAccessTokenCreatedEvent;
        expect(event.tokenId.equals(token.id)).toBe(true);
        expect(event.name).toBe('Test Token');
        expect(event.expiresAt).toEqual(new Date('2025-12-31'));
        expect(event.aggregateId).toBe(token.id.toString());
      });

      it('should emit event with null name and expiresAt if not provided', () => {
        // Given/When: Creating token without optional props
        const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;

        // Then: Event has null values
        const events = token.getDomainEvents();
        expect(events).toHaveLength(1);

        const event = events[0] as ServerAccessTokenCreatedEvent;
        expect(event.name).toBeNull();
        expect(event.expiresAt).toBeNull();
      });
    });

    describe('recordUsage() - ServerAccessTokenUsedEvent', () => {
      it('should emit ServerAccessTokenUsedEvent on recordUsage', () => {
        // Given: Token with cleared events
        const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
        token.clearDomainEvents();

        // When: Recording usage
        token.recordUsage();

        // Then: One usage event emitted
        const events = token.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(ServerAccessTokenUsedEvent);

        const event = events[0] as ServerAccessTokenUsedEvent;
        expect(event.tokenId.equals(token.id)).toBe(true);
        expect(event.usedAt).toEqual(token.lastUsedAt);
      });

      it('should emit event for each recordUsage call', () => {
        // Given: Token with cleared events
        const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
        token.clearDomainEvents();

        // When: Recording usage twice
        token.recordUsage();
        token.recordUsage();

        // Then: Two events emitted
        const events = token.getDomainEvents();
        expect(events).toHaveLength(2);
        expect(events[0]).toBeInstanceOf(ServerAccessTokenUsedEvent);
        expect(events[1]).toBeInstanceOf(ServerAccessTokenUsedEvent);
      });
    });

    describe('revoke() - ServerAccessTokenRevokedEvent', () => {
      it('should emit ServerAccessTokenRevokedEvent on revoke', () => {
        // Given: Token with cleared events
        const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
        token.clearDomainEvents();

        // When: Revoking
        token.revoke();

        // Then: One revoked event emitted
        const events = token.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(ServerAccessTokenRevokedEvent);

        const event = events[0] as ServerAccessTokenRevokedEvent;
        expect(event.tokenId.equals(token.id)).toBe(true);
        expect(event.revokedAt).toEqual(token.revokedAt);
      });

      it('should NOT emit event on second revoke (idempotent)', () => {
        // Given: Revoked token with cleared events
        const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
        token.revoke();
        token.clearDomainEvents();

        // When: Revoking again
        token.revoke();

        // Then: No new events
        const events = token.getDomainEvents();
        expect(events).toHaveLength(0);
      });
    });

    describe('reconstruct() - No Events', () => {
      it('should NOT emit events on reconstruct', () => {
        // Given: Reconstructed token
        const id = AccessTokenId.create().value!;
        const token = ServerAccessToken.reconstruct({
          id,
          tokenHash: validTokenHash,
          name: null,
          lastUsedAt: null,
          expiresAt: null,
          isRevoked: false,
          revokedAt: null,
          rotatedFromId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Then: No events
        const events = token.getDomainEvents();
        expect(events).toHaveLength(0);
      });
    });

    describe('clearDomainEvents()', () => {
      it('should clear all events', () => {
        // Given: Token with events
        const token = ServerAccessToken.create({ tokenHash: validTokenHash }).value!;
        token.recordUsage();
        expect(token.getDomainEvents().length).toBeGreaterThan(0);

        // When: Clearing events
        token.clearDomainEvents();

        // Then: No events
        expect(token.getDomainEvents()).toHaveLength(0);
      });
    });
  });
});
