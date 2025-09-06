import { PiMoon, PiSun, PiDesktop } from 'react-icons/pi';
import { useColorMode } from '@/hooks/use-color-mode.ts';

/**
 * Icon-Komponente für den aktuellen Color Mode.
 *
 * Zeigt das passende Icon basierend auf dem aktuell ausgewählten Modus:
 * - Sonne für Light Mode
 * - Mond für Dark Mode
 * - Monitor für System Mode
 */
export function ColorModeIcon() {
  const { colorMode, resolvedColorMode } = useColorMode();

  // Wenn System-Modus aktiv ist, zeige Monitor-Icon
  if (colorMode === 'system') {
    return <PiDesktop />;
  }

  // Ansonsten zeige Sonne oder Mond basierend auf dem ausgewählten Modus
  return colorMode === 'dark' ? <PiMoon /> : <PiSun />;
}

/**
 * Icon-Komponente für den aufgelösten (tatsächlichen) Color Mode.
 *
 * Zeigt immer das Icon des tatsächlich angezeigten Modus,
 * auch wenn System-Modus ausgewählt ist.
 */
export function ResolvedColorModeIcon() {
  const { resolvedColorMode } = useColorMode();
  return resolvedColorMode === 'dark' ? <PiMoon /> : <PiSun />;
}
