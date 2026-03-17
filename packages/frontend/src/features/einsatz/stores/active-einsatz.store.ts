import type { EinsatzResponseDto } from '@/shared';
import { createStore, useStore } from '@tanstack/react-store';
import { useCallback } from 'react';

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

/**
 * Hook für Zugriff auf den Einsatz Store
 *
 * Bietet Actions für die Verwaltung des aktiven Einsatzes
 * sowie Legacy-Support für selectedEinsatzId.
 */
export function useEinsatzStore() {
  const store = useStore(einsatzStore, (state) => state);

  // Legacy actions (backward compatibility)
  const setSelectedEinsatzId = useCallback((id: string | null) => {
    einsatzStore.setState((state) => ({
      ...state,
      selectedEinsatzId: id,
    }));
  }, []);

  const clearSelectedEinsatzId = useCallback(() => {
    setSelectedEinsatzId(null);
  }, [setSelectedEinsatzId]);

  // New actions for active Einsatz
  const setActiveEinsatz = useCallback((einsatz: Einsatz | null) => {
    einsatzStore.setState((state) => ({
      ...state,
      activeEinsatz: einsatz,
      // Keep selectedEinsatzId in sync for backward compatibility
      selectedEinsatzId: einsatz?.id ?? null,
      activeEinsatzError: null,
    }));
  }, []);

  const clearActiveEinsatz = useCallback(() => {
    einsatzStore.setState((state) => ({
      ...state,
      activeEinsatz: null,
      selectedEinsatzId: null,
      isLoadingActiveEinsatz: false,
      activeEinsatzError: null,
    }));
  }, []);

  const setLoadingState = useCallback((isLoading: boolean) => {
    einsatzStore.setState((state) => ({
      ...state,
      isLoadingActiveEinsatz: isLoading,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    einsatzStore.setState((state) => ({
      ...state,
      activeEinsatzError: error,
      isLoadingActiveEinsatz: false,
    }));
  }, []);

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
