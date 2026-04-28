import { createStore, useStore } from '@tanstack/react-store';

/**
 * Multi-Select-State für die `PsaProfilePage` (Story 3.2 AC1/AC2).
 *
 * Der Store hält fest, ob die Page sich aktuell im Multi-Select-Modus
 * befindet, und welche `EinsatzEinheit`-IDs ausgewählt sind. In-Memory-
 * Session-State — keine Persistenz, kein Reset zwischen Page-Reloads
 * nötig.
 *
 * **Modus-Wechsel:**
 * - `enterMultiSelect(einheitId)` aktiviert Multi-Select und initialisiert
 *   die Selection mit der Trigger-Einheit (Long-Press / Shift-Klick).
 * - `toggleSelection(einheitId)` togglet die Einheit (No-Op, wenn nicht im
 *   Multi-Select-Modus — der Wechsel passiert nur über `enterMultiSelect`).
 * - `removeFromSelection(einheitId)` entfernt eine Einheit (z. B. via
 *   abwählbarem Chip im Drawer-Header oder „Konflikt-Einheit entfernen").
 *   Wenn die Selection auf 0 sinkt, wird der Modus wieder auf 'single'
 *   gesetzt (Bar verschwindet automatisch).
 * - `exitMultiSelect()` schließt den Multi-Select-Modus und leert die
 *   Selection (Cancel-Button in der `PsaBulkActionBar`).
 * - `clearSelection()` ist ein semantischer Alias für `exitMultiSelect()`
 *   und wird vom Drawer-Submit-Erfolg verwendet, damit Caller-Code lesbar
 *   bleibt („Selection leeren" vs. „Modus verlassen"). Beide setzen den
 *   Modus zurück auf 'single' und entfernen alle markierten IDs.
 */
export interface EigenschutzSelectionState {
  mode: 'single' | 'multi';
  selectedEinheitIds: ReadonlySet<string>;
}

const initialState: EigenschutzSelectionState = {
  mode: 'single',
  selectedEinheitIds: new Set<string>(),
};

export const eigenschutzSelectionStore = createStore<EigenschutzSelectionState>(initialState);

export function enterMultiSelect(einheitId: string): void {
  eigenschutzSelectionStore.setState((state) => {
    // Im Multi-Modus verhält sich `enterMultiSelect` wie `toggleSelection` —
    // niemals die bestehende Selection wipen, damit ein versehentlicher
    // Long-Press auf einer weiteren Karte die bisher markierten Einheiten
    // nicht aus der Hand schlägt (Story 3.2 Code-Review F1).
    if (state.mode === 'multi') {
      const next = new Set(state.selectedEinheitIds);
      if (!next.has(einheitId)) {
        next.add(einheitId);
      }
      return { ...state, selectedEinheitIds: next };
    }
    return {
      mode: 'multi',
      selectedEinheitIds: new Set<string>([einheitId]),
    };
  });
}

export function toggleSelection(einheitId: string): void {
  eigenschutzSelectionStore.setState((state) => {
    if (state.mode !== 'multi') {
      // Single-Mode: einfacher Klick öffnet den Drawer (Story 3.1 Pattern)
      // — der Multi-Select-Trigger ist Long-Press oder Shift-Klick. Toggle
      // im Single-Mode ist No-Op, damit ein versehentlicher Klick nicht
      // implizit in Multi-Select wechselt.
      return state;
    }
    const next = new Set(state.selectedEinheitIds);
    if (next.has(einheitId)) {
      next.delete(einheitId);
    } else {
      next.add(einheitId);
    }
    if (next.size === 0) {
      // Letzte Einheit abgewählt → Modus zurück auf 'single' (Bar
      // verschwindet, Single-Buttons werden wieder eingeblendet).
      return { mode: 'single', selectedEinheitIds: new Set<string>() };
    }
    return { ...state, selectedEinheitIds: next };
  });
}

export function removeFromSelection(einheitId: string): void {
  eigenschutzSelectionStore.setState((state) => {
    if (!state.selectedEinheitIds.has(einheitId)) {
      return state;
    }
    const next = new Set(state.selectedEinheitIds);
    next.delete(einheitId);
    if (next.size === 0) {
      return { mode: 'single', selectedEinheitIds: new Set<string>() };
    }
    return { ...state, selectedEinheitIds: next };
  });
}

export function exitMultiSelect(): void {
  eigenschutzSelectionStore.setState(() => ({
    mode: 'single',
    selectedEinheitIds: new Set<string>(),
  }));
}

export function clearSelection(): void {
  // Semantischer Alias für `exitMultiSelect()` — siehe JSDoc oben. Wir
  // delegieren bewusst, damit künftige Änderungen am Reset-Verhalten
  // automatisch beide Eintrittspunkte abdecken.
  exitMultiSelect();
}

// ============================================================================
// Selectors
// ============================================================================

export function selectIsMultiSelectActive(state: EigenschutzSelectionState): boolean {
  return state.mode === 'multi';
}

export function selectSelectionCount(state: EigenschutzSelectionState): number {
  return state.selectedEinheitIds.size;
}

export function selectSelectedEinheitIds(state: EigenschutzSelectionState): ReadonlySet<string> {
  return state.selectedEinheitIds;
}

export function isEinheitSelected(state: EigenschutzSelectionState, einheitId: string): boolean {
  return state.selectedEinheitIds.has(einheitId);
}

// ============================================================================
// Hook-Wrapper
// ============================================================================

export interface UseEigenschutzSelectionReturn {
  mode: 'single' | 'multi';
  selectedEinheitIds: ReadonlySet<string>;
  selectionCount: number;
  isMultiSelectActive: boolean;
  isSelected: (einheitId: string) => boolean;
  enterMultiSelect: (einheitId: string) => void;
  toggleSelection: (einheitId: string) => void;
  removeFromSelection: (einheitId: string) => void;
  exitMultiSelect: () => void;
  clearSelection: () => void;
}

/**
 * React-Hook-Wrapper für den Selection-Store. Re-rendert ausschließlich
 * bei tatsächlichen State-Änderungen — der zugrundeliegende
 * `@tanstack/react-store` macht das per Reference-Equality.
 */
export function useEigenschutzSelection(): UseEigenschutzSelectionReturn {
  const state = useStore(eigenschutzSelectionStore);
  return {
    mode: state.mode,
    selectedEinheitIds: state.selectedEinheitIds,
    selectionCount: state.selectedEinheitIds.size,
    isMultiSelectActive: state.mode === 'multi',
    isSelected: (einheitId: string) => state.selectedEinheitIds.has(einheitId),
    enterMultiSelect,
    toggleSelection,
    removeFromSelection,
    exitMultiSelect,
    clearSelection,
  };
}
