/**
 * FMS-Status Labels für UI-Anzeige.
 * Story 4.3 Spezifikation.
 */
export const FMS_STATUS_LABELS: Record<number, string> = {
  1: 'Frei über Funk',
  2: 'Einsatzbereit auf Wache',
  3: 'Einsatz übernommen',
  4: 'Am Einsatzort',
  5: 'Sprechwunsch',
  6: 'Nicht einsatzbereit',
  7: 'Patient aufgenommen',
  8: 'Am Zielort',
  9: 'Handfunkgerät',
};

/**
 * FMS-Status Farben gemäß Story 4.3.
 * Verwendet einfache Tailwind-Klassen (Light Mode).
 */
export const FMS_STATUS_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-blue-100 text-blue-800',
  4: 'bg-indigo-100 text-indigo-800',
  5: 'bg-yellow-100 text-yellow-800',
  6: 'bg-red-100 text-red-800',
  7: 'bg-purple-100 text-purple-800',
  8: 'bg-teal-100 text-teal-800',
  9: 'bg-orange-100 text-orange-800',
};

/**
 * Gibt Tailwind-Klassen für einen FMS-Status zurück.
 * Fallback: grau für unbekannte Status.
 */
export const getStatusClasses = (status: number): string => {
  return FMS_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
};

/**
 * Gibt nur Background-Tailwind-Klassen für einen FMS-Status zurück.
 * Für Status-Dots ohne Text.
 */
export const getStatusBgClasses = (status: number): string => {
  const colorClasses = FMS_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
  const bgClass = colorClasses.split(/\s+/).find((cls) => cls.startsWith('bg-'));
  return bgClass ?? 'bg-gray-100';
};

/**
 * Type für gültige FMS-Status Werte (1-9).
 * Story 4.3 Spezifikation.
 */
export type FmsStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Type Guard für FMS Status Validierung.
 * Prüft ob ein Wert ein gültiger FMS Status (1-9) ist.
 *
 * @param value - Zu prüfender Wert
 * @returns true wenn value ein gültiger FMS Status ist
 *
 * @example
 * ```typescript
 * if (isFmsStatus(data.status)) {
 *   const label = FMS_STATUS_LABELS[data.status];
 * }
 * ```
 */
export const isFmsStatus = (value: unknown): value is FmsStatus => {
  return typeof value === 'number' && value >= 1 && value <= 9 && Number.isInteger(value);
};

/**
 * Alle verfügbaren FMS-Status Codes (1-9).
 */
export const FMS_STATUS_OPTIONS: readonly FmsStatus[] = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
