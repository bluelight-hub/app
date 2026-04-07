/**
 * Gemeinsame Severity-Styles für Warnungs-Provider (DWD, NINA, etc.)
 *
 * Definiert Farben und Labels für die vier Warnstufen.
 * Wird von Popup- und Panel-Komponenten wiederverwendet.
 */

import { format } from 'date-fns';

/** Badge-Styles für kompakte Darstellung (Popups) */
export interface SeverityBadgeStyle {
  bg: string;
  text: string;
}

/** Card-Styles für vollständige Darstellung (Panels) */
export interface SeverityCardStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

export const SEVERITY_BADGE_STYLES: Record<string, SeverityBadgeStyle> = {
  Minor: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  Moderate: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
  Severe: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' },
  Extreme: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
};

export const DEFAULT_BADGE_STYLE: SeverityBadgeStyle = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  text: 'text-gray-800 dark:text-gray-300',
};

export const SEVERITY_CARD_STYLES: Record<string, SeverityCardStyle> = {
  Minor: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-300', label: 'Wetterwarnung' },
  Moderate: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300', label: 'Markante Warnung' },
  Severe: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-300', label: 'Unwetterwarnung' },
  Extreme: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-800 dark:text-purple-300', label: 'Extreme Unwetterwarnung' },
};

export const DEFAULT_CARD_STYLE: SeverityCardStyle = {
  bg: 'bg-gray-50 dark:bg-gray-800/50',
  border: 'border-gray-200 dark:border-gray-700',
  text: 'text-gray-800 dark:text-gray-300',
  label: 'Warnung',
};

/** Formatiert einen ISO-Zeitstring für die Kurzanzeige */
export function formatWarnungTime(isoString: string | undefined): string {
  if (!isoString) return '–';
  try {
    return format(new Date(isoString), 'dd.MM. HH:mm') + ' Uhr';
  } catch {
    return isoString;
  }
}

/** Formatiert einen ISO-Zeitstring für die Detailanzeige */
export function formatWarnungDateTime(isoString: string | undefined): string {
  if (!isoString) return '–';
  try {
    return format(new Date(isoString), 'dd.MM.yyyy, HH:mm') + ' Uhr';
  } catch {
    return isoString;
  }
}
