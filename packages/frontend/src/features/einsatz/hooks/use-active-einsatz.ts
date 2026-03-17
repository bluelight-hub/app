import { useCurrentUser } from '@/features/auth';
import { serverStore } from '@/features/server/stores/server.store';
import type { EinsatzControllerFindOneVAlpha200Response, ResponseError } from '@/shared';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { milliseconds } from 'date-fns';
import { useCallback, useEffect, useMemo } from 'react';
import { EINSATZ_QUERY_KEYS } from '../api';
import { einsatzStore, useEinsatzStore } from '../stores/active-einsatz.store';
import type { ActiveEinsatzStorageScope } from '../stores/persistence/einsatz-persistence';
import { clearActiveEinsatz as clearPersistedEinsatz, loadActiveEinsatzId, rehydrateActiveEinsatz, saveActiveEinsatzId, subscribeToStorageChanges } from '../stores/persistence/einsatz-persistence';

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
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);
  const { user, authStatus } = useCurrentUser();
  const {
    activeEinsatz,
    isLoadingActiveEinsatz,
    activeEinsatzError,
    setActiveEinsatz: storeSetActiveEinsatz,
    clearActiveEinsatz: storeClearActiveEinsatz,
    setLoadingState,
    setError,
    selectedEinsatzId,
  } = useEinsatzStore();

  const persistenceScope = useMemo<ActiveEinsatzStorageScope | null>(() => {
    if (authStatus !== 'authenticated' || !activeServerId || !user?.id || !user.role) {
      return null;
    }

    return {
      serverId: activeServerId,
      userId: user.id,
      role: user.role,
    };
  }, [activeServerId, authStatus, user?.id, user?.role]);

  // Query für aktiven Einsatz basierend auf selectedEinsatzId
  const {
    data: fetchedEinsatz,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useQuery<EinsatzControllerFindOneVAlpha200Response, ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.detail(selectedEinsatzId),
    queryFn: async () => {
      if (!selectedEinsatzId) {
        throw new Error('No Einsatz ID selected');
      }

      try {
        return await api.einsatz().einsatzControllerFindOneVAlpha({
          id: selectedEinsatzId,
        });
      } catch (error) {
        logger.error('Failed to fetch active Einsatz', error);
        throw error;
      }
    },
    enabled: !!selectedEinsatzId && !activeEinsatz, // Only fetch if we have an ID but no data
    staleTime: milliseconds({ minutes: 5 }),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update store when query data changes
  useEffect(() => {
    if (fetchedEinsatz?.data && selectedEinsatzId) {
      storeSetActiveEinsatz(fetchedEinsatz.data);
    }
  }, [fetchedEinsatz, selectedEinsatzId, storeSetActiveEinsatz]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      setError(queryError.message || 'Fehler beim Laden des Einsatzes');
    }
  }, [queryError, setError]);

  // Rehydration beim App-Start
  useEffect(() => {
    if (authStatus !== 'authenticated' || !persistenceScope) return;
    // Skip if activeEinsatz already exists
    if (activeEinsatz) return;

    const initializeActiveEinsatz = async () => {
      // Read storage once
      const storedId = await loadActiveEinsatzId(persistenceScope);

      if (storedId) {
        setLoadingState(true);

        try {
          // Validiere die gespeicherte ID durch API-Aufruf
          const validateId = async (id: string): Promise<boolean> => {
            try {
              const response = await api.einsatz().einsatzControllerFindOneVAlpha({ id });
              // Wenn erfolgreich, setze den Einsatz direkt
              if (response.data) {
                // Synchronize both the activeEinsatz and selectedEinsatzId
                storeSetActiveEinsatz(response.data);
                // Ensure the selectedEinsatzId is also set in the store
                einsatzStore.setState((state) => ({
                  ...state,
                  selectedEinsatzId: id,
                }));
                // Cache the data in query client
                queryClient.setQueryData(EINSATZ_QUERY_KEYS.detail(id), response);
                return true;
              }
              return false;
            } catch {
              return false;
            }
          };

          // Pass the storedId directly instead of having rehydrateActiveEinsatz read it again
          const validatedId = await rehydrateActiveEinsatz(persistenceScope, storedId, validateId);

          // If validation failed, clear the persisted ID
          if (!validatedId) {
            await clearPersistedEinsatz(persistenceScope);
          }
        } catch (error) {
          logger.error('Failed to rehydrate active Einsatz', error);
          setError('Gespeicherter Einsatz konnte nicht geladen werden');
          await clearPersistedEinsatz(persistenceScope);
        } finally {
          setLoadingState(false);
        }
      }
    };

    // Nur beim ersten Mount ausführen
    void initializeActiveEinsatz();
  }, [
    activeEinsatz,
    authStatus,
    persistenceScope,
    queryClient,
    setError,
    setLoadingState, // Synchronize both the activeEinsatz and selectedEinsatzId
    storeSetActiveEinsatz,
  ]); // Only re-run if activeEinsatz changes (for early return check)

  useEffect(() => {
    if (authStatus !== 'unauthenticated') {
      return;
    }

    storeClearActiveEinsatz();
  }, [authStatus, storeClearActiveEinsatz]);

  useEffect(() => {
    if (!persistenceScope || typeof window === 'undefined') {
      return;
    }

    return subscribeToStorageChanges(persistenceScope, (einsatzId) => {
      if (einsatzId === einsatzStore.state.activeEinsatz?.id) {
        return;
      }

      if (!einsatzId) {
        einsatzStore.setState((state) => ({
          ...state,
          activeEinsatz: null,
          selectedEinsatzId: null,
          activeEinsatzError: null,
        }));
        return;
      }

      einsatzStore.setState((state) => ({
        ...state,
        activeEinsatz: null,
        selectedEinsatzId: einsatzId,
        activeEinsatzError: null,
      }));
    });
  }, [persistenceScope]);

  /**
   * Setzt einen neuen aktiven Einsatz
   *
   * @param id - Die ID des zu aktivierenden Einsatzes
   */
  const setActiveEinsatz = useCallback(
    async (id: string) => {
      setLoadingState(true);
      setError(null);

      try {
        // Optimistic Update - setze ID sofort
        einsatzStore.setState((state) => ({
          ...state,
          selectedEinsatzId: id,
        }));

        // Prüfe ob Daten im Cache vorhanden sind
        const cachedData = queryClient.getQueryData<EinsatzControllerFindOneVAlpha200Response>(EINSATZ_QUERY_KEYS.detail(id));

        if (cachedData?.data) {
          // Verwende gecachte Daten
          storeSetActiveEinsatz(cachedData.data);
          await saveActiveEinsatzId(id, persistenceScope);
          setLoadingState(false);
        } else {
          // Lade Daten vom Server
          const response = await api.einsatz().einsatzControllerFindOneVAlpha({ id });

          if (response.data) {
            storeSetActiveEinsatz(response.data);
            // Cache die Daten
            queryClient.setQueryData(EINSATZ_QUERY_KEYS.detail(id), response);
            await saveActiveEinsatzId(id, persistenceScope);
          } else {
            throw new Error('Einsatz nicht gefunden');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        logger.error('Failed to set active Einsatz', error);
        setError(errorMessage);
        // Rollback bei Fehler
        storeClearActiveEinsatz();
        await clearPersistedEinsatz(persistenceScope);
        throw error;
      } finally {
        setLoadingState(false);
      }
    },
    [persistenceScope, queryClient, setError, setLoadingState, storeClearActiveEinsatz, storeSetActiveEinsatz],
  );

  /**
   * Löscht den aktiven Einsatz
   */
  const clearActiveEinsatz = useCallback(() => {
    storeClearActiveEinsatz();
    void clearPersistedEinsatz(persistenceScope);
  }, [persistenceScope, storeClearActiveEinsatz]);

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

    // Actions
    setActiveEinsatz,
    clearActiveEinsatz,
    refreshActiveEinsatz,
  };
}
