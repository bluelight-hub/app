import { CreateEinsatzDto } from '@bluelight-hub/shared/client/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { logger } from '../../utils/logger';

/**
 * Query Keys für Einsatz-bezogene Queries
 */
export const einsatzQueryKeys = {
  all: ['einsatz'] as const,
  list: () => [...einsatzQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...einsatzQueryKeys.all, 'detail', id] as const,
} as const;

/**
 * Hook zum Abrufen aller Einsätze
 */
export const useEinsaetze = () => {
  return useQuery({
    queryKey: einsatzQueryKeys.list(),
    queryFn: async () => {
      logger.debug('Fetching Einsätze from API');
      const einsaetze = await api.einsatz.einsatzControllerFindAllV1();
      logger.debug(`Successfully fetched ${einsaetze.length} Einsätze`);
      return einsaetze;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook zum Erstellen eines neuen Einsatzes
 */
export const useCreateEinsatz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEinsatzDto) => {
      logger.debug('Creating new Einsatz', { name: data.name });
      const newEinsatz = await api.einsatz.einsatzControllerCreateV1({
        createEinsatzDto: data,
      });
      logger.debug('Successfully created Einsatz', { id: newEinsatz.id });
      return newEinsatz;
    },
    onSuccess: (newEinsatz) => {
      // Invalidate und refetch Einsätze
      queryClient.invalidateQueries({
        queryKey: einsatzQueryKeys.list(),
      });

      // Optimistic update - füge den neuen Einsatz zur Liste hinzu
      queryClient.setQueryData(einsatzQueryKeys.list(), (oldData: any) => {
        return oldData ? [...oldData, newEinsatz] : [newEinsatz];
      });

      logger.info('Einsatz successfully created and cache updated', {
        id: newEinsatz.id,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Einsatz';
      logger.error('Failed to create Einsatz', { error: errorMessage });
    },
  });
};

/**
 * Hook zum Abrufen eines spezifischen Einsatzes
 */
export const useEinsatz = (id: string) => {
  return useQuery({
    queryKey: einsatzQueryKeys.detail(id),
    queryFn: async () => {
      logger.debug('Fetching Einsatz by ID', { id });
      const einsatz = await api.einsatz.einsatzControllerFindByIdV1({ id });
      logger.debug('Successfully fetched Einsatz', { id: einsatz.id });
      return einsatz;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
};

/**
 * Utility Hook für Einsatz-bezogene Operationen
 */
export const useEinsatzOperations = () => {
  const einsaetzeQuery = useEinsaetze();
  const createMutation = useCreateEinsatz();

  return {
    // Query state
    einsaetze: einsaetzeQuery.data ?? [],
    isLoading: einsaetzeQuery.isLoading,
    error: einsaetzeQuery.error,
    isError: einsaetzeQuery.isError,
    hasDataBeenFetched: einsaetzeQuery.isFetched,

    // Derived state
    hasEinsatz: () => (einsaetzeQuery.data?.length ?? 0) > 0,

    // Actions
    createEinsatz: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    // Manual refetch
    refetch: einsaetzeQuery.refetch,

    // Force refresh
    invalidate: () => {
      // This will be available through the query client context
    },
  };
};
