/**
 * Query Hook für Beitrittsanfragen eines Einsatzes
 *
 * Lädt alle Beitrittsanfragen für einen bestimmten Einsatz.
 * Wird von Führungskräften verwendet, um offene Anfragen zu sehen.
 */

import { api } from '@/shared';
import type { BeitrittsanfrageResponseDto } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { OPERATIVE_ROLES_QUERY_KEYS } from './queries';

/**
 * Hook zum Laden aller Beitrittsanfragen eines Einsatzes
 *
 * @param einsatzId - Einsatz-ID für die Abfrage
 * @returns TanStack Query Result mit BeitrittsanfrageResponseDto Array
 */
export function useBeitrittsanfragen(einsatzId: string) {
  return useQuery<BeitrittsanfrageResponseDto[]>({
    queryKey: OPERATIVE_ROLES_QUERY_KEYS.beitrittsanfragenByEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.einsatzBeitritt().einsatzBeitrittControllerFindAllVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
    staleTime: 30_000,
  });
}
