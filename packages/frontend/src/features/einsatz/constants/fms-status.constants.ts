/**
 * FMS-Status Labels für UI-Anzeige.
 * Story 4.3 Spezifikation + Status 0 für Story 6.1b.
 */
export const FMS_STATUS_LABELS: Record<number, string> = {
  0: 'Nicht einsatzbereit',
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
 * FMS-Status Farben gemäß Story 4.3 + Status 0 für Story 6.1b.
 * Nutzt Ring-1 Design Tokens für konsistente Light-/Dark-Mode-Farben.
 */
export const FMS_STATUS_COLORS: Record<number, string> = {
  0: 'bg-status-danger-surface text-status-danger-text',
  1: 'bg-surface-raised text-text-primary',
  2: 'bg-status-success-surface text-status-success-text',
  3: 'bg-status-info-surface text-status-info-text',
  4: 'bg-action-secondary text-action-primary',
  5: 'bg-status-warning-surface text-status-warning-text',
  6: 'bg-status-danger-surface text-status-danger-text',
  7: 'bg-status-info-surface text-status-info-text',
  8: 'bg-status-success-surface text-status-success-text',
  9: 'bg-action-secondary text-action-primary',
};

/**
 * Gibt Tailwind-Klassen für einen FMS-Status zurück.
 * Fallback: grau für unbekannte Status (mit Dark Mode Support).
 */
export const getStatusClasses = (status: number): string => {
  return FMS_STATUS_COLORS[status] ?? 'bg-surface-raised text-text-primary';
};

/**
 * Gibt nur Background-Tailwind-Klassen für einen FMS-Status zurück.
 * Für Status-Dots ohne Text.
 */
export const getStatusBgClasses = (status: number): string => {
  const colorClasses = FMS_STATUS_COLORS[status] ?? 'bg-surface-raised text-text-primary';
  const bgClasses = colorClasses.split(/\s+/).filter((cls) => cls.startsWith('bg-') || cls.startsWith('dark:bg-'));
  return bgClasses.join(' ') || 'bg-surface-raised';
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
