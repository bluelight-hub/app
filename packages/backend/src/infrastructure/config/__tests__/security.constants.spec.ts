import { BCRYPT_COST_FACTOR_PASSWORD, BCRYPT_COST_FACTOR_TOKEN, validateBcryptCostFactor, isBcryptCostFactor, type ValidBcryptCostFactor } from '../security.constants';

describe('security.constants', () => {
  describe('BCRYPT_COST_FACTOR_PASSWORD', () => {
    it('should be 10 (NFR-S1 minimum)', () => {
      expect(BCRYPT_COST_FACTOR_PASSWORD).toBe(10);
    });

    it('should be valid for bcrypt.hash()', () => {
      expect(isBcryptCostFactor(BCRYPT_COST_FACTOR_PASSWORD)).toBe(true);
    });
  });

  describe('BCRYPT_COST_FACTOR_TOKEN', () => {
    it('should be 10 for consistency', () => {
      expect(BCRYPT_COST_FACTOR_TOKEN).toBe(10);
    });

    it('should match password cost factor', () => {
      expect(BCRYPT_COST_FACTOR_TOKEN).toBe(BCRYPT_COST_FACTOR_PASSWORD);
    });
  });

  describe('validateBcryptCostFactor', () => {
    // Valid values
    it('should accept valid cost factors (10-14)', () => {
      const validValues = [10, 11, 12, 13, 14];

      validValues.forEach((value) => {
        const result = validateBcryptCostFactor(value);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(value);
        expect(result.error).toBeUndefined();
      });
    });

    // String inputs (from environment variables)
    it('should parse string inputs', () => {
      const result = validateBcryptCostFactor('12');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(12);
    });

    // Too low
    it('should reject values < 10 (NFR-S1 violation)', () => {
      const invalidValues = [0, 1, 8, 9];

      invalidValues.forEach((value) => {
        const result = validateBcryptCostFactor(value);
        expect(result.isValid).toBe(false);
        expect(result.value).toBe(BCRYPT_COST_FACTOR_PASSWORD);
        expect(result.error).toContain('10 und 14');
      });
    });

    // Too high
    it('should reject values > 14', () => {
      const invalidValues = [15, 20, 100];

      invalidValues.forEach((value) => {
        const result = validateBcryptCostFactor(value);
        expect(result.isValid).toBe(false);
        expect(result.value).toBe(BCRYPT_COST_FACTOR_PASSWORD);
        expect(result.error).toContain('10 und 14');
      });
    });

    // Non-numeric
    it('should reject non-numeric values', () => {
      const invalidValues = [null, undefined, 'abc', {}, [], true];

      invalidValues.forEach((value) => {
        const result = validateBcryptCostFactor(value);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Zahl sein');
      });
    });

    // Floating point (should fail - must be integer)
    it('should handle floating point gracefully', () => {
      const result = validateBcryptCostFactor(10.5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ganze Zahl');
    });

    // Empty string
    it('should reject empty strings', () => {
      const result = validateBcryptCostFactor('');
      expect(result.isValid).toBe(false);
    });

    // Whitespace strings
    it('should handle whitespace strings', () => {
      const result = validateBcryptCostFactor('  10  ');
      // Number.parseInt is lenient with whitespace
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(10);
    });
  });

  describe('isBcryptCostFactor', () => {
    // Type guard function
    it('should be a type guard for ValidBcryptCostFactor', () => {
      const validValues = [10, 11, 12, 13, 14];

      validValues.forEach((value) => {
        expect(isBcryptCostFactor(value)).toBe(true);
      });
    });

    it('should reject invalid values', () => {
      const invalidValues = [0, 9, 15, '10', null, undefined, 10.5];

      invalidValues.forEach((value) => {
        expect(isBcryptCostFactor(value)).toBe(false);
      });
    });

    // Demonstrates type narrowing would work
    it('should work as type guard in conditional', () => {
      const value: number = 10;
      if (isBcryptCostFactor(value)) {
        // TypeScript narrows value to ValidBcryptCostFactor
        const costFactor: ValidBcryptCostFactor = value;
        expect(costFactor).toBe(10);
      }
    });
  });

  describe('NFR-S1 Compliance', () => {
    it('should enforce minimum cost factor of 10', () => {
      // This is the core NFR requirement
      expect(BCRYPT_COST_FACTOR_PASSWORD).toBeGreaterThanOrEqual(10);
    });

    it('should reject hashes with cost < 10', () => {
      const result = validateBcryptCostFactor(8);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10');
    });

    it('should provide safe fallback on invalid input', () => {
      const result = validateBcryptCostFactor('invalid');
      expect(result.isValid).toBe(false);
      // Fallback should always be valid
      expect(result.value).toBe(10);
      expect(isBcryptCostFactor(result.value)).toBe(true);
    });
  });
});
