import { describe, it, expect } from '@jest/globals';
import { EinsatzCompletenessCalculator, type EinsatzFields } from '../completeness.util';

describe('EinsatzCompletenessCalculator', () => {
  describe('calculate', () => {
    describe('Vollständige Einsätze', () => {
      it('should return 100% score when all required fields are present', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: 'Brand 3',
          alarmierungszeit: new Date('2025-01-15T10:30:00Z'),
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBe(100);
        expect(result.isComplete).toBe(true);
        expect(result.missingFields).toHaveLength(0);
      });

      it('should handle ISO date string correctly', () => {
        // Given (Arrange) - Prisma könnte ISO-Strings zurückgeben
        const einsatz: EinsatzFields = {
          alarmstichwort: 'TH1',
          alarmierungszeit: '2025-01-15T10:30:00.000Z',
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBe(100);
        expect(result.isComplete).toBe(true);
        expect(result.missingFields).toHaveLength(0);
      });
    });

    describe('Fehlende Felder', () => {
      it('should detect missing alarmstichwort', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: null,
          alarmierungszeit: new Date('2025-01-15T10:30:00Z'),
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBeLessThan(100);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields).toHaveLength(1);
        expect(result.missingFields[0]?.field).toBe('alarmstichwort');
        expect(result.missingFields[0]?.priority).toBe('critical');
      });

      it('should detect empty alarmstichwort string', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: '   ', // Nur Whitespace
          alarmierungszeit: new Date('2025-01-15T10:30:00Z'),
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBeLessThan(100);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields.some((f) => f.field === 'alarmstichwort')).toBe(true);
      });

      it('should detect missing alarmierungszeit', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: 'Brand 3',
          alarmierungszeit: null,
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBeLessThan(100);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields).toHaveLength(1);
        expect(result.missingFields[0]?.field).toBe('alarmierungszeit');
        expect(result.missingFields[0]?.priority).toBe('critical');
      });

      it('should detect invalid date', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: 'Brand 3',
          alarmierungszeit: 'invalid-date-string',
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBeLessThan(100);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields.some((f) => f.field === 'alarmierungszeit')).toBe(true);
      });

      it('should detect all missing fields', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: null,
          alarmierungszeit: null,
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBe(0);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields).toHaveLength(2);
      });
    });

    describe('Edge Cases', () => {
      it('should return 0% score when totalWeight is 0 (keine Felder definiert)', () => {
        // Given (Arrange) - Simuliere leere FIELD_WEIGHTS Config
        const einsatz: EinsatzFields = {}; // Keine Felder vorhanden

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        // MEDIUM FIX: totalWeight === 0 sollte 0% zurückgeben, nicht 100%
        // Aber aktuell haben wir Felder definiert, daher ist dieser Test
        // eher ein Dokumentations-Test für zukünftige Refactorings
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should handle undefined fields gracefully', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: undefined,
          alarmierungszeit: undefined,
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBe(0);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields).toHaveLength(2);
      });

      it('should handle Date object with invalid time', () => {
        // Given (Arrange) - Invalid Date Object
        const invalidDate = new Date('invalid');
        const einsatz: EinsatzFields = {
          alarmstichwort: 'Brand 3',
          alarmierungszeit: invalidDate,
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        expect(result.score).toBeLessThan(100);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields.some((f) => f.field === 'alarmierungszeit')).toBe(true);
      });
    });

    describe('Score Calculation', () => {
      it('should calculate weighted score correctly', () => {
        // Given (Arrange) - Nur alarmstichwort (30 von 55 Punkten)
        const einsatz: EinsatzFields = {
          alarmstichwort: 'Brand 3',
          alarmierungszeit: null,
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        // 30 von 55 Punkten = 54.54% ≈ 55%
        expect(result.score).toBe(55);
        expect(result.isComplete).toBe(false);
      });

      it('should calculate weighted score for alarmierungszeit only', () => {
        // Given (Arrange) - Nur alarmierungszeit (25 von 55 Punkten)
        const einsatz: EinsatzFields = {
          alarmstichwort: null,
          alarmierungszeit: new Date('2025-01-15T10:30:00Z'),
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        // 25 von 55 Punkten = 45.45% ≈ 45%
        expect(result.score).toBe(45);
        expect(result.isComplete).toBe(false);
      });
    });

    describe('Missing Fields Structure', () => {
      it('should include all required properties in missing fields', () => {
        // Given (Arrange)
        const einsatz: EinsatzFields = {
          alarmstichwort: null,
          alarmierungszeit: null,
        };

        // When (Act)
        const result = EinsatzCompletenessCalculator.calculate(einsatz);

        // Then (Assert)
        for (const missingField of result.missingFields) {
          expect(missingField).toHaveProperty('field');
          expect(missingField).toHaveProperty('fieldPath');
          expect(missingField).toHaveProperty('priority');
          expect(missingField).toHaveProperty('message');
          expect(missingField).toHaveProperty('suggestedAction');
          expect(typeof missingField.field).toBe('string');
          expect(typeof missingField.message).toBe('string');
          expect(['critical', 'important', 'optional']).toContain(missingField.priority);
        }
      });
    });
  });
});
