/**
 * Quick-Create Notiz Hotkeys Hook
 *
 * Registriert globale Keyboard-Shortcuts fuer Notiz-Erstellung.
 * Pattern analog zu use-quick-create-erinnerung-hotkeys.ts.
 */

import { useHotkeys } from 'react-hotkeys-hook';
import { openQuickCreateNotizDialog } from '@/features/notizen';

interface UseQuickCreateNotizHotkeysOptions {
  /** Einsatz-ID fuer den Dialog-Kontext */
  einsatzId: string;
  /**
   * Ob der Hotkey aktiviert ist (z.B. deaktivieren wenn ein anderer Dialog offen ist)
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook fuer Quick-Create Notiz Keyboard-Shortcuts.
 *
 * Registriert `Cmd+Shift+N` (Mac) / `Ctrl+Shift+N` (Windows/Linux) zum Oeffnen
 * des Quick-Create Notiz Dialogs.
 *
 * **Hinweis**: Ctrl+Shift+N kollidiert mit dem Browser-Shortcut fuer "Neues Inkognito-Fenster".
 * In Tauri Desktop App kein Problem. Im Browser hat preventDefault Vorrang wo moeglich.
 */
export function useQuickCreateNotizHotkeys({ einsatzId, enabled = true }: UseQuickCreateNotizHotkeysOptions) {
  useHotkeys(
    'mod+shift+n',
    (event) => {
      event.preventDefault();
      openQuickCreateNotizDialog(einsatzId);
    },
    {
      enabled,
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
  );
}
