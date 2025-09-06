'use client';

import type { ThemeProviderProps } from 'next-themes';

/**
 * Props für den ColorModeProvider.
 *
 * Erweitert die Props von next-themes ThemeProvider.
 */
export type ColorModeProviderProps = ThemeProviderProps;

/**
 * Verfügbare Farbmodi der Anwendung.
 *
 * - 'light': Heller Modus
 * - 'dark': Dunkler Modus
 * - 'system': Automatisch basierend auf Systemeinstellungen
 */
export type ColorMode = 'light' | 'dark' | 'system';

/**
 * Rückgabewert des useColorMode Hooks.
 *
 * @interface UseColorModeReturn
 */
export interface UseColorModeReturn {
  /** Der aktuelle Farbmodus */
  colorMode: ColorMode;
  /** Der tatsächlich angezeigte Farbmodus (resolved, ohne 'system') */
  resolvedColorMode: 'light' | 'dark';
  /** Funktion zum Setzen eines spezifischen Farbmodus */
  setColorMode: (colorMode: ColorMode) => void;
  /** Funktion zum Umschalten zwischen hell, dunkel und system */
  toggleColorMode: () => void;
}
