import { createStore, useStore } from '@tanstack/react-store';
import type { EinsatzResponseDto } from '@/shared';
import { saveActiveEinsatzId, subscribeToStorageChanges } from './persistence/einsatz-persistence';
import { serverStore } from '@/features/server/stores/server.store';
import { useCallback } from 'react';

// Type alias for better readability
export type Einsatz = EinsatzResponseDto;
export type ActiveEinsatzResumeStatus = 'idle' | 'checking' | 'ready' | 'unavailable';
export type ActiveEinsatzResumeReason = 'no-context' | 'invalid-context' | 'unauthorized' | 'storage-unavailable' | 'unknown' | null;

interface EinsatzStoreState {
  // Legacy: Backward compatibility
  selectedEinsatzId: string | null;

  // New: Full active Einsatz state
  activeEinsatz: Einsatz | null;
  isLoadingActiveEinsatz: boolean;
  activeEinsatzError: string | null;
  runtimeServerId: string | null;
  resumeStatus: ActiveEinsatzResumeStatus;
  resumeReason: ActiveEinsatzResumeReason;
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
  runtimeServerId: null,
  resumeStatus: 'idle',
  resumeReason: null,
});

// Subscribe to store changes for auto-persistence
einsatzStore.subscribe(() => {
  const state = einsatzStore.state;
  if (state.activeEinsatz?.id !== undefined) {
    saveActiveEinsatzId(state.activeEinsatz.id, { serverId: state.runtimeServerId });
  }
});

export function resetActiveEinsatzRuntime(serverId: string | null = serverStore.state.activeServerId): void {
  einsatzStore.setState((state) => ({
    ...state,
    selectedEinsatzId: null,
    activeEinsatz: null,
    isLoadingActiveEinsatz: false,
    activeEinsatzError: null,
    runtimeServerId: serverId,
    resumeStatus: 'idle',
    resumeReason: null,
  }));
}

// Setup cross-tab synchronization
if (typeof window !== 'undefined') {
  subscribeToStorageChanges((einsatzId) => {
    const runtimeServerId = serverStore.state.activeServerId;

    // Only update if the ID actually changed
    if (einsatzId !== einsatzStore.state.activeEinsatz?.id || einsatzStore.state.runtimeServerId !== runtimeServerId) {
      // Clear active Einsatz when ID is removed
      if (!einsatzId) {
        einsatzStore.setState((state) => ({
          ...state,
          activeEinsatz: null,
          selectedEinsatzId: null,
          isLoadingActiveEinsatz: false,
          activeEinsatzError: null,
          runtimeServerId,
          resumeStatus: 'unavailable',
          resumeReason: 'no-context',
        }));
      } else {
        // Note: The actual Einsatz data will be loaded by the useActiveEinsatz hook
        einsatzStore.setState((state) => ({
          ...state,
          activeEinsatz: null,
          selectedEinsatzId: einsatzId,
          activeEinsatzError: null,
          runtimeServerId,
          resumeStatus: 'checking',
          resumeReason: null,
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
  const store = useStore(einsatzStore, (state) => state);
  const resolveServerId = useCallback((serverId?: string | null) => {
    if (serverId !== undefined) {
      return serverId;
    }

    return serverStore.state.activeServerId;
  }, []);

  // Legacy actions (backward compatibility)
  const setSelectedEinsatzId = useCallback(
    (
      id: string | null,
      options?: {
        serverId?: string | null;
        resumeStatus?: ActiveEinsatzResumeStatus;
        resumeReason?: ActiveEinsatzResumeReason;
      },
    ) => {
      const runtimeServerId = resolveServerId(options?.serverId);

      einsatzStore.setState((state) => ({
        ...state,
        selectedEinsatzId: id,
        activeEinsatz: id && state.activeEinsatz?.id !== id ? null : state.activeEinsatz,
        runtimeServerId,
        resumeStatus: options?.resumeStatus ?? state.resumeStatus,
        resumeReason: options?.resumeReason ?? state.resumeReason,
      }));
    },
    [resolveServerId],
  );

  const clearSelectedEinsatzId = useCallback(() => {
    setSelectedEinsatzId(null);
  }, [setSelectedEinsatzId]);

  const setResumeState = useCallback(
    (resumeStatus: ActiveEinsatzResumeStatus, resumeReason: ActiveEinsatzResumeReason = null, options?: { serverId?: string | null }) => {
      const runtimeServerId = resolveServerId(options?.serverId);

      einsatzStore.setState((state) => ({
        ...state,
        runtimeServerId,
        resumeStatus,
        resumeReason,
      }));
    },
    [resolveServerId],
  );

  // New actions for active Einsatz
  const setActiveEinsatz = useCallback(
    (
      einsatz: Einsatz | null,
      options?: {
        serverId?: string | null;
        resumeStatus?: ActiveEinsatzResumeStatus;
        resumeReason?: ActiveEinsatzResumeReason;
      },
    ) => {
      const runtimeServerId = resolveServerId(options?.serverId);

      einsatzStore.setState((state) => ({
        ...state,
        activeEinsatz: einsatz,
        // Keep selectedEinsatzId in sync for backward compatibility
        selectedEinsatzId: einsatz?.id ?? null,
        activeEinsatzError: null,
        runtimeServerId,
        resumeStatus: options?.resumeStatus ?? (einsatz ? 'ready' : state.resumeStatus),
        resumeReason: options?.resumeReason ?? (einsatz ? null : state.resumeReason),
      }));
    },
    [resolveServerId],
  );

  const clearActiveEinsatz = useCallback(
    (options?: { preserveResumeState?: boolean; serverId?: string | null; resumeStatus?: ActiveEinsatzResumeStatus; resumeReason?: ActiveEinsatzResumeReason }) => {
      const runtimeServerId = resolveServerId(options?.serverId);

      einsatzStore.setState((state) => ({
        ...state,
        activeEinsatz: null,
        selectedEinsatzId: null,
        isLoadingActiveEinsatz: false,
        activeEinsatzError: null,
        runtimeServerId,
        resumeStatus: options?.preserveResumeState ? state.resumeStatus : (options?.resumeStatus ?? 'unavailable'),
        resumeReason: options?.preserveResumeState ? state.resumeReason : (options?.resumeReason ?? 'no-context'),
      }));
    },
    [resolveServerId],
  );

  const setLoadingState = useCallback(
    (isLoading: boolean, options?: { serverId?: string | null; resumeStatus?: ActiveEinsatzResumeStatus }) => {
      const runtimeServerId = resolveServerId(options?.serverId);

      einsatzStore.setState((state) => ({
        ...state,
        isLoadingActiveEinsatz: isLoading,
        runtimeServerId,
        resumeStatus: options?.resumeStatus ?? state.resumeStatus,
      }));
    },
    [resolveServerId],
  );

  const setError = useCallback(
    (error: string | null, options?: { serverId?: string | null; resumeStatus?: ActiveEinsatzResumeStatus; resumeReason?: ActiveEinsatzResumeReason }) => {
      const runtimeServerId = resolveServerId(options?.serverId);

      einsatzStore.setState((state) => ({
        ...state,
        activeEinsatzError: error,
        isLoadingActiveEinsatz: false,
        runtimeServerId,
        resumeStatus: options?.resumeStatus ?? state.resumeStatus,
        resumeReason: options?.resumeReason ?? state.resumeReason,
      }));
    },
    [resolveServerId],
  );

  const resetRuntimeState = useCallback(
    (serverId?: string | null) => {
      resetActiveEinsatzRuntime(resolveServerId(serverId));
    },
    [resolveServerId],
  );

  return {
    // Legacy exports
    selectedEinsatzId: store.selectedEinsatzId,
    setSelectedEinsatzId,
    clearSelectedEinsatzId,

    // New exports
    activeEinsatz: store.activeEinsatz,
    isLoadingActiveEinsatz: store.isLoadingActiveEinsatz,
    activeEinsatzError: store.activeEinsatzError,
    runtimeServerId: store.runtimeServerId,
    resumeStatus: store.resumeStatus,
    resumeReason: store.resumeReason,
    setActiveEinsatz,
    clearActiveEinsatz,
    setLoadingState,
    setError,
    setResumeState,
    resetRuntimeState,
  };
}

// Exported selectors for optimal performance
export const selectActiveEinsatz = (state: EinsatzStoreState) => state.activeEinsatz;
export const selectIsLoadingActiveEinsatz = (state: EinsatzStoreState) => state.isLoadingActiveEinsatz;
export const selectActiveEinsatzError = (state: EinsatzStoreState) => state.activeEinsatzError;
export const selectSelectedEinsatzId = (state: EinsatzStoreState) => state.selectedEinsatzId;
export const selectRuntimeServerId = (state: EinsatzStoreState) => state.runtimeServerId;
export const selectResumeStatus = (state: EinsatzStoreState) => state.resumeStatus;
export const selectResumeReason = (state: EinsatzStoreState) => state.resumeReason;
