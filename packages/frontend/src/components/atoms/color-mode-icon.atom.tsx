import { useColorMode } from '@/hooks/use-color-mode.ts';
import { PiMoon, PiSun } from 'react-icons/pi';

export function ColorModeIcon() {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? <PiMoon /> : <PiSun />;
}
