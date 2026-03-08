// @ts-nocheck
import { EinsatzRollenzuweisung } from './einsatz-rollenzuweisung.entity';
import { EinsatzRolle } from '@domain/value-objects/einsatz-rolle';

describe('EinsatzRollenzuweisung', () => {
  const validEinsatzId = 'clw3h8x9y0000test1234567';
  const validUserId = 'clw3h8x9y0000user1234567';

  describe('create()', () => {
    it('should create a valid EinsatzRollenzuweisung', () => {
      const rolle = EinsatzRolle.BEFEHLSGEBER();
      const result = EinsatzRollenzuweisung.create(validEinsatzId, validUserId, rolle);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(result.value?.userId).toBe(validUserId);
      expect(result.value?.rolle.equals(rolle)).toBe(true);
      expect(result.value?.id).toBeDefined();
      expect(result.value?.zugewiesenAm).toBeInstanceOf(Date);
    });

    it('should create with all rolle types', () => {
      const rollen = [EinsatzRolle.BEFEHLSGEBER(), EinsatzRolle.ERSTELLER(), EinsatzRolle.EMPFAENGER(), EinsatzRolle.BEOBACHTER()];

      for (const rolle of rollen) {
        const result = EinsatzRollenzuweisung.create(validEinsatzId, validUserId, rolle);
        expect(result.isSuccess).toBe(true);
        expect(result.value?.rolle.value).toBe(rolle.value);
      }
    });

    it('should fail with empty einsatzId', () => {
      const rolle = EinsatzRolle.ERSTELLER();
      const result = EinsatzRollenzuweisung.create('', validUserId, rolle);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId');
    });

    it('should fail with whitespace-only einsatzId', () => {
      const rolle = EinsatzRolle.ERSTELLER();
      const result = EinsatzRollenzuweisung.create('   ', validUserId, rolle);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId');
    });

    it('should fail with empty userId', () => {
      const rolle = EinsatzRolle.EMPFAENGER();
      const result = EinsatzRollenzuweisung.create(validEinsatzId, '', rolle);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('userId');
    });

    it('should fail with whitespace-only userId', () => {
      const rolle = EinsatzRolle.EMPFAENGER();
      const result = EinsatzRollenzuweisung.create(validEinsatzId, '   ', rolle);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('userId');
    });

    it('should generate unique IDs for different instances', () => {
      const rolle = EinsatzRolle.BEOBACHTER();
      const result1 = EinsatzRollenzuweisung.create(validEinsatzId, validUserId, rolle);
      const result2 = EinsatzRollenzuweisung.create(validEinsatzId, validUserId, rolle);

      expect(result1.value?.id).not.toBe(result2.value?.id);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute from DB data', () => {
      const id = 'existing-id-123';
      const rolle = EinsatzRolle.EMPFAENGER();
      const zugewiesenAm = new Date('2026-01-15T10:00:00Z');

      const entity = EinsatzRollenzuweisung.reconstitute(id, validEinsatzId, validUserId, rolle, zugewiesenAm);

      expect(entity.id).toBe(id);
      expect(entity.einsatzId).toBe(validEinsatzId);
      expect(entity.userId).toBe(validUserId);
      expect(entity.rolle.equals(rolle)).toBe(true);
      expect(entity.zugewiesenAm).toBe(zugewiesenAm);
    });
  });

  describe('equals()', () => {
    it('should return true for same ID', () => {
      const rolle = EinsatzRolle.BEFEHLSGEBER();
      const date = new Date();
      const entity1 = EinsatzRollenzuweisung.reconstitute('same-id', validEinsatzId, validUserId, rolle, date);
      const entity2 = EinsatzRollenzuweisung.reconstitute('same-id', validEinsatzId, validUserId, rolle, date);

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const rolle = EinsatzRolle.BEFEHLSGEBER();
      const date = new Date();
      const entity1 = EinsatzRollenzuweisung.reconstitute('id-1', validEinsatzId, validUserId, rolle, date);
      const entity2 = EinsatzRollenzuweisung.reconstitute('id-2', validEinsatzId, validUserId, rolle, date);

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should return false when comparing with undefined', () => {
      const rolle = EinsatzRolle.ERSTELLER();
      const result = EinsatzRollenzuweisung.create(validEinsatzId, validUserId, rolle);
      expect(result.value?.equals(undefined)).toBe(false);
    });

    it('should return true when comparing with itself', () => {
      const rolle = EinsatzRolle.ERSTELLER();
      const result = EinsatzRollenzuweisung.create(validEinsatzId, validUserId, rolle);
      expect(result.value?.equals(result.value!)).toBe(true);
    });
  });
});
