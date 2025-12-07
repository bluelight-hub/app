import { useColorMode } from '@/shared/hooks/use-color-mode';
import { useHotkeys } from 'react-hotkeys-hook';

export function useGlobalThemeHotkeys() {
  const { setColorMode } = useColorMode();

  // Light theme: Cmd+Shift+L
  useHotkeys('mod+shift+l', () => setColorMode('light'), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    preventDefault: true,
  });

  // Dark theme: Cmd+Shift+D
  useHotkeys('mod+shift+d', () => setColorMode('dark'), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    preventDefault: true,
  });

  // System theme: Cmd+Shift+S
  useHotkeys('mod+shift+s', () => setColorMode('system'), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    preventDefault: true,
  });
}
