import { BefehlStatus } from './befehl-status';

describe('BefehlStatus', () => {
  describe('create() - Factory Method', () => {
    it('should create with valid value ERTEILT', () => {
      const result = BefehlStatus.create('ERTEILT');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('ERTEILT');
    });

    it('should create with valid value ZUGESTELLT', () => {
      const result = BefehlStatus.create('ZUGESTELLT');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('ZUGESTELLT');
    });

    it('should create with valid value QUITTIERT', () => {
      const result = BefehlStatus.create('QUITTIERT');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('QUITTIERT');
    });

    it('should create with valid value KORRIGIERT', () => {
      const result = BefehlStatus.create('KORRIGIERT');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('KORRIGIERT');
    });

    it('should fail with invalid status value', () => {
      const result = BefehlStatus.create('UNGUELTIG');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültiger Befehl-Status');
      expect(result.error).toContain('UNGUELTIG');
      expect(result.error).toContain('ERTEILT');
    });

    it('should fail with empty string', () => {
      const result = BefehlStatus.create('');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültiger Befehl-Status');
    });

    it('should fail with lowercase status value', () => {
      const result = BefehlStatus.create('erteilt');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültiger Befehl-Status');
    });
  });

  describe('Static Convenience Factories', () => {
    it('should create ERTEILT status', () => {
      const status = BefehlStatus.ERTEILT();
      expect(status.value).toBe('ERTEILT');
    });

    it('should create ZUGESTELLT status', () => {
      const status = BefehlStatus.ZUGESTELLT();
      expect(status.value).toBe('ZUGESTELLT');
    });

    it('should create QUITTIERT status', () => {
      const status = BefehlStatus.QUITTIERT();
      expect(status.value).toBe('QUITTIERT');
    });

    it('should create KORRIGIERT status', () => {
      const status = BefehlStatus.KORRIGIERT();
      expect(status.value).toBe('KORRIGIERT');
    });

    it('should create structurally equal instances', () => {
      const status1 = BefehlStatus.ERTEILT();
      const status2 = BefehlStatus.ERTEILT();

      expect(status1).not.toBe(status2);
      expect(status1.equals(status2)).toBe(true);
    });
  });

  describe('canTransitionTo() - State Machine', () => {
    describe('Transitions from ERTEILT', () => {
      it('should allow ERTEILT → ZUGESTELLT', () => {
        expect(BefehlStatus.ERTEILT().canTransitionTo(BefehlStatus.ZUGESTELLT())).toBe(true);
      });

      it('should allow ERTEILT → KORRIGIERT', () => {
        expect(BefehlStatus.ERTEILT().canTransitionTo(BefehlStatus.KORRIGIERT())).toBe(true);
      });

      it('should block ERTEILT → QUITTIERT', () => {
        expect(BefehlStatus.ERTEILT().canTransitionTo(BefehlStatus.QUITTIERT())).toBe(false);
      });

      it('should block ERTEILT → ERTEILT (self)', () => {
        expect(BefehlStatus.ERTEILT().canTransitionTo(BefehlStatus.ERTEILT())).toBe(false);
      });
    });

    describe('Transitions from ZUGESTELLT', () => {
      it('should allow ZUGESTELLT → QUITTIERT', () => {
        expect(BefehlStatus.ZUGESTELLT().canTransitionTo(BefehlStatus.QUITTIERT())).toBe(true);
      });

      it('should allow ZUGESTELLT → KORRIGIERT', () => {
        expect(BefehlStatus.ZUGESTELLT().canTransitionTo(BefehlStatus.KORRIGIERT())).toBe(true);
      });

      it('should block ZUGESTELLT → ERTEILT (backward)', () => {
        expect(BefehlStatus.ZUGESTELLT().canTransitionTo(BefehlStatus.ERTEILT())).toBe(false);
      });

      it('should block ZUGESTELLT → ZUGESTELLT (self)', () => {
        expect(BefehlStatus.ZUGESTELLT().canTransitionTo(BefehlStatus.ZUGESTELLT())).toBe(false);
      });
    });

    describe('Transitions from QUITTIERT (final)', () => {
      it('should block all transitions from QUITTIERT', () => {
        const quittiert = BefehlStatus.QUITTIERT();

        expect(quittiert.canTransitionTo(BefehlStatus.ERTEILT())).toBe(false);
        expect(quittiert.canTransitionTo(BefehlStatus.ZUGESTELLT())).toBe(false);
        expect(quittiert.canTransitionTo(BefehlStatus.QUITTIERT())).toBe(false);
        expect(quittiert.canTransitionTo(BefehlStatus.KORRIGIERT())).toBe(false);
      });
    });

    describe('Transitions from KORRIGIERT (final)', () => {
      it('should block all transitions from KORRIGIERT', () => {
        const korrigiert = BefehlStatus.KORRIGIERT();

        expect(korrigiert.canTransitionTo(BefehlStatus.ERTEILT())).toBe(false);
        expect(korrigiert.canTransitionTo(BefehlStatus.ZUGESTELLT())).toBe(false);
        expect(korrigiert.canTransitionTo(BefehlStatus.QUITTIERT())).toBe(false);
        expect(korrigiert.canTransitionTo(BefehlStatus.KORRIGIERT())).toBe(false);
      });
    });

    describe('Complete Flow', () => {
      it('should support ERTEILT → ZUGESTELLT → QUITTIERT', () => {
        expect(BefehlStatus.ERTEILT().canTransitionTo(BefehlStatus.ZUGESTELLT())).toBe(true);
        expect(BefehlStatus.ZUGESTELLT().canTransitionTo(BefehlStatus.QUITTIERT())).toBe(true);
      });

      it('should support ERTEILT → KORRIGIERT (Korrekturbefehl)', () => {
        expect(BefehlStatus.ERTEILT().canTransitionTo(BefehlStatus.KORRIGIERT())).toBe(true);
      });
    });
  });

  describe('equals() - Structural Equality', () => {
    it('should return true for same value', () => {
      expect(BefehlStatus.ERTEILT().equals(BefehlStatus.ERTEILT())).toBe(true);
    });

    it('should return false for different values', () => {
      expect(BefehlStatus.ERTEILT().equals(BefehlStatus.ZUGESTELLT())).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(BefehlStatus.ERTEILT().equals(undefined)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return status value', () => {
      expect(BefehlStatus.ERTEILT().toString()).toBe('ERTEILT');
      expect(BefehlStatus.ZUGESTELLT().toString()).toBe('ZUGESTELLT');
      expect(BefehlStatus.QUITTIERT().toString()).toBe('QUITTIERT');
      expect(BefehlStatus.KORRIGIERT().toString()).toBe('KORRIGIERT');
    });
  });

  describe('Immutability', () => {
    it('should freeze props object', () => {
      const status = BefehlStatus.ERTEILT();
      expect(Object.isFrozen(status.props)).toBe(true);
    });

    it('should prevent modification of value via props', () => {
      const status = BefehlStatus.ERTEILT();
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        status.props.value = 'MODIFIED';
      }).toThrow();
      expect(status.value).toBe('ERTEILT');
    });
  });
});
