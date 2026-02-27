/**
 * Mutation Hook fuer Empfaenger-Status-Aenderung
 *
 * Aendert den Status eines Empfaengers: Zustellen, stellvertretend
 * Quittieren oder Zuruecksetzen. Mit Optimistic Updates.
 */

import { api } from '@/shared';
import type { BefehlDto, ResponseError } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { type BefehlDtoStatusEnum, BefehlDtoStatusEnum as StatusEnum } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

import type { AendereEmpfaengerStatusDtoAktionEnum, AendereEmpfaengerStatusDtoQuittierungArtEnum, AendereEmpfaengerStatusDtoZielStatusEnum } from '@bluelight-hub/shared/client';

/** Mutation Input fuer Empfaenger-Status-Aenderung */
export interface AendereEmpfaengerStatusInput {
  befehlId: string;
  empfaengerEntityId: string;
  aktion: AendereEmpfaengerStatusDtoAktionEnum;
  quittierungArt?: AendereEmpfaengerStatusDtoQuittierungArtEnum;
  kommentar?: string;
  zielStatus?: AendereEmpfaengerStatusDtoZielStatusEnum;
}

/** Context fuer Optimistic Update Rollback (alle betroffenen Queries) */
interface MutationContext {
  previousQueries: [readonly unknown[], BefehlDto[] | undefined][];
}

/**
 * Berechnet den Befehl-Status optimistisch basierend auf Empfaenger-Daten.
 * Spiegelt die Server-Logik aus befehl.aggregate.ts#recomputeStatus.
 */
function computeOptimisticBefehlStatus(empfaenger: BefehlDto['empfaenger'], currentStatus: BefehlDtoStatusEnum): BefehlDtoStatusEnum {
  if (currentStatus === StatusEnum.Korrigiert) return StatusEnum.Korrigiert;
  if (empfaenger.length === 0) return currentStatus;

  const alleQuittiert = empfaenger.every((e) => e.quittiertAm != null);
  const alleZugestellt = empfaenger.every((e) => e.zugestelltAm != null);

  if (alleQuittiert) return StatusEnum.Quittiert;
  if (alleZugestellt) return StatusEnum.Zugestellt;
  return StatusEnum.Erteilt;
}

/** Toast-Labels pro Aktion */
const AKTION_LABELS: Record<string, { success: string; error: string }> = {
  ZUSTELLEN: { success: 'Empfaenger als zugestellt markiert', error: 'Zustellung fehlgeschlagen' },
  QUITTIEREN: { success: 'Stellvertretend quittiert', error: 'Quittierung fehlgeschlagen' },
  ZURUECKSETZEN: { success: 'Status zurueckgesetzt', error: 'Zuruecksetzen fehlgeschlagen' },
};

/**
 * Hook fuer Empfaenger-Status-Aenderung mit Optimistic Updates
 *
 * @param einsatzId - Einsatz-ID fuer Cache-Invalidierung
 * @returns TanStack Mutation Result
 */
export const useAendereEmpfaengerStatus = (einsatzId: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<BefehlDto, ResponseError, AendereEmpfaengerStatusInput, MutationContext>({
    mutationKey: ['befehl', 'empfaengerStatus', einsatzId],
    mutationFn: async (data) => {
      const response = await api.befehle().befehlControllerAendereEmpfaengerStatusVAlpha({
        id: data.befehlId,
        empfaengerEntityId: data.empfaengerEntityId,
        aendereEmpfaengerStatusDto: {
          aktion: data.aktion,
          quittierungArt: data.quittierungArt,
          kommentar: data.kommentar,
          zielStatus: data.zielStatus,
        },
      });
      return response.data;
    },
    onMutate: async (input) => {
      // Alle List-Queries dieses Einsatzes canceln und optimistisch updaten
      const listPrefix = BEFEHL_QUERY_KEYS.listPrefix(einsatzId);
      await queryClient.cancelQueries({ queryKey: listPrefix });

      // Snapshot aller betroffenen Queries fuer Rollback
      const previousQueries: MutationContext['previousQueries'] = [];
      const queriesData = queryClient.getQueriesData<BefehlDto[]>({ queryKey: listPrefix });
      for (const [queryKey, data] of queriesData) {
        previousQueries.push([queryKey, data]);
      }

      /** Empfaenger-Mapper fuer optimistischen Update */
      const updateEmpfaenger = (emp: BefehlDto['empfaenger'][number]) => {
        if (emp.id !== input.empfaengerEntityId) return emp;
        switch (input.aktion) {
          case 'ZUSTELLEN':
            return { ...emp, zugestelltAm: new Date().toISOString() };
          case 'QUITTIEREN':
            return {
              ...emp,
              quittierungArt: input.quittierungArt,
              quittiertAm: new Date().toISOString(),
              quittierungKommentar: input.kommentar,
            };
          case 'ZURUECKSETZEN':
            if (input.zielStatus === 'ERTEILT') {
              return { ...emp, zugestelltAm: undefined, quittiertAm: undefined, quittierungArt: undefined, quittierungKommentar: undefined };
            }
            return { ...emp, quittiertAm: undefined, quittierungArt: undefined, quittierungKommentar: undefined };
          default:
            return emp;
        }
      };

      // Alle Queries mit Prefix optimistisch updaten (inkl. Befehl-Status-Neuberechnung)
      queryClient.setQueriesData<BefehlDto[]>({ queryKey: listPrefix }, (old) =>
        (old || []).map((befehl) => {
          if (befehl.id !== input.befehlId) return befehl;
          const updatedEmpfaenger = befehl.empfaenger.map(updateEmpfaenger);
          return {
            ...befehl,
            empfaenger: updatedEmpfaenger,
            status: computeOptimisticBefehlStatus(updatedEmpfaenger, befehl.status),
          };
        }),
      );

      return { previousQueries };
    },
    onError: async (error, variables, context) => {
      // Rollback: Alle gespeicherten Query-Snapshots wiederherstellen
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      const labels = AKTION_LABELS[variables.aktion] ?? { error: 'Aktion fehlgeschlagen' };
      const message = await getApiErrorMessage(error, labels.error);
      toast.error(labels.error, {
        description: message,
        action: {
          label: 'Erneut versuchen',
          onClick: () => mutation.mutate(variables),
        },
      });
    },
    onSuccess: (_data, variables) => {
      const labels = AKTION_LABELS[variables.aktion] ?? { success: 'Aktion ausgefuehrt' };
      toast.success(labels.success);
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({
        queryKey: BEFEHL_QUERY_KEYS.listPrefix(einsatzId),
      });
      await queryClient.invalidateQueries({
        queryKey: BEFEHL_QUERY_KEYS.detail(variables.befehlId),
      });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  return mutation;
};
