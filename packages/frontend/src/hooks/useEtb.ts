import { api } from '@/api';
import { QUERY_KEYS } from '@/queryKeys';
import { getApiErrorMessage } from '@/utils/apiErrorHandler';
import { logger } from '@/utils/logger';
import type {
  CreateEtbDto,
  CreateEtbEintragDto,
  CreateEtbEintragResponse,
  CreateEtbResponse,
  GetEtbResponse,
  ResponseError,
  TextbausteinListResponse,
  UpdateEtbEintragDto,
  UpdateEtbEintragResponse,
} from '@bluelight-hub/shared/client';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Exponential Backoff Retry-Verzögerung berechnen
 */
function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}

/**
 * Hook für ETB-Abfrage anhand der Einsatz-ID
 *
 * @param einsatzId - Die ID des Einsatzes
 * @param page - Seitenzahl für Paginierung (optional)
 * @param limit - Anzahl der Einträge pro Seite (optional)
 * @returns ETB-Daten mit Ladezustand und Fehler
 */
export const useEtb = (einsatzId?: string, page?: number, limit?: number) => {
  return useQuery<GetEtbResponse, ResponseError>({
    enabled: !!einsatzId,
    queryKey: QUERY_KEYS.etb.byEinsatz(einsatzId, page, limit),
    queryFn: async () => {
      if (!einsatzId) {
        throw new Error('einsatzId must be provided');
      }
      try {
        return await api.etb().etbControllerGetEtbByEinsatzIdVAlpha({
          einsatzId,
          page,
          limit,
        });
      } catch (error) {
        logger.error('Failed to fetch ETB', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook für ETB-Abfrage mit Infinite Scrolling
 *
 * @param einsatzId - Die ID des Einsatzes
 * @param limit - Anzahl der Einträge pro Seite (Standard: 20)
 * @param sortBy - Feld nach dem sortiert wird (Standard: 'timestamp')
 * @param sortOrder - Sortierreihenfolge (Standard: 'desc' = neueste zuerst)
 * @param includeDeleted - Gelöschte Einträge einschließen (Standard: false)
 * @returns ETB-Daten mit Infinite Scrolling Support
 */
export const useEtbInfinite = (einsatzId?: string, limit: number = 20, sortBy: string = 'timestamp', sortOrder: 'asc' | 'desc' = 'desc', includeDeleted: boolean = false) => {
  return useInfiniteQuery({
    enabled: !!einsatzId,
    queryKey: QUERY_KEYS.etb.infinite(einsatzId, limit, sortBy, sortOrder, includeDeleted),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!einsatzId) {
        throw new Error('einsatzId must be provided');
      }
      try {
        return await api.etb().etbControllerGetEtbByEinsatzIdVAlpha({
          einsatzId,
          page: pageParam,
          limit,
          sortBy: sortBy as 'timestamp' | 'sequenceNumber' | 'kategorie' | 'text',
          sortOrder,
          includeDeleted,
        });
      } catch (error) {
        logger.error('Failed to fetch ETB', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      if (!firstPage.pagination) return undefined;
      const { page } = firstPage.pagination;
      return page > 1 ? page - 1 : undefined;
    },
    staleTime: 30000,
    retry: 3,
    retryDelay: calculateRetryDelay,
    refetchOnWindowFocus: false,
    // Behalte alte Daten während des Nachladens
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook für Textbausteine-Abfrage
 *
 * @returns Textbausteine-Daten mit Ladezustand und Fehler
 */
export const useTextbausteine = () => {
  return useQuery<TextbausteinListResponse, ResponseError>({
    queryKey: QUERY_KEYS.etb.textbausteine(),
    queryFn: async () => {
      try {
        return await api.etb().etbControllerGetTextbausteineVAlpha();
      } catch (error) {
        logger.error('Failed to fetch Textbausteine', error);
        throw error;
      }
    },
    staleTime: 60000, // Textbausteine ändern sich selten, längere stale time
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook für ETB-Erstellung
 *
 * @returns Mutation für ETB-Erstellung
 */
export const useCreateEtb = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateEtbResponse, ResponseError, CreateEtbDto>({
    mutationFn: async (data: CreateEtbDto) => {
      return await api.etb().etbControllerCreateEtbVAlpha({
        createEtbDto: data,
      });
    },
    onMutate: async (newEtb) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.etb.all });

      // Optimistic update könnte hier implementiert werden
      return { newEtb };
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das ETB konnte nicht erstellt werden.', 'createEtb');
      logger.error('Failed to create ETB', error);
      toast.error('Fehler', { description: message });
    },
    onSuccess: (data) => {
      toast.success('ETB erstellt', {
        description: 'Das Einsatztagebuch wurde erfolgreich erstellt.',
      });
      // Invalidate relevant queries
      if (data.data?.einsatzId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.etb.byEinsatz(data.data.einsatzId),
        });
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.etb.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook für ETB-Eintrag-Erstellung
 *
 * @returns Mutation für ETB-Eintrag-Erstellung
 */
export const useCreateEtbEintrag = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateEtbEintragResponse, ResponseError, { etbId: string; data: CreateEtbEintragDto }>({
    mutationFn: async ({ etbId, data }) => {
      return await api.etb().etbControllerCreateEintragVAlpha({
        id: etbId,
        createEtbEintragDto: data,
      });
    },
    onMutate: async ({ etbId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.etb.eintraege(etbId),
      });

      // Optimistic update könnte hier implementiert werden
      return { etbId, data };
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der ETB-Eintrag konnte nicht erstellt werden.', 'createEtbEintrag');
      logger.error('Failed to create ETB entry', error);
      toast.error('Fehler', { description: message });
    },
    onSuccess: (result, { etbId }) => {
      toast.success('Eintrag hinzugefügt', {
        description: 'Der ETB-Eintrag wurde erfolgreich erstellt.',
      });
      // Invalidate ETB queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.etb.eintraege(etbId),
      });
      // Invalidate the ETB by einsatz query to refresh the entries
      if (result.data?.etbId) {
        // We need to get the einsatzId from the ETB itself
        // For now, invalidate all ETB queries to ensure consistency
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.etb.all,
        });
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.etb.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook für ETB-Eintrag-Aktualisierung
 *
 * @returns Mutation für ETB-Eintrag-Aktualisierung
 */
export const useUpdateEtbEintrag = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateEtbEintragResponse, ResponseError, { eintragId: string; data: UpdateEtbEintragDto }>({
    mutationFn: async ({ eintragId, data }) => {
      return await api.etb().etbControllerUpdateEintragVAlpha({
        id: eintragId,
        updateEtbEintragDto: data,
      });
    },
    onMutate: async ({ eintragId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.etb.eintrag(eintragId),
      });

      // Optimistic update könnte hier implementiert werden
      return { eintragId, data };
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der ETB-Eintrag konnte nicht aktualisiert werden.', 'updateEtbEintrag');
      logger.error('Failed to update ETB entry', error);
      toast.error('Fehler', { description: message });
    },
    onSuccess: (result, { eintragId }) => {
      toast.success('Eintrag aktualisiert', {
        description: 'Der ETB-Eintrag wurde erfolgreich aktualisiert.',
      });
      // Invalidate specific entry query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.etb.eintrag(eintragId),
      });
      // Invalidate the ETB by einsatz query to refresh the entries
      if (result.data?.etbId) {
        // We need to get the einsatzId from the ETB itself
        // For now, invalidate all ETB queries to ensure consistency
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.etb.all,
        });
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.etb.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook für ETB-Eintrag-Löschung (Soft Delete)
 *
 * @returns Mutation für ETB-Eintrag-Löschung
 */
export const useDeleteEtbEintrag = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ResponseError, { eintragId: string; einsatzId?: string }>({
    mutationFn: async ({ eintragId }) => {
      await api.etb().etbControllerDeleteEintragVAlpha({
        id: eintragId,
      });
    },
    onMutate: async ({ eintragId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.etb.eintrag(eintragId),
      });

      // Optimistic update könnte hier implementiert werden
      return { eintragId };
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der ETB-Eintrag konnte nicht gelöscht werden.', 'deleteEtbEintrag');
      logger.error('Failed to delete ETB entry', error);
      toast.error('Fehler', { description: message });
    },
    onSuccess: (_, { eintragId, einsatzId }) => {
      toast.success('Eintrag gelöscht', {
        description: 'Der ETB-Eintrag wurde erfolgreich gelöscht.',
      });
      // Invalidate specific entry query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.etb.eintrag(eintragId),
      });
      // If we have the einsatzId, invalidate the ETB by einsatz query
      if (einsatzId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.etb.byEinsatz(einsatzId),
        });
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.etb.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook für ETB-Eintrag-Historie
 *
 * @param eintragId - Die ID des ETB-Eintrags
 * @param page - Seitenzahl für Paginierung (optional)
 * @param limit - Anzahl der Historie-Einträge pro Seite (optional)
 * @returns Historie-Daten mit Ladezustand und Fehler
 */
export const useEtbEntryHistory = (eintragId?: string, page?: number, limit?: number) => {
  return useQuery({
    enabled: !!eintragId,
    queryKey: QUERY_KEYS.etb.eintragHistory(eintragId || '', page, limit),
    queryFn: async () => {
      if (!eintragId) {
        throw new Error('eintragId must be provided');
      }
      try {
        return await api.etb().etbControllerGetEintragHistoryVAlpha({
          id: eintragId,
          page,
          limit,
        });
      } catch (error) {
        logger.error('Failed to fetch ETB entry history', error);
        throw error;
      }
    },
    staleTime: 60000, // Historie ändert sich selten, längere stale time
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Kombinierter Hook für alle ETB-Operationen
 *
 * @param einsatzId - Die ID des Einsatzes (optional für queries)
 * @returns Objekt mit allen ETB-bezogenen Hooks und Daten
 */
export const useEtbOperations = (einsatzId?: string) => {
  const etbQuery = useEtb(einsatzId);
  const textbausteineQuery = useTextbausteine();
  const createEtb = useCreateEtb();
  const createEintrag = useCreateEtbEintrag();
  const updateEintrag = useUpdateEtbEintrag();
  const deleteEintrag = useDeleteEtbEintrag();

  return {
    // Query results
    etb: etbQuery.data,
    isLoadingEtb: etbQuery.isLoading,
    etbError: etbQuery.error,
    textbausteine: textbausteineQuery.data,
    isLoadingTextbausteine: textbausteineQuery.isLoading,
    textbausteineError: textbausteineQuery.error,

    // Mutations
    createEtb: createEtb.mutate,
    createEintrag: createEintrag.mutate,
    updateEintrag: updateEintrag.mutate,
    deleteEintrag: deleteEintrag.mutate,

    // Mutation states
    isCreatingEtb: createEtb.isPending,
    isCreatingEintrag: createEintrag.isPending,
    isUpdatingEintrag: updateEintrag.isPending,
    isDeletingEintrag: deleteEintrag.isPending,
  };
};
