/**
 * Status Counts Query Hook für Einsatz Feature
 *
 * Holt die Anzahl der Einsätze pro Status vom Backend.
 */

import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { EinsatzControllerGetStatusCountsVAlpha200Response, ResponseError } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { milliseconds } from 'date-fns';
import { EINSATZ_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook für Einsatz-Status-Counts
 *
 * Holt die Anzahl der Einsätze pro Status vom Backend.
 * Optimiert für Dashboard-Anzeige mit Status-Karten.
 *
 * @param includeArchived - Ob archivierte Einsätze mitgezählt werden sollen
 * @returns Status-Counts und Ladezustände
 *
 * @example
 * ```tsx
 * const { total, counts, isLoading } = useEinsatzStatusCounts(true);
 *
 * return (
 *   <div>
 *     <span>Gesamt: {total}</span>
 *     <span>Angelegt: {counts.angelegt}</span>
 *     <span>In Bearbeitung: {counts.inBearbeitung}</span>
 *   </div>
 * );
 * ```
 */
export const useEinsatzStatusCounts = (includeArchived = false) => {
  const query = useQuery<EinsatzControllerGetStatusCountsVAlpha200Response, ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.statusCounts(includeArchived),
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
    staleTime: milliseconds({ seconds: 30 }),
    retry: 3,
    retryDelay: calculateRetryDelay,
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
