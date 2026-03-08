// @ts-nocheck
import { AccessTokenId } from '@domain/value-objects/access-token-id';

// Mock CUID2 for Jest compatibility (ESM module issue)
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    // Generate valid CUID2 format: 24 lowercase alphanumeric characters
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
}));

// Valid AccessTokenId: blh_ (4) + 24 chars = 28 total
const VALID_TOKEN_ID = 'blh_abcdefghij1234567890abcd';
const VALID_TOKEN_ID_2 = 'blh_zyxwvutsrq0987654321zyxw';

describe('AccessTokenId', () => {
  describe('create() - Factory Method', () => {
    it('should auto-generate valid token ID with blh_ prefix', () => {
      // Given: No ID parameter

      // When: Creating AccessTokenId without parameter
      const result = AccessTokenId.create();

      // Then: Success with auto-generated ID with correct format
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.value).toMatch(/^blh_[a-z0-9]{24}$/);
      expect(result.value?.value.length).toBe(28);
    });

    it('should generate unique IDs on each create()', () => {
      // Given: Multiple calls to create without parameter

      // When: Creating multiple AccessTokenIds
      const result1 = AccessTokenId.create();
      const result2 = AccessTokenId.create();

      // Then: Each ID should be unique
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value?.value).not.toBe(result2.value?.value);
    });

    it('should accept valid existing ID (blh_ + 24 chars)', () => {
      // Given: Valid token ID format (28 chars total)
      const validId = VALID_TOKEN_ID;

      // When: Creating AccessTokenId with valid ID
      const result = AccessTokenId.create(validId);

      // Then: Success with provided ID
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.value).toBe(validId);
    });

    it('should trim whitespace before validation', () => {
      // Given: Valid ID with whitespace
      const idWithWhitespace = `  ${VALID_TOKEN_ID}  `;

      // When: Creating AccessTokenId
      const result = AccessTokenId.create(idWithWhitespace);

      // Then: Success with trimmed ID
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe(VALID_TOKEN_ID);
    });

    it('should reject ID without blh_ prefix', () => {
      // Given: ID without correct prefix (28 chars total, wrong prefix)
      const noPrefix = 'abc_abcdefghij1234567890abcd';

      // When: Creating AccessTokenId
      const result = AccessTokenId.create(noPrefix);

      // Then: Failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("muss mit 'blh_' beginnen");
    });

    it('should reject ID with wrong length (27 chars - too short)', () => {
      // Given: Too short (27 instead of 28)
      const tooShort = 'blh_abcdefghij1234567890abc';

      // When: Creating AccessTokenId
      const result = AccessTokenId.create(tooShort);

      // Then: Failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('muss exakt 28 Zeichen haben');
    });

    it('should reject ID with wrong length (29 chars - too long)', () => {
      // Given: Too long (29 instead of 28)
      const tooLong = 'blh_abcdefghij1234567890abcde';

      // When: Creating AccessTokenId
      const result = AccessTokenId.create(tooLong);

      // Then: Failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('muss exakt 28 Zeichen haben');
    });

    it('should reject ID with uppercase characters', () => {
      // Given: ID with uppercase letters (28 chars)
      const withUppercase = 'blh_ABCDEFGHIJ1234567890abcd';

      // When: Creating AccessTokenId
      const result = AccessTokenId.create(withUppercase);

      // Then: Failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Format ungültig');
    });

    it('should reject ID with special characters', () => {
      // Given: ID with special characters (28 chars)
      const withSpecial = 'blh_abcdefghij12-4567890abcd';

      // When: Creating AccessTokenId
      const result = AccessTokenId.create(withSpecial);

      // Then: Failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Format ungültig');
    });
  });

  describe('equals()', () => {
    it('should return true for same value', () => {
      // Given: Two AccessTokenIds with same value
      const tokenId1 = AccessTokenId.create(VALID_TOKEN_ID).value!;
      const tokenId2 = AccessTokenId.create(VALID_TOKEN_ID).value!;

      // When/Then
      expect(tokenId1.equals(tokenId2)).toBe(true);
    });

    it('should return false for different values', () => {
      // Given: Two different AccessTokenIds
      const tokenId1 = AccessTokenId.create(VALID_TOKEN_ID).value!;
      const tokenId2 = AccessTokenId.create(VALID_TOKEN_ID_2).value!;

      // When/Then
      expect(tokenId1.equals(tokenId2)).toBe(false);
    });

    it('should return false for null', () => {
      // Given: AccessTokenId
      const tokenId = AccessTokenId.create(VALID_TOKEN_ID).value!;

      // When/Then
      expect(tokenId.equals(null as unknown as AccessTokenId)).toBe(false);
    });

    it('should return false for undefined', () => {
      // Given: AccessTokenId
      const tokenId = AccessTokenId.create(VALID_TOKEN_ID).value!;

      // When/Then
      expect(tokenId.equals(undefined)).toBe(false);
    });

    it('should return true for same instance', () => {
      // Given: Same AccessTokenId instance
      const tokenId = AccessTokenId.create(VALID_TOKEN_ID).value!;

      // When/Then
      expect(tokenId.equals(tokenId)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return the full token ID string', () => {
      // Given: AccessTokenId
      const tokenId = AccessTokenId.create(VALID_TOKEN_ID).value!;

      // When/Then
      expect(tokenId.toString()).toBe(VALID_TOKEN_ID);
    });
  });

  describe('value getter', () => {
    it('should return the token ID value', () => {
      // Given: AccessTokenId
      const tokenId = AccessTokenId.create(VALID_TOKEN_ID).value!;

      // When/Then
      expect(tokenId.value).toBe(VALID_TOKEN_ID);
    });
  });
});
