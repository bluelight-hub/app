/**
 * Mutation Hook für Befehl-Kommentar hinzufügen
 *
 * Fügt einen Kommentar oder eine Rückfrage zu einem Befehl hinzu.
 * Invalidiert automatisch den Befehle-Cache nach erfolgreicher Erstellung.
 */

import { api } from '@/shared';
import type { BefehlDto, ResponseError } from '@/shared';
import type { AddBefehlKommentarDto } from '@bluelight-hub/shared/client';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

/** Mutation Input für Kommentar hinzufügen */
interface AddBefehlKommentarInput {
  befehlId: string;
  dto: AddBefehlKommentarDto;
}

/**
 * Hook für Kommentar zu Befehl hinzufügen
 *
 * Sendet einen Kommentar oder eine Rückfrage an das Backend
 * und invalidiert den Cache nach Erfolg.
 *
 * @param einsatzId - Einsatz-ID für Cache-Invalidierung
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export const useAddBefehlKommentar = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation<BefehlDto, ResponseError, AddBefehlKommentarInput>({
    mutationKey: ['befehl', 'kommentar', einsatzId],
    mutationFn: async (data) => {
      const response = await api.befehle().befehlControllerAddKommentarVAlpha({
        id: data.befehlId,
        addBefehlKommentarDto: data.dto,
      });
      return response.data;
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Kommentar konnte nicht gesendet werden');
      toast.error('Kommentar fehlgeschlagen', {
        description: message,
      });
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
