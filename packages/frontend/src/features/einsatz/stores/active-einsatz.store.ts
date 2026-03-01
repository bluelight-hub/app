import { createStore, useStore } from '@tanstack/react-store';
import type { EinsatzResponseDto } from '@/shared';
import { saveActiveEinsatzId, subscribeToStorageChanges } from './persistence/einsatz-persistence';

// Type alias for better readability
export type Einsatz = EinsatzResponseDto;

interface EinsatzStoreState {
  // Legacy: Backward compatibility
  selectedEinsatzId: string | null;

  // New: Full active Einsatz state
  activeEinsatz: Einsatz | null;
  isLoadingActiveEinsatz: boolean;
  activeEinsatzError: string | null;
}

/**
 * Globaler Store für Einsatz UI-State
 *
 * Verwaltet den aktiven Einsatz-Kontext für die gesamte Anwendung.
 * Unterstützt sowohl den legacy selectedEinsatzId als auch den neuen
 * vollständigen activeEinsatz State.
 */
export const einsatzStore = createStore<EinsatzStoreState>({
  selectedEinsatzId: null,
  activeEinsatz: null,
  isLoadingActiveEinsatz: false,
  activeEinsatzError: null,
});

// Subscribe to store changes for auto-persistence
einsatzStore.subscribe(() => {
  const state = einsatzStore.state;
  if (state.activeEinsatz?.id !== undefined) {
    saveActiveEinsatzId(state.activeEinsatz.id);
  }
});

// Setup cross-tab synchronization
if (typeof window !== 'undefined') {
  subscribeToStorageChanges((einsatzId) => {
    // Only update if the ID actually changed
    if (einsatzId !== einsatzStore.state.activeEinsatz?.id) {
      // Clear active Einsatz when ID is removed
      if (!einsatzId) {
        einsatzStore.setState((state) => ({
          ...state,
          activeEinsatz: null,
          selectedEinsatzId: null,
          activeEinsatzError: null,
        }));
      } else {
        // Note: The actual Einsatz data will be loaded by the useActiveEinsatz hook
        einsatzStore.setState((state) => ({
          ...state,
          selectedEinsatzId: einsatzId,
        }));
      }
    }
  });
}

/**
 * Hook für Zugriff auf den Einsatz Store
 *
 * Bietet Actions für die Verwaltung des aktiven Einsatzes
 * sowie Legacy-Support für selectedEinsatzId.
 */
export function useEinsatzStore() {
  const store = useStore(einsatzStore);

  // Legacy actions (backward compatibility)
  const setSelectedEinsatzId = (id: string | null) => {
    einsatzStore.setState((state) => ({
      ...state,
      selectedEinsatzId: id,
    }));
  };

  const clearSelectedEinsatzId = () => {
    setSelectedEinsatzId(null);
  };

  // New actions for active Einsatz
  const setActiveEinsatz = (einsatz: Einsatz | null) => {
    einsatzStore.setState((state) => ({
      ...state,
      activeEinsatz: einsatz,
      // Keep selectedEinsatzId in sync for backward compatibility
      selectedEinsatzId: einsatz?.id ?? null,
      activeEinsatzError: null,
    }));
  };

  const clearActiveEinsatz = () => {
    einsatzStore.setState((state) => ({
      ...state,
      activeEinsatz: null,
      selectedEinsatzId: null,
      isLoadingActiveEinsatz: false,
      activeEinsatzError: null,
    }));
  };

  const setLoadingState = (isLoading: boolean) => {
    einsatzStore.setState((state) => ({
      ...state,
      isLoadingActiveEinsatz: isLoading,
    }));
  };

  const setError = (error: string | null) => {
    einsatzStore.setState((state) => ({
      ...state,
      activeEinsatzError: error,
      isLoadingActiveEinsatz: false,
    }));
  };

  return {
    // Legacy exports
    selectedEinsatzId: store.selectedEinsatzId,
    setSelectedEinsatzId,
    clearSelectedEinsatzId,

    // New exports
    activeEinsatz: store.activeEinsatz,
    isLoadingActiveEinsatz: store.isLoadingActiveEinsatz,
    activeEinsatzError: store.activeEinsatzError,
    setActiveEinsatz,
    clearActiveEinsatz,
    setLoadingState,
    setError,
  };
}

// Exported selectors for optimal performance
export const selectActiveEinsatz = (state: EinsatzStoreState) => state.activeEinsatz;
export const selectIsLoadingActiveEinsatz = (state: EinsatzStoreState) => state.isLoadingActiveEinsatz;
export const selectActiveEinsatzError = (state: EinsatzStoreState) => state.activeEinsatzError;
export const selectSelectedEinsatzId = (state: EinsatzStoreState) => state.selectedEinsatzId;
