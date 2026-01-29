import { format, isValid, parseISO } from 'date-fns';

/**
 * NATO DateTime Format mit lokaler Zeitzone
 * Format: DDHHmmX MON YY (X = Zeitzone)
 * Example: 031600B DEC 24 (3. Dezember 2024, 16:00 Uhr Bravo/Berlin Zeit)
 */
export function formatNatoDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(d)) return '';

  // Format: dd HHmm MMM yy
  return format(d, 'dd HHmm MMM yy').toUpperCase();
}

/**
 * Benutzerfreundliches DateTime Format
 * Format: DD.MM.YYYY HH:mm
 * Example: 03.12.2024 16:00
 */
export function formatDisplayDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(d)) return '';

  return format(d, 'dd.MM.yyyy HH:mm');
}

/**
 * Formatiert Sekunden in eine lesbare Dauer.
 * @param seconds Sekunden
 * @returns z.B. "5m 30s" oder "1h 15m"
 */
export function formatDuration(seconds: number): string {
  if (Math.round(seconds) < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
