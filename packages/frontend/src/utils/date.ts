import dayjs, { Dayjs, isDayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
import { logger } from '@/utils/logger.ts';

// Plugin für benutzerdefiniertes Parsing registrieren
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(updateLocale);
dayjs.updateLocale('de', {
  formats: { L: 'DDHHmm[Z]MMMYY' },
});
dayjs.locale('de');

// Formatstrings für NATO-Datum
export const natoDateTime = 'DDHHmm[Z]MMMYY';
export const natoDateTimeAnt = 'DDHHmm[Z]MMMYY';

export function formatNatoDateTime<DateType extends Date>(
  dateTime: DateType | Dayjs | number | string | undefined,
): string | null {
  if (!dateTime) {
    return null;
  }

  try {
    // Konvertiere jede Eingabe zu einem JavaScript Date Objekt
    let date: Date;
    if (isDayjs(dateTime)) {
      date = dateTime.toDate();
    } else if (typeof dateTime === 'string' || typeof dateTime === 'number') {
      date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return null;
      }
    } else {
      date = dateTime;
    }

    // Manuell formatieren für NATO-Format
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    // Monatsnamen für NATO-Format (immer kleingeschrieben)
    const monthNames = [
      'jan',
      'feb',
      'mar',
      'apr',
      'mai',
      'jun',
      'jul',
      'aug',
      'sep',
      'okt',
      'nov',
      'dez',
    ];
    const month = monthNames[date.getMonth()];

    // Jahr (2-stellig)
    const year = String(date.getFullYear()).slice(-2);

    return `${day}${hour}${minute}${month}${year}`;
  } catch (error) {
    logger.error('Fehler beim Formatieren des Datums:', error);
    return null;
  }
}

/**
 * Parst ein Datum im NATO-Format oder Standard-Format in ein Dayjs-Objekt
 *
 * @param input - Das zu parsende Datum als String
 * @returns Dayjs Objekt wenn das Parsing erfolgreich war
 * @throws Error wenn das Datum nicht geparst werden konnte
 */
export function parseNatoDateTime(input: string | undefined): Dayjs {
  if (!input) {
    throw new Error('Kein Datum übergeben');
  }

  try {
    // Prüfe, ob das Format dem NATO-Format entspricht: ddHHmmMMMYY
    const natoRegex = /^(\d{2})(\d{2})(\d{2})([a-zA-Z]{3})(\d{2})$/;
    if (natoRegex.test(input)) {
      const matches = input.match(natoRegex);
      if (matches) {
        const [_, dayStr, hourStr, minuteStr, monthStr, yearStr] = matches;

        const day = parseInt(dayStr, 10);
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        const monthLower = monthStr.toLowerCase();
        const year = 2000 + parseInt(yearStr, 10);

        // Konvertiere Monatsabkürzungen in Monatszahlen (0-11)
        const monthMap: Record<string, number> = {
          jan: 0,
          feb: 1,
          mar: 2,
          apr: 3,
          mai: 4,
          jun: 5,
          jul: 6,
          aug: 7,
          sep: 8,
          okt: 9,
          nov: 10,
          dez: 11,
        };

        const month = monthMap[monthLower];
        if (month !== undefined) {
          return dayjs(new Date(year, month, day, hour, minute));
        }
      }
    }

    // Wenn das nicht klappt, versuche es als normales Datum zu parsen
    const fallbackDate = dayjs(input);
    if (fallbackDate.isValid()) {
      return fallbackDate;
    }

    // Wenn beide Versuche fehlschlagen, wirf einen Fehler
    throw new Error('Datum konnte nicht geparst werden');
  } catch (error) {
    logger.error('Fehler beim Parsen des Datums:', error);
    throw new Error(`Ungültiges Datumsformat: ${input}`);
  }
}
