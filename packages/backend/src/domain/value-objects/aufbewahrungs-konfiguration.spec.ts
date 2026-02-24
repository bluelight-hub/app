import { AufbewahrungsKonfiguration } from './aufbewahrungs-konfiguration';

describe('AufbewahrungsKonfiguration', () => {
  describe('create', () => {
    it('sollte eine gueltige Konfiguration erstellen', () => {
      const result = AufbewahrungsKonfiguration.create(10, 30, false);
      expect(result.isSuccess).toBe(true);
      expect(result.value?.aufbewahrungsfristJahre).toBe(10);
      expect(result.value?.freigabeperiodeTage).toBe(30);
      expect(result.value?.automatischLoeschenAktiv).toBe(false);
    });

    it('sollte bei Minimalwerten erfolgreich sein', () => {
      const result = AufbewahrungsKonfiguration.create(1, 1, true);
      expect(result.isSuccess).toBe(true);
    });

    it('sollte bei Maximalwerten erfolgreich sein', () => {
      const result = AufbewahrungsKonfiguration.create(30, 365, true);
      expect(result.isSuccess).toBe(true);
    });

    it('sollte bei zu kleiner Frist fehlschlagen', () => {
      const result = AufbewahrungsKonfiguration.create(0, 30, false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('zwischen');
    });

    it('sollte bei zu grosser Frist fehlschlagen', () => {
      const result = AufbewahrungsKonfiguration.create(31, 30, false);
      expect(result.isFailure).toBe(true);
    });

    it('sollte bei zu kleiner Freigabeperiode fehlschlagen', () => {
      const result = AufbewahrungsKonfiguration.create(10, 0, false);
      expect(result.isFailure).toBe(true);
    });

    it('sollte bei zu grosser Freigabeperiode fehlschlagen', () => {
      const result = AufbewahrungsKonfiguration.create(10, 366, false);
      expect(result.isFailure).toBe(true);
    });

    it('sollte bei Dezimalzahl fuer Frist fehlschlagen', () => {
      const result = AufbewahrungsKonfiguration.create(10.5, 30, false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('ganze Zahl');
    });

    it('sollte bei Dezimalzahl fuer Freigabeperiode fehlschlagen', () => {
      const result = AufbewahrungsKonfiguration.create(10, 30.5, false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('ganze Zahl');
    });
  });

  describe('default', () => {
    it('sollte GoBD-konforme Default-Werte haben', () => {
      const config = AufbewahrungsKonfiguration.default();
      expect(config.aufbewahrungsfristJahre).toBe(10);
      expect(config.freigabeperiodeTage).toBe(30);
      expect(config.automatischLoeschenAktiv).toBe(false);
    });
  });

  describe('toString', () => {
    it('sollte eine lesbare Darstellung liefern', () => {
      const config = AufbewahrungsKonfiguration.default();
      expect(config.toString()).toBe('Aufbewahrung: 10J, Freigabe: 30T, Aktiv: false');
    });
  });

  describe('equality', () => {
    it('sollte gleiche Konfigurationen als gleich erkennen', () => {
      const a = AufbewahrungsKonfiguration.create(10, 30, false).value!;
      const b = AufbewahrungsKonfiguration.create(10, 30, false).value!;
      expect(a.equals(b)).toBe(true);
    });

    it('sollte unterschiedliche Konfigurationen als ungleich erkennen', () => {
      const a = AufbewahrungsKonfiguration.create(10, 30, false).value!;
      const b = AufbewahrungsKonfiguration.create(5, 30, false).value!;
      expect(a.equals(b)).toBe(false);
    });
  });
});
