import { useColorMode } from '@/hooks/use-color-mode';
import { useHotkeys } from 'react-hotkeys-hook';

export function useGlobalThemeHotkeys() {
  const { setColorMode } = useColorMode();

  // Light theme: Cmd+Shift+L
  useHotkeys(
    'mod+shift+l',
    (e) => {
      e.preventDefault();
      setColorMode('light');
    },
    {
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
  );

  // Dark theme: Cmd+Shift+D
  useHotkeys(
    'mod+shift+d',
    (e) => {
      e.preventDefault();
      setColorMode('dark');
    },
    {
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
  );

  // System theme: Cmd+Shift+S
  useHotkeys(
    'mod+shift+s',
    (e) => {
      e.preventDefault();
      setColorMode('system');
    },
    {
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
  );
}
