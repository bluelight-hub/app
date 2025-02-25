import { formatNatoDateTime } from './date';

describe('DatePicker Utilities', () => {
    describe('antDatePickerFormat', () => {
        it('returns the correct format for the ANT date picker', () => {
            // Erstelle ein festes Testdatum
            const testDate = new Date(2023, 0, 23, 8, 0); // 23. Januar 2023, 08:00 Uhr
            const expectedNatoFormat = '230800jan23'; // Erwartetes NATO-Format

            // Prüfe direkte Formatierung über die formatNatoDateTime-Funktion
            expect(formatNatoDateTime(testDate)).toBe(expectedNatoFormat);

            // Hinweis: In der tatsächlichen Anwendung würde man folgendes verwenden:
            // <DatePicker format={(value) => formatNatoDateTime(value.toDate())} />
            // Oder einen benutzerdefinierten Format-Provider erstellen
        });
    });
});