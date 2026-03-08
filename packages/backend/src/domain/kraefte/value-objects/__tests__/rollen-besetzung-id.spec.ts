// @ts-nocheck
// Mock CUID2 for Jest compatibility (ESM module issue)
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    // Generate valid CUID2 format: starts with 'c', 20-30 lowercase alphanumeric characters
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

import { RollenBesetzungId } from '../rollen-besetzung-id';
import { createId } from '@paralleldrive/cuid2';

/**
 * Unit Tests für RollenBesetzungId Value Object.
 *
 * Testet CUID2 Validation Pattern (folgt EinsatzId Pattern):
 * - Auto-generation ohne Parameter
 * - Validation mit gültigem CUID2
 * - Rejection mit ungültigem Format
 * - equals() Equality Check
 * - value getter
 * - Immutability
 */
describe('RollenBesetzungId Value Object', () => {
  describe('create() - Factory Method', () => {
    it('should create valid CUID2 without parameter', () => {
      // Given/When
      const result = RollenBesetzungId.create();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.value).toMatch(/^[a-z][a-z0-9]+$/);
      expect(result.value?.value.length).toBeGreaterThanOrEqual(20);
      expect(result.value?.value.length).toBeLessThanOrEqual(30);
    });

    it('should create with valid CUID2 parameter', () => {
      // Given
      const validCuid = createId();

      // When
      const result = RollenBesetzungId.create(validCuid);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.value).toBe(validCuid);
      expect(result.error).toBeUndefined();
    });

    it('should fail with invalid ID format (too short)', () => {
      // Given
      const invalidId = 'abc123'; // Too short

      // When
      const result = RollenBesetzungId.create(invalidId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.isSuccess).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.error).toBe('Invalid CUID format');
    });

    it('should fail with UUID format (common mistake)', () => {
      // Given
      const uuid = '123e4567-e89b-12d3-a456-426614174000';

      // When
      const result = RollenBesetzungId.create(uuid);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format');
    });

    it('should fail with empty string', () => {
      // Given
      const emptyId = '';

      // When
      const result = RollenBesetzungId.create(emptyId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format');
    });

    it('should fail with invalid characters (uppercase)', () => {
      // Given
      const invalidChars = 'cABCDEFGHIJKLMNOPQRSTU'; // Uppercase not allowed

      // When
      const result = RollenBesetzungId.create(invalidChars);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format');
    });

    it('should fail with invalid characters (special chars)', () => {
      // Given
      const invalidChars = 'c_test-id-with-special@chars'; // Special chars not allowed

      // When
      const result = RollenBesetzungId.create(invalidChars);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format');
    });
  });

  describe('value - Getter', () => {
    it('should expose underlying CUID2 string value', () => {
      // Given
      const testCuid = createId();
      const result = RollenBesetzungId.create(testCuid);

      // When
      const id = result.value as RollenBesetzungId;
      const value = id.value;

      // Then
      expect(value).toBe(testCuid);
      expect(typeof value).toBe('string');
    });
  });

  describe('equals() - Equality', () => {
    it('should return true for same CUID values', () => {
      // Given
      const testCuid = createId();
      const id1 = RollenBesetzungId.create(testCuid).value!;
      const id2 = RollenBesetzungId.create(testCuid).value!;

      // When/Then
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different CUID values', () => {
      // Given
      const id1 = RollenBesetzungId.create().value!;
      const id2 = RollenBesetzungId.create().value!;

      // When/Then
      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false when compared with null', () => {
      // Given
      const id = RollenBesetzungId.create().value!;

      // When/Then
      expect(id.equals(null as unknown as RollenBesetzungId)).toBe(false);
    });

    it('should return false when compared with undefined', () => {
      // Given
      const id = RollenBesetzungId.create().value!;

      // When/Then
      expect(id.equals(undefined as unknown as RollenBesetzungId)).toBe(false);
    });

    it('should return true when comparing same instance', () => {
      // Given
      const id = RollenBesetzungId.create().value!;

      // When/Then
      expect(id.equals(id)).toBe(true);
    });
  });

  describe('toString() - String Representation', () => {
    it('should return CUID string', () => {
      // Given
      const testCuid = createId();
      const id = RollenBesetzungId.create(testCuid).value!;

      // When
      const stringValue = id.toString();

      // Then
      expect(stringValue).toBe(testCuid);
      expect(typeof stringValue).toBe('string');
    });
  });

  describe('immutability', () => {
    it('should not allow modification of value property', () => {
      // Given
      const id = RollenBesetzungId.create().value!;
      const originalValue = id.value;

      // When: Attempt to modify (TypeScript prevents this, but test runtime behavior)
      try {
        // biome-ignore lint/suspicious/noExplicitAny: Testing runtime immutability
        (id as any).value = 'modified-value';
      } catch {
        // Expected: Property is readonly
      }

      // Then: Value should remain unchanged
      expect(id.value).toBe(originalValue);
    });
  });
});
