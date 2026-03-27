/**
 * Mutation Hook für das Erstellen einer Beitrittsanfrage
 *
 * Ermöglicht Einsatzkräften das Stellen einer Anfrage, einem Einsatz beizutreten.
 * Invalidiert automatisch die Beitrittsanfragen-Liste nach erfolgreicher Erstellung.
 */

import { api } from '@/shared';
import type { BeitrittsanfrageResponseDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import { OPERATIVE_ROLES_QUERY_KEYS } from './queries';

interface CreateBeitrittsanfrageParams {
  einsatzId: string;
}

/**
 * Hook zum Erstellen einer Beitrittsanfrage für einen Einsatz
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export function useCreateBeitrittsanfrage() {
  const queryClient = useQueryClient();

  return useMutation<BeitrittsanfrageResponseDto, ResponseError, CreateBeitrittsanfrageParams>({
    mutationFn: async ({ einsatzId }: CreateBeitrittsanfrageParams) => {
      const response = await api.einsatzBeitritt().einsatzBeitrittControllerCreateVAlpha({ einsatzId });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Cache für diesen Einsatz invalidieren
      void queryClient.invalidateQueries({
        queryKey: OPERATIVE_ROLES_QUERY_KEYS.beitrittsanfragenByEinsatz(variables.einsatzId),
      });
    },
    onError: (error: ResponseError) => {
      logger.error('Beitrittsanfrage konnte nicht erstellt werden', error);
    },
  });
}
