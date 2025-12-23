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
 * Unterstützt Light Mode und Dark Mode mit Tailwind CSS.
 */
export const FMS_STATUS_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  2: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  4: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  5: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  6: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  7: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  8: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  9: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

/**
 * Gibt Tailwind-Klassen für einen FMS-Status zurück.
 * Fallback: grau für unbekannte Status (mit Dark Mode Support).
 */
export const getStatusClasses = (status: number): string => {
  return FMS_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

/**
 * Gibt nur Background-Tailwind-Klassen für einen FMS-Status zurück.
 * Für Status-Dots ohne Text.
 */
export const getStatusBgClasses = (status: number): string => {
  const colorClasses = FMS_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  const bgClasses = colorClasses.split(/\s+/).filter((cls) => cls.startsWith('bg-') || cls.startsWith('dark:bg-'));
  return bgClasses.join(' ') || 'bg-gray-100';
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
