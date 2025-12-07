import type { ColorMode } from '@/shared/ui/headless/color-mode';
import { useColorMode } from '@/shared/hooks/use-color-mode';
import { useMemo } from 'react';
import { PiPalette } from 'react-icons/pi';
import type { ThemeOption } from '../types';

export const useThemeCommands = () => {
  const { toggleColorMode, colorMode, setColorMode } = useColorMode();

  const themeOptions: ThemeOption[] = useMemo(
    () => [
      {
        id: 'theme-light',
        name: 'Hell',
        value: 'light' as ColorMode,
        icon: PiPalette,
        description: 'Helles Theme aktivieren',
        shortcut: ['⌘', '⇧', 'L'],
      },
      {
        id: 'theme-dark',
        name: 'Dunkel',
        value: 'dark' as ColorMode,
        icon: PiPalette,
        description: 'Dunkles Theme aktivieren',
        shortcut: ['⌘', '⇧', 'D'],
      },
      {
        id: 'theme-system',
        name: 'System',
        value: 'system' as ColorMode,
        icon: PiPalette,
        description: 'Systemeinstellung folgen',
        shortcut: ['⌘', '⇧', 'S'],
      },
    ],
    [],
  );

  const handleThemeChange = (theme?: unknown) => {
    if (theme && typeof theme === 'string') {
      setColorMode(theme as ColorMode);
    } else {
      toggleColorMode();
    }
  };

  return {
    themeOptions,
    handleThemeChange,
    colorMode,
    toggleColorMode,
    setColorMode,
  };
};
