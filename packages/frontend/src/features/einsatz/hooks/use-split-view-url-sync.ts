/**
 * useSplitViewUrlSync (Issue #627, G4)
 *
 * Bidirektionale Synchronisation zwischen `splitViewStore` und den URL-
 * Search-Params `?split=true&focus=...`. Die URL ist authoritative — Store-
 * Aenderungen werden in die URL zurueckgeschrieben (`replace: true`), und
 * externe URL-Aenderungen (Browser-Back, Bookmark) aktualisieren den Store.
 *
 * Voraussetzung: Die Route-`validateSearch` liefert `split` (boolean) und
 * `focus` (string | undefined) — siehe `gefahren.tsx` / `karte.tsx`.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { focusEquals, parseFocus, serializeFocus, splitViewActions, splitViewStore, type SplitViewFocus } from '../stores/split-view.store';

export interface UseSplitViewUrlSyncOptions {
  /** Aktueller Wert des `split`-Param (aus Route-Search). */
  split: boolean | undefined;
  /** Aktueller Wert des `focus`-Param (aus Route-Search). */
  focus: string | undefined;
}

/**
 * URL → Store: wenn sich die Param-Werte aendern, uebernehmen wir sie.
 * Store → URL: Store-Aenderungen aktualisieren die URL via `navigate`.
 *
 * `syncFromUrlRef` verhindert eine Navigation-Dauerschleife: wenn der Store
 * gerade durch URL→Store aktualisiert wurde, ueberspringt Store→URL einen
 * Durchgang — sonst laeuft Store→URL im gleichen Flush noch mit dem alten
 * `state`-Snapshot und setzt die URL-Params irrtuemlich zurueck.
 */
export function useSplitViewUrlSync({ split, focus }: UseSplitViewUrlSyncOptions): void {
  const navigate = useNavigate();
  const state = useStore(splitViewStore, (s) => s);
  const syncFromUrlRef = useRef(false);

  // URL → Store
  useEffect(() => {
    const desiredIsActive = split === true;
    const desiredFocus: SplitViewFocus | null = parseFocus(focus);
    if (splitViewStore.state.isActive === desiredIsActive && focusEquals(splitViewStore.state.focus, desiredFocus)) {
      return;
    }
    syncFromUrlRef.current = true;
    splitViewActions.setState({ isActive: desiredIsActive, focus: desiredFocus });
  }, [split, focus]);

  // Store → URL
  useEffect(() => {
    if (syncFromUrlRef.current) {
      syncFromUrlRef.current = false;
      return;
    }
    const targetSplit = state.isActive ? true : undefined;
    const targetFocus = serializeFocus(state.focus);
    if (split === targetSplit && focus === targetFocus) {
      return;
    }
    navigate({
      to: '.',
      search: (prev) => {
        const next = { ...(prev as Record<string, unknown>) };
        if (targetSplit) {
          next.split = true;
        } else {
          delete next.split;
        }
        if (targetFocus) {
          next.focus = targetFocus;
        } else {
          delete next.focus;
        }
        return next as never;
      },
      replace: true,
    });
  }, [state, split, focus, navigate]);
}
