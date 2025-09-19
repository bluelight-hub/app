import { api } from '@/api';
import { QUERY_KEYS } from '@/queryKeys';
import { type Einsatz, einsatzStore, useEinsatzStore } from '@/stores/einsatzStore';
import { clearActiveEinsatz as clearPersistedEinsatz, loadActiveEinsatzId, rehydrateActiveEinsatz } from '@/stores/persistence/einsatzPersistence';
import { logger } from '@/utils/logger';
import type { ResponseError } from '@bluelight-hub/shared/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { milliseconds } from 'date-fns';
import { useCallback, useEffect } from 'react';

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

  // Query für aktiven Einsatz basierend auf selectedEinsatzId
  const {
    data: fetchedEinsatz,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useQuery<Einsatz, ResponseError>({
    queryKey: QUERY_KEYS.einsatz.detail(selectedEinsatzId),
    queryFn: async () => {
      if (!selectedEinsatzId) {
        throw new Error('No Einsatz ID selected');
      }

      try {
        const response = await api.einsatz().einsatzControllerFindOneVAlpha({
          id: selectedEinsatzId,
        });

        return response.data;
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
    if (fetchedEinsatz && selectedEinsatzId) {
      storeSetActiveEinsatz(fetchedEinsatz);
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
    // Skip if activeEinsatz already exists
    if (activeEinsatz) return;

    const initializeActiveEinsatz = async () => {
      // Read storage once
      const storedId = loadActiveEinsatzId();

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
                queryClient.setQueryData(QUERY_KEYS.einsatz.detail(id), response.data);
                return true;
              }
              return false;
            } catch {
              return false;
            }
          };

          // Pass the storedId directly instead of having rehydrateActiveEinsatz read it again
          const validatedId = await rehydrateActiveEinsatz(storedId, validateId);

          // If validation failed, clear the persisted ID
          if (!validatedId) {
            clearPersistedEinsatz();
          }
        } catch (error) {
          logger.error('Failed to rehydrate active Einsatz', error);
          setError('Gespeicherter Einsatz konnte nicht geladen werden');
          clearPersistedEinsatz();
        } finally {
          setLoadingState(false);
        }
      }
    };

    // Nur beim ersten Mount ausführen
    void initializeActiveEinsatz();
  }, [
    activeEinsatz,
    queryClient,
    setError,
    setLoadingState, // Synchronize both the activeEinsatz and selectedEinsatzId
    storeSetActiveEinsatz,
  ]); // Only re-run if activeEinsatz changes (for early return check)

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
        const cachedData = queryClient.getQueryData<Einsatz>(QUERY_KEYS.einsatz.detail(id));

        if (cachedData) {
          // Verwende gecachte Daten
          storeSetActiveEinsatz(cachedData);
          setLoadingState(false);
        } else {
          // Lade Daten vom Server
          const response = await api.einsatz().einsatzControllerFindOneVAlpha({ id });

          if (response.data) {
            storeSetActiveEinsatz(response.data);
            // Cache die Daten
            queryClient.setQueryData(QUERY_KEYS.einsatz.detail(id), response.data);
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
        throw error;
      } finally {
        setLoadingState(false);
      }
    },
    [queryClient, storeSetActiveEinsatz, storeClearActiveEinsatz, setLoadingState, setError],
  );

  /**
   * Löscht den aktiven Einsatz
   */
  const clearActiveEinsatz = useCallback(() => {
    storeClearActiveEinsatz();
    clearPersistedEinsatz();
  }, [storeClearActiveEinsatz]);

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
