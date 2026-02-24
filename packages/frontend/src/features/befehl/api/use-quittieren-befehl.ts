/**
 * Quittieren Mutation Hook für Befehl
 *
 * Quittiert einen Befehl mit Optimistic Updates für sofortiges UI-Feedback.
 * Unterstützt Offline-Queue bei fehlender Netzwerkverbindung.
 */

import { api } from '@/shared';
import type { BefehlDto, ResponseError } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { befehlOfflineQueue } from '../lib/offline-queue';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

import { QuittierenBefehlDtoQuittierungArtEnum } from '@bluelight-hub/shared/client';

/** Mutation Input für Befehl quittieren */
interface QuittierenBefehlInput {
  befehlId: string;
  empfaengerId: string;
  quittierungArt: QuittierenBefehlDtoQuittierungArtEnum;
}

/** Context für Optimistic Update Rollback */
interface QuittierenBefehlMutationContext {
  previousBefehle?: BefehlDto[];
}

/**
 * Hook für Befehl quittieren mit Optimistic Updates
 *
 * Quittiert einen Befehl und aktualisiert sofort die UI
 * (Optimistic Update), noch bevor die Server-Antwort zurückkommt.
 *
 * Bei fehlender Netzwerkverbindung wird die Quittierung in die
 * Offline-Queue eingereiht und bei Wiederverbindung automatisch gesendet.
 *
 * @param einsatzId - Einsatz-ID für Cache-Invalidierung
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export const useQuittierenBefehl = (einsatzId: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<BefehlDto, ResponseError, QuittierenBefehlInput, QuittierenBefehlMutationContext>({
    mutationKey: ['befehl', 'quittieren', einsatzId],
    mutationFn: async (data) => {
      if (!navigator.onLine) {
        await befehlOfflineQueue.enqueue(data);
        toast.info('Quittierung offline gespeichert – wird gesendet sobald online');
        return { id: data.befehlId } as BefehlDto;
      }

      const response = await api.befehle().befehlControllerQuittierenVAlpha({
        id: data.befehlId,
        quittierenBefehlDto: {
          empfaengerId: data.empfaengerId,
          quittierungArt: data.quittierungArt,
        },
      });
      return response.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) });

      const previousBefehle = queryClient.getQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId));

      queryClient.setQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId), (old) =>
        (old || []).map((befehl) => {
          if (befehl.id !== input.befehlId) return befehl;

          return {
            ...befehl,
            empfaenger: befehl.empfaenger.map((emp) => {
              if (emp.empfaengerId !== input.empfaengerId) return emp;

              return {
                ...emp,
                quittierungArt: input.quittierungArt,
                quittiertAm: new Date().toISOString(),
              };
            }),
          };
        }),
      );

      return { previousBefehle };
    },
    onError: async (error, variables, context) => {
      if (context?.previousBefehle) {
        queryClient.setQueryData(BEFEHL_QUERY_KEYS.list(einsatzId), context.previousBefehle);
      }

      const message = await getApiErrorMessage(error, 'Quittierung fehlgeschlagen');
      toast.error('Quittierung fehlgeschlagen', {
        description: message,
        action: {
          label: 'Erneut versuchen',
          onClick: () => mutation.mutate(variables),
        },
      });
    },
    onSuccess: () => {
      if (navigator.onLine) {
        toast.success('Befehl quittiert');
      }
    },
    onSettled: async () => {
      if (navigator.onLine) {
        await queryClient.invalidateQueries({
          queryKey: BEFEHL_QUERY_KEYS.listPrefix(einsatzId),
        });
      }
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  return mutation;
};
