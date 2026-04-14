/**
 * FMS-Status Labels für UI-Anzeige (BOS-Kontext).
 *
 * Grün (1,2) = verfügbar, Warm-Töne (3,4,7) = im Einsatz aktiv,
 * Rot (0,6) = nicht verfügbar/Notfall, Blau (5) = Kommunikation,
 * Violett (8) = Transport, Grau (9) = technisch/neutral.
 */
export const FMS_STATUS_LABELS: Record<number, string> = {
  0: 'Notruf',
  1: 'Frei über Funk',
  2: 'Einsatzbereit auf Wache',
  3: 'Einsatz übernommen',
  4: 'Am Einsatzort',
  5: 'Sprechwunsch',
  6: 'Nicht einsatzbereit',
  7: 'Patient aufgenommen',
  8: 'Am Transportziel',
  9: 'Quittung',
};

/**
 * FMS-Status Farben — praxisnahe BOS-Farbzuordnung.
 *
 * Nutzt Tailwind v4 Standard-Palette mit /opacity-Syntax
 * für konsistente Light-/Dark-Mode-Darstellung.
 *
 * Farblogik:
 * - Grüntöne = verfügbar (FMS 1, 2)
 * - Warm-Töne (Gelb/Orange) = im Einsatz aktiv (FMS 3, 4, 7)
 * - Rot = nicht verfügbar oder Notfall (FMS 0, 6)
 * - Blau = Kommunikation (FMS 5)
 * - Violett = Transport (FMS 8)
 * - Grau = neutral/technisch (FMS 9)
 */
export const FMS_STATUS_COLORS: Record<number, string> = {
  0: 'bg-red-600/15 text-red-700 dark:bg-red-600/25 dark:text-red-400',
  1: 'bg-green-500/15 text-green-700 dark:bg-green-500/25 dark:text-green-400',
  2: 'bg-green-400/15 text-green-600 dark:bg-green-400/25 dark:text-green-300',
  3: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-400',
  4: 'bg-orange-500/15 text-orange-700 dark:bg-orange-500/25 dark:text-orange-400',
  5: 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-400',
  6: 'bg-red-500/15 text-red-600 dark:bg-red-500/25 dark:text-red-400',
  7: 'bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/25 dark:text-yellow-400',
  8: 'bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-400',
  9: 'bg-gray-500/15 text-gray-600 dark:bg-gray-500/25 dark:text-gray-400',
};

/**
 * Gibt Tailwind-Klassen für einen FMS-Status zurück.
 * Fallback: grau für unbekannte Status.
 */
export const getStatusClasses = (status: number): string => {
  return FMS_STATUS_COLORS[status] ?? 'bg-gray-500/15 text-gray-600 dark:bg-gray-500/25 dark:text-gray-400';
};

/**
 * Gibt nur Background-Tailwind-Klassen für einen FMS-Status zurück.
 * Für Status-Dots ohne Text.
 */
export const getStatusBgClasses = (status: number): string => {
  const colorClasses = FMS_STATUS_COLORS[status] ?? 'bg-gray-500/15 dark:bg-gray-500/25';
  const bgClasses = colorClasses.split(/\s+/).filter((cls) => cls.startsWith('bg-') || cls.startsWith('dark:bg-'));
  return bgClasses.join(' ') || 'bg-gray-500/15';
};

/**
 * Type für gültige FMS-Status Werte (0-9).
 * Story 4.3 + Story 6.1b Spezifikation.
 */
export type FmsStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Type Guard für FMS Status Validierung.
 * Prüft ob ein Wert ein gültiger FMS Status (0-9) ist.
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
  return typeof value === 'number' && value >= 0 && value <= 9 && Number.isInteger(value);
};

/**
 * Alle verfügbaren FMS-Status Codes (0-9).
 */
export const FMS_STATUS_OPTIONS: readonly FmsStatus[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Prüft ob ein FMS-Status "Im Einsatz" bedeutet (FMS 3-4).
 */
export const isImEinsatzStatus = (fmsStatus: number): boolean => fmsStatus >= 3 && fmsStatus <= 4;

/**
 * Prüft ob ein FMS-Status "Einsatzbereit" bedeutet (FMS 1-2).
 */
export const isEinsatzbereitStatus = (fmsStatus: number): boolean => fmsStatus >= 1 && fmsStatus <= 2;

/**
 * Border-Left-Farben nach FMS-Status für Karten-Darstellung.
 * Passt zur BOS-Farbzuordnung in FMS_STATUS_COLORS.
 */
export const FMS_BORDER_LEFT_COLORS: Record<number, string> = {
  0: 'border-l-red-600',
  1: 'border-l-green-500',
  2: 'border-l-green-400',
  3: 'border-l-amber-500',
  4: 'border-l-orange-500',
  5: 'border-l-blue-500',
  6: 'border-l-red-500',
  7: 'border-l-yellow-500',
  8: 'border-l-violet-500',
  9: 'border-l-gray-500',
};

/**
 * Gibt die Border-Left-Klasse für einen FMS-Status zurück.
 */
export const getStatusBorderLeftClass = (status: number): string => {
  return FMS_BORDER_LEFT_COLORS[status] ?? 'border-l-text-primary';
};
