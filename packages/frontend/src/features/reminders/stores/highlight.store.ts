/**
 * Highlight Store
 *
 * Trackt welche Elemente gerade hervorgehoben werden sollen (z.B. beim Klick auf Badge im ETB).
 *
 * **Story 5.4 Task 6:** Badge in ETB-Tabelle zeigt verknuepfte Erinnerung
 * Beim Klick auf den Badge wird die Erinnerung hervorgehoben und in den View gescrollt.
 *
 * **Story 5.5:** ETB-Eintraege koennen ebenfalls hervorgehoben werden (Timeline-Navigation)
 */

import { createStore, useStore } from '@tanstack/react-store';

/**
 * Highlight Store State
 */
export interface HighlightStoreState {
  /** ID der hervorzuhebenden Erinnerung (null = keine Hervorhebung) */
  highlightedErinnerungId: string | null;
  /** ID des hervorzuhebenden ETB-Eintrags (null = keine Hervorhebung) - Story 5.5 */
  highlightedEntryId: string | null;
}

/**
 * Highlight Dauer in Millisekunden
 * Nach dieser Zeit wird die Hervorhebung automatisch entfernt
 */
const HIGHLIGHT_DURATION_MS = 3000;

/**
 * TanStack Store fuer Highlight-State
 */
export const highlightStore = createStore<HighlightStoreState>({
  highlightedErinnerungId: null,
  highlightedEntryId: null,
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Setzt die hervorzuhebende Erinnerung.
 * Entfernt automatisch nach HIGHLIGHT_DURATION_MS.
 *
 * @param erinnerungId - ID der hervorzuhebenden Erinnerung
 */
export function setHighlightedErinnerung(erinnerungId: string): void {
  highlightStore.setState(() => ({
    highlightedErinnerungId: erinnerungId,
  }));

  // Auto-Cleanup nach Highlight-Dauer
  setTimeout(() => {
    // Nur entfernen wenn noch dieselbe Erinnerung hervorgehoben ist
    if (highlightStore.state.highlightedErinnerungId === erinnerungId) {
      clearHighlightedErinnerung();
    }
  }, HIGHLIGHT_DURATION_MS);
}

/**
 * Entfernt die aktuelle Hervorhebung.
 */
export function clearHighlightedErinnerung(): void {
  highlightStore.setState((state) => ({
    ...state,
    highlightedErinnerungId: null,
  }));
}

/**
 * Setzt den hervorzuhebenden ETB-Eintrag (Story 5.5).
 * Entfernt automatisch nach HIGHLIGHT_DURATION_MS.
 *
 * @param entryId - ID des hervorzuhebenden ETB-Eintrags
 */
export function setHighlightedEntry(entryId: string): void {
  highlightStore.setState((state) => ({
    ...state,
    highlightedEntryId: entryId,
  }));

  // Auto-Cleanup nach Highlight-Dauer
  setTimeout(() => {
    // Nur entfernen wenn noch derselbe Eintrag hervorgehoben ist
    if (highlightStore.state.highlightedEntryId === entryId) {
      clearHighlightedEntry();
    }
  }, HIGHLIGHT_DURATION_MS);
}

/**
 * Entfernt die Hervorhebung des ETB-Eintrags (Story 5.5).
 */
export function clearHighlightedEntry(): void {
  highlightStore.setState((state) => ({
    ...state,
    highlightedEntryId: null,
  }));
}

/**
 * Resettet den Highlight-Store auf Initialzustand.
 */
export function resetHighlightStore(): void {
  highlightStore.setState(() => ({
    highlightedErinnerungId: null,
    highlightedEntryId: null,
  }));
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Prueft ob eine Erinnerung gerade hervorgehoben ist.
 *
 * @param erinnerungId - ID der Erinnerung
 * @returns true wenn Erinnerung hervorgehoben
 */
export function isHighlighted(erinnerungId: string): boolean {
  return highlightStore.state.highlightedErinnerungId === erinnerungId;
}

/**
 * Gibt die ID der hervorgehobenen Erinnerung zurueck.
 *
 * @returns Erinnerungs-ID oder null
 */
export function getHighlightedErinnerungId(): string | null {
  return highlightStore.state.highlightedErinnerungId;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook um zu pruefen ob eine Erinnerung hervorgehoben ist.
 *
 * @param erinnerungId - ID der Erinnerung
 * @returns true wenn Erinnerung hervorgehoben
 */
export function useIsHighlighted(erinnerungId: string): boolean {
  return useStore(highlightStore, (state) => state.highlightedErinnerungId === erinnerungId);
}

/**
 * Hook fuer die ID der hervorgehobenen Erinnerung.
 *
 * @returns Erinnerungs-ID oder null
 */
export function useHighlightedErinnerungId(): string | null {
  return useStore(highlightStore, (state) => state.highlightedErinnerungId);
}

/**
 * Hook fuer den kompletten Highlight-Store State (Debug/Testing).
 *
 * @returns Kompletter Store State
 */
export function useHighlightStoreState(): HighlightStoreState {
  return useStore(highlightStore, (state) => state);
}

// ============================================================================
// ETB Entry Highlight Hooks (Story 5.5)
// ============================================================================

/**
 * Hook um zu pruefen ob ein ETB-Eintrag hervorgehoben ist.
 *
 * @param entryId - ID des ETB-Eintrags
 * @returns true wenn Eintrag hervorgehoben
 */
export function useIsEntryHighlighted(entryId: string): boolean {
  return useStore(highlightStore, (state) => state.highlightedEntryId === entryId);
}

/**
 * Hook fuer die ID des hervorgehobenen ETB-Eintrags.
 *
 * @returns Entry-ID oder null
 */
export function useHighlightedEntryId(): string | null {
  return useStore(highlightStore, (state) => state.highlightedEntryId);
}
