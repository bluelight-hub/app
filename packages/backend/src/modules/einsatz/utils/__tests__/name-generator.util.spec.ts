// @ts-nocheck
import { EinsatzNameGenerator } from '../name-generator.util';

describe('EinsatzNameGenerator', () => {
  describe('generate', () => {
    it('should generate name with alarmstichwort and alarmierungszeit', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'B3 - Wohnungsbrand',
        alarmierungszeit: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      // Format: "alarmstichwort - DD HHMM MMM YY" (with spaces, uppercase month)
      expect(result).toMatch(/^B3 - Wohnungsbrand - \d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('B3 - Wohnungsbrand');
      expect(result).toContain('15'); // Day
      expect(result).toContain('JAN'); // Month
      expect(result).toContain('25'); // Year
    });

    it('should generate name with only alarmierungszeit when alarmstichwort is missing', () => {
      // Given
      const einsatz = {
        alarmierungszeit: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^\d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('15');
      expect(result).toContain('JAN');
      expect(result).toContain('25');
    });

    it('should fallback to createdAt when alarmierungszeit is missing', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'THL 1',
        createdAt: new Date('2025-02-20T10:15:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^THL 1 - \d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('20');
      expect(result).toContain('FEB');
      expect(result).toContain('25');
    });

    it('should use current time when both alarmierungszeit and createdAt are missing', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'Brandsicherheitswachdienst',
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^Brandsicherheitswachdienst - \d{2} \d{4} [A-Z]{3} \d{2}$/);
      // Verify timestamp is present
      const timePart = result.split(' - ')[1];
      expect(timePart).toBeTruthy();
      expect(timePart).toMatch(/\d{2} \d{4} [A-Z]{3} \d{2}/);
    });

    it('should handle string date format for alarmierungszeit', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'H1',
        alarmierungszeit: '2025-03-10T08:45:00',
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^H1 - \d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('10');
      expect(result).toContain('MAR');
      expect(result).toContain('25');
    });

    it('should handle string date format for createdAt', () => {
      // Given
      const einsatz = {
        createdAt: '2025-03-10T08:45:00',
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^\d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('10');
      expect(result).toContain('MAR');
      expect(result).toContain('25');
    });

    it('should handle invalid date in alarmierungszeit and fallback to createdAt', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'THL 2',
        alarmierungszeit: 'invalid-date-string',
        createdAt: new Date('2025-04-05T12:00:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^THL 2 - \d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('05');
      expect(result).toContain('APR');
      expect(result).toContain('25');
    });

    it('should handle invalid date in both alarmierungszeit and createdAt', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'B2',
        alarmierungszeit: 'invalid',
        createdAt: 'also-invalid',
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      // Should use current time as fallback
      expect(result).toMatch(/^B2 - \d{2} \d{4} [A-Z]{3} \d{2}$/);
    });

    it('should handle null values', () => {
      // Given
      const einsatz = {
        alarmstichwort: null,
        alarmierungszeit: null,
        createdAt: new Date('2025-05-01T00:00:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^\d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('01');
      expect(result).toContain('MAY');
      expect(result).toContain('25');
    });

    it('should handle empty object and use current time', () => {
      // Given
      const einsatz = {};

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^\d{2} \d{4} [A-Z]{3} \d{2}$/);
    });

    it('should use separator constant for joining components', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'Test',
        alarmierungszeit: new Date('2025-01-01T00:00:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toContain(' - ');
      const parts = result.split(' - ');
      expect(parts[0]).toBe('Test');
      expect(parts[1]).toMatch(/\d{2} \d{4} [A-Z]{3} \d{2}/);
    });
  });

  describe('getNameComponents', () => {
    it('should extract all components when all fields are present', () => {
      // Given
      const testDate = new Date('2025-01-15T14:30:00');
      const einsatz = {
        alarmstichwort: 'B4',
        alarmierungszeit: testDate,
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.alarmstichwort).toBe('B4');
      expect(result.zeit).toMatch(/^\d{2}:\d{2}$/);
      expect(result.datum).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      expect(result.datum).toContain('15.01.2025');
    });

    it('should return undefined for alarmstichwort when not present', () => {
      // Given
      const einsatz = {
        alarmierungszeit: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.alarmstichwort).toBeUndefined();
      expect(result.zeit).toMatch(/^\d{2}:\d{2}$/);
      expect(result.datum).toBe('15.01.2025');
    });

    it('should use nullish coalescing for alarmstichwort (not falsy check)', () => {
      // Given
      const einsatz = {
        alarmstichwort: '', // Empty string should be preserved
        alarmierungszeit: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.alarmstichwort).toBe('');
    });

    it('should fallback to createdAt when alarmierungszeit is missing', () => {
      // Given
      const einsatz = {
        createdAt: new Date('2025-02-20T10:15:00'),
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.zeit).toMatch(/^\d{2}:\d{2}$/);
      expect(result.datum).toBe('20.02.2025');
    });

    it('should use current time when both dates are missing', () => {
      // Given
      const einsatz = {};

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.zeit).toMatch(/^\d{2}:\d{2}$/);
      expect(result.datum).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    it('should handle invalid date and fallback', () => {
      // Given
      const einsatz = {
        alarmierungszeit: 'invalid',
        createdAt: new Date('2025-03-15T16:45:00'),
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.zeit).toMatch(/^\d{2}:\d{2}$/);
      expect(result.datum).toBe('15.03.2025');
    });

    it('should format time with leading zeros', () => {
      // Given
      const einsatz = {
        alarmierungszeit: new Date('2025-01-05T03:05:00'),
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.zeit).toBe('03:05');
    });

    it('should format date in German format (dd.MM.yyyy)', () => {
      // Given
      const einsatz = {
        alarmierungszeit: new Date('2025-12-31T23:59:00'),
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.datum).toBe('31.12.2025');
    });

    it('should handle null alarmstichwort as undefined', () => {
      // Given
      const einsatz = {
        alarmstichwort: null,
        alarmierungszeit: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.getNameComponents(einsatz);

      // Then
      expect(result.alarmstichwort).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle Date objects correctly', () => {
      // Given
      const dateObj = new Date('2025-06-15T18:00:00');
      const einsatz = {
        alarmierungszeit: dateObj,
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^\d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('15');
      expect(result).toContain('JUN');
      expect(result).toContain('25');
    });

    it('should handle ISO string dates correctly', () => {
      // Given
      const einsatz = {
        alarmierungszeit: '2025-07-20T09:30:00',
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/^\d{2} \d{4} [A-Z]{3} \d{2}$/);
      expect(result).toContain('20');
      expect(result).toContain('JUL');
      expect(result).toContain('25');
    });

    it('should handle timestamp numbers as Date input', () => {
      // Given
      const timestamp = new Date('2025-01-15T14:30:00').getTime();
      const einsatz = {
        alarmierungszeit: new Date(timestamp),
        createdAt: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toMatch(/\d{2} \d{4} [A-Z]{3} \d{2}/);
      expect(result).toContain('15');
      expect(result).toContain('JAN');
      expect(result).toContain('25');
    });

    it('should handle very long alarmstichwort without truncation', () => {
      // Given
      const longKeyword = 'B4 - Wohnungsbrand mit Menschenrettung und Tierrettung über Drehleiter';
      const einsatz = {
        alarmstichwort: longKeyword,
        alarmierungszeit: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toContain(longKeyword);
      expect(result).toMatch(new RegExp(`^${longKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - \\d{2} \\d{4} [A-Z]{3} \\d{2}$`));
    });

    it('should handle special characters in alarmstichwort', () => {
      // Given
      const einsatz = {
        alarmstichwort: 'THL § & / Ölspur',
        alarmierungszeit: new Date('2025-01-15T14:30:00'),
      };

      // When
      const result = EinsatzNameGenerator.generate(einsatz);

      // Then
      expect(result).toContain('THL § & / Ölspur');
      expect(result).toMatch(/^THL § & \/ Ölspur - \d{2} \d{4} [A-Z]{3} \d{2}$/);
    });

    it('should consistently use same separator throughout', () => {
      // Given
      const einsatz1 = {
        alarmstichwort: 'Test1',
        alarmierungszeit: new Date('2025-01-01T00:00:00'),
      };
      const einsatz2 = {
        alarmstichwort: 'Test2',
        alarmierungszeit: new Date('2025-02-02T00:00:00'),
      };

      // When
      const result1 = EinsatzNameGenerator.generate(einsatz1);
      const result2 = EinsatzNameGenerator.generate(einsatz2);

      // Then
      const separator1 = result1.match(/Test1(.+?)\d{2}/)?.[1];
      const separator2 = result2.match(/Test2(.+?)\d{2}/)?.[1];
      expect(separator1).toBe(' - ');
      expect(separator2).toBe(' - ');
      expect(separator1).toBe(separator2);
    });
  });
});
