/**
 * useSplitViewResponsive (Issue #627, G4)
 *
 * Liefert `true`, wenn das Viewport mindestens `xl` (1280 px) breit ist.
 * Wird vom `SplitViewToggle` fuer den Disabled-State und vom Layout selbst
 * als Fallback (`<xl` → Vollansicht) benutzt. Optional: wenn das Fenster
 * unter die Schwelle schrumpft, während der Split aktiv ist, deaktiviert der
 * Hook den Store und zeigt einen Info-Toast (UX-Spec Zeile 135).
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { splitViewActions, splitViewStore } from '../stores/split-view.store';

const SPLIT_VIEW_MIN_WIDTH_PX = 1280;
const SPLIT_VIEW_MEDIA_QUERY = `(min-width: ${SPLIT_VIEW_MIN_WIDTH_PX}px)`;

export function useSplitViewResponsive(): { isAllowed: boolean } {
  const [isAllowed, setIsAllowed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia(SPLIT_VIEW_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(SPLIT_VIEW_MEDIA_QUERY);
    const handler = (event: MediaQueryListEvent) => setIsAllowed(event.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  // Auto-deactivate: wenn Split aktiv ist und Viewport unter die Schwelle rutscht
  // → Store zurücksetzen + Info-Toast. Kein Effekt, solange der Split nicht aktiv ist.
  useEffect(() => {
    if (isAllowed) return;
    if (!splitViewStore.state.isActive) return;
    splitViewActions.deactivate();
    toast.info('Verknüpfte Ansicht benötigt mind. 1280 px — wechsele zurück zur Vollansicht');
  }, [isAllowed]);

  return { isAllowed };
}
