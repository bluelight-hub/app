import { FunkPrioritaet } from '../funk-prioritaet';

describe('FunkPrioritaet', () => {
  describe('create()', () => {
    it('akzeptiert gültige Werte', () => {
      expect(FunkPrioritaet.create('routine').isSuccess).toBe(true);
      expect(FunkPrioritaet.create('prioritaet').isSuccess).toBe(true);
      expect(FunkPrioritaet.create('notfall').isSuccess).toBe(true);
    });

    it('lehnt ungültige Werte ab', () => {
      const result = FunkPrioritaet.create('dringend' as never);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige FunkPrioritaet');
    });

    it('lehnt leeren String ab', () => {
      expect(FunkPrioritaet.create('' as never).isFailure).toBe(true);
    });
  });

  describe('isNotfall()', () => {
    it('liefert true für notfall', () => {
      const notfall = FunkPrioritaet.create('notfall').value!;
      expect(notfall.isNotfall()).toBe(true);
    });

    it('liefert false für routine', () => {
      const routine = FunkPrioritaet.create('routine').value!;
      expect(routine.isNotfall()).toBe(false);
    });

    it('liefert false für prioritaet', () => {
      const prio = FunkPrioritaet.create('prioritaet').value!;
      expect(prio.isNotfall()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('erkennt gleiche Werte', () => {
      const a = FunkPrioritaet.create('routine').value!;
      const b = FunkPrioritaet.create('routine').value!;
      expect(a.equals(b)).toBe(true);
    });

    it('erkennt ungleiche Werte', () => {
      const a = FunkPrioritaet.create('routine').value!;
      const b = FunkPrioritaet.create('notfall').value!;
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('static factories', () => {
    it('ROUTINE(), PRIORITAET(), NOTFALL() liefern jeweils korrekte Instanz', () => {
      expect(FunkPrioritaet.ROUTINE().value).toBe('routine');
      expect(FunkPrioritaet.PRIORITAET().value).toBe('prioritaet');
      expect(FunkPrioritaet.NOTFALL().value).toBe('notfall');
      expect(FunkPrioritaet.NOTFALL().isNotfall()).toBe(true);
    });
  });
});
