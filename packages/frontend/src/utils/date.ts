import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/de';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Konfiguriere dayjs
dayjs.extend(customParseFormat);
dayjs.locale('de');

/**
 * NATO-Datumsformate
 * NATO: ddHHmmLLLyy (Tag, Stunde, Minute, Monat, Jahr)
 * ANT: DDHHmmMMMYY (Ant Design spezifisches Format)
 */
export const DATE_FORMATS = {
    NATO: 'ddHHmmLLLyy',
    NATO_ANT: 'DDHHmmMMMYY',
} as const;

/**
 * Formatiert ein Datum in das NATO-Format
 * 
 * @param dateTime - Das zu formatierende Datum
 * @param formatType - Das zu verwendende Format (NATO oder NATO_ANT)
 * @returns Formatierter String oder undefined wenn kein Datum übergeben wurde
 */
export function formatNatoDateTime(
    dateTime: Date | Dayjs | number | string | undefined,
    formatType: keyof typeof DATE_FORMATS = 'NATO'
): string | undefined {
    if (!dateTime) {
        return undefined;
    }

    try {
        // Konvertiere zu Dayjs wenn nötig
        const date = dayjs.isDayjs(dateTime) ? dateTime : dayjs(dateTime);

        if (!date.isValid()) {
            throw new Error('Ungültiges Datum');
        }

        return date.format(DATE_FORMATS[formatType]);
    } catch (error) {
        console.error('Fehler beim Formatieren des Datums:', error);
        return undefined;
    }
}

/**
 * Parst ein Datum im NATO-Format oder Standard-Format in ein Dayjs-Objekt
 *
 * @param input - Das zu parsende Datum als String
 * @returns Dayjs Objekt
 * @throws Error wenn das Datum nicht geparst werden konnte
 */
export function parseNatoDateTime(input: string | undefined): Dayjs {
    if (!input) {
        throw new Error('Kein Datum übergeben');
    }

    try {
        // Versuche zuerst im NATO-Format zu parsen
        const natoDate = dayjs(input, DATE_FORMATS.NATO, true);
        if (natoDate.isValid()) {
            return natoDate;
        }

        // Versuche im ANT-Format zu parsen
        const antDate = dayjs(input, DATE_FORMATS.NATO_ANT, true);
        if (antDate.isValid()) {
            return antDate;
        }

        // Versuche als normales Datum zu parsen
        const fallbackDate = dayjs(input);
        if (fallbackDate.isValid()) {
            return fallbackDate;
        }

        throw new Error('Datum konnte nicht geparst werden');
    } catch (error) {
        console.error('Fehler beim Parsen des Datums:', error);
        throw new Error(`Ungültiges Datumsformat: ${input}`);
    }
}

// Für die Verwendung in Ant Design Komponenten
export const natoDateTimeAnt = DATE_FORMATS.NATO_ANT; 