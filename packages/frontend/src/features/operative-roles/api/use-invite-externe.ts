/**
 * Mutation Hook für das Einladen einer externen Person zu einem Einsatz
 *
 * Ermöglicht Führungskräften das Einladen von externen Personen.
 * Erstellt automatisch eine genehmigte Beitrittsanfrage.
 * Invalidiert automatisch die Beitrittsanfragen-Liste nach erfolgreicher Einladung.
 */

import { api } from '@/shared';
import type { BeitrittsanfrageResponseDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/shared/lib/logger';
import { OPERATIVE_ROLES_QUERY_KEYS } from './queries';

interface InviteExterneParams {
  einsatzId: string;
  userId: string;
}

/**
 * Hook zum Einladen einer externen Person zu einem Einsatz
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export function useInviteExterne() {
  const queryClient = useQueryClient();

  return useMutation<BeitrittsanfrageResponseDto, ResponseError, InviteExterneParams>({
    mutationFn: async ({ einsatzId, userId }: InviteExterneParams) => {
      const response = await api.einsatzBeitritt().einsatzBeitrittControllerInviteVAlpha({
        einsatzId,
        inviteExterneDto: { userId },
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success('Externe Person eingeladen', {
        description: 'Die Einladung wurde erfolgreich erstellt.',
      });
      // Cache für diesen Einsatz invalidieren
      void queryClient.invalidateQueries({
        queryKey: OPERATIVE_ROLES_QUERY_KEYS.beitrittsanfragenByEinsatz(variables.einsatzId),
      });
    },
    onError: (error: ResponseError) => {
      logger.error('Externe Person konnte nicht eingeladen werden', error);
      toast.error('Fehler', {
        description: 'Die externe Person konnte nicht eingeladen werden.',
      });
    },
  });
}
