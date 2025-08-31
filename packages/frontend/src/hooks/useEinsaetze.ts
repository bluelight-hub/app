import { api } from '@/api';
import { QUERY_KEYS } from '@/queryKeys';
import { useEinsatzStore } from '@/stores/einsatzStore';
import { getApiErrorMessage } from '@/utils/apiErrorHandler';
import { logger } from '@/utils/logger';
import type {
  CreateEinsatzDto,
  EinsatzControllerCreateVAlpha200Response,
  EinsatzControllerFindAllVAlpha200Response,
  EinsatzControllerFindAllVAlphaStatusEnum,
  EinsatzResponseDto,
  ResponseError,
  UpdateEinsatzDto,
} from '@bluelight-hub/shared/client';
import { EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';

/**
 * Exponential Backoff Retry-Verzögerung berechnen
 */
function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}

/**
 * Hook für Einsatz-API-Operationen
 *
 * Stellt alle API-Funktionen für Einsatz-Verwaltung bereit:
 * - Laden der Einsatzliste
 * - Erstellen neuer Einsätze
 * - Aktualisieren von Einsätzen
 * - Löschen von Einsätzen
 *
 * @param filters - Optionale Filter für die Einsatzliste
 * @returns Objekt mit Einsatzdaten, Ladezuständen und API-Aktionen
 */
export const useEinsaetze = (filters?: { status?: EinsatzControllerFindAllVAlphaStatusEnum; search?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();

  // Query für Einsatzliste mit verbessertem Caching und Backend-Filtering
  const einsaetzeQuery = useQuery<EinsatzControllerFindAllVAlpha200Response, ResponseError>({
    queryKey: QUERY_KEYS.einsatz.list(filters),
    queryFn: async () => {
      try {
        return await api.einsatz().einsatzControllerFindAllVAlpha({
          limit: filters?.limit,
          page: filters?.page,
          search: filters?.search,
          status: filters?.status,
        });
      } catch (error) {
        logger.error('Failed to fetch einsaetze', error);
        throw error;
      }
    },
    // Stale time für bessere Performance bei wiederholten Anfragen
    staleTime: 30000, // 30 seconds
    // Retry-Logic mit exponential backoff
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  // Mutation für Einsatz erstellen mit Optimistic Updates
  const createEinsatzMutation = useMutation<EinsatzResponseDto, ResponseError, CreateEinsatzDto>({
    mutationFn: async (data: CreateEinsatzDto) => {
      const response = await api.einsatz().einsatzControllerCreateVAlpha({
        createEinsatzDto: data,
      });
      return response.data;
    },
    onMutate: async (newEinsatz) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.einsatz.all });

      // Snapshot the previous value
      const previousEinsaetze = queryClient.getQueryData<EinsatzControllerFindAllVAlpha200Response>(QUERY_KEYS.einsatz.list(filters));

      // Optimistically update to the new value
      const optimisticEinsatz: EinsatzResponseDto = {
        id: `temp-${Date.now()}`,
        ...newEinsatz,
        status: ('status' in newEinsatz ? newEinsatz.status : undefined) || EinsatzResponseDtoStatusEnum.Angelegt,
        createdBy: 'current-user',
        name: `${newEinsatz.alarmstichwort} (wird erstellt)`,
        completeness: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as EinsatzResponseDto;

      queryClient.setQueryData<EinsatzControllerFindAllVAlpha200Response>(QUERY_KEYS.einsatz.list(filters), (old) => {
        if (!old) return old;
        return {
          ...old,
          data: [optimisticEinsatz, ...(old.data || [])],
        };
      });

      // Return a context with the previous and new data
      return { previousEinsaetze, optimisticEinsatz };
    },
    onError: async (error: ResponseError, _newEinsatz, context) => {
      // If the mutation fails, use the context to roll back
      if (context && typeof context === 'object' && 'previousEinsaetze' in context && context.previousEinsaetze) {
        queryClient.setQueryData(QUERY_KEYS.einsatz.list(filters), context.previousEinsaetze);
      }

      const message = await getApiErrorMessage(error, 'Der Einsatz konnte nicht erstellt werden.', 'createEinsatz');
      logger.error('Failed to create einsatz', error);
      toast.error('Fehler', {
        description: message,
      });
    },
    onSuccess: async () => {
      toast.success('Einsatz erstellt', {
        description: 'Der Einsatz wurde erfolgreich erstellt.',
      });
    },
    onSettled: async () => {
      // Always refetch after an error or success
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  // Mutation für Einsatz aktualisieren mit Optimistic Updates
  const updateEinsatzMutation = useMutation<EinsatzResponseDto, ResponseError, { id: string; data: UpdateEinsatzDto }>({
    mutationFn: async ({ id, data }) => {
      const response = await api.einsatz().einsatzControllerUpdateVAlpha({
        id,
        updateEinsatzDto: data,
      });
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.einsatz.detail(id) });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.einsatz.all });

      // Snapshot the previous values
      const previousEinsatz = queryClient.getQueryData<EinsatzControllerCreateVAlpha200Response>(QUERY_KEYS.einsatz.detail(id));
      const previousEinsaetze = queryClient.getQueryData<EinsatzControllerFindAllVAlpha200Response>(QUERY_KEYS.einsatz.list(filters));

      // Optimistically update the single einsatz
      if (previousEinsatz?.data) {
        const updatedEinsatz: EinsatzResponseDto = {
          ...previousEinsatz.data,
          ...data,
          completeness: previousEinsatz.data.completeness,
          updatedAt: new Date(),
        };

        queryClient.setQueryData<EinsatzControllerCreateVAlpha200Response>(QUERY_KEYS.einsatz.detail(id), {
          data: updatedEinsatz,
          meta: previousEinsatz.meta || {},
        });

        // Also update in the list
        queryClient.setQueryData<EinsatzControllerFindAllVAlpha200Response>(QUERY_KEYS.einsatz.list(filters), (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data?.map((e) => (e.id === id ? updatedEinsatz : e)) || [],
          };
        });
      }

      return { previousEinsatz, previousEinsaetze };
    },
    onError: async (error: ResponseError, { id }, context) => {
      // Roll back on error
      if (context && typeof context === 'object' && 'previousEinsatz' in context && context.previousEinsatz) {
        queryClient.setQueryData(QUERY_KEYS.einsatz.detail(id), context.previousEinsatz);
      }
      if (context && typeof context === 'object' && 'previousEinsaetze' in context && context.previousEinsaetze) {
        queryClient.setQueryData(QUERY_KEYS.einsatz.list(filters), context.previousEinsaetze);
      }

      const message = await getApiErrorMessage(error, 'Der Einsatz konnte nicht aktualisiert werden.', 'updateEinsatz');
      logger.error('Failed to update einsatz', error);
      toast.error('Fehler', {
        description: message,
      });
    },
    onSuccess: async () => {
      toast.success('Einsatz aktualisiert', {
        description: 'Der Einsatz wurde erfolgreich aktualisiert.',
      });
    },
    onSettled: async (_, __, { id }) => {
      // Always refetch after error or success
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.detail(id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  return {
    // Einsatzdaten und Ladezustände
    einsaetze: einsaetzeQuery.data?.data || [],
    // total: einsaetzeQuery.data?.total || 0,
    // page: einsaetzeQuery.data?.page || 1,
    // limit: einsaetzeQuery.data?.limit || 10,
    isLoading: einsaetzeQuery.isLoading,
    error: einsaetzeQuery.error,
    refetch: einsaetzeQuery.refetch,

    // API-Aktionen
    createEinsatz: createEinsatzMutation,
    updateEinsatz: updateEinsatzMutation,
  };
};

/**
 * Hook für einzelnen Einsatz mit Store-Integration
 */
export const useEinsatz = (id: string | null) => {
  const queryClient = useQueryClient();
  const { selectedEinsatzId, setSelectedEinsatzId } = useEinsatzStore();

  const einsatz = useQuery<EinsatzControllerCreateVAlpha200Response, ResponseError>({
    enabled: !!id,
    queryKey: QUERY_KEYS.einsatz.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      return await api.einsatz().einsatzControllerFindOneVAlpha({ id });
    },
    staleTime: 30000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  // Sync mit einsatzStore wenn sich selectedEinsatzId ändert
  useMemo(() => {
    if (id && id !== selectedEinsatzId) {
      setSelectedEinsatzId(id);
    }
  }, [id, selectedEinsatzId, setSelectedEinsatzId]);

  const updateEinsatzMutation = useMutation<EinsatzResponseDto, ResponseError, { data: UpdateEinsatzDto }>({
    mutationFn: async ({ data }) => {
      if (!id) {
        throw new Error('ID is required');
      }
      const response = await api.einsatz().einsatzControllerUpdateVAlpha({
        id,
        updateEinsatzDto: data,
      });
      return response.data;
    },
    onMutate: async ({ data }) => {
      if (!id) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.einsatz.detail(id) });

      // Snapshot the previous value
      const previousEinsatz = queryClient.getQueryData<EinsatzControllerCreateVAlpha200Response>(QUERY_KEYS.einsatz.detail(id));

      // Optimistically update to the new value
      if (previousEinsatz?.data) {
        const updatedEinsatz: EinsatzResponseDto = {
          ...previousEinsatz.data,
          ...data,
          completeness: previousEinsatz.data.completeness,
          updatedAt: new Date(),
        };

        queryClient.setQueryData<EinsatzControllerCreateVAlpha200Response>(QUERY_KEYS.einsatz.detail(id), {
          data: updatedEinsatz,
          meta: previousEinsatz.meta || {},
        });
      }

      return { previousEinsatz };
    },
    onError: async (error: ResponseError, _, context) => {
      // Roll back on error
      if (context && typeof context === 'object' && 'previousEinsatz' in context && context.previousEinsatz && id) {
        queryClient.setQueryData(QUERY_KEYS.einsatz.detail(id), context.previousEinsatz);
      }

      const message = await getApiErrorMessage(error, 'Der Einsatz konnte nicht aktualisiert werden.', 'updateEinsatz');
      logger.error('Failed to update einsatz', error);
      toast.error('Fehler', {
        description: message,
      });
    },
    onSuccess: async () => {
      toast.success('Einsatz aktualisiert', {
        description: 'Der Einsatz wurde erfolgreich aktualisiert.',
      });
    },
    onSettled: async () => {
      if (!id) return;
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.detail(id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  const completeness = einsatz.data?.data?.completeness;

  return {
    isLoading: einsatz.isLoading,
    error: einsatz.error,
    einsatz: einsatz.data?.data,
    completeness,
    updateEinsatz: updateEinsatzMutation,
    refetch: einsatz.refetch,
  };
};
