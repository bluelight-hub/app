/**
 * Query Hook für Befehle mit offenen Rückfragen
 *
 * Lädt nur Befehle die offene Rückfragen haben.
 * Nutzt enabled-Flag für Token-sparende conditional Queries.
 */

import { api } from '@/shared';
import type { BefehlDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum Laden der Befehle mit offenen Rückfragen
 *
 * @param einsatzId - Einsatz-ID für die Abfrage
 * @param enabled - Ob die Query gefeuert werden soll (default: true)
 * @returns TanStack Query Result mit BefehlDto Array
 */
export function useOffeneRueckfragen(einsatzId: string, enabled = true) {
  return useQuery<BefehlDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.offeneRueckfragen(einsatzId),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerFindByEinsatzVAlpha({
        einsatzId,
        hasOpenRueckfragen: true,
      });
      return response.data;
    },
    enabled: !!einsatzId && enabled,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
