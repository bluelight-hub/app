import { describe, it, expect } from 'vitest';
import { validatePasswordCriteria, isPasswordBlocked, PASSWORD_CRITERIA, PASSWORD_MIN_SCORE, PASSWORD_BLOCKLIST } from '../password.schema';

/**
 * Unit Tests für Password-Validierung gemäß NIST SP 800-63B-4
 */
describe('Password Validation (NIST SP 800-63B-4)', () => {
  describe('PASSWORD_CRITERIA constants', () => {
    it('should have correct minimum length (NIST: 8)', () => {
      expect(PASSWORD_CRITERIA.minLength).toBe(8);
    });

    it('should have correct maximum length (NIST: min 64, we use 128)', () => {
      expect(PASSWORD_CRITERIA.maxLength).toBe(128);
    });

    it('should have composition rules disabled (NIST prohibits these)', () => {
      expect(PASSWORD_CRITERIA.requireLowercase).toBe(false);
      expect(PASSWORD_CRITERIA.requireUppercase).toBe(false);
      expect(PASSWORD_CRITERIA.requireNumber).toBe(false);
      expect(PASSWORD_CRITERIA.requireSymbol).toBe(false);
    });

    it('should have minimum zxcvbn score of 3', () => {
      expect(PASSWORD_MIN_SCORE).toBe(3);
    });
  });

  describe('PASSWORD_BLOCKLIST', () => {
    it('should contain common passwords', () => {
      expect(PASSWORD_BLOCKLIST.has('123456')).toBe(true);
      expect(PASSWORD_BLOCKLIST.has('password')).toBe(true);
      expect(PASSWORD_BLOCKLIST.has('qwerty')).toBe(true);
      expect(PASSWORD_BLOCKLIST.has('admin')).toBe(true);
      expect(PASSWORD_BLOCKLIST.has('letmein')).toBe(true);
    });

    it('should have at least 100 entries', () => {
      expect(PASSWORD_BLOCKLIST.size).toBeGreaterThanOrEqual(100);
    });
  });

  describe('isPasswordBlocked', () => {
    it('should return true for blocked passwords', () => {
      expect(isPasswordBlocked('password')).toBe(true);
      expect(isPasswordBlocked('123456')).toBe(true);
      expect(isPasswordBlocked('admin')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isPasswordBlocked('PASSWORD')).toBe(true);
      expect(isPasswordBlocked('Password')).toBe(true);
      expect(isPasswordBlocked('ADMIN')).toBe(true);
      expect(isPasswordBlocked('Admin')).toBe(true);
    });

    it('should return false for unique passwords', () => {
      expect(isPasswordBlocked('MySecureUniquePassword2025!')).toBe(false);
      expect(isPasswordBlocked('XyZ123!@#aBcDeF')).toBe(false);
    });
  });

  describe('validatePasswordCriteria', () => {
    describe('length validation', () => {
      it('should reject passwords shorter than minimum length', () => {
        const result = validatePasswordCriteria('short');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('mindestens 8 Zeichen');
      });

      it('should accept passwords at minimum length', () => {
        // Note: This might fail blocklist if it's a common password
        // Let's use a unique 8-char password
        const result2 = validatePasswordCriteria('abXy12Zq');
        expect(result2.isValid).toBe(true);
      });

      it('should reject passwords longer than maximum length', () => {
        const longPassword = 'a'.repeat(129);
        const result = validatePasswordCriteria(longPassword);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('maximal 128 Zeichen');
      });

      it('should accept passwords at maximum length', () => {
        const maxPassword = 'a'.repeat(128);
        const result = validatePasswordCriteria(maxPassword);
        expect(result.isValid).toBe(true);
      });
    });

    describe('blocklist validation', () => {
      it('should reject blocked passwords', () => {
        const result = validatePasswordCriteria('password');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('zu häufig');
      });

      it('should reject blocked passwords case-insensitively', () => {
        const result = validatePasswordCriteria('PASSWORD');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('zu häufig');
      });

      it('should accept unique passwords', () => {
        const result = validatePasswordCriteria('MySecureUniquePassword2025!');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('NIST compliance - no composition rules', () => {
      it('should accept passwords without uppercase letters', () => {
        const result = validatePasswordCriteria('alllowercase123!');
        expect(result.isValid).toBe(true);
      });

      it('should accept passwords without lowercase letters', () => {
        const result = validatePasswordCriteria('ALLUPPERCASE123!');
        expect(result.isValid).toBe(true);
      });

      it('should accept passwords without numbers', () => {
        const result = validatePasswordCriteria('NoNumbersHere!@#');
        expect(result.isValid).toBe(true);
      });

      it('should accept passwords without special characters', () => {
        const result = validatePasswordCriteria('NoSpecialChars123');
        expect(result.isValid).toBe(true);
      });

      it('should accept passwords with only letters', () => {
        const result = validatePasswordCriteria('OnlyLettersHere');
        expect(result.isValid).toBe(true);
      });

      it('should accept passwords with only numbers (if long enough and not blocked)', () => {
        const result = validatePasswordCriteria('9876543210987654');
        expect(result.isValid).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        const result = validatePasswordCriteria('');
        expect(result.isValid).toBe(false);
      });

      it('should handle Unicode characters', () => {
        const result = validatePasswordCriteria('Übêr$écürePäss');
        expect(result.isValid).toBe(true);
      });

      it('should handle whitespace', () => {
        const result = validatePasswordCriteria('password with spaces');
        expect(result.isValid).toBe(true);
      });

      it('should handle emojis', () => {
        const result = validatePasswordCriteria('MyPassword🔒🔑');
        expect(result.isValid).toBe(true);
      });
    });
  });
});
