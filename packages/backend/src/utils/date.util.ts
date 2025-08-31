/**
 * Convert Date to NATO Date Time Group format
 * Format: DDHHmmmonYY
 * Example: 011200jan24 for January 1, 2024, 12:00 UTC
 */
export function toNatDateTime(date: Date): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear().toString().slice(-2);

  return `${day}${hours}${minutes}${month}${year}`;
}
