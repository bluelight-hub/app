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

import { BefehlKommentar } from './befehl-kommentar.entity';
import { UserId } from '@domain/value-objects/user-id';

describe('BefehlKommentar', () => {
  const createUserId = () => UserId.create().value!;

  describe('create()', () => {
    it('should create a new BefehlKommentar', () => {
      const authorId = createUserId();
      const kommentar = BefehlKommentar.create(authorId, 'Befehl verstanden', false);

      expect(kommentar.id).toBeDefined();
      expect(kommentar.id.length).toBeGreaterThanOrEqual(20);
      expect(kommentar.authorId).toBe(authorId);
      expect(kommentar.text).toBe('Befehl verstanden');
      expect(kommentar.isRueckfrage).toBe(false);
      expect(kommentar.parentId).toBeUndefined();
      expect(kommentar.createdAt).toBeInstanceOf(Date);
    });

    it('should create Rueckfrage-Kommentar', () => {
      const kommentar = BefehlKommentar.create(createUserId(), 'Welche Einheit?', true);

      expect(kommentar.isRueckfrage).toBe(true);
    });

    it('should create with parentId for thread support', () => {
      const parentKommentar = BefehlKommentar.create(createUserId(), 'Rückfrage', true);
      const antwort = BefehlKommentar.create(createUserId(), 'Antwort auf Rückfrage', false, parentKommentar.id);

      expect(antwort.parentId).toBe(parentKommentar.id);
    });

    it('should generate unique ids', () => {
      const userId = createUserId();
      const k1 = BefehlKommentar.create(userId, 'Text 1', false);
      const k2 = BefehlKommentar.create(userId, 'Text 2', false);

      expect(k1.id).not.toBe(k2.id);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute with all fields', () => {
      const authorId = createUserId();
      const created = new Date('2026-01-15T10:00:00Z');

      const kommentar = BefehlKommentar.reconstitute('test-id-123', authorId, 'Kommentar text', true, 'parent-id-456', created);

      expect(kommentar.id).toBe('test-id-123');
      expect(kommentar.authorId).toBe(authorId);
      expect(kommentar.text).toBe('Kommentar text');
      expect(kommentar.isRueckfrage).toBe(true);
      expect(kommentar.parentId).toBe('parent-id-456');
      expect(kommentar.createdAt).toBe(created);
    });
  });

  describe('equals()', () => {
    it('should return true for same id', () => {
      const userId = createUserId();
      const k1 = BefehlKommentar.reconstitute('same-id', userId, 'Text', false);
      const k2 = BefehlKommentar.reconstitute('same-id', userId, 'Anderer Text', true);

      expect(k1.equals(k2)).toBe(true);
    });

    it('should return false for different ids', () => {
      const userId = createUserId();
      const k1 = BefehlKommentar.create(userId, 'Text', false);
      const k2 = BefehlKommentar.create(userId, 'Text', false);

      expect(k1.equals(k2)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      const kommentar = BefehlKommentar.create(createUserId(), 'Text', false);
      expect(kommentar.equals(undefined)).toBe(false);
    });

    it('should return true for same reference', () => {
      const kommentar = BefehlKommentar.create(createUserId(), 'Text', false);
      expect(kommentar.equals(kommentar)).toBe(true);
    });
  });
});
