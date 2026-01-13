import { formatDistanceToNow, format, parseISO, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Informationen zur letzten Verwendung eines Tokens
 */
export interface LastUsedInfo {
  /** Relativer Text, z.B. "vor 5 Tagen" oder "Nie verwendet" */
  text: string;
  /** Exaktes Datum fuer Tooltip, z.B. "12.01.2026 um 14:30 Uhr" */
  tooltip: string;
  /** true wenn >90 Tage seit letzter Verwendung oder nie verwendet */
  isInactive: boolean;
}

/**
 * Schwellenwert in Tagen fuer Inaktivitaets-Warnung
 */
const INACTIVITY_THRESHOLD_DAYS = 90;

/**
 * Formatiert das lastUsedAt Datum in benutzerfreundliche Informationen.
 *
 * Gibt relative Zeit ("vor 5 Tagen"), exaktes Datum fuer Tooltip und
 * Inaktivitaets-Status zurueck. Ein Token gilt als inaktiv wenn es
 * laenger als 90 Tage nicht verwendet wurde oder noch nie.
 *
 * @param lastUsedAt - ISO-8601 Datum-String oder null
 * @returns Formatierte Informationen zur letzten Verwendung
 *
 * @example
 * ```ts
 * formatLastUsed(null)
 * // => { text: 'Nie verwendet', tooltip: '...', isInactive: true }
 *
 * formatLastUsed('2025-01-07T10:00:00Z') // 5 Tage her
 * // => { text: 'vor 5 Tagen', tooltip: '07.01.2025 um 10:00 Uhr', isInactive: false }
 * ```
 */
export function formatLastUsed(lastUsedAt: string | Date | object | null): LastUsedInfo {
  if (!lastUsedAt) {
    return {
      text: 'Nie verwendet',
      tooltip: 'Dieser Token wurde noch nie verwendet',
      isInactive: true,
    };
  }

  // Konvertiere zu Date - unterstuetzt String, Date und Object (wegen OpenAPI-Generator)
  const date = lastUsedAt instanceof Date ? lastUsedAt : parseISO(String(lastUsedAt));
  const now = new Date();
  const diffDays = differenceInDays(now, date);

  return {
    text: formatDistanceToNow(date, { addSuffix: true, locale: de }),
    tooltip: format(date, "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de }),
    isInactive: diffDays > INACTIVITY_THRESHOLD_DAYS,
  };
}
