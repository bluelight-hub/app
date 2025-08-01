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
 */
export type ColorMode = 'light' | 'dark';

/**
 * Rückgabewert des useColorMode Hooks.
 *
 * @interface UseColorModeReturn
 */
export interface UseColorModeReturn {
  /** Der aktuelle Farbmodus */
  colorMode: ColorMode;
  /** Funktion zum Setzen eines spezifischen Farbmodus */
  setColorMode: (colorMode: ColorMode) => void;
  /** Funktion zum Umschalten zwischen hell und dunkel */
  toggleColorMode: () => void;
}
