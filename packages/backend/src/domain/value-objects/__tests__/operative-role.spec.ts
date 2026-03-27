import { OperativeRole } from '../operative-role';

describe('OperativeRole', () => {
  describe('create', () => {
    it('erstellt FUEHRUNGSKRAFT aus gültigem String', () => {
      const result = OperativeRole.create('FUEHRUNGSKRAFT');
      expect(result.isSuccess).toBe(true);
      expect(result.value!.value).toBe('FUEHRUNGSKRAFT');
    });

    it('erstellt EINSATZKRAFT aus gültigem String', () => {
      const result = OperativeRole.create('EINSATZKRAFT');
      expect(result.isSuccess).toBe(true);
      expect(result.value!.value).toBe('EINSATZKRAFT');
    });

    it('erstellt EXTERNE aus gültigem String', () => {
      const result = OperativeRole.create('EXTERNE');
      expect(result.isSuccess).toBe(true);
      expect(result.value!.value).toBe('EXTERNE');
    });

    it('lehnt ungültigen Wert ab', () => {
      const result = OperativeRole.create('INVALID');
      expect(result.isFailure).toBe(true);
    });
  });

  describe('static factories', () => {
    it('FUEHRUNGSKRAFT() erstellt korrekte Rolle', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().value).toBe('FUEHRUNGSKRAFT');
    });

    it('EINSATZKRAFT() erstellt korrekte Rolle', () => {
      expect(OperativeRole.EINSATZKRAFT().value).toBe('EINSATZKRAFT');
    });

    it('EXTERNE() erstellt korrekte Rolle', () => {
      expect(OperativeRole.EXTERNE().value).toBe('EXTERNE');
    });
  });

  describe('canAccessEinsatzList', () => {
    it('FK kann Einsatz-Liste sehen', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().canAccessEinsatzList()).toBe(true);
    });

    it('EK kann Einsatz-Liste sehen', () => {
      expect(OperativeRole.EINSATZKRAFT().canAccessEinsatzList()).toBe(true);
    });

    it('Externe kann Einsatz-Liste NICHT sehen', () => {
      expect(OperativeRole.EXTERNE().canAccessEinsatzList()).toBe(false);
    });
  });

  describe('canOpenEinsatz', () => {
    it('FK kann Einsatz öffnen', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().canOpenEinsatz()).toBe(true);
    });

    it('EK kann Einsatz NICHT öffnen', () => {
      expect(OperativeRole.EINSATZKRAFT().canOpenEinsatz()).toBe(false);
    });

    it('Externe kann Einsatz NICHT öffnen', () => {
      expect(OperativeRole.EXTERNE().canOpenEinsatz()).toBe(false);
    });
  });

  describe('canArchiveEinsatz', () => {
    it('FK kann Einsatz archivieren', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().canArchiveEinsatz()).toBe(true);
    });

    it('EK kann Einsatz NICHT archivieren', () => {
      expect(OperativeRole.EINSATZKRAFT().canArchiveEinsatz()).toBe(false);
    });

    it('Externe kann Einsatz NICHT archivieren', () => {
      expect(OperativeRole.EXTERNE().canArchiveEinsatz()).toBe(false);
    });
  });

  describe('requiresStammperson', () => {
    it('FK benötigt Stammperson', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().requiresStammperson()).toBe(true);
    });

    it('EK benötigt Stammperson', () => {
      expect(OperativeRole.EINSATZKRAFT().requiresStammperson()).toBe(true);
    });

    it('Externe benötigt KEINE Stammperson', () => {
      expect(OperativeRole.EXTERNE().requiresStammperson()).toBe(false);
    });
  });

  describe('toString', () => {
    it('gibt den Rollenwert zurück', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().toString()).toBe('FUEHRUNGSKRAFT');
    });
  });
});
