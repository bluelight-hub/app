/**
 * Mutation Hook für das Widerrufen einer Einladung
 *
 * Ermöglicht Führungskräften das Widerrufen einer genehmigten Beitrittsanfrage (Einladung).
 * Invalidiert automatisch die Beitrittsanfragen-Liste nach erfolgreichem Widerruf.
 */

import { api } from '@/shared';
import type { BeitrittsanfrageResponseDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/shared/lib/logger';
import { OPERATIVE_ROLES_QUERY_KEYS } from './queries';

interface RevokeInvitationParams {
  einsatzId: string;
  userId: string;
}

/**
 * Hook zum Widerrufen einer Einladung für einen Einsatz
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation<BeitrittsanfrageResponseDto, ResponseError, RevokeInvitationParams>({
    mutationFn: async ({ einsatzId, userId }: RevokeInvitationParams) => {
      const response = await api.einsatzBeitritt().einsatzBeitrittControllerRevokeInvitationVAlpha({
        einsatzId,
        userId,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success('Einladung widerrufen', {
        description: 'Die Einladung wurde erfolgreich widerrufen.',
      });
      // Cache für diesen Einsatz invalidieren
      void queryClient.invalidateQueries({
        queryKey: OPERATIVE_ROLES_QUERY_KEYS.beitrittsanfragenByEinsatz(variables.einsatzId),
      });
    },
    onError: (error: ResponseError) => {
      logger.error('Einladung konnte nicht widerrufen werden', error);
      toast.error('Fehler', {
        description: 'Die Einladung konnte nicht widerrufen werden.',
      });
    },
  });
}
