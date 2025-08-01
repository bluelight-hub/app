import { useColorMode } from '@/hooks/use-color-mode.ts';
import { PiMoon, PiSun } from 'react-icons/pi';
import * as React from 'react';

export function ColorModeIcon() {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? <PiMoon /> : <PiSun />;
}
