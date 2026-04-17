/**
 * useSplitViewHotkey (Issue #627, G4)
 *
 * Registriert den globalen Tastatur-Shortcut `cmd+shift+g` / `ctrl+shift+g`
 * zum Umschalten der Verknüpften Ansicht. Respektiert Disabled-Zustand
 * (Viewport < 1280 px).
 */

import { useHotkeys } from 'react-hotkeys-hook';
import { splitViewActions } from '../stores/split-view.store';
import { useSplitViewResponsive } from './use-split-view-responsive';

export function useSplitViewHotkey(): void {
  const { isAllowed } = useSplitViewResponsive();

  useHotkeys(
    'mod+shift+g',
    () => {
      if (!isAllowed) return;
      splitViewActions.toggle();
    },
    {
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
  );
}
