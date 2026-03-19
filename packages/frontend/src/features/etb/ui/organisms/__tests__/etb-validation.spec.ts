import { describe, expect, it } from 'vitest';
import { etbEntrySchema } from '../EtbEntryForm';

describe('etbEntrySchema', () => {
  describe('5.1: Zod-Schema Validierungsregeln', () => {
    it('akzeptiert alle Pflichtfelder korrekt ausgefüllt', () => {
      // Gegeben: ein vollständiges Formular mit allen Feldern
      const input = {
        kategorie: 'LAGE',
        text: 'Hochwasser gemeldet',
        absender: 'EL',
        empfaenger: 'Leitstelle',
      };

      // Wenn: das Schema validiert wird
      const result = etbEntrySchema.safeParse(input);

      // Dann: ist die Validierung erfolgreich
      expect(result.success).toBe(true);
    });

    it('akzeptiert nur Pflichtfelder ohne absender/empfaenger', () => {
      // Gegeben: ein Formular mit nur den Pflichtfeldern
      const input = {
        kategorie: 'BEFEHL',
        text: 'Rückzug angeordnet',
      };

      // Wenn: das Schema validiert wird
      const result = etbEntrySchema.safeParse(input);

      // Dann: ist die Validierung erfolgreich
      expect(result.success).toBe(true);
    });

    it('lehnt leeren Text ab mit Fehlermeldung "Text ist erforderlich"', () => {
      // Gegeben: ein Formular mit leerem Text
      const input = {
        kategorie: 'LAGE',
        text: '',
      };

      // Wenn: das Schema validiert wird
      const result = etbEntrySchema.safeParse(input);

      // Dann: schlägt die Validierung fehl mit passender Meldung
      expect(result.success).toBe(false);
      if (!result.success) {
        const textError = result.error.issues.find((i) => i.path.includes('text'));
        expect(textError?.message).toBe('Text ist erforderlich');
      }
    });

    it('lehnt Text über 2000 Zeichen ab mit Fehlermeldung "Maximal 2000 Zeichen"', () => {
      // Gegeben: ein Formular mit zu langem Text
      const input = {
        kategorie: 'PERSONAL',
        text: 'x'.repeat(2001),
      };

      // Wenn: das Schema validiert wird
      const result = etbEntrySchema.safeParse(input);

      // Dann: schlägt die Validierung fehl mit passender Meldung
      expect(result.success).toBe(false);
      if (!result.success) {
        const textError = result.error.issues.find((i) => i.path.includes('text'));
        expect(textError?.message).toBe('Maximal 2000 Zeichen');
      }
    });

    it('lehnt absender über 100 Zeichen ab mit Fehlermeldung "Maximal 100 Zeichen"', () => {
      // Gegeben: ein Formular mit zu langem Absender
      const input = {
        kategorie: 'LOGISTIK',
        text: 'Nachschub angefordert',
        absender: 'A'.repeat(101),
      };

      // Wenn: das Schema validiert wird
      const result = etbEntrySchema.safeParse(input);

      // Dann: schlägt die Validierung fehl mit passender Meldung
      expect(result.success).toBe(false);
      if (!result.success) {
        const absenderError = result.error.issues.find((i) => i.path.includes('absender'));
        expect(absenderError?.message).toBe('Maximal 100 Zeichen');
      }
    });

    it('lehnt empfaenger über 100 Zeichen ab mit Fehlermeldung "Maximal 100 Zeichen"', () => {
      // Gegeben: ein Formular mit zu langem Empfänger
      const input = {
        kategorie: 'SONSTIGES',
        text: 'Info an alle Einheiten',
        empfaenger: 'E'.repeat(101),
      };

      // Wenn: das Schema validiert wird
      const result = etbEntrySchema.safeParse(input);

      // Dann: schlägt die Validierung fehl mit passender Meldung
      expect(result.success).toBe(false);
      if (!result.success) {
        const empfaengerError = result.error.issues.find((i) => i.path.includes('empfaenger'));
        expect(empfaengerError?.message).toBe('Maximal 100 Zeichen');
      }
    });

    it('lehnt ungültige Kategorie ab', () => {
      // Gegeben: ein Formular mit ungültiger Kategorie
      const input = {
        kategorie: 'UNGUELTIG',
        text: 'Ein Eintrag',
      };

      // Wenn: das Schema validiert wird
      const result = etbEntrySchema.safeParse(input);

      // Dann: schlägt die Validierung fehl mit Zod-Enum-Fehlermeldung
      expect(result.success).toBe(false);
      if (!result.success) {
        const kategorieError = result.error.issues.find((i) => i.path.includes('kategorie'));
        expect(kategorieError?.message).toContain('Invalid option: expected one of');
        expect(kategorieError?.message).toContain('ALARMIERUNG');
        expect(kategorieError?.message).toContain('SONSTIGES');
      }
    });

    it('akzeptiert absender und empfaenger als leer/undefined', () => {
      // Gegeben: ein Formular mit leeren optionalen Feldern
      const withEmpty = {
        kategorie: 'LAGE',
        text: 'Lagemeldung eingegangen',
        absender: '',
        empfaenger: '',
      };

      const withUndefined = {
        kategorie: 'LAGE',
        text: 'Lagemeldung eingegangen',
        absender: undefined,
        empfaenger: undefined,
      };

      // Wenn: das Schema validiert wird
      const resultEmpty = etbEntrySchema.safeParse(withEmpty);
      const resultUndefined = etbEntrySchema.safeParse(withUndefined);

      // Dann: sind beide Varianten erfolgreich
      expect(resultEmpty.success).toBe(true);
      expect(resultUndefined.success).toBe(true);
    });
  });

  describe('5.5: Performance-Test: Validierung innerhalb 200ms', () => {
    it('safeParse schließt 1000 Iterationen mit Durchschnitt < 1ms ab', () => {
      // Gegeben: ein valides Formular-Objekt
      const input = {
        kategorie: 'LAGE',
        text: 'Performance-Testmeldung',
        absender: 'EL',
        empfaenger: 'Leitstelle',
      };

      // Wenn: 1000 Iterationen durchgeführt werden
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        etbEntrySchema.safeParse(input);
      }

      const end = performance.now();
      const totalMs = end - start;
      const averageMs = totalMs / iterations;

      // Dann: ist die Gesamtdauer unter 200ms und der Durchschnitt unter 1ms
      expect(totalMs).toBeLessThan(200);
      expect(averageMs).toBeLessThan(1);
    });
  });
});
