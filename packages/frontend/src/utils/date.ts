import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/de';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utcPlugin from 'dayjs/plugin/utc';
import { logger } from './logger';

// Konfiguriere dayjs
dayjs.extend(customParseFormat);
dayjs.extend(utcPlugin);
dayjs.locale('de');

/**
 * NATO-Datumsformate
 * NATO: ddHHmmLLLyy (Tag, Stunde, Minute, Monat abgekürzt klein, Jahr)
 * ANT: DDHHmmMMMYY (Ant Design spezifisches Format, ebenfalls mit kleingeschriebenem Monat)
 * 
 * Beispiel NATO: 230800jan23 (23. Januar 2023, 08:00 Uhr)
 * Beispiel ANT: 230800jan23 (23. Januar 2023, 08:00 Uhr)
 */
export const DATE_FORMATS = {
    NATO: 'ddHHmmLLLYY', // wird durch custom Formatierung überschrieben
    NATO_ANT: 'DDHHmmMMMYY', // wird durch custom Formatierung überschrieben
} as const;

/**
 * Formatiert ein Datum in das NATO-Format mit kleingeschriebenem Monat
 * 
 * @param dateTime - Das zu formatierende Datum
 * @param __formatType - Formattyp (NATO oder NATO_ANT, beides verwendet kleingeschriebene Monate)
 * @returns Formatierter String oder null wenn kein Datum übergeben wurde
 */
export function formatNatoDateTime(
    dateTime: Date | Dayjs | number | string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    __formatType: keyof typeof DATE_FORMATS = 'NATO'
): string | null {
    if (!dateTime) {
        return null;
    }

    try {
        // Konvertiere zu Dayjs wenn nötig
        const date = dayjs.isDayjs(dateTime) ? dateTime : dayjs(dateTime);

        if (!date.isValid()) {
            throw new Error('Ungültiges Datum');
        }

        // Formatierung mit dem entsprechenden Format
        const day = date.format('DD');
        const hour = date.format('HH');
        const minute = date.format('mm');

        // Monat anders behandeln - wir brauchen die standardisierten 3-Buchstaben-Abkürzungen
        const monthNum = date.month(); // 0-basierter Index (0 = Januar)
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];
        const month = monthNames[monthNum];

        const year = date.format('YY');
        return `${day}${hour}${minute}${month}${year}`;
    } catch (error) {
        logger.warn('Fehler beim Formatieren des Datums:', error);
        return null;
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
        // Versuche als NATO-Format zu parsen (mit manueller Regex)
        // Format: ddHHmmMMMYY (z.B. 230800jan23)
        const natoRegex = /^(\d{2})(\d{2})(\d{2})([a-z]{3})(\d{2})$/i;
        if (natoRegex.test(input)) {
            const [, day, hour, minute, month, year] = natoRegex.exec(input) || [];
            // Normalisiere den Monat (immer klein)
            const monthLower = month.toLowerCase();
            // Format für dayjs
            const dateStr = `20${year}-${getMonthNumber(monthLower)}-${day}T${hour}:${minute}:00`;
            const parsedDate = dayjs(dateStr);
            if (parsedDate.isValid()) {
                return parsedDate;
            }
        }

        // Versuche als ISO-Format zu parsen
        const isoDate = dayjs(input, 'YYYY-MM-DD HH:mm', true);
        if (isoDate.isValid()) {
            return isoDate;
        }

        // Versuche als normales Datum zu parsen
        const fallbackDate = dayjs(input);
        if (fallbackDate.isValid()) {
            return fallbackDate;
        }

        throw new Error('Datum konnte nicht geparst werden');
    } catch (error) {
        logger.warn('Fehler beim Parsen des Datums:', error);
        throw new Error(`Ungültiges Datumsformat: ${input}`);
    }
}

/**
 * Hilfsfunktion: Konvertiert einen Monatsnamen (3 Buchstaben) in einen Monatsnummer (01-12)
 * @param monthName - Monatsname (3 Buchstaben, z.B. "jan")
 * @returns Monatsnummer als String mit Nullfüllung (z.B. "01")
 */
function getMonthNumber(monthName: string): string {
    const months: Record<string, string> = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'mai': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'okt': '10', 'nov': '11', 'dez': '12',
        // Englische Monate für Kompatibilität
        'may': '05', 'oct': '10', 'dec': '12'
    };

    return months[monthName] || '01';
}

/**
 * Kombiniert ein Datum und eine Zeit in ein einziges Dayjs-Objekt
 * 
 * @param date - Das Datum
 * @param time - Die Zeit
 * @returns Kombiniertes Dayjs-Objekt oder null wenn date null ist
 */
export function combineDateAndTime(date: Dayjs | null, time: Dayjs | null): Dayjs | null {
    if (!date) {
        return null;
    }

    if (!time) {
        // Wenn keine Zeit angegeben, verwende 00:00 Uhr
        return date.hour(0).minute(0).second(0);
    }

    return date
        .hour(time.hour())
        .minute(time.minute())
        .second(time.second());
}

