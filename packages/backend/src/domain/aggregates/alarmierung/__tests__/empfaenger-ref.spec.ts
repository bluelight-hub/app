import type { AlarmierungEmpfaengerRef } from '../alarmierung-empfaenger-ref';
import { empfaengerRefEquals, validateEmpfaengerRef } from '../alarmierung-empfaenger-ref';

/**
 * Unit-Tests für die polymorphe Empfänger-Referenz des Alarmierung-Aggregats.
 *
 * Deckt `validateEmpfaengerRef` (Format-Validierung inkl. aller drei Kinds)
 * sowie `empfaengerRefEquals` (strukturelle Gleichheit) vollständig ab.
 */
describe('AlarmierungEmpfaengerRef', () => {
  describe('validateEmpfaengerRef', () => {
    it('akzeptiert gültige Fahrzeug-Referenz', () => {
      const ref: AlarmierungEmpfaengerRef = { kind: 'fahrzeug', fahrzeugId: 'fzg-1' };

      const result = validateEmpfaengerRef(ref);

      expect(result.isSuccess).toBe(true);
    });

    it('akzeptiert gültige Personen-Referenz', () => {
      const ref: AlarmierungEmpfaengerRef = { kind: 'person', personId: 'person-1' };

      const result = validateEmpfaengerRef(ref);

      expect(result.isSuccess).toBe(true);
    });

    it('akzeptiert gültige Einheiten-Referenz', () => {
      const ref: AlarmierungEmpfaengerRef = { kind: 'einheit', einheitId: 'einheit-1' };

      const result = validateEmpfaengerRef(ref);

      expect(result.isSuccess).toBe(true);
    });

    it('lehnt null/undefined ab', () => {
      const result = validateEmpfaengerRef(null as unknown as AlarmierungEmpfaengerRef);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('empfaengerRef ist erforderlich');
    });

    it('lehnt Nicht-Objekt-Werte ab (z.B. String)', () => {
      const result = validateEmpfaengerRef('fahrzeug' as unknown as AlarmierungEmpfaengerRef);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('empfaengerRef ist erforderlich');
    });

    it('lehnt leere fahrzeugId ab', () => {
      const ref = { kind: 'fahrzeug', fahrzeugId: '' } as unknown as AlarmierungEmpfaengerRef;

      const result = validateEmpfaengerRef(ref);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('fahrzeugId ist erforderlich');
    });

    it('lehnt fahrzeugId mit reinem Whitespace ab', () => {
      const ref = { kind: 'fahrzeug', fahrzeugId: '   ' } as unknown as AlarmierungEmpfaengerRef;

      const result = validateEmpfaengerRef(ref);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('fahrzeugId ist erforderlich');
    });

    it('lehnt leere personId ab', () => {
      const ref = { kind: 'person', personId: '' } as unknown as AlarmierungEmpfaengerRef;

      const result = validateEmpfaengerRef(ref);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('personId ist erforderlich');
    });

    it('lehnt leere einheitId ab', () => {
      const ref = { kind: 'einheit', einheitId: '' } as unknown as AlarmierungEmpfaengerRef;

      const result = validateEmpfaengerRef(ref);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einheitId ist erforderlich');
    });

    it('lehnt unbekannten kind-Diskriminator ab', () => {
      const ref = { kind: 'roboter', roboterId: 'r2d2' } as unknown as AlarmierungEmpfaengerRef;

      const result = validateEmpfaengerRef(ref);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('empfaengerRef.kind muss fahrzeug | person | einheit sein');
    });
  });

  describe('empfaengerRefEquals', () => {
    it('zwei identische Fahrzeug-Refs sind gleich', () => {
      const a: AlarmierungEmpfaengerRef = { kind: 'fahrzeug', fahrzeugId: 'fzg-1' };
      const b: AlarmierungEmpfaengerRef = { kind: 'fahrzeug', fahrzeugId: 'fzg-1' };

      expect(empfaengerRefEquals(a, b)).toBe(true);
    });

    it('zwei Fahrzeug-Refs mit unterschiedlicher fahrzeugId sind ungleich', () => {
      const a: AlarmierungEmpfaengerRef = { kind: 'fahrzeug', fahrzeugId: 'fzg-1' };
      const b: AlarmierungEmpfaengerRef = { kind: 'fahrzeug', fahrzeugId: 'fzg-2' };

      expect(empfaengerRefEquals(a, b)).toBe(false);
    });

    it('zwei identische Personen-Refs sind gleich', () => {
      const a: AlarmierungEmpfaengerRef = { kind: 'person', personId: 'person-1' };
      const b: AlarmierungEmpfaengerRef = { kind: 'person', personId: 'person-1' };

      expect(empfaengerRefEquals(a, b)).toBe(true);
    });

    it('zwei identische Einheiten-Refs sind gleich', () => {
      const a: AlarmierungEmpfaengerRef = { kind: 'einheit', einheitId: 'einheit-1' };
      const b: AlarmierungEmpfaengerRef = { kind: 'einheit', einheitId: 'einheit-1' };

      expect(empfaengerRefEquals(a, b)).toBe(true);
    });

    it('unterschiedliche kinds sind ungleich (auch bei identischer ID-Struktur)', () => {
      const a = { kind: 'fahrzeug', fahrzeugId: 'shared-id' } as AlarmierungEmpfaengerRef;
      const b = { kind: 'person', personId: 'shared-id' } as AlarmierungEmpfaengerRef;

      expect(empfaengerRefEquals(a, b)).toBe(false);
    });

    it('Fahrzeug vs. Einheit sind ungleich', () => {
      const a: AlarmierungEmpfaengerRef = { kind: 'fahrzeug', fahrzeugId: 'x' };
      const b: AlarmierungEmpfaengerRef = { kind: 'einheit', einheitId: 'x' };

      expect(empfaengerRefEquals(a, b)).toBe(false);
    });

    it('Person vs. Einheit sind ungleich', () => {
      const a: AlarmierungEmpfaengerRef = { kind: 'person', personId: 'x' };
      const b: AlarmierungEmpfaengerRef = { kind: 'einheit', einheitId: 'x' };

      expect(empfaengerRefEquals(a, b)).toBe(false);
    });
  });
});
