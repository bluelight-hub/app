import { api } from '@/api';
import { QUERY_KEYS } from '@/queryKeys';
import { logger } from '@/utils/logger';
import type { EinsatzControllerGetStatusCountsVAlpha200Response, ResponseError } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook für Einsatz-Status-Counts
 *
 * Holt die Anzahl der Einsätze pro Status vom Backend
 *
 * @param includeArchived - Ob archivierte Einsätze mitgezählt werden sollen
 * @returns Status-Counts und Ladezustände
 */
export const useEinsatzStatusCounts = (includeArchived = false) => {
  const query = useQuery<EinsatzControllerGetStatusCountsVAlpha200Response, ResponseError>({
    queryKey: QUERY_KEYS.einsatz.statusCounts(includeArchived),
    queryFn: async () => {
      try {
        return await api.einsatz().einsatzControllerGetStatusCountsVAlpha({
          includeArchived,
        });
      } catch (error) {
        logger.error('Failed to fetch status counts', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    total: query.data?.data?.total ?? 0,
    counts: query.data?.data?.counts ?? {
      angelegt: 0,
      inBearbeitung: 0,
      abgeschlossen: 0,
      archiviert: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
