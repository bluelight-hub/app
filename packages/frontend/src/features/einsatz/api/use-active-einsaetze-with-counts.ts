/**
 * Dashboard Query Hook für Einsätze mit ETB/POI-Counts
 *
 * Optimierter Query für Dashboard-Anzeige mit aggregierten Zählern.
 * Nutzt Backend-Endpoint der direkt EinsatzListItemDto[] mit Counts liefert.
 */

import { api } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzListItemDto, ResponseError } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { EINSATZ_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook für Dashboard-Liste mit ETB/POI-Counts
 *
 * Lädt Einsätze mit aggregierten Zählern für ETB-Einträge und POIs.
 * Optimiert für Dashboard-Anzeige.
 *
 * Dieser Hook nutzt den optimierten kombinierten Backend-Endpoint
 * für bessere Performance (eine Query statt mehreren).
 *
 * @param includeArchived - Archivierte Einsätze einschließen (Standard: false)
 * @returns TanStack Query Result mit EinsatzListItemDto[] inkl. Counts
 *
 * @example
 * ```tsx
 * // Nur aktive Einsätze
 * const { data: einsaetze } = useActiveEinsaetzeWithCounts();
 *
 * // Inklusive archivierter Einsätze
 * const { data: alleEinsaetze } = useActiveEinsaetzeWithCounts(true);
 * ```
 */
export const useActiveEinsaetzeWithCounts = (includeArchived = false) => {
  return useQuery<EinsatzListItemDto[], ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.activeWithCounts(includeArchived),
    queryFn: async () => {
      try {
        const response = await api.einsatz().einsatzControllerGetActiveEinsaetzeWithCountsVAlpha({ includeArchived });
        return response.data;
      } catch (error) {
        logger.error('Failed to fetch einsaetze with counts', error);
        throw error;
      }
    },
    staleTime: 30_000, // 30 Sekunden
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
