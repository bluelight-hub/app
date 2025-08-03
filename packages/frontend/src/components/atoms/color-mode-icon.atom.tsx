import { PiMoon, PiSun } from 'react-icons/pi';
import { useColorMode } from '@/hooks/use-color-mode.ts';

export function ColorModeIcon() {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? <PiMoon /> : <PiSun />;
}
