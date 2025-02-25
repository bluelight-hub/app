import { describe, expect, it } from 'vitest';
import {
    formatNatoDateTime,
    parseNatoDateTime
} from './date';

describe('Date Utilities', () => {
    describe('formatNatoDateTime', () => {
        it('formats a date in NATO format correctly', () => {
            // Arrange
            const testDate = new Date(2023, 0, 23, 8, 0);

            // Act - NATO Format mit kleingeschriebenem Monat
            const formattedNato = formatNatoDateTime(testDate);

            // Assert
            expect(formattedNato).toBe('230800jan23');
        });

        it('formats a date in ANT format correctly', () => {
            // Arrange
            const testDate = new Date(2023, 0, 23, 8, 0);

            // Act - ANT Format ebenfalls mit kleingeschriebenem Monat
            const formattedAnt = formatNatoDateTime(testDate);

            // Assert
            expect(formattedAnt).toBe('230800jan23');
        });

        it('returns null for invalid dates', () => {
            // Arrange & Act & Assert
            expect(formatNatoDateTime(undefined)).toBeNull();
            expect(formatNatoDateTime('invalid-date')).toBeNull();
        });

        it('formats dates correctly for different months', () => {
            // Arrange
            const months = [
                { month: 0, expected: 'jan' }, // Januar
                { month: 1, expected: 'feb' }, // Februar
                { month: 2, expected: 'mar' }, // März
                { month: 3, expected: 'apr' }, // April
                { month: 4, expected: 'mai' }, // Mai
                { month: 5, expected: 'jun' }, // Juni
                { month: 6, expected: 'jul' }, // Juli
                { month: 7, expected: 'aug' }, // August
                { month: 8, expected: 'sep' }, // September
                { month: 9, expected: 'okt' }, // Oktober
                { month: 10, expected: 'nov' }, // November
                { month: 11, expected: 'dez' }  // Dezember
            ];

            // Act & Assert
            months.forEach(({ month, expected }) => {
                const date = new Date(2023, month, 15, 10, 0);
                const formatted = formatNatoDateTime(date);
                expect(formatted).toContain(expected);
            });
        });
    });

    describe('parseNatoDateTime', () => {
        it('parses a NATO formatted date correctly', () => {
            // Arrange
            const natoDate = '230800jan23'; // 23. Januar 2023, 08:00 Uhr

            // Act
            const parsed = parseNatoDateTime(natoDate);

            // Assert
            expect(parsed.year()).toBe(2023);
            expect(parsed.month()).toBe(0); // Januar (0-indexiert)
            expect(parsed.date()).toBe(23);
            expect(parsed.hour()).toBe(8);
            expect(parsed.minute()).toBe(0);
        });

        it('parses a NATO formatted date with uppercase month correctly', () => {
            // Arrange
            const natoDate = '230800JAN23'; // Großbuchstaben sollten auch funktionieren

            // Act
            const parsed = parseNatoDateTime(natoDate);

            // Assert
            expect(parsed.year()).toBe(2023);
            expect(parsed.month()).toBe(0);
            expect(parsed.date()).toBe(23);
            expect(parsed.hour()).toBe(8);
            expect(parsed.minute()).toBe(0);
        });

        it('parses ISO formatted dates as fallback', () => {
            // Arrange
            const isoDate = '2023-01-23 08:00';

            // Act
            const parsed = parseNatoDateTime(isoDate);

            // Assert
            expect(parsed.format('YYYY-MM-DD HH:mm')).toBe('2023-01-23 08:00');
        });

        it('throws error for invalid dates', () => {
            // Arrange & Act & Assert
            expect(() => parseNatoDateTime(undefined)).toThrow();
            expect(() => parseNatoDateTime('invalid-format')).toThrow();
            expect(() => parseNatoDateTime('')).toThrow();
        });

        it('parses all months correctly', () => {
            // Arrange
            const months = [
                { abbr: 'jan', month: 0 }, // Januar
                { abbr: 'feb', month: 1 }, // Februar
                { abbr: 'mar', month: 2 }, // März
                { abbr: 'apr', month: 3 }, // April
                { abbr: 'mai', month: 4 }, // Mai
                { abbr: 'jun', month: 5 }, // Juni
                { abbr: 'jul', month: 6 }, // Juli
                { abbr: 'aug', month: 7 }, // August
                { abbr: 'sep', month: 8 }, // September
                { abbr: 'okt', month: 9 }, // Oktober
                { abbr: 'nov', month: 10 }, // November
                { abbr: 'dez', month: 11 }  // Dezember
            ];

            // Act & Assert
            months.forEach(({ abbr, month }) => {
                const parsed = parseNatoDateTime(`150800${abbr}23`);
                expect(parsed.month()).toBe(month);
                expect(parsed.date()).toBe(15);
                expect(parsed.year()).toBe(2023);
            });
        });
    });
}); 