import { useTheme } from 'next-themes';
import type { ColorMode, UseColorModeReturn } from '@/components/ui/color-mode';

/**
 * Hook zum Verwalten des Farbmodus (Hell/Dunkel-Theme).
 *
 * Bietet eine einfache API zum Lesen und Ändern des aktuellen Themes.
 * Validiert die Theme-Werte und stellt sicher, dass nur gültige
 * Farbmodi verwendet werden.
 *
 * @returns Objekt mit colorMode, setColorMode und toggleColorMode Funktionen
 */
export function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();

  // Validierung der Theme-Werte
  const rawColorMode = forcedTheme || resolvedTheme;
  const isValidColorMode = (mode: unknown): mode is ColorMode => {
    return mode === 'light' || mode === 'dark';
  };

  // Fallback auf 'light' wenn ungültiger Wert
  const colorMode: ColorMode = isValidColorMode(rawColorMode) ? rawColorMode : 'light';

  // Warnung bei ungültigem Theme-Wert
  if (rawColorMode && !isValidColorMode(rawColorMode)) {
    console.warn(`Ungültiger Theme-Wert: "${rawColorMode}". Verwende "light" als Fallback.`);
  }

  const toggleColorMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return {
    colorMode,
    setColorMode: setTheme,
    toggleColorMode,
  };
}

/**
 * Hook zum Auswählen von Werten basierend auf dem aktuellen Farbmodus.
 *
 * Ermöglicht die bedingte Verwendung von Werten abhängig vom
 * Hell- oder Dunkel-Modus.
 *
 * @param light - Wert für den hellen Modus
 * @param dark - Wert für den dunklen Modus
 * @returns Der entsprechende Wert basierend auf dem aktuellen Farbmodus
 *
 * @example
 * const backgroundColor = useColorModeValue('white', 'gray.800');
 * const textColor = useColorModeValue('gray.900', 'white');
 */
export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? dark : light;
}
