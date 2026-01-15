/**
 * Unit Tests für PrismaServerAccessTokenMapper.
 *
 * Testet die bidirektionale Transformation zwischen:
 * - Prisma ServerAccessToken Records ↔ Domain ServerAccessToken Aggregates
 *
 * **Test Strategy:**
 * - Keine DB-Abhängigkeit (Pure Unit Tests)
 * - Alle Felder werden korrekt gemappt
 * - Edge Cases: null-Werte, Sonderzeichen
 * - Error Cases: Ungültige DB-Daten
 */

import type { ServerAccessToken as PrismaServerAccessToken } from '@/generated/prisma/client';
import { PrismaServerAccessTokenMapper } from '../prisma-server-access-token.mapper';
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { TokenHash } from '@domain/value-objects/token-hash';

/**
 * Valide bcrypt Hash Beispiele für Tests.
 * Format: $2[aby]$[cost]$[53 chars salt+hash] = 60 Zeichen total
 */
const VALID_HASH_2A_COST_10 = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

/**
 * Helper: Erstellt ein gültiges Prisma ServerAccessToken Record.
 */
function createPrismaRecord(overrides?: Partial<PrismaServerAccessToken>): PrismaServerAccessToken {
  const now = new Date();
  return {
    id: 'blh_abcdefghijklmnopqrstuvwx',
    tokenHash: VALID_HASH_2A_COST_10,
    name: 'Test Token',
    lastUsedAt: null,
    expiresAt: null,
    isRevoked: false,
    revokedAt: null,
    rotatedFromId: null,
    inviteCodeId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Helper: Erstellt ein gültiges Domain Aggregate.
 */
function createDomainAggregate(overrides?: { name?: string; expiresAt?: Date }): ServerAccessToken {
  const tokenHashResult = TokenHash.create(VALID_HASH_2A_COST_10);
  expect(tokenHashResult.isSuccess).toBe(true);

  const result = ServerAccessToken.create({
    tokenHash: tokenHashResult.value!,
    name: overrides?.name,
    expiresAt: overrides?.expiresAt,
  });
  expect(result.isSuccess).toBe(true);
  return result.value!;
}

describe('PrismaServerAccessTokenMapper', () => {
  // ========================================
  // toAggregate() TESTS
  // ========================================

  describe('toAggregate()', () => {
    describe('Successful Mapping', () => {
      it('should map Prisma record to Domain Aggregate with all fields', () => {
        // Given: Complete Prisma record
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 86400000);
        const record = createPrismaRecord({
          name: 'Production Token',
          expiresAt,
          lastUsedAt: now,
        });

        // When: Map to aggregate
        const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);

        // Then: All fields are correctly mapped
        expect(aggregate.id.value).toBe('blh_abcdefghijklmnopqrstuvwx');
        expect(aggregate.tokenHash.value).toBe(VALID_HASH_2A_COST_10);
        expect(aggregate.name).toBe('Production Token');
        expect(aggregate.expiresAt?.getTime()).toBe(expiresAt.getTime());
        expect(aggregate.lastUsedAt?.getTime()).toBe(now.getTime());
        expect(aggregate.isRevoked).toBe(false);
        expect(aggregate.revokedAt).toBeNull();
      });

      it('should map record with null optional fields', () => {
        // Given: Record with null optional fields
        const record = createPrismaRecord({
          name: null,
          expiresAt: null,
          lastUsedAt: null,
          revokedAt: null,
        });

        // When: Map to aggregate
        const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);

        // Then: Null fields are preserved
        expect(aggregate.name).toBeNull();
        expect(aggregate.expiresAt).toBeNull();
        expect(aggregate.lastUsedAt).toBeNull();
        expect(aggregate.revokedAt).toBeNull();
      });

      it('should map revoked token correctly', () => {
        // Given: Revoked token record
        const revokedAt = new Date();
        const record = createPrismaRecord({
          isRevoked: true,
          revokedAt,
        });

        // When: Map to aggregate
        const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);

        // Then: Revoked state is correctly mapped
        expect(aggregate.isRevoked).toBe(true);
        expect(aggregate.revokedAt?.getTime()).toBe(revokedAt.getTime());
      });

      it('should map token with Umlauts and special characters in name', () => {
        // Given: Token with special characters
        const record = createPrismaRecord({
          name: 'Token für Kündler-Ärzte äöüß €',
        });

        // When: Map to aggregate
        const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);

        // Then: Special characters preserved
        expect(aggregate.name).toBe('Token für Kündler-Ärzte äöüß €');
      });

      it('should preserve createdAt and updatedAt timestamps', () => {
        // Given: Record with specific timestamps
        const createdAt = new Date('2025-01-01T10:00:00Z');
        const updatedAt = new Date('2025-06-15T15:30:00Z');
        const record = createPrismaRecord({ createdAt, updatedAt });

        // When: Map to aggregate
        const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);

        // Then: Timestamps are preserved
        expect(aggregate.createdAt.getTime()).toBe(createdAt.getTime());
        expect(aggregate.updatedAt.getTime()).toBe(updatedAt.getTime());
      });

      it('should map token with rotatedFromId', () => {
        // Given: Record with rotatedFromId (rotiertes Token)
        const record = createPrismaRecord({
          rotatedFromId: 'blh_originaltokenid123456789',
        });

        // When: Map to aggregate
        const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);

        // Then: rotatedFromId is correctly mapped
        expect(aggregate.rotatedFromId).not.toBeNull();
        expect(aggregate.rotatedFromId?.value).toBe('blh_originaltokenid123456789');
        expect(aggregate.wasRotated()).toBe(true);
      });

      it('should map token without rotatedFromId', () => {
        // Given: Record without rotatedFromId
        const record = createPrismaRecord({
          rotatedFromId: null,
        });

        // When: Map to aggregate
        const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);

        // Then: rotatedFromId is null
        expect(aggregate.rotatedFromId).toBeNull();
        expect(aggregate.wasRotated()).toBe(false);
      });
    });

    describe('Error Cases', () => {
      it('should throw when AccessTokenId is invalid', () => {
        // Given: Record with invalid ID (wrong format)
        const record = createPrismaRecord({
          id: 'invalid-id-format',
        });

        // When/Then: Throws error
        expect(() => PrismaServerAccessTokenMapper.toAggregate(record)).toThrow('Invalid AccessTokenId in database');
      });

      it('should throw when TokenHash is invalid', () => {
        // Given: Record with invalid hash
        const record = createPrismaRecord({
          tokenHash: 'not-a-valid-bcrypt-hash',
        });

        // When/Then: Throws error
        expect(() => PrismaServerAccessTokenMapper.toAggregate(record)).toThrow('Invalid TokenHash in database');
      });

      it('should throw when TokenHash has wrong cost factor', () => {
        // Given: Record with cost factor < 10
        const record = createPrismaRecord({
          tokenHash: '$2a$08$N9qo8uLOickgx2ZMRZoMyeIjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS',
        });

        // When/Then: Throws error (cost factor 08 < 10)
        expect(() => PrismaServerAccessTokenMapper.toAggregate(record)).toThrow('Invalid TokenHash in database');
      });

      it('should throw when rotatedFromId has invalid format', () => {
        // Given: Record with invalid rotatedFromId format
        const record = createPrismaRecord({
          rotatedFromId: 'invalid-token-id',
        });

        // When/Then: Throws error
        expect(() => PrismaServerAccessTokenMapper.toAggregate(record)).toThrow('Invalid rotatedFromId in database');
      });
    });
  });

  // ========================================
  // toPersistence() TESTS
  // ========================================

  describe('toPersistence()', () => {
    describe('Successful Mapping', () => {
      it('should map Domain Aggregate to Persistence DTO with all fields', () => {
        // Given: Complete aggregate
        const futureDate = new Date(Date.now() + 86400000);
        const aggregate = createDomainAggregate({
          name: 'Persistence Test',
          expiresAt: futureDate,
        });

        // When: Map to persistence
        const dto = PrismaServerAccessTokenMapper.toPersistence(aggregate);

        // Then: All fields are correctly mapped
        expect(dto.id).toBe(aggregate.id.value);
        expect(dto.tokenHash).toBe(aggregate.tokenHash.value);
        expect(dto.name).toBe('Persistence Test');
        expect(dto.expiresAt?.getTime()).toBe(futureDate.getTime());
        expect(dto.isRevoked).toBe(false);
        expect(dto.revokedAt).toBeNull();
        expect(dto.lastUsedAt).toBeNull();
        expect(dto.createdAt).toBeInstanceOf(Date);
        expect(dto.updatedAt).toBeInstanceOf(Date);
      });

      it('should map aggregate with null name', () => {
        // Given: Aggregate without name
        const aggregate = createDomainAggregate({ name: undefined });

        // When: Map to persistence
        const dto = PrismaServerAccessTokenMapper.toPersistence(aggregate);

        // Then: Name is null
        expect(dto.name).toBeNull();
      });

      it('should map revoked aggregate correctly', () => {
        // Given: Revoked aggregate
        const aggregate = createDomainAggregate();
        aggregate.revoke();

        // When: Map to persistence
        const dto = PrismaServerAccessTokenMapper.toPersistence(aggregate);

        // Then: Revoked state is correctly mapped
        expect(dto.isRevoked).toBe(true);
        expect(dto.revokedAt).toBeInstanceOf(Date);
      });

      it('should map aggregate with lastUsedAt', () => {
        // Given: Aggregate with recorded usage
        const aggregate = createDomainAggregate();
        aggregate.recordUsage();

        // When: Map to persistence
        const dto = PrismaServerAccessTokenMapper.toPersistence(aggregate);

        // Then: lastUsedAt is set
        expect(dto.lastUsedAt).toBeInstanceOf(Date);
      });

      it('should map aggregate without rotatedFromId to null', () => {
        // Given: Aggregate without rotatedFromId
        const aggregate = createDomainAggregate();

        // When: Map to persistence
        const dto = PrismaServerAccessTokenMapper.toPersistence(aggregate);

        // Then: rotatedFromId is null
        expect(dto.rotatedFromId).toBeNull();
      });
    });
  });

  // ========================================
  // ROUND-TRIP TESTS
  // ========================================

  describe('Round-Trip Mapping', () => {
    it('should preserve data in Prisma → Aggregate → Prisma round-trip', () => {
      // Given: Original Prisma record
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 86400000);
      const originalRecord = createPrismaRecord({
        name: 'Round-Trip Token',
        expiresAt,
        lastUsedAt: now,
        isRevoked: false,
      });

      // When: Map to aggregate and back to persistence
      const aggregate = PrismaServerAccessTokenMapper.toAggregate(originalRecord);
      const resultDto = PrismaServerAccessTokenMapper.toPersistence(aggregate);

      // Then: Key fields match
      expect(resultDto.id).toBe(originalRecord.id);
      expect(resultDto.tokenHash).toBe(originalRecord.tokenHash);
      expect(resultDto.name).toBe(originalRecord.name);
      expect(resultDto.expiresAt?.getTime()).toBe(originalRecord.expiresAt?.getTime());
      expect(resultDto.lastUsedAt?.getTime()).toBe(originalRecord.lastUsedAt?.getTime());
      expect(resultDto.isRevoked).toBe(originalRecord.isRevoked);
    });

    it('should preserve revoked state in round-trip', () => {
      // Given: Revoked Prisma record
      const revokedAt = new Date();
      const originalRecord = createPrismaRecord({
        isRevoked: true,
        revokedAt,
      });

      // When: Round-trip
      const aggregate = PrismaServerAccessTokenMapper.toAggregate(originalRecord);
      const resultDto = PrismaServerAccessTokenMapper.toPersistence(aggregate);

      // Then: Revoked state preserved
      expect(resultDto.isRevoked).toBe(true);
      expect(resultDto.revokedAt?.getTime()).toBe(revokedAt.getTime());
    });
  });
});
