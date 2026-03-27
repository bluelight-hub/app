/**
 * Mutation Hook für das Entscheiden einer Beitrittsanfrage
 *
 * Ermöglicht Führungskräften das Genehmigen oder Ablehnen von Beitrittsanfragen.
 * Invalidiert automatisch die Beitrittsanfragen-Liste nach erfolgreicher Entscheidung.
 */

import { api } from '@/shared';
import type { BeitrittsanfrageResponseDto, ResolveBeitrittsanfrageDtoDecisionEnum, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import { OPERATIVE_ROLES_QUERY_KEYS } from './queries';

interface ResolveBeitrittsanfrageParams {
  anfrageId: string;
  decision: ResolveBeitrittsanfrageDtoDecisionEnum;
  /** Einsatz-ID für Cache-Invalidierung */
  einsatzId: string;
}

/**
 * Hook zum Entscheiden (Genehmigen/Ablehnen) einer Beitrittsanfrage
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export function useResolveBeitrittsanfrage() {
  const queryClient = useQueryClient();

  return useMutation<BeitrittsanfrageResponseDto, ResponseError, ResolveBeitrittsanfrageParams>({
    mutationFn: async ({ anfrageId, decision }: ResolveBeitrittsanfrageParams) => {
      const response = await api.einsatzBeitritt().einsatzBeitrittControllerResolveVAlpha({
        anfrageId,
        resolveBeitrittsanfrageDto: { decision },
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Cache für diesen Einsatz invalidieren
      void queryClient.invalidateQueries({
        queryKey: OPERATIVE_ROLES_QUERY_KEYS.beitrittsanfragenByEinsatz(variables.einsatzId),
      });
    },
    onError: (error: ResponseError) => {
      logger.error('Beitrittsanfrage konnte nicht entschieden werden', error);
    },
  });
}
