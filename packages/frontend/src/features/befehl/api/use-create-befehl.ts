/**
 * Create Mutation Hook für neuen Befehl
 *
 * Erstellt einen neuen Befehl mit Optimistic Updates für sofortiges UI-Feedback.
 * Invalidiert automatisch alle betroffenen Queries nach erfolgreicher Erstellung.
 */

import { api } from '@/shared';
import type { BefehlDto, CreateBefehlDto, ResponseError } from '@/shared';
import { BefehlDtoStatusEnum, BefehlDtoBefehlstypEnum } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

/** Context für Optimistic Update Rollback */
interface CreateBefehlMutationContext {
  previousBefehle?: BefehlDto[];
}

/**
 * Hook für Befehl erstellen mit Optimistic Updates
 *
 * Erstellt einen neuen Befehl und aktualisiert sofort die UI
 * (Optimistic Update), noch bevor die Server-Antwort zurückkommt.
 *
 * Bei Fehlern wird der optimistische State automatisch zurückgerollt.
 *
 * @param einsatzId - Einsatz-ID für Cache-Invalidierung
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export const useCreateBefehl = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation<BefehlDto, ResponseError, CreateBefehlDto, CreateBefehlMutationContext>({
    mutationKey: ['befehl', 'create', einsatzId],
    mutationFn: async (data) => {
      const response = await api.befehle().befehlControllerCreateVAlpha({
        createBefehlDto: data,
      });
      return response.data;
    },
    onMutate: async (newBefehl) => {
      await queryClient.cancelQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) });

      const previousBefehle = queryClient.getQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId));

      queryClient.setQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId), (old) => [
        {
          ...newBefehl,
          id: `temp-${Date.now()}`,
          nummer: '...',
          status: BefehlDtoStatusEnum.Erteilt,
          befehlstyp:
            newBefehl.ereignis && newBefehl.mittel && newBefehl.ziel && newBefehl.weg
              ? BefehlDtoBefehlstypEnum.Eamzw
              : newBefehl.ereignis || newBefehl.mittel || newBefehl.ziel || newBefehl.weg
                ? BefehlDtoBefehlstypEnum.Erweitert
                : BefehlDtoBefehlstypEnum.Kurzbefehl,
          befehlsgeberName: newBefehl.befehlsgeber,
          erteiltAm: new Date(),
          empfaenger: newBefehl.empfaenger.map((e) => ({
            id: `temp-${e.name}`,
            name: e.name,
            empfaengerId: e.empfaengerId,
            istQuittierbar: !!e.empfaengerId,
          })),
          ereignis: newBefehl.ereignis,
          mittel: newBefehl.mittel,
          ziel: newBefehl.ziel,
          weg: newBefehl.weg,
          kommentare: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as BefehlDto,
        ...(old || []),
      ]);

      return { previousBefehle };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBefehle) {
        queryClient.setQueryData(BEFEHL_QUERY_KEYS.list(einsatzId), context.previousBefehle);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: BEFEHL_QUERY_KEYS.listPrefix(einsatzId),
      });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
