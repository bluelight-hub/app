import { EintragKontext, FunkKontext, StandardKontext } from '../eintrag-kontext';

describe('EintragKontext', () => {
  describe('standard()', () => {
    it('baut Standard-Kontext', () => {
      const k = EintragKontext.standard();
      expect(k.type).toBe('standard');
    });

    it('serialisiert zu { type: "standard" }', () => {
      const k = EintragKontext.standard();
      expect(k.toPersistence()).toEqual({ type: 'standard' });
    });
  });

  describe('funkspruch()', () => {
    it('baut FunkKontext mit kanalId und Priorität', () => {
      const k = EintragKontext.funkspruch({
        kanalId: 'k1',
        funkPrioritaet: 'notfall',
      });
      expect(k.type).toBe('funkspruch');
      expect((k as FunkKontext).kanalId).toBe('k1');
      expect((k as FunkKontext).funkPrioritaet).toBe('notfall');
    });

    it('serialisiert alle Felder', () => {
      const k = EintragKontext.funkspruch({
        kanalId: 'x',
        funkPrioritaet: 'prioritaet',
      });
      expect(k.toPersistence()).toEqual({
        type: 'funkspruch',
        kanalId: 'x',
        funkPrioritaet: 'prioritaet',
      });
    });
  });

  describe('fromPersistence()', () => {
    it('dekodiert Standard-Kontext', () => {
      const k = EintragKontext.fromPersistence('standard', null);
      expect(k.type).toBe('standard');
    });

    it('dekodiert FunkKontext aus JSONB', () => {
      const k = EintragKontext.fromPersistence('funkspruch', {
        kanalId: 'x',
        funkPrioritaet: 'routine',
      });
      expect(k.type).toBe('funkspruch');
      expect((k as FunkKontext).kanalId).toBe('x');
      expect((k as FunkKontext).funkPrioritaet).toBe('routine');
    });

    it('fällt bei unbekanntem type auf standard zurück', () => {
      const k = EintragKontext.fromPersistence('unknown', {});
      expect(k.type).toBe('standard');
    });

    it('Roundtrip: standard', () => {
      const original = EintragKontext.standard();
      const persisted = original.toPersistence();
      const restored: StandardKontext = EintragKontext.fromPersistence(persisted.type, null) as StandardKontext;
      expect(restored.type).toBe('standard');
    });

    it('Roundtrip: funkspruch', () => {
      const original = EintragKontext.funkspruch({
        kanalId: 'ch-42',
        funkPrioritaet: 'notfall',
      });
      const persisted = original.toPersistence();
      const restored = EintragKontext.fromPersistence(persisted.type, persisted.type === 'funkspruch' ? { kanalId: persisted.kanalId, funkPrioritaet: persisted.funkPrioritaet } : null) as FunkKontext;
      expect(restored.type).toBe('funkspruch');
      expect(restored.kanalId).toBe('ch-42');
      expect(restored.funkPrioritaet).toBe('notfall');
    });
  });
});
