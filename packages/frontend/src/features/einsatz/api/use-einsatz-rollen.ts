/**
 * Query Hook für Einsatz-Rollen
 *
 * Lädt alle Rollenzuweisungen eines Einsatzes.
 * Wird vom Rollen-Manager und Permission-Hook verwendet.
 */

import { api } from '@/shared';
import type { EinsatzRolleDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { EINSATZ_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum Laden aller Rollenzuweisungen eines Einsatzes
 *
 * @param einsatzId - Einsatz-ID für die Abfrage
 * @returns TanStack Query Result mit EinsatzRolleDto Array
 */
export function useEinsatzRollen(einsatzId: string) {
  return useQuery<EinsatzRolleDto[]>({
    queryKey: EINSATZ_QUERY_KEYS.rollen(einsatzId),
    queryFn: async () => {
      const response = await api.einsatz().einsatzControllerGetRollenVAlpha({ id: einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
    staleTime: 30_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
