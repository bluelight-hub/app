/**
 * Mutation Hook für Einsatz-Rollen Update
 *
 * Aktualisiert alle Rollenzuweisungen eines Einsatzes atomar.
 * PUT-Semantik: Sendet vollständige Rollenliste, Server ersetzt komplett.
 */

import { api } from '@/shared';
import type { EinsatzRolleDto, UpdateEinsatzRollenDto } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EINSATZ_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum atomaren Aktualisieren aller Rollenzuweisungen
 *
 * @param einsatzId - Einsatz-ID für den die Rollen aktualisiert werden
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export function useUpdateEinsatzRollen(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<EinsatzRolleDto[], Error, UpdateEinsatzRollenDto>({
    mutationKey: ['einsatz', 'rollen', 'update', einsatzId],
    mutationFn: async (data) => {
      const response = await api.einsatz().einsatzControllerUpdateRollenVAlpha({
        id: einsatzId,
        updateEinsatzRollenDto: data,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Rollen aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Rollen');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.rollen(einsatzId) });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
