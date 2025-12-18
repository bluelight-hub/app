/**
 * FMS-Status Labels für UI-Anzeige.
 * BOS Standard Codes 0-9.
 */
export const FMS_STATUS_LABELS: Record<number, string> = {
  0: 'Nicht einsatzbereit',
  1: 'Auf Wache',
  2: 'Einsatzbereit',
  3: 'Ausgerückt zum Einsatz',
  4: 'Am Einsatzort',
  5: 'Sprechwunsch',
  6: 'Außer Dienst',
  7: 'Regional 7',
  8: 'Regional 8',
  9: 'Regional 9',
};

/**
 * FMS-Status Farben für Light und Dark Mode.
 * WCAG 2.1 AA Kontrast beachtet.
 */
export const FMS_STATUS_COLORS: Record<number, { light: string; dark: string }> = {
  0: { light: 'bg-gray-100 text-gray-800', dark: 'dark:bg-gray-800 dark:text-gray-200' },
  1: { light: 'bg-gray-100 text-gray-800', dark: 'dark:bg-gray-800 dark:text-gray-200' },
  2: { light: 'bg-green-100 text-green-800', dark: 'dark:bg-green-900/30 dark:text-green-300' },
  3: { light: 'bg-blue-100 text-blue-800', dark: 'dark:bg-blue-900/30 dark:text-blue-300' },
  4: { light: 'bg-yellow-100 text-yellow-800', dark: 'dark:bg-yellow-900/30 dark:text-yellow-300' },
  5: { light: 'bg-orange-100 text-orange-800', dark: 'dark:bg-orange-900/30 dark:text-orange-300' },
  6: { light: 'bg-purple-100 text-purple-800', dark: 'dark:bg-purple-900/30 dark:text-purple-300' },
  7: { light: 'bg-purple-100 text-purple-800', dark: 'dark:bg-purple-900/30 dark:text-purple-300' },
  8: { light: 'bg-purple-100 text-purple-800', dark: 'dark:bg-purple-900/30 dark:text-purple-300' },
  9: { light: 'bg-purple-100 text-purple-800', dark: 'dark:bg-purple-900/30 dark:text-purple-300' },
};

/**
 * Gibt Tailwind-Klassen für einen FMS-Status zurück.
 * Kombiniert Light und Dark Mode Klassen.
 */
export const getStatusClasses = (status: number): string => {
  const colors = FMS_STATUS_COLORS[status] ?? FMS_STATUS_COLORS[6];
  return `${colors.light} ${colors.dark}`;
};

/**
 * Alle verfügbaren FMS-Status Codes (0-9).
 */
export const FMS_STATUS_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
