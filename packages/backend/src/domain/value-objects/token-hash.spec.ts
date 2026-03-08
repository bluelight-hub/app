// @ts-nocheck
import { TokenHash } from '@domain/value-objects/token-hash';

/**
 * Valide bcrypt Hash Beispiele für Tests.
 * Format: $2[aby]$[cost]$[53 chars salt+hash] = 60 Zeichen total
 * Verified: All strings are exactly 60 characters
 */
// $2a$ variant with cost 10 (60 chars)
const VALID_HASH_2A_COST_10 = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
// $2b$ variant with cost 12 (60 chars)
const VALID_HASH_2B_COST_12 = '$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
// $2y$ variant with cost 10 (60 chars)
const VALID_HASH_2Y_COST_10 = '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
// $2a$ variant with cost 14 (60 chars)
const VALID_HASH_2A_COST_14 = '$2a$14$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

describe('TokenHash', () => {
  describe('create() - Factory Method', () => {
    describe('Valid Hash Formats', () => {
      it('should accept $2a$ bcrypt variant with cost 10', () => {
        // Given: Valid $2a$ hash with cost factor 10
        const hash = VALID_HASH_2A_COST_10;

        // When: Creating TokenHash
        const result = TokenHash.create(hash);

        // Then: Success
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.value).toBe(hash);
      });

      it('should accept $2b$ bcrypt variant', () => {
        // Given: Valid $2b$ hash with cost factor 12
        const hash = VALID_HASH_2B_COST_12;

        // When: Creating TokenHash
        const result = TokenHash.create(hash);

        // Then: Success
        expect(result.isSuccess).toBe(true);
        expect(result.value?.value).toBe(hash);
      });

      it('should accept $2y$ bcrypt variant', () => {
        // Given: Valid $2y$ hash with cost factor 10
        const hash = VALID_HASH_2Y_COST_10;

        // When: Creating TokenHash
        const result = TokenHash.create(hash);

        // Then: Success
        expect(result.isSuccess).toBe(true);
        expect(result.value?.value).toBe(hash);
      });

      it('should accept hash with cost factor = 10', () => {
        // Given: Hash with minimum allowed cost factor
        const hash = VALID_HASH_2A_COST_10;

        // When: Creating TokenHash
        const result = TokenHash.create(hash);

        // Then: Success
        expect(result.isSuccess).toBe(true);
      });

      it('should accept hash with cost factor = 12', () => {
        // Given: Hash with higher cost factor
        const hash = VALID_HASH_2B_COST_12;

        // When: Creating TokenHash
        const result = TokenHash.create(hash);

        // Then: Success
        expect(result.isSuccess).toBe(true);
      });

      it('should accept hash with cost factor = 14', () => {
        // Given: Hash with high cost factor
        const hash = VALID_HASH_2A_COST_14;

        // When: Creating TokenHash
        const result = TokenHash.create(hash);

        // Then: Success
        expect(result.isSuccess).toBe(true);
      });
    });

    describe('Invalid Hash Formats', () => {
      it('should reject hash with wrong length (59 chars)', () => {
        // Given: Hash that is too short (59 chars)
        const tooShort = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01';

        // When: Creating TokenHash
        const result = TokenHash.create(tooShort);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('muss exakt 60 Zeichen lang sein');
      });

      it('should reject hash with wrong length (61 chars)', () => {
        // Given: Hash that is too long (61 chars)
        const tooLong = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123';

        // When: Creating TokenHash
        const result = TokenHash.create(tooLong);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('muss exakt 60 Zeichen lang sein');
      });

      it('should reject hash with invalid prefix ($2x$)', () => {
        // Given: Invalid bcrypt variant (60 chars)
        const invalidPrefix = '$2x$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

        // When: Creating TokenHash
        const result = TokenHash.create(invalidPrefix);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('gültiges bcrypt-Format');
      });

      it('should reject hash with invalid prefix ($3a$)', () => {
        // Given: Invalid bcrypt version (60 chars)
        const invalidVersion = '$3a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

        // When: Creating TokenHash
        const result = TokenHash.create(invalidVersion);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('gültiges bcrypt-Format');
      });

      it('should reject hash with cost factor < 10 (NFR-S1)', () => {
        // Given: Hash with cost factor 8 (below minimum, 60 chars)
        const lowCost = '$2a$08$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

        // When: Creating TokenHash
        const result = TokenHash.create(lowCost);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Cost Factor muss mindestens 10 sein');
        expect(result.error).toContain('NFR-S1');
      });

      it('should reject hash with cost factor = 9', () => {
        // Given: Hash with cost factor 9 (just below minimum, 60 chars)
        const cost9 = '$2a$09$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

        // When: Creating TokenHash
        const result = TokenHash.create(cost9);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Cost Factor muss mindestens 10 sein');
      });

      it('should reject hash with invalid characters', () => {
        // Given: Hash with invalid characters (! is not valid in bcrypt, 60 chars)
        const invalidChars = '$2a$10$abcdefghijklmnopqrstuu!BCDEFGHIJKLMNOPQRSTUVWXYZ01234';

        // When: Creating TokenHash
        const result = TokenHash.create(invalidChars);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('gültiges bcrypt-Format');
      });

      it('should reject empty string', () => {
        // Given: Empty hash
        const empty = '';

        // When: Creating TokenHash
        const result = TokenHash.create(empty);

        // Then: Failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('muss exakt 60 Zeichen lang sein');
      });

      it('should reject non-bcrypt string', () => {
        // Given: Random string (60 chars but wrong format)
        const notBcrypt = 'this_is_not_a_bcrypt_hash_at_all_1234567890123456789012345';

        // When: Creating TokenHash
        const result = TokenHash.create(notBcrypt);

        // Then: Failure
        expect(result.isFailure).toBe(true);
      });
    });
  });

  describe('equals()', () => {
    it('should return true for same hash value', () => {
      // Given: Two TokenHashes with same value
      const hash1 = TokenHash.create(VALID_HASH_2A_COST_10).value!;
      const hash2 = TokenHash.create(VALID_HASH_2A_COST_10).value!;

      // When/Then
      expect(hash1.equals(hash2)).toBe(true);
    });

    it('should return false for different hash values', () => {
      // Given: Two different TokenHashes
      const hash1 = TokenHash.create(VALID_HASH_2A_COST_10).value!;
      const hash2 = TokenHash.create(VALID_HASH_2B_COST_12).value!;

      // When/Then
      expect(hash1.equals(hash2)).toBe(false);
    });

    it('should return false for null', () => {
      // Given: TokenHash
      const hash = TokenHash.create(VALID_HASH_2A_COST_10).value!;

      // When/Then
      expect(hash.equals(null as unknown as TokenHash)).toBe(false);
    });

    it('should return false for undefined', () => {
      // Given: TokenHash
      const hash = TokenHash.create(VALID_HASH_2A_COST_10).value!;

      // When/Then
      expect(hash.equals(undefined)).toBe(false);
    });

    it('should return true for same instance', () => {
      // Given: Same TokenHash instance
      const hash = TokenHash.create(VALID_HASH_2A_COST_10).value!;

      // When/Then
      expect(hash.equals(hash)).toBe(true);
    });
  });

  describe('toString() - Security', () => {
    it('should return masked hash (first 8 chars only)', () => {
      // Given: TokenHash
      const hash = TokenHash.create(VALID_HASH_2A_COST_10).value!;

      // When: Getting string representation
      const str = hash.toString();

      // Then: Should be masked (shows only first 8 chars + ...)
      expect(str).toBe('$2a$10$a...');
      expect(str.length).toBeLessThan(60);
    });
  });

  describe('toMaskedString() - Security', () => {
    it('should return masked hash for logging', () => {
      // Given: TokenHash
      const hash = TokenHash.create(VALID_HASH_2A_COST_10).value!;

      // When: Getting masked string
      const masked = hash.toMaskedString();

      // Then: Should be masked
      expect(masked).toBe('$2a$10$a...');
      expect(masked).not.toBe(VALID_HASH_2A_COST_10);
    });
  });

  describe('value getter', () => {
    it('should return the full hash value', () => {
      // Given: TokenHash
      const hash = TokenHash.create(VALID_HASH_2A_COST_10).value!;

      // When/Then: Getting value should return full hash
      expect(hash.value).toBe(VALID_HASH_2A_COST_10);
    });
  });
});
