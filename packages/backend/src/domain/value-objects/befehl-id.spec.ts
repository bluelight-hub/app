jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
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

import { BefehlId } from './befehl-id';
import { EinsatzId } from './einsatz-id';

describe('BefehlId', () => {
  describe('create()', () => {
    it('should auto-generate a valid CUID', () => {
      const result = BefehlId.create();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.value).toMatch(/^[a-z][a-z0-9]+$/);
    });

    it('should create from existing valid CUID', () => {
      const validCuid = 'clw3h8x9y0000qwertyuiopas';
      const result = BefehlId.create(validCuid);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.value).toBe(validCuid);
    });

    it('should fail with invalid CUID format', () => {
      const result = BefehlId.create('invalid');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format');
    });
  });

  describe('equals()', () => {
    it('should return true for same CUID value', () => {
      const cuid = 'clw3h8x9y0000qwertyuiopas';
      const id1 = BefehlId.create(cuid).value!;
      const id2 = BefehlId.create(cuid).value!;

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different CUID values', () => {
      const id1 = BefehlId.create().value!;
      const id2 = BefehlId.create().value!;

      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      const id = BefehlId.create().value!;

      expect(id.equals(undefined)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the CUID string', () => {
      const cuid = 'clw3h8x9y0000qwertyuiopas';
      const id = BefehlId.create(cuid).value!;

      expect(id.toString()).toBe(cuid);
    });
  });

  describe('Type Safety', () => {
    it('should be instanceof BefehlId', () => {
      const id = BefehlId.create().value!;
      expect(id).toBeInstanceOf(BefehlId);
    });

    it('should not be instanceof EinsatzId at runtime', () => {
      const befehlId = BefehlId.create().value!;
      expect(befehlId).not.toBeInstanceOf(EinsatzId);
    });
  });
});
