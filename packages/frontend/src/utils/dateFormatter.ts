/**
 * NATO DateTime Format mit lokaler Zeitzone
 * Format: DDHHmmX MON YY (X = Zeitzone)
 * Example: 031600B DEC 24 (3. Dezember 2024, 16:00 Uhr Bravo/Berlin Zeit)
 */
export function formatNatoDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);

  return `${day} ${hours}${minutes} ${month} ${year}`;
}
