// @ts-nocheck
import { EinsatzRolle } from './einsatz-rolle';

describe('EinsatzRolle', () => {
  describe('create() - Factory Method', () => {
    it.each(['BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER'])('should create EinsatzRolle with valid value %s', (value) => {
      const result = EinsatzRolle.create(value);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.value).toBe(value);
    });

    it('should fail with invalid rolle value', () => {
      const result = EinsatzRolle.create('INVALID_ROLLE');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungueltige Rolle');
      expect(result.error).toContain('INVALID_ROLLE');
      expect(result.error).toContain('BEFEHLSGEBER');
    });

    it('should fail with empty string', () => {
      const result = EinsatzRolle.create('');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungueltige Rolle');
    });

    it('should fail with lowercase rolle value', () => {
      const result = EinsatzRolle.create('befehlsgeber');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungueltige Rolle');
    });
  });

  describe('Static Convenience Factories', () => {
    it('should create BEFEHLSGEBER via static factory', () => {
      const rolle = EinsatzRolle.BEFEHLSGEBER();
      expect(rolle.value).toBe('BEFEHLSGEBER');
    });

    it('should create ERSTELLER via static factory', () => {
      const rolle = EinsatzRolle.ERSTELLER();
      expect(rolle.value).toBe('ERSTELLER');
    });

    it('should create EMPFAENGER via static factory', () => {
      const rolle = EinsatzRolle.EMPFAENGER();
      expect(rolle.value).toBe('EMPFAENGER');
    });

    it('should create BEOBACHTER via static factory', () => {
      const rolle = EinsatzRolle.BEOBACHTER();
      expect(rolle.value).toBe('BEOBACHTER');
    });

    it('should create structurally equal instances', () => {
      const rolle1 = EinsatzRolle.BEFEHLSGEBER();
      const rolle2 = EinsatzRolle.BEFEHLSGEBER();

      expect(rolle1).not.toBe(rolle2);
      expect(rolle1.equals(rolle2)).toBe(true);
    });
  });

  describe('equals() - Structural Equality', () => {
    it('should return true for same rolle value', () => {
      const rolle1 = EinsatzRolle.ERSTELLER();
      const rolle2 = EinsatzRolle.ERSTELLER();

      expect(rolle1.equals(rolle2)).toBe(true);
    });

    it('should return false for different rolle values', () => {
      const rolle1 = EinsatzRolle.ERSTELLER();
      const rolle2 = EinsatzRolle.EMPFAENGER();

      expect(rolle1.equals(rolle2)).toBe(false);
    });

    it('should return false when comparing with undefined', () => {
      const rolle = EinsatzRolle.BEOBACHTER();
      expect(rolle.equals(undefined)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the rolle value', () => {
      const rolle = EinsatzRolle.BEFEHLSGEBER();
      expect(rolle.toString()).toBe('BEFEHLSGEBER');
    });
  });

  describe('Immutability', () => {
    it('should freeze props object', () => {
      const rolle = EinsatzRolle.ERSTELLER();
      expect(Object.isFrozen(rolle.props)).toBe(true);
    });
  });

  describe('ALLOWED_VALUES', () => {
    it('should contain exactly 4 values', () => {
      expect(EinsatzRolle.ALLOWED_VALUES).toHaveLength(4);
    });

    it('should contain all expected roles', () => {
      expect(EinsatzRolle.ALLOWED_VALUES).toEqual(['BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER']);
    });
  });
});
