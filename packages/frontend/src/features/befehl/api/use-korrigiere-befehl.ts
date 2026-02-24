/**
 * Korrigiere Mutation Hook fuer Befehl
 *
 * Korrigiert einen bestehenden Befehl mit Optimistic Updates.
 * Der Original-Befehl wird auf KORRIGIERT gesetzt und ein neuer
 * Korrektur-Befehl wird erstellt.
 */

import { api } from '@/shared';
import type { BefehlDto, KorrigiereBefehlDto, ResponseError } from '@/shared';
import { BefehlDtoStatusEnum, BefehlDtoBefehlstypEnum } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

/** Context fuer Optimistic Update Rollback */
interface KorrigiereBefehlMutationContext {
  previousBefehle?: BefehlDto[];
}

/**
 * Hook fuer Befehl korrigieren mit Optimistic Updates
 *
 * Erstellt einen Korrektur-Befehl und markiert den Original-Befehl als KORRIGIERT.
 * Bei Fehlern wird der optimistische State automatisch zurueckgerollt.
 *
 * @param befehlId - ID des zu korrigierenden Befehls
 * @param einsatzId - Einsatz-ID fuer Cache-Invalidierung
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export const useKorrigiereBefehl = (befehlId: string, einsatzId: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<BefehlDto, ResponseError, KorrigiereBefehlDto, KorrigiereBefehlMutationContext>({
    mutationKey: ['befehl', 'korrigieren', befehlId],
    mutationFn: async (data) => {
      const response = await api.befehle().befehlControllerKorrigierenVAlpha({
        id: befehlId,
        korrigiereBefehlDto: data,
      });
      return response.data;
    },
    onMutate: async (korrekturData) => {
      await queryClient.cancelQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) });

      const previousBefehle = queryClient.getQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId));

      queryClient.setQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId), (old) => {
        if (!old) return old;

        // Original-Befehl auf KORRIGIERT setzen
        const updated = old.map((b) => (b.id === befehlId ? { ...b, status: BefehlDtoStatusEnum.Korrigiert } : b));

        // Optimistischen Korrektur-Befehl hinzufuegen
        const optimisticBefehl: BefehlDto = {
          id: `temp-korrektur-${Date.now()}`,
          nummer: '...',
          einsatzId,
          auftrag: korrekturData.auftrag,
          befehlsgeberName: korrekturData.befehlsgeber,
          erstellerId: korrekturData.erstellerId,
          status: BefehlDtoStatusEnum.Erteilt,
          befehlstyp: BefehlDtoBefehlstypEnum.Kurzbefehl,
          originalBefehlId: befehlId,
          zeitvorgabe: korrekturData.zeitvorgabe,
          ereignis: korrekturData.ereignis,
          mittel: korrekturData.mittel,
          ziel: korrekturData.ziel,
          weg: korrekturData.weg,
          erteiltAm: new Date(),
          empfaenger: korrekturData.empfaenger.map((e) => ({
            id: `temp-${e.name}`,
            name: e.name,
            empfaengerId: e.empfaengerId,
            istQuittierbar: !!e.empfaengerId,
          })),
          kommentare: [],
          isUeberfaellig: false,
          hatNichtVerstanden: false,
          hatOffeneRueckfrage: false,
          kritikalitaet: 'NORMAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as BefehlDto;

        return [optimisticBefehl, ...updated];
      });

      return { previousBefehle };
    },
    onError: async (error, _variables, context) => {
      if (context?.previousBefehle) {
        queryClient.setQueryData(BEFEHL_QUERY_KEYS.list(einsatzId), context.previousBefehle);
      }

      const message = await getApiErrorMessage(error, 'Korrektur fehlgeschlagen');
      toast.error('Korrektur fehlgeschlagen', {
        description: message,
      });
    },
    onSuccess: (data) => {
      toast.success(`Korrektur-Befehl #${data.nummer} erstellt`);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: BEFEHL_QUERY_KEYS.listPrefix(einsatzId),
      });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  return mutation;
};
