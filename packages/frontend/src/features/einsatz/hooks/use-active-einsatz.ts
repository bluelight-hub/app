import type { EinsatzControllerFindOneVAlpha200Response, ResponseError } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { serverStore } from '@/features/server/stores/server.store';
import { logger } from '@/shared/lib/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { milliseconds } from 'date-fns';
import { useCallback, useEffect } from 'react';
import { EINSATZ_QUERY_KEYS } from '../api';
import { type ActiveEinsatzResumeReason, useEinsatzStore } from '../stores/active-einsatz.store';
import { clearPersistedResumeContext, isLocalStorageAvailable, loadActiveEinsatzId, rehydrateActiveEinsatz } from '../stores/persistence/einsatz-persistence';
import { ensureSingleRehydration, fetchActiveEinsatzOnce, getActiveEinsatzRuntimeGeneration, invalidateActiveEinsatzRuntime, isActiveEinsatzRuntimeGenerationCurrent } from './active-einsatz-runtime';

function resolveResumeReason(error: unknown): ActiveEinsatzResumeReason {
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (status === 401 || status === 403) {
    return 'unauthorized';
  }

  if (status === 404) {
    return 'invalid-context';
  }

  return 'unknown';
}

class ActiveEinsatzRuntimeStaleError extends Error {
  constructor() {
    super('Active Einsatz runtime is stale');
    this.name = 'ActiveEinsatzRuntimeStaleError';
  }
}

function isActiveEinsatzRuntimeCurrent(serverId: string | null, generation: number): boolean {
  return isActiveEinsatzRuntimeGenerationCurrent(generation) && serverStore.state.activeServerId === serverId;
}

function assertActiveEinsatzRuntimeCurrent(serverId: string | null, generation: number): void {
  if (!isActiveEinsatzRuntimeCurrent(serverId, generation)) {
    throw new ActiveEinsatzRuntimeStaleError();
  }
}

function isActiveEinsatzRuntimeStaleError(error: unknown): error is ActiveEinsatzRuntimeStaleError {
  return error instanceof ActiveEinsatzRuntimeStaleError;
}

function getResumeQueryKey(serverId: string | null, einsatzId: string | null) {
  return [...EINSATZ_QUERY_KEYS.detail(einsatzId), 'resume-context', serverId ?? 'global'] as const;
}

/**
 * Hook für aktiven Einsatz-Management
 *
 * Zentrale API für die Verwaltung des aktiven Einsatzes
 * mit automatischer Persistierung und Datensynchronisation
 *
 * Features:
 * - Automatische Rehydration beim App-Start
 * - TanStack Query Integration für Daten-Fetching
 * - Optimistic Updates
 * - Cross-Tab-Synchronisation
 * - Error Recovery
 */
export function useActiveEinsatz() {
  const queryClient = useQueryClient();
  const currentServerId = useStore(serverStore, (state) => state.activeServerId);
  const { authStatus } = useCurrentUser();
  const {
    activeEinsatz: storedActiveEinsatz,
    isLoadingActiveEinsatz,
    activeEinsatzError,
    setActiveEinsatz: storeSetActiveEinsatz,
    clearActiveEinsatz: clearActiveEinsatzState,
    setLoadingState,
    setError,
    selectedEinsatzId: storedSelectedEinsatzId,
    setSelectedEinsatzId,
    runtimeServerId,
    resumeStatus: storedResumeStatus,
    resumeReason: storedResumeReason,
    setResumeState,
    resetRuntimeState,
  } = useEinsatzStore();
  const isCurrentServerContext = runtimeServerId === currentServerId;
  const activeEinsatz = isCurrentServerContext ? storedActiveEinsatz : null;
  const selectedEinsatzId = isCurrentServerContext ? storedSelectedEinsatzId : null;
  const resumeStatus = isCurrentServerContext ? storedResumeStatus : 'idle';
  const resumeReason = isCurrentServerContext ? storedResumeReason : null;
  const activeEinsatzQueryKey = getResumeQueryKey(currentServerId, selectedEinsatzId);

  // Query für aktiven Einsatz basierend auf selectedEinsatzId
  const {
    data: fetchedEinsatz,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useQuery<EinsatzControllerFindOneVAlpha200Response, ResponseError>({
    queryKey: activeEinsatzQueryKey,
    queryFn: async () => {
      if (!selectedEinsatzId) {
        throw new Error('No Einsatz ID selected');
      }

      try {
        return await fetchActiveEinsatzOnce(currentServerId, selectedEinsatzId);
      } catch (error) {
        logger.error('Failed to fetch active Einsatz', error);
        throw error;
      }
    },
    enabled: authStatus === 'authenticated' && !!selectedEinsatzId && !isLoadingActiveEinsatz && (!activeEinsatz || activeEinsatz.id !== selectedEinsatzId),
    staleTime: milliseconds({ minutes: 5 }),
    retry: (failureCount, error) => {
      const resumeErrorReason = resolveResumeReason(error);

      if (resumeErrorReason === 'invalid-context' || resumeErrorReason === 'unauthorized') {
        return false;
      }

      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update store when query data changes
  useEffect(() => {
    if (fetchedEinsatz?.data && selectedEinsatzId && currentServerId) {
      storeSetActiveEinsatz(fetchedEinsatz.data, {
        serverId: currentServerId,
        resumeStatus: 'ready',
        resumeReason: null,
      });
    }
  }, [currentServerId, fetchedEinsatz, selectedEinsatzId, storeSetActiveEinsatz]);

  // Handle query errors
  useEffect(() => {
    if (!queryError || !currentServerId || !selectedEinsatzId) {
      return;
    }

    const resumeErrorReason = resolveResumeReason(queryError);

    if (resumeErrorReason === 'invalid-context' || resumeErrorReason === 'unauthorized') {
      clearPersistedResumeContext(selectedEinsatzId, { serverId: currentServerId });
      clearActiveEinsatzState({
        serverId: currentServerId,
        resumeStatus: 'unavailable',
        resumeReason: resumeErrorReason,
      });
      setError(queryError.message || 'Fehler beim Laden des Einsatzes', {
        serverId: currentServerId,
        resumeStatus: 'unavailable',
        resumeReason: resumeErrorReason,
      });
      return;
    }

    setError(queryError.message || 'Fehler beim Laden des Einsatzes', {
      serverId: currentServerId,
      resumeStatus: activeEinsatz ? 'ready' : 'unavailable',
      resumeReason: activeEinsatz ? null : 'unknown',
    });
  }, [activeEinsatz, clearActiveEinsatzState, currentServerId, queryError, selectedEinsatzId, setError]);

  // Session-Wechsel, Logout und Serverwechsel räumen nur den Laufzeitzustand auf.
  useEffect(() => {
    if (authStatus === 'authenticated' && currentServerId && (!runtimeServerId || runtimeServerId === currentServerId)) {
      return;
    }

    invalidateActiveEinsatzRuntime();
    resetRuntimeState(currentServerId ?? null);
  }, [authStatus, currentServerId, resetRuntimeState, runtimeServerId]);

  // Rehydration beim App-Start und nach Session-Wiederaufnahme
  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentServerId) {
      return;
    }

    if (activeEinsatz) {
      if (resumeStatus !== 'ready') {
        setResumeState('ready', null, { serverId: currentServerId });
      }
      return;
    }

    const sessionKey = `${currentServerId}`;
    const runtimeGeneration = getActiveEinsatzRuntimeGeneration();

    void ensureSingleRehydration(sessionKey, async () => {
      if (!isLocalStorageAvailable()) {
        setResumeState('unavailable', 'storage-unavailable', { serverId: currentServerId });
        return;
      }

      const storedId = loadActiveEinsatzId({ serverId: currentServerId });
      if (!storedId) {
        setResumeState('unavailable', 'no-context', { serverId: currentServerId });
        return;
      }

      setLoadingState(true, {
        serverId: currentServerId,
        resumeStatus: 'checking',
      });

      let validationReason: ActiveEinsatzResumeReason = 'unknown';

      try {
        const validatedId = await rehydrateActiveEinsatz(
          storedId,
          async (id) => {
            try {
              const response = await fetchActiveEinsatzOnce(currentServerId, id);
              assertActiveEinsatzRuntimeCurrent(currentServerId, runtimeGeneration);

              if (!response.data) {
                validationReason = 'invalid-context';
                return false;
              }

              storeSetActiveEinsatz(response.data, {
                serverId: currentServerId,
                resumeStatus: 'ready',
                resumeReason: null,
              });
              queryClient.setQueryData(getResumeQueryKey(currentServerId, id), response);
              return true;
            } catch (error) {
              if (isActiveEinsatzRuntimeStaleError(error)) {
                throw error;
              }

              const resumeErrorReason = resolveResumeReason(error);

              if (resumeErrorReason === 'invalid-context' || resumeErrorReason === 'unauthorized') {
                validationReason = resumeErrorReason;
                return false;
              }

              throw error;
            }
          },
          { serverId: currentServerId },
        );

        assertActiveEinsatzRuntimeCurrent(currentServerId, runtimeGeneration);

        if (!validatedId) {
          clearPersistedResumeContext(storedId, { serverId: currentServerId });
          clearActiveEinsatzState({
            preserveResumeState: true,
            serverId: currentServerId,
          });
          setResumeState('unavailable', validationReason, { serverId: currentServerId });
          return;
        }
      } catch (error) {
        if (isActiveEinsatzRuntimeStaleError(error)) {
          return;
        }

        logger.error('Failed to rehydrate active Einsatz', error);
        setError('Gespeicherter Einsatz konnte nicht geladen werden', {
          serverId: currentServerId,
          resumeStatus: 'unavailable',
          resumeReason: 'unknown',
        });
      } finally {
        if (isActiveEinsatzRuntimeCurrent(currentServerId, runtimeGeneration)) {
          setLoadingState(false, { serverId: currentServerId });
        }
      }
    });
  }, [activeEinsatz, authStatus, clearActiveEinsatzState, currentServerId, queryClient, setError, setLoadingState, setResumeState, storeSetActiveEinsatz, resumeStatus]);

  /**
   * Setzt einen neuen aktiven Einsatz
   *
   * @param id - Die ID des zu aktivierenden Einsatzes
   */
  const setActiveEinsatz = useCallback(
    async (id: string) => {
      if (!currentServerId) {
        throw new Error('Kein aktiver Serverkontext verfügbar');
      }

      const runtimeGeneration = getActiveEinsatzRuntimeGeneration();

      setLoadingState(true, {
        serverId: currentServerId,
        resumeStatus: 'checking',
      });
      setError(null, {
        serverId: currentServerId,
      });

      try {
        // Optimistic Update - setze ID sofort
        setSelectedEinsatzId(id, {
          serverId: currentServerId,
          resumeStatus: 'checking',
          resumeReason: null,
        });

        // Prüfe ob Daten im Cache vorhanden sind
        const cachedData = queryClient.getQueryData<EinsatzControllerFindOneVAlpha200Response>(getResumeQueryKey(currentServerId, id));

        if (cachedData?.data) {
          assertActiveEinsatzRuntimeCurrent(currentServerId, runtimeGeneration);

          // Verwende gecachte Daten
          storeSetActiveEinsatz(cachedData.data, {
            serverId: currentServerId,
            resumeStatus: 'ready',
            resumeReason: null,
          });
        } else {
          // Lade Daten vom Server
          const response = await fetchActiveEinsatzOnce(currentServerId, id);
          assertActiveEinsatzRuntimeCurrent(currentServerId, runtimeGeneration);

          if (response.data) {
            storeSetActiveEinsatz(response.data, {
              serverId: currentServerId,
              resumeStatus: 'ready',
              resumeReason: null,
            });
            // Cache die Daten
            queryClient.setQueryData(getResumeQueryKey(currentServerId, id), response);
          } else {
            throw new Error('Einsatz nicht gefunden');
          }
        }
      } catch (error) {
        if (isActiveEinsatzRuntimeStaleError(error)) {
          return;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        logger.error('Failed to set active Einsatz', error);
        setError(errorMessage, {
          serverId: currentServerId,
          resumeStatus: 'unavailable',
          resumeReason: 'unknown',
        });
        // Rollback bei Fehler
        clearActiveEinsatzState({
          preserveResumeState: true,
          serverId: currentServerId,
        });
        throw error;
      } finally {
        if (isActiveEinsatzRuntimeCurrent(currentServerId, runtimeGeneration)) {
          setLoadingState(false, {
            serverId: currentServerId,
          });
        }
      }
    },
    [clearActiveEinsatzState, currentServerId, queryClient, setError, setLoadingState, setSelectedEinsatzId, storeSetActiveEinsatz],
  );

  /**
   * Löscht den aktiven Einsatz
   */
  const clearActiveEinsatz = useCallback(() => {
    clearActiveEinsatzState({
      serverId: currentServerId,
      resumeStatus: 'unavailable',
      resumeReason: 'no-context',
    });

    if (activeEinsatz?.id) {
      clearPersistedResumeContext(activeEinsatz.id, { serverId: currentServerId });
    }
  }, [activeEinsatz?.id, clearActiveEinsatzState, currentServerId]);

  /**
   * Aktualisiert die Daten des aktiven Einsatzes
   */
  const refreshActiveEinsatz = useCallback(async () => {
    if (selectedEinsatzId) {
      await refetch();
    }
  }, [selectedEinsatzId, refetch]);

  // Kombiniere Loading-States
  const isLoading = isLoadingActiveEinsatz || isQueryLoading;

  // Prüfe ob ein Einsatz aktiv ist
  const isEinsatzActive = !!activeEinsatz;

  return {
    // State
    activeEinsatz,
    isLoading,
    error: activeEinsatzError || (queryError?.message ?? null),
    isEinsatzActive,
    resumeStatus,
    resumeReason,

    // Actions
    setActiveEinsatz,
    clearActiveEinsatz,
    refreshActiveEinsatz,
  };
}
