/**
 * Neuer-ETB-Eintrag-Hotkey (Phase 4 — ETB-Quick-Action-Default)
 *
 * Registriert `Cmd/Ctrl+Shift+E` als globalen Shortcut für die ETB-Quick-Action
 * im Sidebar-Footer. Die Navigation bzw. Dialog-Öffnung wird vom Aufrufer
 * übernommen, damit dieser Hook framework-agnostisch bleibt.
 */

import { useHotkeys } from 'react-hotkeys-hook';

interface UseNeuerEtbEintragHotkeyOptions {
  /** Callback beim Auslösen des Shortcuts (z. B. Navigation auf die ETB-Seite). */
  onTrigger: () => void;
  /**
   * Ob der Hotkey aktiviert ist — sollte während blockierender Overlays
   * (offene Dialoge, Command Palette …) deaktiviert sein.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Registriert `Cmd+Shift+E` (Mac) / `Ctrl+Shift+E` (Windows/Linux) als
 * globale ETB-Quick-Action.
 *
 * @example
 * useNeuerEtbEintragHotkey({
 *   onTrigger: handleOpenEtb,
 *   enabled: !workspaceIsBlocked,
 * });
 */
export function useNeuerEtbEintragHotkey({ onTrigger, enabled = true }: UseNeuerEtbEintragHotkeyOptions) {
  useHotkeys(
    'mod+shift+e',
    (event) => {
      event.preventDefault();
      onTrigger();
    },
    {
      enabled,
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
  );
}
