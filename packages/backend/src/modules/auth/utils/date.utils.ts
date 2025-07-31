/**
 * Hilfsfunktionen für Date-Verarbeitung
 */

/**
 * Parsed ein optionales Datum-String oder gibt einen Standardwert zurück
 * @param dateString - Das zu parsende Datum als String
 * @param defaultValue - Der Standardwert, falls kein dateString angegeben
 * @returns Das geparste Date-Objekt oder der Standardwert
 */
export function parseOptionalDate(dateString?: string, defaultValue?: Date): Date | undefined {
  if (dateString) {
    return new Date(dateString);
  }
  return defaultValue;
}

/**
 * Parsed einen Datumbereich mit Standardwerten für Start und Ende
 * @param startDate - Das Start-Datum als String (optional)
 * @param endDate - Das End-Datum als String (optional)
 * @param defaultDaysBack - Anzahl Tage zurück für Standard-Startdatum (default: 1)
 * @returns Ein Objekt mit start und end Date
 */
export function parseDateRange(
  startDate?: string,
  endDate?: string,
  defaultDaysBack: number = 1,
): { start: Date; end: Date } {
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - defaultDaysBack * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  return { start, end };
}

/**
 * Erstellt ein Date-Objekt für eine bestimmte Anzahl von Tagen in der Vergangenheit
 * @param daysBack - Anzahl der Tage zurück
 * @returns Date-Objekt
 */
export function daysAgo(daysBack: number): Date {
  return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
}

/**
 * Erstellt ein Date-Objekt für eine bestimmte Anzahl von Stunden in der Vergangenheit
 * @param hoursBack - Anzahl der Stunden zurück
 * @returns Date-Objekt
 */
export function hoursAgo(hoursBack: number): Date {
  return new Date(Date.now() - hoursBack * 60 * 60 * 1000);
}

/**
 * Erstellt ein Date-Objekt für eine bestimmte Anzahl von Minuten in der Vergangenheit
 * @param minutesBack - Anzahl der Minuten zurück
 * @returns Date-Objekt
 */
export function minutesAgo(minutesBack: number): Date {
  return new Date(Date.now() - minutesBack * 60 * 1000);
}
