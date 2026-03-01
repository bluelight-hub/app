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

import { BefehlEmpfaenger } from './befehl-empfaenger.entity';
import { UserId } from '@domain/value-objects/user-id';

describe('BefehlEmpfaenger', () => {
  const createUserId = () => UserId.create().value!;

  describe('create()', () => {
    it('should create a new BefehlEmpfaenger with name and auto-generated id', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');

      expect(empfaenger.id).toBeDefined();
      expect(empfaenger.id.length).toBeGreaterThanOrEqual(20);
      expect(empfaenger.name).toBe('ZF Nord');
      expect(empfaenger.empfaengerId).toBeUndefined();
      expect(empfaenger.zugestelltAm).toBeUndefined();
      expect(empfaenger.quittiertAm).toBeUndefined();
      expect(empfaenger.quittierungArt).toBeUndefined();
      expect(empfaenger.createdAt).toBeInstanceOf(Date);
    });

    it('should create with optional empfaengerId', () => {
      const userId = createUserId();
      const empfaenger = BefehlEmpfaenger.create('ZF Nord', userId);

      expect(empfaenger.name).toBe('ZF Nord');
      expect(empfaenger.empfaengerId).toBe(userId);
    });

    it('should generate unique ids', () => {
      const e1 = BefehlEmpfaenger.create('ZF Nord');
      const e2 = BefehlEmpfaenger.create('ZF Süd');

      expect(e1.id).not.toBe(e2.id);
    });

    it('should initialize with istZugestellt=false and istQuittiert=false', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');

      expect(empfaenger.istZugestellt).toBe(false);
      expect(empfaenger.istQuittiert).toBe(false);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute with all fields', () => {
      const userId = createUserId();
      const zugestellt = new Date('2026-01-15T10:00:00Z');
      const quittiert = new Date('2026-01-15T10:05:00Z');
      const created = new Date('2026-01-15T09:00:00Z');

      const empfaenger = BefehlEmpfaenger.reconstitute('test-id-123', 'ZF Nord', userId, zugestellt, quittiert, 'VERSTANDEN', undefined, created);

      expect(empfaenger.id).toBe('test-id-123');
      expect(empfaenger.name).toBe('ZF Nord');
      expect(empfaenger.empfaengerId).toBe(userId);
      expect(empfaenger.zugestelltAm).toBe(zugestellt);
      expect(empfaenger.quittiertAm).toBe(quittiert);
      expect(empfaenger.quittierungArt).toBe('VERSTANDEN');
      expect(empfaenger.quittierungKommentar).toBeUndefined();
      expect(empfaenger.createdAt).toBe(created);
    });

    it('should reconstitute without empfaengerId', () => {
      const empfaenger = BefehlEmpfaenger.reconstitute('test-id-123', 'ZF Nord', undefined);

      expect(empfaenger.name).toBe('ZF Nord');
      expect(empfaenger.empfaengerId).toBeUndefined();
    });
  });

  describe('markAlsZugestellt()', () => {
    it('should set zugestelltAm to current date', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      const before = new Date();

      empfaenger.markAlsZugestellt();

      expect(empfaenger.zugestelltAm).toBeDefined();
      expect(empfaenger.zugestelltAm?.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(empfaenger.istZugestellt).toBe(true);
    });

    it('should accept custom timestamp', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      const customDate = new Date('2026-01-15T10:00:00Z');

      empfaenger.markAlsZugestellt(customDate);

      expect(empfaenger.zugestelltAm).toBe(customDate);
    });
  });

  describe('quittieren()', () => {
    it('should fail if not zugestellt', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');

      const result = empfaenger.quittieren('VERSTANDEN');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Empfänger wurde noch nicht zugestellt');
      expect(empfaenger.quittiertAm).toBeUndefined();
      expect(empfaenger.quittierungArt).toBeUndefined();
    });

    it('should set quittierungArt VERSTANDEN after zugestellt', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      empfaenger.markAlsZugestellt();

      const result = empfaenger.quittieren('VERSTANDEN');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.quittiertAm).toBeDefined();
      expect(empfaenger.quittierungArt).toBe('VERSTANDEN');
      expect(empfaenger.istQuittiert).toBe(true);
    });

    it('should set quittierungArt RUECKFRAGE', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      empfaenger.markAlsZugestellt();

      const result = empfaenger.quittieren('RUECKFRAGE');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.quittierungArt).toBe('RUECKFRAGE');
    });

    it('should set quittierungArt NICHT_VERSTANDEN', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      empfaenger.markAlsZugestellt();

      const result = empfaenger.quittieren('NICHT_VERSTANDEN');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.quittierungArt).toBe('NICHT_VERSTANDEN');
    });

    it('should accept custom timestamp', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      empfaenger.markAlsZugestellt();
      const customDate = new Date('2026-01-15T10:05:00Z');

      const result = empfaenger.quittieren('VERSTANDEN', customDate);

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.quittiertAm).toBe(customDate);
    });
  });

  describe('anonymisiere() - DSGVO Story 5.5', () => {
    it('sollte Name mit gesalzenem Hash ersetzen', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');

      const result = empfaenger.anonymisiere('test-salt');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.name).toMatch(/^\[ANON-[a-f0-9]{6}\]$/);
      expect(empfaenger.name).not.toBe('ZF Nord');
    });

    it('sollte empfaengerId entfernen', () => {
      const userId = createUserId();
      const empfaenger = BefehlEmpfaenger.create('ZF Nord', userId);
      expect(empfaenger.empfaengerId).toBe(userId);

      empfaenger.anonymisiere('salt-123');

      expect(empfaenger.empfaengerId).toBeUndefined();
    });

    it('sollte deterministisch sein (gleicher Name + Salt = gleicher Hash)', () => {
      const e1 = BefehlEmpfaenger.create('ZF Nord');
      const e2 = BefehlEmpfaenger.create('ZF Nord');

      e1.anonymisiere('same-salt');
      e2.anonymisiere('same-salt');

      expect(e1.name).toBe(e2.name);
    });

    it('sollte verschiedene Hashes mit verschiedenen Salts erzeugen', () => {
      const e1 = BefehlEmpfaenger.create('ZF Nord');
      const e2 = BefehlEmpfaenger.create('ZF Nord');

      e1.anonymisiere('salt-a');
      e2.anonymisiere('salt-b');

      expect(e1.name).not.toBe(e2.name);
    });
  });

  describe('equals()', () => {
    it('should return true for same id', () => {
      const e1 = BefehlEmpfaenger.reconstitute('same-id', 'ZF Nord', undefined);
      const e2 = BefehlEmpfaenger.reconstitute('same-id', 'ZF Nord', undefined);

      expect(e1.equals(e2)).toBe(true);
    });

    it('should return false for different ids', () => {
      const e1 = BefehlEmpfaenger.create('ZF Nord');
      const e2 = BefehlEmpfaenger.create('ZF Süd');

      expect(e1.equals(e2)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      expect(empfaenger.equals(undefined)).toBe(false);
    });

    it('should return true for same reference', () => {
      const empfaenger = BefehlEmpfaenger.create('ZF Nord');
      expect(empfaenger.equals(empfaenger)).toBe(true);
    });
  });
});
