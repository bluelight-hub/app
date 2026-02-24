/**
 * Query Hook fuer Aufbewahrungskonfiguration
 *
 * Laedt die aktuelle DSGVO-Aufbewahrungskonfiguration vom Backend.
 */

import { api } from '@/shared';
import type { AufbewahrungsKonfigurationDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { AUFBEWAHRUNG_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum Laden der aktuellen Aufbewahrungskonfiguration
 *
 * @returns TanStack Query Result mit AufbewahrungsKonfigurationDto
 */
export function useAufbewahrungsKonfiguration() {
  return useQuery<AufbewahrungsKonfigurationDto>({
    queryKey: AUFBEWAHRUNG_QUERY_KEYS.config(),
    queryFn: async () => {
      const response = await api.aufbewahrung().aufbewahrungControllerGetConfigVAlpha();
      return response.data;
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
